import { Api, JsonRpc } from 'eosjs'
import { JsSignatureProvider } from 'eosjs/dist/eosjs-jssig';
import { initAccessContext } from 'eos-transit';
import scatter from 'eos-transit-scatter-provider';
import anchor from 'eos-transit-anchorlink-provider';

const GREYMASS_EOS_RPC = 'https://eos.greymass.com';
const EOSCAFE_EOS_RPC = 'https://eos.eoscafeblock.com';
const DEFAULT_EOS_RPC = GREYMASS_EOS_RPC;

async function connectWallet() {
    const accessContext = initAccessContext({
        appName: 'Discussions',
        network: {
            protocol: DEFAULT_EOS_RPC.substring(0, DEFAULT_EOS_RPC.indexOf(':')),
            host: DEFAULT_EOS_RPC.substring(DEFAULT_EOS_RPC.indexOf(':') + 3),
            port: 443,
            chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
        },
        walletProviders: [
            anchor(`discussions`),
            scatter()
        ]
    });

    const walletProviders = accessContext.getWalletProviders();

    for (let i = 0; i < walletProviders.length; i++) {
        const selectedProvider = walletProviders[i];
        try {
            const wallet = accessContext.initWallet(selectedProvider);
            await wallet.connect();
            await wallet.login();
            return wallet;
        }
        catch (ex) {
            console.log(selectedProvider.meta.name, ex);
        }
    }

    throw new Error(`Unable to connect to any EOS wallet`);
}

function getAPI(rpcEndpoint) {
    rpcEndpoint = rpcEndpoint || DEFAULT_EOS_RPC;
    const signatureProvider = new JsSignatureProvider([]);
    const jsonRpc = new JsonRpc(rpcEndpoint);
    const api = new Api({
        rpc: jsonRpc,
        signatureProvider,
        textDecoder: new TextDecoder(),
        textEncoder: new TextEncoder(),
    });
    return api;
}

export default {
    DEFAULT_EOS_RPC,
    GREYMASS_EOS_RPC,
    EOSCAFE_EOS_RPC,
    getAPI,
    connectWallet
}