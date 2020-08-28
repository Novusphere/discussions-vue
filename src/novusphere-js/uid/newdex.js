import crypto from 'crypto';
import axios from 'axios';

class NewDexAPI {
    constructor(key, secret) {
        this.key = key;
        this.secret = secret;
    }

    async request(endpoint, params = {}) {
        const url = `https://api.newdex.io${endpoint}`;

        params[`api_key`] = this.key;
        params[`timestamp`] = Math.floor(Date.now() / 1000);

        let queryString = Object
            .keys(params)
            .sort()
            .map(k => `${k}=${encodeURIComponent(params[k])}`).join(`&`);

        let hash = crypto
            .createHmac('sha256', this.secret)
            .update(queryString)
            .digest("hex");

        queryString += `&sign=${hash}`;

        const { data: { data } } = await axios.get(`https://api.newdex.io${endpoint}?${queryString}`);
        return data;
    }

    async depth(symbol) {
        return await this.request(`/v1/depth`, {
            symbol
        });
    }

    async commonSymbols() {
        return await this.request(`/v1/common/symbols`);
    }

    async swapDetails(start, targetSymbol, symbols = undefined) {
        const SLIPPAGE_FACTOR = 0.995;
        const [, startSymbol] = start.split(' ');

        function consumeBook(units, isBaseUnit, book) {
            let expect = 0;
            for (const [p, q] of book) {

                const consume = Math.min(q, isBaseUnit ? (units / p) : units);
                units -= isBaseUnit ? (consume * p) : consume;
                expect += isBaseUnit ? consume : (consume * p);

                if (units <= 0) {
                    return { expect, price: String(p) };
                }
            }
            throw new Error(`Insufficient liquidity in orderbooks`); // more details?
        }

        if (!symbols) symbols = await this.commonSymbols();
        if (startSymbol == 'EOS') {
            const market = symbols.find(m => m.currency == targetSymbol);
            const depth = await this.depth(market.symbol);

            const { expect, price } = consumeBook(parseFloat(start), true, depth.asks.reverse());
            return [{
                type: `buy-limit`,
                market,
                price,
                quantity: start,
                expect: `${(expect * SLIPPAGE_FACTOR).toFixed(market.currency_precision)} ${targetSymbol}`
            }];
        }
        else if (targetSymbol == 'EOS') {
            const market = symbols.find(m => m.currency == startSymbol);
            const depth = await this.depth(market.symbol);

            const { expect, price } = consumeBook(parseFloat(start), false, depth.bids);
            return [{
                type: `sell-limit`,
                market,
                price,
                quantity: start,
                expect: `${(expect * SLIPPAGE_FACTOR).toFixed(4)} ${targetSymbol}`
            }];
        }
        else {
            const [hop1] = await this.swapDetails(start, 'EOS', symbols);
            const [hop2] = await this.swapDetails(hop1.expect, targetSymbol, symbols);
            return [hop1, hop2];
        }
    }
}

export {
    NewDexAPI
}