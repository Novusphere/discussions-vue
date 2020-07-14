function Api({ requireAuth } = {}) {
    return function (target, name, descriptor) {
        let fn = descriptor.value;
        let newFn = async function (req, res, next) {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('content-type', 'application/json');

            res.success = (json) => {
                res.send(JSON.stringify({
                    payload: json ? json : true
                }));
            }

            res.error = (err) => {
                res.send(JSON.stringify({
                    error: true,
                    message: err.message
                }));
            }

            req.unpack = () => {
                let unpacked = {};
                Object.assign(unpacked, req.params);
                Object.assign(unpacked, req.query);
                Object.assign(unpacked, req.body);
                return unpacked;
            }

            try {
                if (requireAuth) {
                    if (!req.query.test) {
                        throw new Error(`Unauthorized`);
                    }
                }

                await fn.apply(target, arguments);
            }
            catch (ex) {
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