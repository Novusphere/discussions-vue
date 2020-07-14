import { getConfig } from "@/novusphere-js/utility";

//
// NOTE:
// create /config/mongo.json and put your "connection" field there
//

let config = {
    "connection": "mongodb://localhost:27017",
    "database": "discussions2",
    "actions": {
        "discussions": "atmosdb2::discussions_actions"
    },
    "contract": {
        "discussions": "discussionsx",
        "uid": "nsuidcntract"
    },
    "table": {
        "state": "state",
        "posts": "posts",
        "votes": "votes",
        "accounts": "accounts",
        "moderation": "moderation"
    },
    "index": {
        "accounts": {
            "pub": 1,
            "data.arbitraryPublicKey": 1,
            "data.uidw": 1,
            "data.subscribedTags": 1,
            "data.followingUsers.pub": 1
        },
        "state": {
            "name": 1
        },
        "votes": {
            "pub": 1,
            "uuid": 1
        },
        "posts": {
            "id": -1,
            "block": -1,
            "transaction": 1,
            "chain": 1,
            "createdAt": -1,
            "poster": 1,
            "pub": 1,
            "sub": 1,
            "tags": 1,
            "threadUuid": 1,
            "uuid": 1,
            "mentions": 1,
            "$text": ["searchMeta", "content"]
        },
        "moderation": {
            "pub": 1,
            "uuid": 1
        }
    }
}

Object.assign(config, getConfig(`mongo`));

export default config;