import fetch from "node-fetch";
import { getConfig } from "@/novusphere-js/utility";
import eos from "@/novusphere-js/uid/eos";

(async function () {
    const config = await getConfig(`test`);

    const api = await eos.getAPI(undefined, [], { fetch });
    const [balance] = await api.rpc.get_currency_balance('novusphereio', 'asphyxiating', 'ATMOS');
    console.log(balance);

})();