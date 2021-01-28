import { Controller, Post, Get } from '@decorators/express';
import { getConfig } from "@/novusphere-js/utility";
import passport from 'passport';
import { Strategy } from 'passport-twitter';
import ecc from 'eosjs-ecc';

import { Api } from "../helpers";
import { config, getDatabase } from "../mongo";
import siteConfig from "../site";
import { accountEvent } from "../events";

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
        let identityPub = null;

        const user = {
            token: token,
            secret: tokenSecret,
            username: profile.username
        };

        //console.log({ pub, domain });
        //console.log(user);

        if (pub) {
            const { value: account } = await db.collection(config.table.accounts).findOneAndUpdate(
                {
                    pub: pub,
                    domain: domain
                },
                {
                    $set: {
                        "auth.twitter": user
                    }
                });

            if (account) {
                identityPub = account.data.publicKeys.arbitrary;
            }
        }

        // maybe use id over username? ...but doing this for backwards compatability for now...
        const db = await getDatabase();
        const { value: oauth } = await db.collection(config.table.oauths).findOneAndUpdate(
            { provider: 'twitter', id: String(profile.username) },
            {
                $setOnInsert: { provider: 'twitter', id: String(profile.username) },
                $set: {
                    token,
                    tokenSecret,
                    profile
                },
                $addToSet: {
                    pubs: { $each: (identityPub) ? [identityPub] : [] }
                }
            },
            { upsert: true, returnOriginal: false }
        );

        req.session.state = JSON.stringify({
            ...JSON.parse(req.session.state),
            provider: 'twitter',
            id: String(profile.username),
            pubs: oauth.pubs.join(',')
        });

        done(null, {});
    }

    @Get('/passport/:what/redirect')
    async redirect(req, res) {
        const { redirect, provider, id, pubs } = JSON.parse(req.session.state);
        req.logout();
        return res.redirect(redirect + `?provider=${provider}&id=${id}&pubs=${pubs}`);
    }

    @Api()
    @Post('/passport/:what/remove')
    async passportRemove(req, res) {
        const { pub, domain } = req.unpackAuthenticated();
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
        try {
            const { data: { redirect }, pub, domain } = req.unpackAuthenticated();
            const state = { redirect, pub, domain };
            req.session.state = JSON.stringify(state);
        }
        catch (ex) { // unauthenticated
            const { redirect, domain } = req.unpack();
            const state = { redirect, domain };
            req.session.state = JSON.stringify(state);
        }

        const authenticate = passport.authenticate(req.params.what);
        authenticate(req, res, next);
    }

    @Api()
    @Post('/block')
    async blockUser(req, res) {
        const { pub, domain, data } = req.unpackAuthenticated();
        const { displayName, user, nameTime, value } = data;

        //console.log(displayName, user, nameTime, value);

        let db = await getDatabase();

        await db.collection(config.table.accounts)
            .updateOne({ pub: pub, domain: domain },
                {
                    $pull: { blockedUsers: { pub: user } },
                    //$push: { blockedUsers: { displayName, pub: user, nameTime } },
                });

        if (value) {
            // block
            await db.collection(config.table.accounts)
                .updateOne({ pub: pub, domain: domain },
                    {
                        //$pull: { blockedUsers: { pub: user } },
                        $push: { blockedUsers: { displayName, pub: user, nameTime } },
                    });
        }

        return res.success();
    }

    @Api()
    @Post('/linkexternal')
    async linkExternal(req, res) {
        const { pub, domain, data } = req.unpackAuthenticated();
        const { externalName, externalValue } = data;

        let db = await getDatabase();

        if (externalName && externalValue) {
            await db.collection(config.table.accounts)
                .updateOne({ pub: pub, domain: domain },
                    {
                        $pull: { external: { name: externalName, value: externalValue } },
                    });

            await db.collection(config.table.accounts)
                .updateOne({ pub: pub, domain: domain },
                    {
                        $push: { external: { name: externalName, value: externalValue } },
                    });
        }

        return res.success({ name: externalName, value: externalValue });
    }

    @Api()
    @Post('/follow')
    async followUser(req, res) {
        const { pub, domain, data } = req.unpackAuthenticated();
        const { displayName, user, uidw, nameTime, value } = data;

        let db = await getDatabase();

        await db.collection(config.table.accounts)
            .updateOne({ pub: pub, domain: domain },
                {
                    $pull: { followingUsers: { pub: user } },
                    //$push: { followingUsers: { displayName, pub: user, uidw, nameTime } },
                });

        if (value) {
            // follow
            await db.collection(config.table.accounts)
                .updateOne({ pub: pub, domain: domain },
                    {
                        //$pull: { followingUsers: { pub: user } },
                        $push: { followingUsers: { displayName, pub: user, uidw, nameTime } },
                    });
        }

        return res.success();
    }


    @Api()
    @Post('/orienttag')
    async orientTag(req, res) {
        const { pub, time, domain, data: { tag, up } } = req.unpackAuthenticated();
        const db = await getDatabase();

        const state = await db.collection(config.table.accounts)
            .findOne({ pub: pub, domain: domain });

        if (!state) throw new Error(`Account not found`);

        // verbatim from vuex.js::orientTag

        let i = state.subscribedTags.indexOf(tag);
        if (i == -1) return;
        if (i == 0 && up) return;
        if (i == (state.subscribedTags.length - 1) && !up) return;

        state.subscribedTags.splice(i, 1); // remove it
        state.subscribedTags.splice(up ? i - 1 : i + 1, 0, tag);

        await db.collection(config.table.accounts)
            .updateOne({ pub: pub, domain: domain },
                { $set: { subscribedTags: state.subscribedTags } });

        return res.success();
    }

    @Api()
    @Post('/subscribe')
    async subscribeTag(req, res) {
        const { pub, time, domain, data: { tag, value } } = req.unpackAuthenticated();
        const db = await getDatabase();

        await db.collection(config.table.accounts)
            .updateOne({ pub: pub, domain: domain },
                {
                    $pull: { subscribedTags: tag },
                    //$push: { subscribedTags: tag },
                });

        if (value) {
            // subscribe
            await db.collection(config.table.accounts)
                .updateOne({ pub: pub, domain: domain },
                    {
                        //$pull: { subscribedTags: tag },
                        $push: { subscribedTags: tag },
                    });
        }

        return res.success();
    }

    @Api()
    @Post('/getdrafts')
    async getDrafts(req, res) {
        let { pub, domain } = req.unpackAuthenticated();

        let db = await getDatabase();
        let document = await db.collection(config.table.accounts)
            .find({
                pub: pub,
                domain: domain
            })
            .limit(1)
            .next();

        if (document && document.drafts) {
            return res.success(document.drafts);
        }

        return res.success([]);
    }

    @Api()
    @Post('/savedrafts')
    async saveDrafts(req, res) {
        let { pub, domain, data: { drafts }, _data } = req.unpackAuthenticated();

        if (_data.length >= 256 * 1024) throw new Error(`Data must be less than 256kb`);
        if (!drafts || !Array.isArray(drafts)) throw new Error(`Expected drafts to be an array`);

        let db = await getDatabase();

        await db.collection(config.table.accounts)
            .updateOne(
                {
                    pub: pub,
                    domain: domain
                },
                {
                    $set: {
                        drafts: drafts
                    }
                });

        return res.success();
    }

    @Api()
    @Post('/grantoauth')
    async grantOAuth(req, res) {
        let { pub, data: { provider, id } } = req.unpackAuthenticated(); 

        //console.log(provider, id, pub);

        const db = await getDatabase();
        await db.collection(config.table.oauths).updateOne(
            { provider: provider, id: id },
            {
                $addToSet: {
                    pubs: pub
                }
            },
        );

        return res.success();
    }

    //
    // Account retrieval
    //
    @Api()
    @Post('/get')
    async getUser(req, res) {
        let { pub, domain, data: { encryptedBrainKey } } = req.unpackAuthenticated();

        const time = Date.now();
        let db = await getDatabase();
        let document = await db.collection(config.table.accounts)
            .findOneAndUpdate(
                { pub, domain },
                {
                    $setOnInsert: {
                        pub: pub,
                        domain: domain,
                        drafts: [],
                        followingUsers: [],
                        subscribedTags: [],
                        blockedUsers: [],
                        createdAt: time
                    },
                    $set: {
                        lastActive: time,
                        encryptedBrainKey: encryptedBrainKey
                    }
                },
                {
                    upsert: true,
                    returnOriginal: false
                });

        if (!document || !document.value) {
            throw new Error(`Account not found`);
        }

        return res.success(document.value);
    }

    //
    // Account saving
    //
    @Api()
    @Post('/save')
    async saveUser(req, res) {
        let { pub, domain, time, data, _data } = req.unpackAuthenticated();

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

        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '';
        const db = await getDatabase();
        const document = await db.collection(config.table.accounts)
            .findOneAndUpdate(
                {
                    pub: pub,
                    domain: domain
                },
                {
                    $setOnInsert: {
                        pub: pub,
                        domain: domain,
                        drafts: [],
                        followingUsers: [],
                        subscribedTags: [],
                        blockedUsers: [],
                        createdAt: time
                    },
                    $set: {
                        lastActive: time,
                        time: time,
                        data: data,
                        ip: ip
                    }
                },
                {
                    upsert: true,
                    returnOriginal: false
                });

        accountEvent.emit('change', document.value);

        return res.success();
    }
}