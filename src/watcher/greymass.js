import { sleep } from "@/novusphere-js/utility";
import axios from 'axios';

export default class GreymassWatcher {
    constructor(endpoint) {
        this.name = 'greymass';
        this._endpoint = endpoint || `https://eos.greymass.com`;
    }

    async getPreviousAction(collection) {
        return await collection
            .find()
            .sort({ position: -1 })
            .limit(1)
            .next()
            || { block: -1, position: -1 };
    }

    async startWatch(account, previousAction, onAction) {
        try {
            for (; ;) {

                const { data } = await axios.post(`${this._endpoint}/v1/history/get_actions`,
                    JSON.stringify({
                        account_name: account,
                        pos: previousAction.position + 1,
                        offset: 100
                    }),
                    {
                        headers: { 'Content-Type': 'application/json' },
                        timeout: 10000 // 10s timeout
                    });

                const actions = data.actions.map((a, i) => {
                    const { trx_id, act } = a.action_trace;
                    return {
                        id: Number(a.global_action_seq),
                        position: a.account_action_seq,
                        account: act.account,
                        auth: act.authorization.map(auth => auth.actor),
                        transaction: trx_id,
                        block: a.block_num,
                        time: new Date(a.block_time).getTime(),
                        name: act.name,
                        hexData: act.hex_data,
                        data: act.data
                    };
                });

                for (const action of actions) {
                    if (onAction) {
                        onAction(action);
                    }
                    if (!previousAction || action.position > previousAction.position) {
                        previousAction = action;
                        //console.log(`GM position set to ${account}@${previousAction.position}`);
                    }
                }

                await sleep(2500);
            }
        }
        catch (ex) {
            console.error(`Greymass error for ${account}`, ex);
        }
    }
}