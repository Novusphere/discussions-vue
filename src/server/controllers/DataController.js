import * as axios from 'axios';
import { generateUuid, markdownToHTML, htmlToText } from "@/novusphere-js/utility";
import { Controller, Get, Post, All } from '@decorators/express';
import { Api } from "../helpers";
import { config, getDatabase } from "../mongo";
import Identicon from 'identicon.js';
import { PublicKey } from 'eosjs-ecc';

const IMAGE_REGEX = (/(.|)http[s]?:\/\/(\w|[:/.%-])+\.(png|jpg|jpeg|gif)(\?(\w|[:/.%-])+)?(.|)/gi);
const LINK_REGEX = (/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z]{2,}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/gi);

@Controller('/data')
export default class DataController {
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
        const { data } = await axios.get(`https://raw.githubusercontent.com/Novusphere/discussions-app-settings/master/community.json`);
        const tags = Object.keys(data);
        const pipeline = [
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
        let { publicKey, dark } = req.unpack();
        const dot = publicKey.indexOf('.');
        if (dot > -1) {
            // remove the .svg
            publicKey = publicKey.substring(0, dot);
        }

        const options = {
            //foreground: [0, 0, 0, 255],  // rgba black
            background: dark ? [0, 0, 0, 255] : [255, 255, 255, 255],
            //margin: 0.2,  // 20% margin
            size: 420, // 420px square
            format: 'svg' // use SVG instead of PNG
        };

        const icon = new Identicon(PublicKey.fromString(publicKey).toHex(), options).toString(true);
        res.setHeader('content-type', 'image/svg+xml');
        return res.send(icon);
    }

    @Api()
    @Get("/oembed")
    async oembed(req, res) {
        let { url: href } = req.unpack();
        let insertHTML = undefined;
        let oembed = undefined;

        if (new RegExp(IMAGE_REGEX).test(href) ||
            (/https?:\/\/(www.)?tradingview.com\/x\//gi).test(href)) {
            // Images auto embed
            // Trading view chart image
            insertHTML = `<img src="${href}" alt="${href}" />`;
        }
        else if ((/t.me\/([a-zA-Z0-9_!@+]+)\/([a-zA-Z0-9]+)/gi).test(href)) {
            // Telegram
            const [, ids] = href.split('t.me/')
            if (ids) {
                insertHTML = `<span data-telegram-rn="${generateUuid()}" data-telegram-post="${ids}" data-width="100%"></span>`
            }
        }
        else if ((/https:\/\/twitter.com\/[a-zA-Z0-9-_]+\/status\/[0-9]+/gi).test(href)) {
            // Twitter
            oembed = `https://publish.twitter.com/oembed?url=${href}`;
        }
        else if ((/https?:\/\/www.youtube.com\/watch\?feature=(.*?)&v=[a-zA-Z0-9-_]+/).test(href) ||
            (/https?:\/\/www.youtube.com\/watch\?t=[0-9]+/).test(href) ||
            (/https?:\/\/(www|m)?.youtube.com\/watch\?v=[a-zA-Z0-9-_]+/).test(href) ||
            (/https?:\/\/youtu.be\/[a-zA-Z0-9-_]+/).test(href)) {
            // Youtube
            oembed = `https://www.youtube.com/oembed?format=json&url=${href.replace(/feature=(.*?)&/, '')}`;
        }
        else if ((/https?:\/\/www.instagr.am(\/[a-zA-Z0-9-_]+)?\/p\/[a-zA-Z0-9-_]+(\/?.+)?/i).test(href) ||
            (/https?:\/\/www.instagram.com(\/[a-zA-Z0-9-_]+)?\/p\/[a-zA-Z0-9-_]+(\/?.+)?/i).test(href)) {
            // Instagram
            oembed = `https://api.instagram.com/oembed/?url=${href}`;
        }
        else if ((/soundcloud/).test(href)) {
            // Sound Cloud
            oembed = `https://soundcloud.com/oembed?format=json&url=${href}`;
        }

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