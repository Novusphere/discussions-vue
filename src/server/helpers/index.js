import ecc from "eosjs-ecc";

const CONTENT_TYPE_JSON = 'application/json';
const NO_CACHE = 'no-cache';

function Api() {
    return function (target, name, descriptor) {
        let fn = descriptor.value;
        let newFn = async function (req, res, next) {

            res.success = (result, { cacheControl, contentType } = { contentType: CONTENT_TYPE_JSON, cacheControl: NO_CACHE }) => {
                if (contentType)
                    res.setHeader('Content-Type', contentType);
                if (cacheControl)
                    res.setHeader('Cache-Control', cacheControl);

                if (contentType == CONTENT_TYPE_JSON) {
                    res.send(JSON.stringify({
                        payload: result ? result : true
                    }));
                }
                else {
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

                const recoveredKey = ecc.recover(sig, data);
                if (recoveredKey != pub) {
                    throw new Error(`Recovered key ${recoveredKey} does not match supplied key ${pub}`);
                }

                if (Math.abs(Date.now() - time) > 30000) {
                    throw new Error(`Signature must be within a 30 second threshold, it's possible your system clock is out of sync`);
                }

                if (!domain || domain.length > 32) {
                    throw new Error(`Invalid domain ${domain}`);
                }

                let realData = {};
                Object.assign(realData, defaultObject);
                Object.assign(realData, rest);

                return {
                    pub, sig, time, domain,
                    _data: data,
                    data: realData
                };
            }

            try {
                await fn.apply(target, arguments);
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