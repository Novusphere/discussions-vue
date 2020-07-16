const { createDfuseClient } = require("@dfuse/client");
global.fetch = require('node-fetch');
global.WebSocket = require('ws');

export default class DfuseWatcher {
    constructor(apiKey) {
        this._apiKey = apiKey;
        this._client = createDfuseClient({
            apiKey: this._apiKey,
            network: "mainnet.eos.dfuse.io",
        });
    }

    async startWatch(account, previousAction, onAction) {
        const operation = `
                subscription {
                    searchTransactionsForward(
                        query: "(auth:${account} OR receiver:${account})"
                        lowBlockNum:${previousAction ? previousAction.block + 1 : 0}
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
                }
        `;

        const stream = await this._client.graphql(operation, message => {
            if (message.type === 'data') {
                const {
                    cursor,
                    trace: { id, block, executedActions }
                } = message.data.searchTransactionsForward;

                executedActions.forEach((act) => {
                    const action = {
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
                    };

                    if (onAction) onAction(action);
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

        // Waits until the stream completes, or forever
        await stream.join();
        await this._client.release();
    }
}