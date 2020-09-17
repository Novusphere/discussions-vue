import fetch from "node-fetch";
import { getConfig } from "@/novusphere-js/utility";
import { getMarketCaps } from "@/novusphere-js/uid";

(async function () {
    const config = await getConfig(`test`);

    console.log((await getMarketCaps())['ATMOS']);

})();