import { Controller, Post, Get, All } from '@decorators/express';
import ecc from 'eosjs-ecc';
import { Api } from "../helpers";
import { config } from "../mongo";
import siteConfig from "../site";
import eos from "@/novusphere-js/uid/eos";
import { getXNationQuote } from "@/novusphere-js/uid/xnation";
import { NewDexAPI } from "@/novusphere-js/uid/newdex";
import axios from 'axios';
import discussionsx from "../services/discussionsx";
import { getFromCache } from '@/novusphere-js/utility';

const cache = {};

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

    async getEosAPI() {
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
        return api;
    }

    async transact(actions) {

        let api = await this.getEosAPI();

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
        return await getFromCache(cache, 'p2k', async () => {
            const { data: { p2k } } = await axios.get('https://raw.githubusercontent.com/Novusphere/discussions-app-settings/master/p2k.json');
            // sort alphabetically
            const tokens = p2k.sort((p1, p2) => p1.symbol.localeCompare(p2.symbol));
            return tokens;
        });
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
    @Post('/getasset')
    async getAsset(req, res) {
        const { symbol, address, zero } = req.unpack();
        let balance = undefined;

        try {

            const p2k = await this.getP2K();
            const token = p2k.find(t => t.symbol == symbol);
            if (token) {
                const api = await this.getEosAPI();
                const bound = `0x${ecc.sha256(ecc.PublicKey.fromString(address).toBuffer(), 'hex')}`;
                const balances = await api.rpc.get_table_rows({
                    json: true,
                    code: token.p2k.contract,
                    scope: token.p2k.chain,
                    table: 'accounts',
                    limit: 100,
                    key_type: 'i256',
                    lower_bound: bound,
                    upper_bound: bound,
                    index_position: 2,
                });

                if (balances.rows && balances.rows.length > 0) {
                    balance = balances.rows[0].balance;
                    cache[`${address}::${symbol}`] = balance;
                }
            }

        }
        catch (ex) {
            console.log(ex);
            // fall back to our cache if the BP endpoint fails...
            balance = cache[`${address}::${symbol}`];
        }

        //console.log(symbol, address, zero, balance);

        return res.success(balance || zero);
    }

    @Api()
    @Get('/p2k')
    async p2k(req, res) {
        return res.success(await this.getP2K());
    }

    async _sweepRelay(tokens) {
        const api = await this.getEosAPI();
        let actions = [];

        for (const { contract, symbol } of tokens) {
            const [balance] = await api.rpc.get_currency_balance(contract, siteConfig.relay.account, symbol);
            if (!balance) continue;
            if (!parseFloat(balance)) continue;

            actions.push({
                account: contract,
                name: `transfer`,
                data: {
                    from: siteConfig.relay.account,
                    to: `nsuidcntract`, // TO-DO: don't hard code? do p2k lookup
                    quantity: balance,
                    memo: siteConfig.relay.pub // deposit for our relay pub
                }
            });
        }

        actions = this.addAuthorizationToActions(actions);

        await this.transact(actions);
    }

    @Api()
    @Post('/newdexswap')
    async newdexSwap(req, res) {
        const { transfers, from, expect, createAccount } = req.unpack();
        const [, toAsset] = expect.split(' ');

        if (!transfers || !Array.isArray(transfers)) throw new Error(`Expected actions to be of type Array`);

        if (transfers.length != 1 || transfers[0].to != 'EOS1111111111111111111111111111111114T1Anm' || !transfers[0].memo.startsWith(siteConfig.relay.account))
            throw new Error(`Expected one transfer action withdrawal to relay account`);

        const newdex = new NewDexAPI(siteConfig.newdex.key, siteConfig.newdex.secret);
        const hops = await newdex.swapDetails(transfers[0].amount, toAsset);
        const lastHop = hops[hops.length - 1];

        //console.log(transfers[0]);
        //console.log(hops);

        if (parseFloat(lastHop.expect) < parseFloat(expect)) {
            throw new Error(`Last hop expect was ${lastHop.expect} under the quote ${expect}, try refreshing your quote and try again`);
        }

        let actions = await this.makeTransferActions(transfers);
        let tokens = [{ contract: 'eosio.token', symbol: 'EOS' }];

        // send the hops to newdex, these are effectively FILL-OR-KILL orders
        for (const hop of hops) {
            tokens.push({
                contract: hop.market.contract,
                symbol: hop.market.symbol.split('-')[1].toUpperCase()
            });

            actions.push({
                account: hop.type.startsWith('sell') ? hop.market.contract : 'eosio.token',
                name: `transfer`,
                data: {
                    from: siteConfig.relay.account,
                    to: `newdexpublic`,
                    quantity: hop.quantity,
                    memo: JSON.stringify({
                        "type": hop.type,
                        "symbol": hop.market.symbol,
                        "price": hop.price,
                        "channel": "API"
                    })
                }
            });
        }

        if (createAccount) {
            if (lastHop.type.startsWith('buy'))
                throw new Error(`Account creation is specified but last hop is a buy`);

            actions.push({
                account: 'eosio.token',
                name: `transfer`,
                data: {
                    from: siteConfig.relay.account,
                    to: 'signupeoseos',
                    quantity: expect, // the minimum
                    memo: createAccount
                }
            });
        }
        else {
            actions.push({
                account: lastHop.type.startsWith('buy') ? lastHop.market.contract : 'eosio.token',
                name: `transfer`,
                data: {
                    from: siteConfig.relay.account,
                    to: actions[0].account, // nsuidcntract
                    quantity: expect, // the minimum
                    memo: transfers[0].from // redeposit back to this public key
                }
            });
        }

        actions = this.addAuthorizationToActions(actions);

        //console.log(createAccount);
        //console.log(actions);

        //const trx = { transaction_id: "5f2f829d6a35279ed7cf373f8ee3667bbc86cec39375a4b3b5cc86b1a9c233b7" }; 
        const trx = await this.transact(actions);

        // don't await this
        this._sweepRelay(tokens);

        return res.success(trx);
    }

    @Api()
    @All('/newdexquote')
    async newdexQuote(req, res) {
        const { from, to, reverse } = req.unpack();
        const newdex = new NewDexAPI(siteConfig.newdex.key, siteConfig.newdex.secret);
        const hops = reverse ? await newdex.swapDetailsReverse(to, from) : await newdex.swapDetails(from, to);
        return res.success(hops);
    }

    @Api()
    @All('/xnationquote')
    async xnationQuote(req, res) {
        const { from, amount, fromId, toId } = req.unpack();
        const quote = await getXNationQuote(from, amount, fromId, toId);
        return res.success(quote);
    }

    @Api()
    @Post('/transfer')
    async transfer(req, res) {

        let { transfers, notify } = req.unpack();
        if (!transfers || !Array.isArray(transfers)) throw new Error(`Expected actions to be of type Array`);

        let actions = await this.makeTransferActions(transfers);
        if (notify) {
            if (Array.isArray(notify))
                actions.push(...notify.map(n => this.makeNotifiyAction(n)));
            else
                actions.push(this.makeNotifiyAction(notify));
        }
        actions = this.addAuthorizationToActions(actions);

        //const trx = { transaction_id: "5f2f829d6a35279ed7cf373f8ee3667bbc86cec39375a4b3b5cc86b1a9c233b7" }; 
        const trx = await this.transact(actions);

        return res.success(trx);
    }
}