import { Api, JsonRpc } from 'eosjs'
import { JsSignatureProvider } from 'eosjs/dist/eosjs-jssig';
import { initAccessContext } from 'eos-transit';
import scatter from 'eos-transit-scatter-provider';
import anchor from 'eos-transit-anchorlink-provider';

const GREYMASS_EOS_RPC = 'https://eos.greymass.com';
const EOSCAFE_EOS_RPC = 'https://eos.eoscafeblock.com';
const EOSNATION_EOS_RPC = 'https://api.eosn.io';
const DEFAULT_EOS_RPC = GREYMASS_EOS_RPC;
const DEFAULT_TELOS_RPC = 'https://telos.greymass.com';

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
        scatter(),
        scatter()
    ]
}

function getWalletNames() {
    // NOTE: this should match [ACCESS_CONTEXT_OPTIONS.walletProviders] indexes
    return [`anchor`, `scatter`, `telos`];
}

function makeNetwork(rpc) {
    const network = {
        ...ACCESS_CONTEXT_OPTIONS.network,
        protocol: rpc.substring(0, rpc.indexOf(':')),
        host: rpc.substring(rpc.indexOf(':') + 3)
    };
    return network;
}

async function connectWallet(name) {
    //console.log(name);

    let network = makeNetwork(DEFAULT_EOS_RPC);

    if (name == 'telos') {
        network = makeNetwork(DEFAULT_TELOS_RPC);
        network.chainId = '4667b205c6838ef70ff7988f6e8257e8be0e1284a2f59699054a018f743b1d11';
    }


    const accessContextOptions = {
        ...ACCESS_CONTEXT_OPTIONS,
        network
    }

    const accessContext = initAccessContext(accessContextOptions);

    const walletProviders = accessContext.getWalletProviders();
    const selectedProvider = walletProviders[getWalletNames().findIndex(wn => wn == name)];

    const wallet = accessContext.initWallet(selectedProvider);
    await wallet.connect();
    if (name == 'scatter') {
        await wallet.logout();
    }
    await wallet.login();
    return wallet;
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

async function getAccount(name, { rpcEndpoint, rpcConfig } = {}) {
    const api = await getAPI(rpcEndpoint, undefined, rpcConfig);
    try {
        const account = await api.rpc.get_account(name);
        return account;
    }
    catch (ex) {
        return undefined;
    }
}

export default {
    DEFAULT_EOS_RPC,
    DEFAULT_TELOS_RPC,
    GREYMASS_EOS_RPC,
    EOSNATION_EOS_RPC,
    EOSCAFE_EOS_RPC,
    getWalletNames,
    getAPI,
    connectWallet,
    getAccount
}