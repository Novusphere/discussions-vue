import io from 'socket.io-client';
import { getAPIHost, createSignedBody } from './api';
import { waitFor } from "../utility";
import { Aes } from 'eosjs-ecc';
import Long from 'long';

window._Aes = Aes;
window._Long = Long;
window._Buffer = Buffer;

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

async function decryptDirectMessage(arbitraryKey, friendPublicKey, message, nonce, checksum) {
    const encryptedBuffer = Buffer.from(message, "hex");
    //console.log('decrypt', arbitraryKey, nonce.toString(), encryptedBuffer.toString('hex'), checksum, friendPublicKey);
    return Aes.decrypt(arbitraryKey, friendPublicKey, Long.fromString(nonce), encryptedBuffer, checksum).toString('utf8');
}

async function sendDirectMessage(arbitraryKey, friendPublicKey, textMessage) {
    const { nonce, message, checksum } = Aes.encrypt(arbitraryKey, friendPublicKey, textMessage);
    const nonceStr = nonce.toString();
    const messageStr =  message.toString('hex');
    //console.log('encrypt', arbitraryKey, nonceStr, messageStr, checksum, friendPublicKey);
    const dm = await gatewaySend('sendDirectMessage', { nonce: nonceStr, message: messageStr, checksum, friendPublicKey }, { key: arbitraryKey });
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

            const detail = { ...e.payload };
            //console.log(detail);

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