import * as axios from 'axios';
import { getFromCache, markdownToHTML, htmlToText, getOEmbedHtml, LBRY_REGEX, createDOMParser } from "@/novusphere-js/utility";
import { getTokensInfo, getAsset } from "@/novusphere-js/uid";
import { Controller, Get, All, Post } from '@decorators/express';
import { Api } from "../helpers";
import { config, getDatabase } from "../mongo";
import siteConfig from "../site";
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
    @Post("/analytics/viewpost")
    async analyticsViewPost(req, res) {
        const { uuid } = req.unpack();

        const db = await getDatabase();
        const analytics = await db.collection(config.table.posts)
            .updateOne({ uuid: uuid },
                {
                    $inc: { views: 1 }
                });

        return res.success();
    }

    @Api()
    @Post("/analytics")
    async analytics(req, res) {
        const { pub, data: { type } } = req.unpackAuthenticated();

        if (!siteConfig.testerPublicKeys.some(pk => pub == pk)) {
            throw new Error(`Unauthorized tester public key`);
        }

        const LAST_YEAR = Date.now() - (365 * 24 * 60 * 60 * 1000);

        const db = await getDatabase();
        const analytics = await db.collection(config.table.analytics)
            .find({ type: type, time: { $gte: LAST_YEAR } })
            .toArray();

        return res.success(analytics);
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
                        {
                            $match: {
                                "followingUsers.pub": { $exists: true },
                                $expr: {
                                    $in: ["$$pub", "$followingUsers.pub"]
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
            { $match: { domain: domain, "subscribedTags": { $in: tags } } },
            { $unwind: "$subscribedTags" },
            { $group: { _id: "$subscribedTags", count: { $sum: 1 } } },
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

        const result = tags
            .map(t => {
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
            })
            .sort((a, b) => b.members - a.members);

        return res.success(result);
    }

    @Api()
    @Get("/tokens")
    async tokens(req, res) {
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
    @Get("/marketcaps")
    async marketcaps(req, res) {
        const { data: feed } = await axios.get('https://monitor-api.eosx.io/marketcap');
        const mcaps = {};

        for (let i = 1; i < feed.length; i++) {
            const { tokenName, tokenContract, tokenPriceInUSD, percentChange24h } = feed[i];
            mcaps[tokenName] = {
                symbol: tokenName,
                contract: tokenContract,
                price: parseFloat(tokenPriceInUSD),
                percentChange24h
            }
        }

        return res.success(mcaps);
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
        let followerUsers = [];
        let lastPost = null;
        let threads = 0;
        let posts = 0;

        function stripAuth(auth) {
            if (!auth) return undefined;
            return Object.keys(auth).map(name => ({
                name: name,
                username: auth[name].username
            }));
        }

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
            auth = stripAuth(user.auth);
        }

        if (pub && pub.length >= 50) {
            followers = await db.collection(config.table.accounts)
                .countDocuments({
                    "domain": domain,
                    "followingUsers.pub": pub
                });

            // TO-DO: limit 100... cross this bridge later
            followerUsers = (await db.collection(config.table.accounts)
                .aggregate([{
                    $match: {
                        "domain": domain,
                        "followingUsers.pub": pub
                    }
                }, {
                    $project: {
                        "displayName": "$data.displayName",
                        "pub": "$data.publicKeys.arbitrary",
                        "uidw": "$data.publicKeys.wallet"
                    }
                }, {
                    $limit: 100
                }])
                .toArray());

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
            posts,
            threads,
            uidw: lastPost ? lastPost.uidw : undefined,
            displayName: lastPost ? lastPost.displayName : undefined,
            followers,
            followerUsers,
            followingUsers: (user ? user.followingUsers : undefined) || [],
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
        let svg = false;
        if (dot > -1) {
            // remove the .svg / .png
            svg = publicKey.lastIndexOf('.svg') == publicKey.length - 4;
            publicKey = publicKey.substring(0, dot);
        }

        const icon = await getFromCache(keyIconCache, `${publicKey}_${svg ? 'svg' : 'png'}`, async () => {
            const options = {
                //foreground: [0, 0, 0, 255],  // rgba black
                //background: dark ? [0, 0, 0, 255] : [255, 255, 255, 255],
                background: [0, 0, 0, 0],
                //margin: 0.2,  // 20% margin
                size: 420, // 420px square
                format: svg ? 'svg' : 'png' // use SVG instead of PNG
            };

            const icon = new Identicon(PublicKey.fromString(publicKey).toHex(), options).toString(true);
            const iconBuffer = Buffer.from(icon, 'binary');
            return iconBuffer;
        });

        return res.success(icon, { contentType: svg ? 'image/svg+xml' : 'image/png', cacheControl: 'public, max-age=604800, immutable' });
    }

    @Api()
    @Get("/oembed")
    async oembed(req, res) {
        let { url: href } = req.unpack();
        let { insertHTML, oembed } = getOEmbedHtml(href);
        let raw = {};

        if (oembed) {
            try {
                const { data: oembedResult } = await axios.get(oembed);
                if (new RegExp(LBRY_REGEX).test(href)) {
                    //
                    // Doing LBRYs job of having an oembed API...
                    //
                    let domParser = createDOMParser();
                    let document = domParser.parseFromString(oembedResult, 'text/html');
                    const ogImage = document.querySelector('meta[property="og:image"]');
                    const embedUrl = oembedResult.match(/https:\/\/[a-zA-Z0-9\.]+\/\$\/embed\/[a-zA-Z0-9_\-\/().!]+/);

                    if (embedUrl && embedUrl.length > 0) {
                        raw = {
                            html: `<iframe id="lbry-iframe" width="560" height="315" src="${embedUrl[0]}" allowfullscreen></iframe>`,
                            thumbnail_url: ogImage ? ogImage.getAttribute('content') : undefined
                        }
                    }
                }
                else if (oembedResult.html) {
                    raw = oembedResult;
                    insertHTML = oembedResult.html;
                }
            }
            catch (ex) {
                //console.log(ex);
                // failed...
            }
        }

        return res.success({
            oembedUrl: oembed,
            html: raw.html || insertHTML,
            image: raw.thumbnail_url,
            type: raw.type,
            raw: raw
        });
    }
}