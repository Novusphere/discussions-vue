import Joi from "@hapi/joi";
import { Api, JsonRpc } from 'eosjs'
import { JsSignatureProvider } from 'eosjs/dist/eosjs-jssig'
import * as ecc from 'eosjs-ecc';
import * as aesjs from 'aes-js';
import * as bip39 from 'bip39';
import * as bip32 from 'bip32';
import * as axios from 'axios';
import BufferWriter from './bufferwriter';
import { getFromCache } from "@/novusphere-js/utility";

let cache = {};

const GREYMASS_EOS_RPC = 'https://eos.greymass.com';
const EOSCAFE_EOS_RPC = 'https://eos.eoscafeblock.com';
const DEFAULT_EOS_RPC = EOSCAFE_EOS_RPC;

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

function isValidBrainKey(brainKey) {
    return bip39.validateMnemonic(brainKey);
}

async function brainKeyToKeys(brainKey) {
    const seed = await bip39.mnemonicToSeed(brainKey);
    const node = await bip32.fromSeed(seed);

    function getKeyAt(index) {
        let child = node.derivePath(`m/80'/0'/0'/${index}`);
        const wif = child.toWIF();
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

function getEOSAPI(rpcEndpoint = DEFAULT_EOS_RPC) {
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

//
// Get token info for a given symbol, throws an exception if not found
//
async function getToken(symbol) {
    const eosTokensInfo = await getTokensInfo();
    const token = eosTokensInfo.find(t => t.symbol == symbol);
    if (!token) throw new Error(`Symbol "${symbol}" was not found in Unified ID token symbols`);
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
        const { data } = await axios.get(`https://atmosdb.novusphere.io/unifiedid/p2k`);
        return data;
    });

    return eosTokensInfo;
}
//
// Get all symbols supported by Unified ID
//
async function getSymbols() {
    const eosTokensInfo = await getTokensInfo();
    return eosTokensInfo.map(t => t.symbol);
}

//
// Gets an asset for an address (or public key depending on the asset type)
// Returns a string with the balance followed by the symbol
//
async function getAsset(symbol, address, rpc = DEFAULT_EOS_RPC) {
    let balance = `0 ${symbol}`;

    const eosTokensInfo = await getTokensInfo();

    const eosToken = eosTokensInfo.find(t => t.symbol == symbol);
    if (eosToken) {

        const eos = await getEOSAPI(rpc);
        const bound = `0x${ecc.sha256(ecc.PublicKey.fromString(address).toBuffer(), 'hex')}`;
        const balances = await eos.rpc.get_table_rows({
            json: true,
            code: eosToken.p2k.contract,
            scope: eosToken.p2k.chain,
            table: 'accounts',
            limit: 100,
            key_type: 'i256',
            lower_bound: bound,
            upper_bound: bound,
            index_position: 2,
        });

        if (balances.rows && balances.rows.length > 0) {
            balance = balances.rows[0].balance;
        }
    }

    return balance;
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
        memo: `${account}:${memo || ''}`
    };
}

//
// Create transfer actions
//
function createTransferActions(actions) {
    const schema = Joi.object(
        {
            actions: Joi.array().items(Joi.object({
                chain: Joi.number().required(),
                senderPrivateKey: Joi.string().required(),
                recipientPublicKey: Joi.string().required(),
                amount: Joi.string().required(),
                fee: Joi.string().required(),
                nonce: Joi.number().required(),
                memo: Joi.string()
            }))
        });


    schema.validate({ actions });

    let transfers = [];

    for (const {
        chain,
        senderPrivateKey,
        recipientPublicKey,
        amount,
        fee,
        nonce,
        memo
    } of actions) {

        const senderPublicKey = ecc.privateToPublic(senderPrivateKey);

        let body = new BufferWriter();
        body.writeUInt64(chain);
        body.writePublicKey(senderPublicKey, 'EOS');
        body.writePublicKey(recipientPublicKey, 'EOS');
        body.writeAsset(amount);
        body.writeAsset(fee);
        body.writeUInt64(nonce);
        body.writeString(memo);

        const bodyBuffer = body.toBuffer();

        let header = new BufferWriter();
        header.writeByte(0x03); // version
        header.writeByte(bodyBuffer.length + 2); // length

        const headerBuffer = header.toBuffer();

        let trx = new BufferWriter();
        trx.write(headerBuffer);
        trx.write(bodyBuffer);

        const trxBuffer = trx.toBuffer();
        const signature = ecc.signHash(ecc.sha256(trxBuffer, 'hex'), senderPrivateKey);

        const transfer = {
            amount: amount,
            fee: fee,
            chain: chain,
            from: senderPublicKey,
            to: recipientPublicKey,
            nonce: nonce,
            memo: memo,
            sig: signature
        };

        transfers.push(transfer);
    }

    return transfers;
}

//
//  Transfers a Unified ID asset
//
async function transfer(actions, notify) {

    const transfers = createTransferActions(actions);
    const { data } = await axios.post(
        `https://atmosdb.novusphere.io/unifiedid/relay`,
        `data=${encodeURIComponent(JSON.stringify({
            transfers: transfers,
            notify: notify ? JSON.stringify(notify) : undefined
        }))}`);
        
    return data;
    //return { transaction_id: "dee67ccdf1aae10cb1f59c5f4ab87bc4b02b5be5ad1710600a352b4d8ebed2a0" };
}

async function getTransactionLink(symbol, trxid) {
    return `https://eosq.app/tx/${trxid}`;
}

async function createAsset(quantity, symbol) {
    const eosTokensInfo = await getTokensInfo();
    const token = eosTokensInfo.find(t => t.symbol == symbol);
    if (token) {
        const quantityString = parseFloat(quantity).toFixed(8);
        const decimal = quantityString.indexOf('.');
        const preciseQuantity = quantityString.substring(0, decimal + 1 + token.precision);

        return `${preciseQuantity} ${symbol}`;
    }

    return `${parseFloat(quantity).toFixed(8)} ${symbol}`;
}

async function sumAsset(asset1, asset2) {
    const [quantity1, symbol1] = asset1.split(' ');
    const [quantity2, symbol2] = asset2.split(' ');
    if (symbol1 != symbol2) throw new Error(`Symbol mismatch for assets "${asset1}", "${asset2}"`);
    return await createAsset(Number(quantity1) + Number(quantity2), symbol1);
}

export {
    DEFAULT_EOS_RPC,
    GREYMASS_EOS_RPC,
    EOSCAFE_EOS_RPC,

    encrypt,
    decrypt,
    isValidBrainKey,
    brainKeyToKeys,
    getTokenAddress,
    getSymbols,
    getAsset,
    getChainForSymbol,
    getFeeForAmount,
    getAmountFeeAssetsForTotal,
    getTokensInfo,
    getTransactionLink,
    createAsset,
    sumAsset,
    withdrawAction,
    transfer,
    createTransferActions
}

