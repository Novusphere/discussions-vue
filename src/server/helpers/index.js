import ecc from "eosjs-ecc";
import siteConfig from "../site";
import eos from "@/novusphere-js/uid/eos";

const CONTENT_TYPE_JSON = 'application/json';
const NO_CACHE = 'no-cache';

function Api() {
    return function (target, name, descriptor) {
        let fn = descriptor.value;
        let newFn = async function (req, res) {

            res.success = (result, { cacheControl, contentType } = { contentType: CONTENT_TYPE_JSON, cacheControl: NO_CACHE }) => {
                if (cacheControl)
                    res.setHeader('Cache-Control', cacheControl);

                if (contentType == CONTENT_TYPE_JSON) {
                    res.setHeader('Content-Type', CONTENT_TYPE_JSON);
                    res.send(JSON.stringify({
                        payload: result ? result : true
                    }));
                }
                else {
                    res.setHeader('Content-Type', contentType);
                    res.send(result);
                }
            }

            res.error = (err) => {
                res.setHeader('Content-Type', CONTENT_TYPE_JSON);
                res.setHeader('Cache-Control', NO_CACHE);

                res.send(JSON.stringify({
                    error: true,
                    message: err.message
                }));
            }

            req.unpack = (defaultObject = {}) => {
                let unpacked = {};
                Object.assign(unpacked, defaultObject);
                Object.assign(unpacked, req.params);
                Object.assign(unpacked, req.query);
                Object.assign(unpacked, req.body);
                return unpacked;
            }

            req.unpackAuthenticated = (defaultObject) => {
                let { sig, data } = req.unpack();
                //console.log(sig);
                //console.log(data);

                let { pub, time, domain, ...rest } = JSON.parse(data);

                let realData = {};
                Object.assign(realData, defaultObject);
                Object.assign(realData, rest);

                const recoveredKey = ecc.recover(sig, data);
                if (recoveredKey != pub) {
                    console.log(realData);
                    throw new Error(`Recovered key ${recoveredKey} does not match supplied key ${pub}`);
                }

                const clockDelta = Date.now() - time;
                if (Math.abs(clockDelta) > 60000) {
                    console.log(realData);
                    throw new Error(`Signature must be within a 60 second threshold, it's possible your system clock is out of sync, clock delta=${clockDelta}`);
                }

                if (!domain || domain.length > 32) {
                    throw new Error(`Invalid domain ${domain}`);
                }

                return {
                    pub, sig, time, domain,
                    _data: data,
                    data: realData
                };
            }

            try {
                await fn.apply(this, arguments);
            }
            catch (ex) {
                console.log(ex);
                res.error(ex);
            }
        };
        descriptor.value = newFn;
        return descriptor;
    }
}

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
    //const apiTokenInfo = await dfuseClient.getTokenInfo()

    const headers = init.headers;
    //headers["Authorization"] = `Bearer ${apiTokenInfo.token}`;
    headers["X-Eos-Push-Guarantee"] = 'in-block';

    return global.fetch(input, init);
}

async function getEosAPI(chain, endpoint) {
    if (!siteConfig.relay.key) throw new Error(`Relay key has not been configured`);

    let api = undefined;
    if (!chain || chain == 'eos') {

        if (endpoint == 'dfuse') {

            if (!siteConfig.relay.dfuse)
                throw new Error(`Dfuse is not configured`);

            if (!dfuseClient) {

                dfuseClient = createDfuseClient({
                    //apiKey: siteConfig.relay.dfuse,
                    authentication: false,
                    network: "eos.dfuse.eosnation.io",
                });
            }

            api = await eos.getAPI(dfuseClient.endpoints.restUrl, [siteConfig.relay.key], { fetch: dfuseFetch });
        }
        else {
            api = await eos.getAPI(endpoint || eos.DEFAULT_EOS_RPC, [siteConfig.relay.key], { fetch });
        }
    }
    else {
        if (chain == 'telos') {
            api = await eos.getAPI(endpoint || eos.DEFAULT_TELOS_RPC, [siteConfig.relay.key], { fetch });
        }
        else {
            throw new Error(`Unknown chain ${chain}`);
        }
    }


    return api;
}

export {
    Api,
    getEosAPI
}