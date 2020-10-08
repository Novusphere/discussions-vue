import { getConfig, sleep } from "@/novusphere-js/utility";
import DfuseWatcher from "./dfuse";
import GreymassWatcher from "./greymass";
import siteConfig from "../server/site";
import { connectDatabase, getCollection, config } from "../server/mongo";

async function startActionWriter(contract, table, watcher) {
    try {
        const collection = await getCollection(table);

        let previousAction = await watcher.getPreviousAction(collection);

        let actions = [];
        watcher.startWatch(contract, previousAction, (action) => {
            try {
                // try to decode metadata json
                if (action.data && action.data.metadata) {
                    action.data.metadata = JSON.parse(action.data.metadata);
                }
            }
            catch (ex) {
                // if we failed, nbd
            }
            actions.push(action);
        });

        for (; ;) {
            const consumedActions = [...actions];
            actions = [];

            if (consumedActions.length > 0) {

                const write = consumedActions.map(action => ({
                    updateOne: {
                        filter: { transaction: action.transaction, name: action.name, hexData: action.hexData },
                        update: { $set: action },
                        upsert: true
                    }
                }));

                await collection.bulkWrite(write);

                previousAction = consumedActions.reduce((a1, a2) => a1.block > a2.block ? a1 : a2, consumedActions[0]);
                console.log(`Consumed ${consumedActions.length} actions for ${contract}@${watcher.name} at ${new Date(previousAction.time).toLocaleString()}`);
            }
            else {
                console.log(`Idle for ${contract}@${watcher.name} at ${new Date(previousAction.time).toLocaleString()}, now ${new Date().toLocaleString()}`);
            }

            await sleep(1000);
        }
    }
    catch (ex) {
        console.error(`Error with watcher for ${contract}`, ex);
    }
}

(async function () {
    if (!await connectDatabase()) return;

    Object.assign(siteConfig, getConfig(`watcher`));

    const dfuse = new DfuseWatcher(siteConfig.dfuse);
    const greymass = new GreymassWatcher();

    const watchers = [dfuse, greymass];

    for (const watcher of watchers.filter(w => w)) {
        startActionWriter(config.contract.discussions, config.table.discussions, watcher);
        startActionWriter(config.contract.uid, config.table.uid, watcher);
    }
})();
