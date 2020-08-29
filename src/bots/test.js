import { getConfig } from "@/novusphere-js/utility";
import { createAsset } from "@/novusphere-js/uid";
import { NewDexAPI } from "@/novusphere-js/uid/newdex";


(async function () {
    const config = await getConfig(`test`);

    const quantity = 100;
    const symbol = `ATMOS`;
    const startSymbol = `BOID`;

    const newdex = new NewDexAPI(config.newdex.key, config.newdex.secret);
    const hops = await newdex.swapDetailsReverse(await createAsset(quantity, symbol), startSymbol);

    console.log(hops);

})();