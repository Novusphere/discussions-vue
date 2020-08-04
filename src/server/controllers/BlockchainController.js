import { Controller, Post, Get } from '@decorators/express';
import { Api } from "../helpers";
import { config } from "../mongo";
import siteConfig from "../site";
import eos from "@/novusphere-js/uid/eos";
import axios from 'axios';
import discussionsx from "../services/discussionsx";

// https://docs.dfuse.io/guides/eosio/tutorials/write-chain/
let dfuseClient = undefined;
global.fetch = require('node-fetch');
global.WebSocket = require('ws');
const { createDfuseClient } = require("@dfuse/client");
async function dfuseFetch(input, init) {
    if (init.headers === undefined) {
        init.headers = {}
    }

    // This is highly optimized and cached, so while the token is fresh, this is very fast
    const apiTokenInfo = await dfuseClient.getTokenInfo()

    const headers = init.headers;
    headers["Authorization"] = `Bearer ${apiTokenInfo.token}`;
    headers["X-Eos-Push-Guarantee"] = 'in-block';

    return global.fetch(input, init);
}

export default @Controller('/blockchain') class BlockchainController {
    constructor() {
    }

    async transact(actions) {
        if (!siteConfig.relay.key) throw new Error(`Relay key has not been configured`);

        let api = undefined;
        if (siteConfig.relay.dfuse) {
            if (!dfuseClient) {

                dfuseClient = createDfuseClient({
                    apiKey: siteConfig.relay.dfuse,
                    network: "mainnet.eos.dfuse.io",
                });
            }
            api = await eos.getAPI(dfuseClient.endpoints.restUrl, [siteConfig.relay.key], { fetch: dfuseFetch });
        }
        else {
            api = await eos.getAPI(eos.DEFAULT_EOS_RPC, [siteConfig.relay.key], { fetch });
        }

        const trx = await api.transact({ actions: actions },
            {
                blocksBehind: 3,
                expireSeconds: 30,
            });

        return trx;
    }

    addAuthorizationToActions(actions) {
        return actions.map(a => ({
            ...a,
            authorization: [{
                actor: siteConfig.relay.account,
                permission: siteConfig.relay.permission || 'active',
            }]
        }));
    }

    async getP2K() {
        const { data: { p2k } } = await axios.get('https://raw.githubusercontent.com/Novusphere/discussions-app-settings/master/p2k.json');
        return p2k;
    }

    async makeTransferActions(transferActions) {
        const p2k = await this.getP2K();
        const actions = [];
        for (const data of transferActions) {

            const p2kInfo = p2k.find(t => t.p2k.chain == data.chain);
            const amount = parseFloat(data.amount);
            const fee = parseFloat(data.fee);

            const precision = Math.pow(10, p2kInfo.precision);
            let estFee = (amount * p2kInfo.fee.percent) + p2kInfo.fee.min;
            estFee = Math.floor(estFee * precision) / precision;

            if (amount + fee < p2kInfo.min) throw new Error(`Minimum transfer is ${p2kInfo.min} for ${p2kInfo.symbol}`);
            if (fee < estFee) throw new Error(`Fee paid is ${fee} ${p2kInfo.symbol} expected minimum fee was ${estFee} ${p2kInfo.symbol}`);

            actions.push({
                account: p2kInfo.p2k.contract,
                name: 'transfer',
                data: {
                    chain_id: data.chain, // uint64_t chain_id
                    relayer_account: siteConfig.relay.account, // name relayer_account
                    relayer: siteConfig.relay.pub, // public_key relayer
                    from: data.from, // public_key from  
                    to: data.to, // public_key to
                    amount: data.amount, // asset amount (note: *.hpp differs from *.cpp)
                    fee: data.fee, // asset fee
                    nonce: data.nonce, // uint64_t nonce
                    memo: data.memo, // string memo
                    sig: data.sig // signature sig
                }
            });
        }

        return actions;
    }

    makeVoteAction(data) {

        if (!data || isNaN(data.value) || data.value < -1 || data.value > 1) throw new Error(`Invalid vote value`);

        const action = {
            account: config.contract.discussions,
            name: "vote",
            data: {
                ...data,
                voter: siteConfig.relay.account
            }
        }

        const dsAction = {
            ...action,
            data: {
                ...action.data,
                metadata: JSON.parse(data.metadata)
            }
        };

        if (!discussionsx.verifyVoteSignature(dsAction))
            throw new Error(`Vote signature is not valid`);

        return action;
    }

    makePostAction(data) {

        if (data.content.length > 40 * 1024) throw new Error(`Post content must be less than 40kb`);

        const action = {
            account: config.contract.discussions,
            name: "post",
            data: {
                ...data,
                poster: siteConfig.relay.account
            }
        }

        const dsAction = {
            ...action,
            data: {
                ...action.data,
                metadata: JSON.parse(data.metadata)
            }
        };

        if (!discussionsx.verifyPostSignature(dsAction))
            throw new Error(`Post signature is not valid`);

        return action;
    }

    makeNotifiyAction(notify) {
        if (!notify.name) {
            throw new Error(`Field name must be specified in notify`);
        }

        const action = {
            account: config.contract.discussions,
            name: "notify",
            data: { metadata: JSON.stringify(notify) },
        };
        return action;
    }

    @Api()
    @Post('/post')
    async post(req, res) {
        let { transfers, post, vote, notify } = req.unpack();

        let actions = transfers ? (await this.makeTransferActions(transfers)) : [];
        actions.push(this.makePostAction(post));
        if (vote) actions.push(this.makeVoteAction(vote));
        if (notify) actions.push(this.makeNotifiyAction(notify));

        actions = this.addAuthorizationToActions(actions);

        const trx = await this.transact(actions);

        return res.success(trx);
    }

    @Api()
    @Post('/vote')
    async vote(req, res) {
        const { vote } = req.unpack();

        let actions = [this.makeVoteAction(vote)];
        actions = this.addAuthorizationToActions(actions);

        const trx = await this.transact(actions);

        return res.success(trx);
    }

    @Api()
    @Get('/p2k')
    async p2k(req, res) {
        return res.success(await this.getP2K());
    }

    @Api()
    @Post('/transfer')
    async transfer(req, res) {

        let { transfers, notify } = req.unpack();
        if (!transfers || !Array.isArray(transfers)) throw new Error(`Expected actions to be of type Array`);

        let actions = await this.makeTransferActions(transfers);
        if (notify) actions.push(this.makeNotifiyAction(notify));
        actions = this.addAuthorizationToActions(actions);

        const trx = await this.transact(actions);

        return res.success(trx);
    }
}