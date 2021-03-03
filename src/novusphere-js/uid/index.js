import Joi from "@hapi/joi";
import * as ecc from 'eosjs-ecc';
import * as aesjs from 'aes-js';
import * as bip39 from 'bip39';
import * as bip32 from 'bip32';
import { spawn, Worker } from "threads";
import { apiRequest } from "@/novusphere-js/discussions/api";
import { getFromCache } from "@/novusphere-js/utility";

import { TransactionSearchQuery } from "./TransactionSearchQuery";
import BufferWriter from './bufferwriter';
import eos from "./eos";
import bch from "./bch";
import eth from "./eth";

let eccWorker = undefined;
if (typeof window != "undefined") {
    spawn(new Worker("./workers/ecc")).then((ew) => eccWorker = ew);
}

let cache = {};

function encrypt(data, password) {
    const key = aesjs.utils.hex.toBytes(ecc.sha256(password));
    const textBytes = aesjs.utils.utf8.toBytes(data);
    const aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(5));
    const encryptedBytes = aesCtr.encrypt(textBytes);
    const encryptedHex = aesjs.utils.hex.fromBytes(encryptedBytes);
    return encryptedHex;
}

function decrypt(data, password) {
    const key = aesjs.utils.hex.toBytes(ecc.sha256(password));
    const aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(5));
    const encryptedBytes = aesjs.utils.hex.toBytes(data);
    const decryptedBytes = aesCtr.decrypt(encryptedBytes);
    const decryptedText = aesjs.utils.utf8.fromBytes(decryptedBytes);
    return decryptedText;
}

function searchTransactions(pub, type) {
    type = (type || 'all').toLowerCase();
    let pipeline = [];

    if (type == 'sent') {
        pipeline.push({
            $match: {
                name: "transfer",
                "data.from": pub
            }
        });
    }
    else if (type == 'received') {
        pipeline.push({
            $match: {
                name: "transfer",
                $or: [
                    { "data.to": pub },
                    { "data.memo": pub } // for deposits
                ]
            }
        });
    }
    else //if (type == 'all') {
        pipeline.push({
            $match: {
                name: "transfer",
                $or: [
                    { "data.to": pub },
                    { "data.from": pub },
                    { "data.memo": pub } // for deposits
                ]
            }
        });

    pipeline.push({
        $project: {
            "id": "$id",
            "time": "$time",
            "transaction": "$transaction",
            "data": "$data",
        }
    });
    pipeline.push({
        $sort: {
            "time": -1, // descending
        }
    });

    return new TransactionSearchQuery({ pipeline });
}

async function getActiveWallets() {
    return await apiRequest(`/v1/api/data/active48h`);
}

function generateBrainKey() {
    return bip39.generateMnemonic()
}

function isValidBrainKey(brainKey) {
    return bip39.validateMnemonic(brainKey.trim());
}

function findInvalidBrainKeyWord(brainKey) {
    const words = brainKey.trim().split(' ');
    const wordlist = bip39.wordlists.english;

    for (const word of words) {
        if (!wordlist.some(w => word == w)) {
            return word;
        }
    }

    return undefined;
}

async function brainKeyFromHash(hash256) {
    const mnemonic = bip39.entropyToMnemonic(hash256);
    return mnemonic;
}

async function brainKeyToKeys(brainKey) {
    const seed = await bip39.mnemonicToSeed(brainKey.trim());
    const node = await bip32.fromSeed(seed);

    function getKeyAt(index) {
        // m/44'/0'/0' = read.cash
        let child = node.derivePath(`m/80'/0'/0'/${index}`);
        const wif = ecc.PrivateKey(child.privateKey).toWif();
        return {
            key: wif,
            pub: ecc.privateToPublic(wif),
        }
    }

    return {
        arbitrary: getKeyAt(0),
        wallet: getKeyAt(1),
        identity: getKeyAt(2)
    }
}

/*function publicKeyToBitcoinAddress(publicKey) {
    const buffer = ecc.PublicKey.fromString(publicKey).toBuffer();
    const keyPair = bitbox.ECPair.fromPublicKey(buffer);
    const address = bitbox.ECPair.toLegacyAddress(keyPair);
    return address;
}

function publicKeyToCashAddress(publicKey) {
    const btc = publicKeyToBitcoinAddress(publicKey);
    return bitbox.Address.toCashAddress(btc);
}*/

function getTokenAddress(token, publicKey) {
    //if (token.chain.name == 'BTC') return publicKeyToBitcoinAddress(publicKey);
    //else if (token.chain.name == 'BCH') return publicKeyToCashAddress(publicKey);

    return publicKey;
}

//
// Get token info for a given symbol, throws an exception if not found
//
async function getToken(symbol) {
    symbol = symbol.toUpperCase();

    if (symbol == 'TELOS') {
        symbol = 'TLOS';
    }

    const eosTokensInfo = await getTokensInfo();
    const token = eosTokensInfo.find(t => t.symbol == symbol);
    if (!token) throw new Error(`Symbol "${symbol}" was not found in Unified ID tokens`);
    return token;
}

//
// Get token info for a given chain_id, throws an exception if not found
//
async function getTokenForChain(chain) {
    const eosTokensInfo = await getTokensInfo();
    const token = eosTokensInfo.find(t => t.p2k.chain == chain);
    if (!token) throw new Error(`Chain "${chain}" was not found in Unified ID tokens`);
    return token;
}

//
// Get the chain id of a given token supported by Unified ID
//
async function getChainForSymbol(symbol) {
    return (await getToken(symbol)).p2k.chain;
}

//
// Gets the fee for an asset transfer
//
async function getFeeForAmount(amountAsset) {
    const [quantity, symbol] = amountAsset.split(' ');
    const token = await getToken(symbol);
    const quantityFee = (quantity * token.fee.percent) + token.fee.flat;
    return await createAsset(quantityFee, symbol);
}

//
// Gets the fee and subtracts it from the total to produce both the fee and amount assets
//
async function getAmountFeeAssetsForTotal(totalAsset) {
    const [totalQuantity, totalSymbol] = totalAsset.split(' ');
    const token = await getToken(totalSymbol);

    const amountAsset = await createAsset((totalQuantity - token.fee.flat) / (1 + token.fee.percent), totalSymbol);
    const feeAsset = await createAsset(totalQuantity - parseFloat(amountAsset), totalSymbol);

    return { amountAsset, feeAsset, totalAsset };
}

//
// Get all tokens info supported by Unified ID
//
async function getTokensInfo() {
    const eosTokensInfo = await getFromCache(cache, 'eosTokensInfo', async () => {
        return apiRequest(`/v1/api/blockchain/p2k`);
    });

    //console.log(eosTokensInfo);

    return [...eosTokensInfo];
}
//
// Get all symbols supported by Unified ID
//
async function getSymbols() {
    const eosTokensInfo = await getTokensInfo();
    return [...eosTokensInfo.map(t => t.symbol)];
}

function isValidAsset(asset) {
    if (!asset) return false;
    const [amount, symbol] = asset.split(' ');
    if (isNaN(amount)) return false;
    if (!symbol) return false;
    if (parseFloat(amount) < 0) return false;

    return true;
}

//
// Gets an asset for an address (or public key depending on the asset type)
// Returns a string with the balance followed by the symbol
//
async function getAsset(symbol, address) {
    // 9/5/2020 -- use server side endpoint since BP endpoint is unreliable
    return await apiRequest('/v1/api/blockchain/getasset', {
        symbol,
        address,
        zero: await createAsset(0, symbol)
    });
}

//
// Create a withdraw transfer action
//
function withdrawAction({ chain, senderPrivateKey, account, amount, fee, nonce, memo }) {
    return {
        chain: chain,
        senderPrivateKey: senderPrivateKey,
        recipientPublicKey: `EOS1111111111111111111111111111111114T1Anm`,
        amount: amount,
        fee: fee,
        nonce: nonce,
        _memo: `${account}:${memo || ''}` // needs to use legacy memo field
    };
}

//
// Create artifical tip objects from transfer actions
//
async function createArtificalTips(from, transaction, transferActions) {
    let artificalTips = (transferActions || []).map(t => ({
        transaction: transaction,
        data: {
            amount: t.amount,
            chain_id: t.chain,
            fee: t.fee,
            from: from,
            memo: t.memo,
            nonce: t.nonce,
            relayer: "",
            relayer_account: "",
            sig: "",
            to: t.recipientPublicKey
        }
    }));

    return artificalTips;
}

//
// Create transfer actions
//
async function createTransferActions(actions, progressCallback) {
    const schema = Joi.object(
        {
            actions: Joi.array().items(Joi.object({
                chain: Joi.number().required(),
                senderPrivateKey: Joi.string().required(),
                recipientPublicKey: Joi.string().required(),
                amount: Joi.string().required(),
                fee: Joi.string().required(),
                nonce: Joi.number().required(),
                memo: Joi.string(),
                metadata: Joi.string()
            }))
        });


    schema.validate({ actions });

    let transfers = [];
    const nonce = Date.now();
    let nTx = 0;

    for (let {
        chain,
        senderPrivateKey,
        recipientPublicKey,
        amount,
        fee,
        //nonce,
        _memo, // legacy support for memo
        memo,
        metadata
    } of actions) {

        const senderPublicKey = ecc.privateToPublic(senderPrivateKey);

        let body = new BufferWriter();
        body.writeUInt64(chain);
        body.writePublicKey(senderPublicKey, 'EOS');
        body.writePublicKey(recipientPublicKey, 'EOS');
        body.writeAsset(amount);
        body.writeAsset(fee);
        body.writeUInt64(nonce + nTx);
        body.writeString(_memo || ''); // DEPRECATED: memo

        const bodyBuffer = body.toBuffer();

        let header = new BufferWriter();
        header.writeByte(0x03); // version
        header.writeByte(bodyBuffer.length + 2); // length

        const headerBuffer = header.toBuffer();

        let trx = new BufferWriter();
        trx.write(headerBuffer);
        trx.write(bodyBuffer);

        const trxBuffer = trx.toBuffer();
        const signature = await signHash(ecc.sha256(trxBuffer, 'hex'), senderPrivateKey);

        // memo is now stored in metadata to by pass ~170ch limit
        if (memo) {
            if (metadata) {
                metadata = JSON.stringify({
                    ...JSON.parse(metadata),
                    memo: memo
                });
            }
            else {
                metadata = JSON.stringify({ memo: memo });
            }
        }

        const transfer = {
            amount: amount,
            fee: fee,
            chain: chain,
            from: senderPublicKey,
            to: recipientPublicKey,
            nonce: nonce + nTx,
            memo: _memo || '', // deprecated (stored in metadata)
            sig: signature,
            metadata: metadata
        };

        transfers.push(transfer);
        nTx += 1;

        if (progressCallback) {
            await progressCallback(nTx, actions.length);
        }

        console.log(`Signed transaction ${nTx} of ${actions.length}`);
    }

    return transfers;
}

async function newdexQuote(from, to, reverse = false) {
    return await apiRequest(`/v1/api/blockchain/newdexquote`, {
        from,
        to,
        reverse
    });
}

async function newdexSwap(withdrawAction, expect, createAccount) {
    const transfers = await createTransferActions([withdrawAction]);

    return await apiRequest(`/v1/api/blockchain/newdexswap`, {
        transfers,
        expect,
        createAccount
    });
}

//
//  Transfers a Unified ID asset
//
async function transfer(actions, progressCallback, forward, chain) {

    const transfers = await createTransferActions(actions, progressCallback);
    const trx = await apiRequest(`/v1/api/blockchain/transfer`, {
        transfers,
        forward,
        chain
    });

    return trx;
    //return { transaction_id: "dee67ccdf1aae10cb1f59c5f4ab87bc4b02b5be5ad1710600a352b4d8ebed2a0" };
}

//
// Gets a block explorer transaction link for a given symbol and a transaction id
//
async function getTransactionLink(symbol, trxid) {
    const token = await getToken(symbol);
    
    if (token) {
        if (token.chain == 'telos') {
            return `https://telos.bloks.io/transaction/${trxid}`;
        }
    }

    return `https://bloks.io/transaction/${trxid}`;
}

//
// Creates an asset from a quantity and a symbol and corrects its precision
//
async function createAsset(quantity, symbol) {
    const eosTokensInfo = await getTokensInfo();
    const token = eosTokensInfo.find(t => t.symbol == symbol);
    if (token) {
        const p = Math.max(8, token.precision);
        const quantityString = parseFloat(quantity).toFixed(p);
        const decimal = quantityString.indexOf('.');
        const preciseQuantity = quantityString.substring(0, decimal + 1 + token.precision);

        return `${preciseQuantity} ${symbol}`;
    }

    return `${parseFloat(quantity).toFixed(8)} ${symbol}`;
}

//
// Add two assets together
//
async function sumAsset(asset1, asset2) {
    const [quantity1, symbol1] = asset1.split(' ');
    const [quantity2, symbol2] = asset2.split(' ');
    if (symbol1 != symbol2) throw new Error(`Symbol mismatch for assets "${asset1}", "${asset2}"`);
    return await createAsset(Number(quantity1) + Number(quantity2), symbol1);
}

//
// Sign a text message
//
async function signText(text, key) {
    if (eccWorker) {
        const result = await eccWorker.sign(text, key);
        return result;
    }
    else {
        return ecc.sign(text, key);
    }
}

//
// Signs a hash
//
async function signHash(hash256, key) {
    if (eccWorker) {
        const result = eccWorker.signHash(hash256, key);
        return result;
    }
    else {
        return ecc.signHash(hash256, key);
    }
}

//
// Connect to a wallet interface
// 

async function connectWallet(name, chain) {
    if (eos.getWalletNames().some(n => n == name))
        return eos.connectWallet(name, chain);
    else if (eth.getWalletNames().some(n => n == name))
        return eth.connectWallet(name, chain);
    throw new Error(`Unable to connect to unknown wallet ${name}`);
}

async function getMarketCaps() {
    const FIVE_MINUTES = 5 * 60 * 1000;

    return getFromCache(cache, 'getMarketCaps', async () => {
        return await apiRequest(`/v1/api/data/marketcaps`);
    },
        FIVE_MINUTES);
}

async function getStakes(publicKey, symbol = `3,ATMOS`) {
    return await apiRequest(`/v1/api/blockchain/getstakes`, { symbol, publicKey });
}

async function exitStake(id, privateKey, symbol = `3,ATMOS`) {
    const pub = ecc.privateToPublic(privateKey);
    const msg = `atmosstakev2 unstake:${id} nsuidcntract ${pub}`;
    const sig = await signText(msg, privateKey);
    return await apiRequest(`/v1/api/blockchain/exitstake`, { id, symbol, to: `nsuidcntract`, memo: pub, sig });
}

async function claimStake(pub, symbol = `3,ATMOS`) {
    return await apiRequest(`/v1/api/blockchain/claimstake`, { pub, symbol });
}

export {
    eos,
    eth,
    bch,
    encrypt,
    decrypt,
    searchTransactions,
    getActiveWallets,
    generateBrainKey,
    isValidBrainKey,
    findInvalidBrainKeyWord,
    brainKeyToKeys,
    brainKeyFromHash,
    getTokenAddress,
    getSymbols,
    getAsset,
    isValidAsset,
    getChainForSymbol,
    getFeeForAmount,
    getAmountFeeAssetsForTotal,
    getTokensInfo,
    getToken,
    getTokenForChain,
    getTransactionLink,
    createAsset,
    sumAsset,
    withdrawAction,
    newdexQuote,
    newdexSwap,
    transfer,
    createArtificalTips,
    createTransferActions,
    signText,
    signHash,
    connectWallet,
    getMarketCaps,
    getStakes,
    exitStake,
    claimStake
}

