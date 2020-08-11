import * as axios from 'axios';
import { getFromCache, markdownToHTML, htmlToText, getOEmbedHtml } from "@/novusphere-js/utility";
import { Controller, Get, All } from '@decorators/express';
import { Api } from "../helpers";
import { config, getDatabase } from "../mongo";
import Identicon from 'identicon.js';
import { PublicKey } from 'eosjs-ecc';

let keyIconCache = {};

export default @Controller('/data') class DataController {
    constructor() {
    }

    @Api()
    @All('/test')
    async test(req, res) {
        return res.success({
            ...req.unpack(),
            time: Date.now()
        })
    }

    @Api()
    @Get("/stats")
    async stats(req, res) {
        const { domain } = req.unpack();
        const result = {};
        const db = await getDatabase();
        
        result.allEosAccounts = await db.collection(config.table.uid).countDocuments({
            name: "transfer",
            account: "nsuidcntract",
            "data.to": "EOS1111111111111111111111111111111114T1Anm",
            "data.chain_id": 1,
            "data.memo": { $regex: "^signupeoseos" }
        });

        const ONE_HOUR = 60 * 60 * 1000;
        const times = [
            { s: "lastDay", n: ONE_HOUR * 24 },
            { s: "lastThreeDays", n: ONE_HOUR * 72 },
            { s: "lastWeek", n: ONE_HOUR * 24 * 7 },
            { s: "lastMonth", n: ONE_HOUR * 24 * 31 }
        ];

        const now = Date.now();
        for (const { s, n } of times) {
            const beforeTime = now - n;
            const posts = await db.collection(config.table.discussions).countDocuments({
                account: "discussionsx",
                name: "post",
                time: { $gte: beforeTime }
            });
            const threads = await db.collection(config.table.discussions).countDocuments({
                account: "discussionsx",
                name: "post",
                time: { $gte: beforeTime },
                "data.parentUuid": ""
            });

            result[s] = {
                posts,
                threads
            };
        }

        return res.success(result);
    }

    @Api()
    @Get("/popularusers")
    async popularUsers(req, res) {

        let { domain } = req.unpack();

        const pipeline = [
            { $match: { domain: domain } },
            {
                $project: {
                    pub: "$data.publicKeys.arbitrary",
                    uidw: "$data.publicKeys.wallet",
                    arbitraryWalletProof: "$data.publicKeyProofs.arbitraryWallet",
                    displayName: "$data.displayName",
                    auth: "$auth"
                }
            },
            {
                $lookup: {
                    from: config.table.accounts,
                    let: { pub: "$pub" },
                    pipeline: [
                        //{
                        // $project: { test: "$$pub" }
                        // $project: { test: "$data.followingUsers.pub" }
                        //},
                        {
                            $match: {
                                "data.followingUsers.pub": { $exists: true },
                                $expr: {
                                    $in: ["$$pub", "$data.followingUsers.pub"]
                                }
                            }
                        },
                        {
                            $count: "n"
                        }
                    ],
                    as: "followers"
                }
            },
            {
                $addFields: {
                    "followers": { $arrayElemAt: ["$followers", 0] }
                }
            },
            {
                $sort: {
                    "followers.n": -1
                }
            },
            {
                $limit: 50
            }
        ];

        const db = await getDatabase();
        const users = (await db
            .collection(config.table.accounts)
            .aggregate(pipeline)
            .toArray())
            .map(u => ({
                ...u,
                followers: u.followers ? u.followers.n : 0,
                auth: !u.auth ? [] : Object.keys(u.auth).map(name => ({
                    name: name,
                    username: u.auth[name].username
                }))
            }))

        res.success(users);
    }

    @Api()
    @Get("/communities")
    async communities(req, res) {
        let { domain } = req.unpack();
        let { data } = await axios.get(`https://raw.githubusercontent.com/Novusphere/discussions-app-settings/master/community.json`);

        const tags = Object.keys(data);
        const pipeline = [
            { $match: { domain: domain, "data.subscribedTags": { $in: tags } } },
            { $unwind: "$data.subscribedTags" },
            { $group: { _id: "$data.subscribedTags", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            {
                $project:
                {
                    _id: false,
                    tag: "$_id",
                    count: "$count"
                }
            },
        ];

        const db = await getDatabase();
        let members = (await db
            .collection(config.table.accounts)
            .aggregate(pipeline)
            .toArray())
            .reduce((obj, { tag, count }) => {
                obj[tag] = count || 0;
                return obj;
            }, {});

        const result = tags.map(t => {
            const community = data[t];
            const html = markdownToHTML(community.desc);
            const textDesc = htmlToText(html);
            return {
                tag: t,
                desc: community.desc,
                icon: community.icon,
                members: members[t] || 0,
                html: html,
                description: textDesc,
                symbol: community.symbol
            };
        });

        return res.success(result);
    }

    @Api()
    @Get("/tokens")
    async tokens(req, res) {

        // TO-DO: test
        const { data } = await axios.get('https://raw.githubusercontent.com/Novusphere/discussions-app-settings/master/tokens.json');
        return res.success(data);
    }

    @Api()
    @Get("/auth")
    async auth(req, res) {
        let { publicKey: pub, domain } = req.unpack();

        const db = await getDatabase();
        let user = await db.collection(config.table.accounts)
            .find({
                "data.publicKeys.arbitrary": { $regex: `${pub}$` },
                "domain": domain
            })
            .limit(1)
            .next();

        let auth = [];

        if (user) {
            // resolve the public key to it's full version
            if (user.data && user.data.publicKeys) {
                pub = user.data.publicKeys.arbitrary;
            }

            if (user.auth) {
                auth = Object.keys(user.auth).map(name => ({
                    name: name,
                    username: user.auth[name].username
                }));
            }
        }

        return res.success({
            pub,
            auth: auth
        });
    }

    @Api()
    @Get("/active48h")
    async active48h(req, res) {
        const ago48h = Date.now() - (2 * 24 * 60 * 60 * 1000);
        const db = await getDatabase();

        const pipeline = [
            {
                $match: {
                    account: "discussionsx",
                    time: { $gte: ago48h },
                    "data.metadata.uidw": { $exists: true }
                }
            },
            { $group: { _id: "$data.metadata.uidw" } },
            {
                $project:
                {
                    _id: false,
                    pub: "$_id"
                }
            },
        ];

        const cursor = await db
            .collection(config.table.discussions)
            .aggregate(pipeline);

        const items = [];
        while (await cursor.hasNext()) {
            const { pub } = await cursor.next();
            items.push(pub);
        }

        return res.success(items);
    }

    @Api()
    @Get("/profile")
    async profile(req, res) {
        let { publicKey: pub, domain } = req.unpack();

        const db = await getDatabase();

        let followers = 0;
        let lastPost = null;
        let threads = 0;
        let posts = 0;

        let user = await db.collection(config.table.accounts)
            .find({
                "data.publicKeys.arbitrary": { $regex: `${pub}$` },
                "domain": domain
            })
            .limit(1)
            .next();

        let auth = [];

        if (user) {
            // resolve the public key to it's full version
            if (user.data && user.data.publicKeys) {
                pub = user.data.publicKeys.arbitrary;
            }

            if (user.auth) {
                auth = Object.keys(user.auth).map(name => ({
                    name: name,
                    username: user.auth[name].username
                }));
            }
        }

        if (pub && pub.length >= 50) {
            followers = await db.collection(config.table.accounts)
                .countDocuments({
                    "domain": domain,
                    "data.followingUsers.pub": pub
                });

            lastPost = await db.collection(config.table.posts)
                .find({ "pub": pub })
                .sort({ "createdAt": -1 })
                .limit(1)
                .next();

            posts = await db.collection(config.table.posts)
                .countDocuments({ "pub": pub });

            threads = await db.collection(config.table.posts)
                .countDocuments({
                    "pub": pub,
                    "parentUuid": ""
                });
        }

        return res.success({
            pub,
            followers,
            posts,
            threads,
            uidw: lastPost ? lastPost.uidw : undefined,
            displayName: lastPost ? lastPost.displayName : undefined,
            followingUsers: user ? user.data.followingUsers : [],
            auth: auth
        });
    }

    @Api()
    @Get("/trending")
    async trending(req, res) {
        const { days, limit, ignoreTags } = req.unpack({ days: 3, limit: 10, ignoreTags: ['all'] });
        const time = Date.now() - (1000 * 60 * 60 * 24 * days);

        const pipeline = [
            { $match: { createdAt: { $gte: time }, sub: { $nin: ignoreTags } } },
            { $unwind: "$tags" },
            { $group: { _id: "$tags", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            {
                $lookup: {
                    from: config.table.accounts,
                    localField: "_id",
                    foreignField: "data.tags",
                    as: "members"
                }
            },
            {
                $project:
                {
                    _id: false,
                    tag: "$_id",
                    members: { $size: "$members" }
                }
            },
            { $limit: limit }
        ];

        const db = await getDatabase();
        const tags = await db
            .collection(config.table.posts)
            .aggregate(pipeline)
            .toArray();

        return res.success(tags);
    }

    @Api()
    @Get("/keyicon/:publicKey")
    async publicKeyIcon(req, res) {
        let { publicKey } = req.unpack();
        const dot = publicKey.indexOf('.');
        if (dot > -1) {
            // remove the .svg / .png
            publicKey = publicKey.substring(0, dot);
        }

        const icon = await getFromCache(keyIconCache, publicKey, async () => {
            const options = {
                //foreground: [0, 0, 0, 255],  // rgba black
                //background: dark ? [0, 0, 0, 255] : [255, 255, 255, 255],
                background: [0, 0, 0, 0],
                //margin: 0.2,  // 20% margin
                size: 420, // 420px square
                format: 'svg' // use SVG instead of PNG
            };

            return new Identicon(PublicKey.fromString(publicKey).toHex(), options).toString(true);
        });

        return res.success(icon, { contentType: 'image/svg+xml', cacheControl: 'public, max-age=604800, immutable' });
    }

    @Api()
    @Get("/oembed")
    async oembed(req, res) {
        let { url: href } = req.unpack();
        let { insertHTML, oembed } = getOEmbedHtml(href);

        if (oembed) {
            try {
                const { data: oembedResult } = await axios.get(oembed);
                if (oembedResult.html) {
                    insertHTML = oembedResult.html;
                }
            }
            catch (ex) {
                // failed...
            }
        }

        return res.success({
            oembedUrl: oembed,
            html: insertHTML
        });
    }
}