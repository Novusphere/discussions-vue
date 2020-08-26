const fetch = require('node-fetch');
global.fetch = fetch;

import { getXNationQuote } from "@/novusphere-js/uid/xnation";

(async function () {
    const from = `asphyxiating`;
    const to = `thisisbancor`;
    const amount = `0.1000 EOS`;
    const details = await getXNationQuote(from, amount, `eosio.token-EOS`, `novusphereio-ATMOS`);

    console.log(details);

})();