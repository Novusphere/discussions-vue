import { Controller, Post, Get } from '@decorators/express';
import { Api } from "../helpers";
import { config, getDatabase } from "../mongo";

export default @Controller('/moderation') class ModerationController {
    constructor() {
    }

    @Api()
    @Get('/test')
    async test(req, res) {
        return res.success([]);
    }

    /*@Api()
    @Post('/posts/:tag')
    async posts(req, res) {
        const { domain, mods, tag, tags, thread } = req.unpack();
        if (!domain) throw new Error(`Field domain is unspecified`);
        if (!mods || !Array.isArray(mods)) throw new Error(`Field mods must be specified`);

        let db = await getDatabase();


        const matchPosts = {};

        if (thread) {
            matchPosts["$expr"] = { $eq: ["$post.uuid", "$post.threadUuid"] };
        }

        if (tags && tags.length > 0) {
            matchPosts["post.tags"] = { $in: tags };
        }

        let result = await db.collection(config.table.moderation)
            .aggregate([{
                $match: {
                    domain: domain,
                    pub: { $in: mods },
                    tags: tag
                },
            },
            {
                $lookup:
                {
                    from: config.table.posts,
                    let: { uuid: "$uuid" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ["$uuid", "$$uuid"]
                                }
                            }
                        }
                    ],
                    as: "post"
                }
            },
            ...(Object.keys(matchPosts).length > 0 ? [{ $match: matchPosts }] : []),
            {
                $project:
                {
                    mod: "$pub",
                    uuid: "$uuid",
                    tags: "$tags",
                    post: { "$arrayElemAt": ["$post", 0] }
                }
            },
            {
                $project:
                {
                    mod: "$pub",
                    uuid: "$uuid",
                    threadUuid: "$post.threadUuid",
                    transaction: "$post.transaction",
                    createdAt: "$post.createdAt"
                }
            }
            ])
            .toArray();

        return res.success(result);
    }*/

    @Api()
    @Post('/settags')
    async setTags(req, res) {

        const { pub, domain, data: { uuid, tags } } = req.unpackAuthenticated({ tags: [] });

        if (!uuid) throw new Error(`Uuid must be specified`);
        if (!Array.isArray(tags)) throw new Error(`Tags must be an array`);

        let db = await getDatabase();

        await db.collection(config.table.moderation).updateOne({
            pub: pub,
            domain: domain,
            uuid: uuid
        }, {
            $setOnInsert: {
                pub: pub,
                domain: domain,
                uuid: uuid
            },
            $set: {
                tags: tags
            }
        }, {
            upsert: true
        });

        return res.success({
            uuid,
            tags
        });
    }
}