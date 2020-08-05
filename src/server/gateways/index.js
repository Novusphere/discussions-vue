import { Api } from "../helpers";
import { accountEvent } from "../events";
import { config, getDatabase } from "../mongo";

const http = require('http');
const socketio = require('socket.io');

let _allClients = {};
let _lastClientId = 1;

class SocketClient {
    constructor(socket) {
        this.$socket = socket;

        this.$state = {
            account: {
                domain: '',
                pub: ''
            }
        };

        this.id = _lastClientId++;
        this.register();
    }

    register() {
        const socket = this.$socket;
        const state = this.$state;
        const onAccountChange = (o) => this.onAccountChange(o, state);

        // connected
        (() => {
            accountEvent.on('change', onAccountChange);

            //console.log(`Socket ${this.id} is connected`);
            _allClients[this.id] = this;
        })();

        socket.on('disconnect', () => {
            accountEvent.off('change', onAccountChange);

            //console.log(`Socket ${this.id} is disconnected`);
            _allClients[this.id];
        });

        socket.on('api', ({ id, method, data }) => {
            //console.log(`api ${JSON.stringify({ id, method, data })}`);
            //console.log(this.$state);

            const dispatch = {
                'ping': this.ping,
                'subscribeAccount': this.subscribeAccount
            };
            const dispatcher = dispatch[method];
            if (dispatcher) {
                const $this = this;
                const req = { body: data };
                const res = {
                    headers: {},
                    setHeader(key, value) {
                        this.headers[key] = value;
                    },
                    send(data) {
                        if (this.headers['Content-Type'] != 'application/json') throw new Error(`Content type ${this.headers['Content-Type']} is not supported`);
                        const { payload, error, message } = JSON.parse(data);
                        $this.send('apiResponse', id, { payload, error, message });
                    }
                };

                //console.log($this);
                dispatcher.apply($this, [req, res]);
            }
        });
    }

    onAccountChange({ pub, domain, sig, time, data }) {
        if (this.$state.account.pub != pub) return;
        if (this.$state.account.domain != domain) return;

        this.send('accountChange', 0, {
            payload: {
                pub,
                domain,
                sig,
                time,
                data
            }
        });
    }

    send(event, id, { payload, error, message }) {
        this.$socket.emit(event, { id, payload, error, message });
    }

    @Api()
    async ping(req, res) {
        const data = req.unpack();
        return res.success({
            pong: data
        });
    }

    @Api()
    async subscribeAccount(req, res) {
        const { pub, domain } = req.unpackAuthenticated();

        const subscription = this.$state.account;
        subscription.pub = pub;
        subscription.domain = domain;

        let db = await getDatabase();
        let document = await db.collection(config.table.accounts)
            .find({
                pub: pub,
                domain: domain
            })
            .limit(1)
            .next();

        if (document)
            this.onAccountChange(document);

        return res.success();
    }
}

async function start(app, port, callback) {
    const server = http.Server(app);
    const io = socketio(server);

    server.listen(port);

    io.on('connect', socket => new SocketClient(socket));

    callback();
}

export default {
    start
}