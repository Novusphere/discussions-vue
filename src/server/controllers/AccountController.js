import { Controller, Get, Post } from '@decorators/express';
import { Api } from "../helpers";
import { config, getDatabase } from "../mongo";

@Controller('/account')
export default class AccountController {
    constructor() {
    }

    //
    // Account retrieval
    //
    @Api({ requiredAuth: false })
    @Get('/')
    async get(req, res) {
        let { pub, domain } = req.unpack();

        let db = await getDatabase();
        let document = await db.collection(config.tables.accounts)
            .find({
                pub: pub,
                domain: domain
            })
            .limit(1)
            .next();

        if (!document) {
            throw new Error(`Account could not be found`);
        }

        return res.success(document);
    }

    //
    // Account saving
    //
    @Api({ requiredAuth: false })
    @Post('/')
    async post(req, res) {
        let { pub, domain, sig, time, data } = req.unpack();
        let account = JSON.parse(data);

        if (data.length >= 1025 * 256) throw new Error(`Data must be smaller than 256kb`);

        let db = await getDatabase();
        let update = await db.collection(config.tables.accounts)
            .update(
                {
                    pub: pub,
                    domain: domain
                },
                {
                    $setOnInsert: {
                        pub: pub,
                        domain: domain
                    },
                    $set: {
                        sig: sig,
                        time: time,
                        _data: data,
                        data: account
                    }
                },
                { upsert: true });

        return req.success();
    }
}