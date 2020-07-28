import { getConfig, saveConfig, sleep } from "@/novusphere-js/utility";
import { setAPIHost } from "@/novusphere-js/discussions/api";
import { getActiveWallets, getAsset } from "@/novusphere-js/uid";
import eos from "@/novusphere-js/uid/eos";

const fetch = require('node-fetch');
global.fetch = fetch;

(async function () {
    try {
        setAPIHost("http://localhost:8008");

        const SLEEP_DURATION = 24 * 60 * 60 * 1000; // 24h how often we do our process loop

        const config = await getConfig('staking1', {
            key: ''
        });

        if (!config.key) throw new Error(`Staking 1.0 key is not configured`);

        for (; ;) {

            let assetMap = {};
            const activeWallets = await getActiveWallets();
            for (const uidw of activeWallets) {
                const asset = await getAsset('ATMOS', uidw);
                assetMap[uidw] = asset;
                await sleep(100);
            }

            let total = Object.values(assetMap).map(a => parseFloat(a)).reduce((a, b) => a + b);
            const payouts = Object.keys(assetMap)
                .map(key => ({ publicKey: key, balance: assetMap[key] }))
                .map(r => ({
                    key: r.publicKey,
                    amount: ((parseFloat(r.balance) / total) * 2740)
                }))
                .filter(r => r.amount >= 0.001)
                .map(r => ({
                    from: `atmosstakerw`,
                    to: `nsuidcntract`,
                    quantity: `${r.amount.toFixed(3)} ATMOS`,
                    memo: r.key,
                }));

            const actions = payouts.map(p => ({
                account: `novusphereio`,
                name: `transfer`,
                data: p,
                authorization: [{
                    actor: `atmosstakerw`,
                    permission: 'active',
                }]
            }));

            const api = await eos.getAPI("https://api.eosn.io", [config.key]);
            const tx = await api.transact({ actions: actions },
                {
                    blocksBehind: 3,
                    expireSeconds: 30,
                });

            console.log(actions.length);
            console.log(tx);

            break;

            console.log(`Resting... ${new Date()}`);
            await sleep(SLEEP_DURATION);
        }
    }
    catch (ex) {
        console.log(ex);
    }

})();