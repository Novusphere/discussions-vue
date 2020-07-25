import { Controller, Post, Get } from '@decorators/express';
import { getConfig } from "@/novusphere-js/utility";
import passport from 'passport';
import { Strategy } from 'passport-twitter';
import ecc from 'eosjs-ecc';

import { Api } from "../helpers";
import { config, getDatabase } from "../mongo";
import siteConfig from "../site";

export default @Controller('/account') class AccountController {
    constructor() {
        this.setupPassport();
    }

    async setupPassport() {
        const twitter = await getConfig('twitter', {});
        if (twitter.options) {
            const {
                consumer_key,
                consumer_secret
            } = twitter.options;

            if (consumer_key) {
                const callback = `${siteConfig.url}/v1/api/account/passport/twitter/callback`;
                const options = {
                    consumerKey: consumer_key,
                    consumerSecret: consumer_secret,
                    callbackURL: callback,
                    passReqToCallback: true,
                    state: true
                };
                passport.use(new Strategy(options, this.twitter));
                console.log(`Added twitter passport  ${callback}`);
            }
        }
    }

    async twitter(req, token, tokenSecret, profile, done) {
        const { pub, domain } = JSON.parse(req.session.state);

        const user = {
            token: token,
            secret: tokenSecret,
            username: profile.username
        };

        console.log({ pub, domain });
        console.log(user);

        const db = await getDatabase();
        await db.collection(config.table.accounts).updateOne(
            {
                pub: pub,
                domain: domain
            },
            {
                $set: {
                    "auth.twitter": user
                }
            });

        done(null, {});
    }

    @Get('/passport/:what/redirect')
    async redirect(req, res) {
        const { redirect } = JSON.parse(req.session.state);
        req.logout();
        return res.redirect(redirect);
    }

    @Api()
    @Post('/passport/:what/remove')
    async passportRemove(req, res) {
        const { pub, domain, data } = req.unpackAuthenticated();
        const { what } = req.params;

        const field = {};
        field[`auth.${what}`] = "";

        const db = await getDatabase();
        await db.collection(config.table.accounts).updateOne(
            {
                pub: pub,
                domain: domain
            },
            {
                $unset: field
            });

        return res.success();
    }

    @Get('/passport/:what/callback')
    async passportCallback(req, res, next) {
        const authenticate = passport.authenticate(req.params.what, {
            failureRedirect: `/v1/api/account/passport/${req.params.what}/redirect`,
            successRedirect: `/v1/api/account/passport/${req.params.what}/redirect`,
            session: false
        });

        authenticate(req, res, next);
    }

    @Api()
    @Get('/passport/:what')
    async passport(req, res, next) {
        const { data: { redirect }, pub, domain } = req.unpackAuthenticated();
        const state = { redirect, pub, domain };
        req.session.state = JSON.stringify(state);

        const authenticate = passport.authenticate(req.params.what);
        authenticate(req, res, next);
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

        // verify public key claims integrity
        if (data.publicKeys) {

            // xxxYYY means [YYY] was signed with [xxx]
            const { identityArbitrary, arbitraryWallet } = data.publicKeyProofs;

            if (!identityArbitrary || ecc.recover(identityArbitrary, data.publicKeys.arbitrary) != data.publicKeys.identity)
                throw new Error(`Failed identityArbitrary public key proof`);

            if (!arbitraryWallet || ecc.recover(arbitraryWallet, data.publicKeys.wallet) != data.publicKeys.arbitrary)
                throw new Error(`Failed arbitraryWallet public key proof`);
        }

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