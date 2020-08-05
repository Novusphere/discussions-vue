import io from 'socket.io-client';
import { getAPIHost, createSignedBody } from './api';
import { waitFor } from "../utility";

let _callbacks = {};
let _lastGatewayId = 1;
let $socket = undefined; // NOTE: WARNING: HMR can cause multiple sockets
const $state = {
    identityKey: ''
}

async function subscribeAccount(identityKey) {
    const subscription = await gatewaySend('subscribeAccount', {}, { key: identityKey });
    if (subscription) {
        $state.identityKey = identityKey;
    }
}

function gatewaySend(method, body, { key, domain }) {
    return new Promise((resolve, reject) => {

        (async function () {
            const socket = await getSocket();

            if (key) {
                body = await createSignedBody(key, domain, body);
            }

            const id = _lastGatewayId++;
            const timeout = setTimeout(() => reject(new Error('gatewaySend timeout')), 30000);

            _callbacks[id] = ({ payload, error, message }) => {
                clearTimeout(timeout);
                delete _callbacks[id];

                if (error) return reject(new Error(message));
                return resolve(payload);
            };

            socket.emit('api', { id, method, data: body });
        })();

    });
}

async function getSocket() {
    if (!$socket) {
        const host = await getAPIHost();
        const socket = io(host, {});

        socket.on('apiResponse', ({ id, payload, error, message }) => {
            const callback = _callbacks[id];
            if (callback) callback({ payload, error, message });
        });

        socket.on('accountChange', (e) => {

            const event = new CustomEvent('accountChange', { detail: e });
            window.dispatchEvent(event);

        });

        socket.on('connect', () => {
            if ($state.identityKey) {
                // resubscribe
                subscribeAccount($state.identityKey);
            }
        });

        $socket = socket;
    }

    await waitFor(() => $socket && $socket.connected, 500);
    return $socket;
}

export {
    subscribeAccount
}