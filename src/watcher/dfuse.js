import { sleep } from "@/novusphere-js/utility";

const { createDfuseClient } = require("@dfuse/client");
global.fetch = require('node-fetch');
global.WebSocket = require('ws');

export default class DfuseWatcher {
    constructor(apiKey) {
        this._apiKey = apiKey;
    }

    async startWatch(account, previousAction, onAction) {
        try {
            for (; ;) {
                const operation = `
                subscription($cursor: String!) {
                    searchTransactionsForward(
                        query: "(auth:${account} OR receiver:${account})"
                        lowBlockNum:${previousAction ? previousAction.block + 1 : 0}
                        cursor: $cursor
                    ) {
                        cursor
                        trace {
                            id
                            status
                            block {
                                id
                                num
                                timestamp
                            }
                            executedActions {
                                seq
                                authorization { actor }
                                account
                                name
                                data
                                hexData
                            }
                        }
                    }
                }`;

                this._client = createDfuseClient({
                    apiKey: this._apiKey,
                    network: "mainnet.eos.dfuse.io",
                });

                const stream = await this._client.graphql(operation, message => {
                    if (message.type === 'data') {
                        const {
                            cursor,
                            trace: { id, block, executedActions }
                        } = message.data.searchTransactionsForward;

                        const actions = executedActions.map((act) => ({
                            id: Number(act.seq),
                            position: 0, // ???
                            account: act.account,
                            auth: act.authorization.map(auth => auth.actor),
                            transaction: id,
                            block: Number(block.num),
                            time: new Date(block.timestamp).getTime(),
                            name: act.name,
                            hexData: act.hexData,
                            data: act.data
                        }));

                        actions.forEach(action => {
                            if (onAction) {
                                onAction(action);
                            }
                            if (!previousAction || action.block > previousAction.block) {
                                previousAction = action;
                            }
                        });

                        // Mark stream at cursor location, on re-connect, we will start back at cursor
                        stream.mark({ cursor });
                    }

                    if (message.type === 'error') {
                        console.log('An error occurred', message.errors, message.terminal);
                    }

                    if (message.type === 'complete') {
                        console.log('Completed');
                    }
                });

                // wait 1 hour, then re-establish the connection
                // dfuse seems to randomly stop providing data, and no indication the connection has "died"
                await sleep(1 * 60 * 60 * 1000);

                try { await this._client.release(); }
                catch (ex) {
                    // do nothing, we're reiniting the client
                }

                console.log(`Force re-establishing connection to dfuse...`);
            }
        }
        catch (ex) {
            console.error(`Dfuse stream error for ${account}`, ex);
        }
    }
}