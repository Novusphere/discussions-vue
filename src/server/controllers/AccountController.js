import { Controller, Post } from '@decorators/express';
import { Api } from "../helpers";
import { config, getDatabase } from "../mongo";

export default @Controller('/account') class AccountController {
    constructor() {
    }

    //
    // Account retrieval
    //
    @Api()
    @Post('/get')
    async get(req, res) {
        let { pub, domain } = req.unpackAuthenticated();

        let db = await getDatabase();
        let document = await db.collection(config.table.accounts)
            .find({
                pub: pub,
                domain: domain
            })
            .limit(1)
            .next();

        if (!document) {
            throw new Error(`Account not found`);
        }

        return res.success(document);
    }

    //
    // Account saving
    //
    @Api()
    @Post('/save')
    async post(req, res) {
        let { pub, sig, domain, time, data, _data } = req.unpackAuthenticated();

        if (_data.length >= 256 * 1024) throw new Error(`Data must be less than 256kb`);

        let db = await getDatabase();

        await db.collection(config.table.accounts)
            .updateOne(
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
                        _data: _data,
                        data: data
                    }
                },
                { upsert: true });

        return res.success();
    }
}