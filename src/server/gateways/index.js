import { Api } from "../helpers";
import { accountEvent } from "../events";
import { config, getDatabase } from "../mongo";

const http = require('http');
const socketio = require('socket.io');

let _allClients = {};
let _lastClientId = 1;

function getAllClients() {
    return Object.values(_allClients);
}

class SocketClient {
    constructor(socket) {
        this.$socket = socket;

        this.$state = {
            account: {
                domain: '',
                pub: '',
                arbitraryPub: ''
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
            delete _allClients[this.id];
        });

        socket.on('api', ({ id, method, data }) => {
            //console.log(`api ${JSON.stringify({ id, method, data })}`);
            //console.log(this.$state);

            const dispatch = {
                'ping': this.ping,
                'subscribeAccount': this.subscribeAccount,
                'sendDirectMessage': this.sendDirectMessage
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

    onAccountChange(document) {
        const { pub, domain, time, data, followingUsers, subscribedTags } = document;

        if (this.$state.account.pub != pub) return;
        if (this.$state.account.domain != domain) return;


        if (data && data.publicKeys) {
            this.$state.account.arbitraryPub = data.publicKeys.arbitrary;
        }

        this.send('accountChange', 0, {
            payload: {
                pub,
                domain,
                time,
                data,
                followingUsers,
                subscribedTags
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

        const db = await getDatabase();
        const document = await db.collection(config.table.accounts)
            .find({
                pub: pub,
                domain: domain
            })
            .limit(1)
            .next();

        const subscription = this.$state.account;
        subscription.pub = pub;
        subscription.domain = domain;

        if (document) {
            if (document.data && document.data.publicKeys) {
                subscription.arbitraryPub = document.data.publicKeys.arbitrary;
            }
            this.onAccountChange(document);
        }

        return res.success();
    }

    @Api()
    async sendDirectMessage(req, res) {
        const { pub, data } = req.unpackAuthenticated();
        if (pub != this.$state.account.arbitraryPub) return; // unexpected pub

        const outgoing = {
            time: Date.now(),
            senderPublicKey: pub,
            friendPublicKey: data.friendPublicKey,
            nonce: data.nonce,
            data: data.message,
            checksum: data.checksum
        };

        const db = await getDatabase();
        await db.collection(config.table.directmsgs)
            .insertOne(outgoing);

        const onlineClients = getAllClients()
        .filter(({ $state }) =>
            $state.account.arbitraryPub == data.friendPublicKey ||
            $state.account.arbitraryPub == pub);

        for (const client of onlineClients) {
            client.send('receiveDirectMessage', 0, {
                payload: outgoing
            });
        }

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