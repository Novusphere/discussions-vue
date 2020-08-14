import ecc from "eosjs-ecc";

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
                if (Math.abs(clockDelta) > 30000) {
                    throw new Error(`Signature must be within a 30 second threshold, it's possible your system clock is out of sync, clock delta=${clockDelta}`);
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

export {
    Api
}