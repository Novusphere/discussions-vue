import io from 'socket.io-client';
import { getAPIHost, createSignedBody } from './api';
import { waitFor } from "../utility";
import { Aes } from 'eosjs-ecc';
import Long from 'long';

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
    return subscription;
}

async function decryptDirectMessage(arbitraryKey, friendPublicKey, encryptedBuffer, nonce, checksum) {
    return Aes.decrypt(arbitraryKey, friendPublicKey, nonce, encryptedBuffer, checksum).toString('utf8');
}

async function sendDirectMessage(arbitraryKey, friendPublicKey, textMessage) {
    const { nonce, message, checksum } = Aes.encrypt(arbitraryKey, friendPublicKey, textMessage);
    const dm = await gatewaySend('sendDirectMessage', { nonce: nonce.toString(), message: message.toString('hex'), checksum, friendPublicKey }, { key: arbitraryKey });
    return dm;
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

        socket.on('receiveDirectMessage', (e) => {

            const data = Buffer.from(e.payload.data, "hex");
            const nonce = Long.fromString(e.payload.nonce);
            const detail = { ...e.payload, data, nonce };

            const event = new CustomEvent('receiveDirectMessage', { detail });
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
    decryptDirectMessage,
    sendDirectMessage,
    subscribeAccount
}