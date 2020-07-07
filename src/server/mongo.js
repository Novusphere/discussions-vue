import { MongoClient } from 'mongodb';
import config from './mongo.config';
import { getFromCache } from "@/novusphere-js/utility";

let cache = {};

export default async function getDatabase() {
    return getFromCache(cache, 'database', async () => {
        const mongo = await MongoClient.connect(config.connection, { useNewUrlParser: true });
        const database = await mongo.db(config.database);

        for (let collection in config.index) {
            let indexes = config.index[collection];
            for (let name in indexes) {
                let action = {};
                if (name == "$text") {
                    indexes[name].forEach(field => action[field] = "text");
                }
                else {
                    action[name] = indexes[name];
                }

                console.log(`${collection} ${JSON.stringify(action)}`);
                await database.collection(collection).createIndex(action);
            }
        }
        return database;
    });
}