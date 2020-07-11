import { sleep, waitFor } from "@/novusphere-js/utility";

class MetamaskWallet {
    constructor() {
        this.provider = {
            id: `metamask`
        };
    }
    async connect() {
        if (typeof window.ethereum == "undefined" || typeof window.web3 == "undefined") {
            throw new Error(`Unable to connect to metamask`);
        }

        this.ethereum = window.ethereum;
        this.web3 = window.web3;

        this.ethereum.enable(); // we do not await this since older versions do not throw ex when canceling
        await waitFor(async () => this.web3.eth.accounts.length > 0, 500, 10000,
            `Connecting to metamask has taken too long, try again`);
    }
    async login() {
        await sleep(1000);
        const account = this.web3.eth.accounts[0];
        console.log(`eth login ${account}`);
        this.auth = {
            accountName: '',
            permission: '',
            publicKey: account
        }
    }
    async logout() {
        this.ethereum = null;
        this.web3 = null;
    }
    signArbitrary(msg) {
        if (!this.auth || !this.auth.publicKey)
            throw new Error(`Not logged into Metamask`);

        return new Promise((resolve, reject) => this.web3.currentProvider.sendAsync({
            method: 'personal_sign',
            params: [msg, this.auth.publicKey],
            from: this.auth.publicKey,
        }, function (err, result) {
            if (err) reject(err);
            else resolve(result.result);
        }));
    }
}

function getWalletNames() {
    return [`metamask`];
}

async function connectWallet(name) {
    if (name == `metamask`) {
        const wallet = new MetamaskWallet();
        await wallet.connect();
        await wallet.login();
        return wallet;
    }
    return undefined;
}

export default {
    MetamaskWallet,
    connectWallet,
    getWalletNames
};