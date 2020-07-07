let config = {
    "connection": "mongodb://localhost:27017",
    "database": "discussions2",
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
            "data.postPub": 1,
            "data.uidw": 1,
            "data.tags": 1,
            "data.following.pub": 1
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

export default config;