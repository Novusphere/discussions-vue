
import { listen } from 'socket.io';
import SearchController from '../controllers/SearchController';

class SocketClient {
    constructor(socket) {
        this.$socket = socket;
        this.$state = {};

        socket.on('api', ({ id, method, data }) => {
            if (method == '/search/posts') {
                this.searchPosts(id, data);
            }
        });
    }

    wrap(id, data) {
        const _this = this;

        const req = {
            body: data
        };

        const res = {
            header: {},
            emit: ((state) => {
                this.$state = { ...this.$state, ...state };
            }),
            setHeader: function (name, value) {
                this.header[name] = value;
            },
            send: function (payload) {
                if (this.header['Content-Type'] == 'application/json') {
                    const json = JSON.parse(payload);
                    _this.send(id, { payload: json });
                }
                else {
                    console.log(`not json`);
                }

                this.header = {};
            }
        };

        return { req, res };
    }

    send(id, { payload, error, message }) {
        $socket.emit('apiResponse', { id, payload, error, message });
    }

    searchPosts(id, data) {
        const { req, res } = this.wrap(id, data);
        const searchController = new SearchController();
        searchController.searchPosts(req, res);
    }
}

async function start(port) {
    return;
    
    const io = listen(port);
    io.on('connect', socket => new SocketClient(socket));
}

export default {
    start
}