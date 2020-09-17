import fetch from "node-fetch";
import { getConfig } from "@/novusphere-js/utility";
import eos from "@/novusphere-js/uid/eos";

(async function () {
    const config = await getConfig(`test`);

    console.log(await eos.getAccount('bob', { rpcConfig: { fetch } }));
    console.log(await eos.getAccount('asphyxiating', { rpcConfig: { fetch } }));

})();