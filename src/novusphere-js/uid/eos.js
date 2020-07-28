import { Api, JsonRpc } from 'eosjs'
import { JsSignatureProvider } from 'eosjs/dist/eosjs-jssig';
import { initAccessContext } from 'eos-transit';
import scatter from 'eos-transit-scatter-provider';
import anchor from 'eos-transit-anchorlink-provider';

const GREYMASS_EOS_RPC = 'https://eos.greymass.com';
const EOSCAFE_EOS_RPC = 'https://eos.eoscafeblock.com';
const EOSNATION_EOS_RPC = 'https://api.eosn.io';
const DEFAULT_EOS_RPC = GREYMASS_EOS_RPC;
const ACCESS_CONTEXT_OPTIONS = {
    appName: 'Discussions',
    network: {
        protocol: '',
        host: '',
        port: 443,
        chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
    },
    walletProviders: [
        anchor(`discussions`),
        scatter()
    ]
}

function getWalletNames() {
    // NOTE: this should match [ACCESS_CONTEXT_OPTIONS.walletProviders] indexes
    return [`anchor`, `scatter`]
}

async function connectWallet(name) {
    const accessContextOptions = {
        ...ACCESS_CONTEXT_OPTIONS,
        network: {
            ...ACCESS_CONTEXT_OPTIONS.network,
            protocol: DEFAULT_EOS_RPC.substring(0, DEFAULT_EOS_RPC.indexOf(':')),
            host: DEFAULT_EOS_RPC.substring(DEFAULT_EOS_RPC.indexOf(':') + 3)
        }
    }

    const accessContext = initAccessContext(accessContextOptions);

    const walletProviders = accessContext.getWalletProviders();
    const selectedProvider = walletProviders[getWalletNames().findIndex(wn => wn == name)];

    //try {
    const wallet = accessContext.initWallet(selectedProvider);
    await wallet.connect();
    await wallet.login();
    return wallet;
    //}
    //catch (ex) {
    //    console.log(selectedProvider.meta.name, ex);
    //}

    //throw new Error(`Unable to connect to any EOS wallet`);
}

async function getAPI(rpcEndpoint, keys = [], rpcConfig = {}) {
    rpcEndpoint = rpcEndpoint || DEFAULT_EOS_RPC;
    const signatureProvider = new JsSignatureProvider(keys);    
    const jsonRpc = new JsonRpc(rpcEndpoint, rpcConfig);
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
    EOSNATION_EOS_RPC,
    EOSCAFE_EOS_RPC,
    getWalletNames,
    getAPI,
    connectWallet
}