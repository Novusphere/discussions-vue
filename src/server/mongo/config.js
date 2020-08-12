import { getConfig } from "@/novusphere-js/utility";

//
// NOTE:
// create /config/mongo.json and put your "connection" field there
//

let config = {
    "connection": "mongodb://localhost:27017",
    "database": "discussions2",
    "contract": {
        "discussions": "discussionsx",
        "uid": "nsuidcntract"
    },
    "table": {
        "discussions": "discussionsx",
        "uid": "nsuidcntract",
        "state": "state",
        "posts": "posts",
        "votes": "votes",
        "accounts": "accounts",
        "moderation": "moderation"
    },
    "index": {
        "discussionsx": {
            "transaction": 1,
            "name": 1,
        },
        "nsuidcntract": {
            "transaction": 1,
            "name": 1,
            "time": 1,
            "data.relayer": 1,
            "data.from": 1,
            "data.to": 1,
            "data.memo": 1, // unfortunately, we need an index on memos for depositing...
        },
        "accounts": {
            "pub": 1,
            "domain": 1,
            "data.publicKeys.arbitrary": 1,
            "data.publicKeys.wallet": 1,
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