import { MongoClient } from 'mongodb';
import config from './config';
import { getFromCache } from "@/novusphere-js/utility";

let cache = {};

async function getMongo() {
    return getFromCache(cache, 'mongo', async () => {
        console.log(`Trying to connect to ${config.connection}`);
        const mongo = await MongoClient.connect(config.connection, { useNewUrlParser: true, useUnifiedTopology: true });

        // set up the indexes
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

                console.log(`Index ${collection} ${JSON.stringify(action)}`);
                await database.collection(collection).createIndex(action);
            }
        }

        return mongo;
    });
}

async function getDatabase(name) {
    name = name || config.database;

    return getFromCache(cache, `database_${name}`, async () => {
        const mongo = await getMongo();
        const database = await mongo.db(name);
        return database;
    });
}

async function getCollection(name) {
    const nameData = name.split('::');
    let collection = undefined;
    if (nameData.length > 1) {
        let database = await getDatabase(nameData[0]);
        return database.collection(nameData[1]);
    }
    else {
        let database = await getDatabase();
        return database.collection(nameData[0]);
    }
}

export {
    config,
    getDatabase,
    getCollection
}