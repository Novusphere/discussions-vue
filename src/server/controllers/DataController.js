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
    @Get("/communities")
    async communities(req, res) {
        const { data, domain } = await axios.get(`https://raw.githubusercontent.com/Novusphere/discussions-app-settings/master/community.json`);
        const tags = Object.keys(data);
        const pipeline = [
            { $match: { domain: domain } },
            { $unwind: "$data.tags" },
            { $match: { "data.tags": { $in: tags } } },
            { $group: { _id: "$data.tags", count: { $sum: 1 } } },
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
        const members = (await db
            .collection(config.table.accounts)
            .aggregate(pipeline)
            .toArray())
            .reduce((obj, { tag, count }) => obj[tag] = count || 0, {});

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
    @Get("/profile")
    async profile(req, res) {
        const { publicKey: pub, domain } = req.unpack();

        const db = await getDatabase();

        let followers = await db.collection(config.table.accounts)
            .countDocuments({ "data.followingUsers.pub": pub });

        let lastPost = await db.collection(config.table.posts)
            .find({ "pub": pub })
            .sort({ "createdAt": -1 })
            .limit(1)
            .next();

        let posts = await db.collection(config.table.posts)
            .countDocuments({ "pub": pub });

        let threads = await db.collection(config.table.posts)
            .countDocuments({
                "pub": pub,
                "parentUuid": ""
            });

        let user = await db.collection(config.table.accounts)
            .find({
                "data.publicKeys.arbitrary": pub,
                "domain": domain
            })
            .limit(1)
            .next();

        return res.success({
            pub,
            followers,
            posts,
            threads,
            uidw: lastPost ? lastPost.uidw : undefined,
            displayName: lastPost ? lastPost.displayName : undefined,
            followingUsers: user ? user.data.followingUsers : []
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