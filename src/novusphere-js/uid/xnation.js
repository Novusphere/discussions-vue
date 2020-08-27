// Reference Implementation - https://github.com/Novusphere/xnation-ui
// Special Thanks: John Williamson

import _ from "lodash";
import { eos } from "@/novusphere-js/uid";

function symToBaseSymbol(sym) {
    const [precision, symbol] = sym.split(',');
    return { symbol, precision };
}

function assetStringtoBaseSymbol(assetString) {
    const [quantity, symbol] = assetString.split(' ');
    const precision = (quantity.length - 1) - quantity.indexOf('.');
    return { quantity, symbol, precision };
}

function buildTokenId({ contract, symbol }) {
    return contract + "-" + symbol;
}

async function fetchMultiRelays() {
    const contractName = `bancorcnvrtr`;
    const smartTokenContract = `bnt2eoscnvrt`;

    const { rpc } = await eos.getAPI();

    const rawRelays = await rpc.get_table_rows({
        code: contractName,
        table: "converter.v2",
        scope: contractName,
        limit: 99
    });

    const parsedRelays = rawRelays.rows;
    const passedRelays = parsedRelays
        .filter(
            relay =>
                relay.reserve_weights.reduce(
                    (acc, reserve) => reserve.value + acc,
                    0
                ) == 1000000
        )
        .filter(relay => relay.reserve_balances.length == 2);

    const relays = passedRelays.map(relay => ({
        id: buildTokenId({
            contract: smartTokenContract,
            symbol: symToBaseSymbol(relay.currency).symbol
        }),
        reserves: relay.reserve_balances.map(({ value }) => ({
            ...assetStringtoBaseSymbol(value.quantity),
            id: buildTokenId({
                contract: value.contract,
                symbol: assetStringtoBaseSymbol(value.quantity).symbol
            }),
            contract: value.contract,
            network: "eos",
            amount: parseFloat(value.quantity)
        })),
        contract: contractName,
        owner: relay.owner,
        isMultiContract: true,
        smartToken: {
            ...symToBaseSymbol(relay.currency),
            id: buildTokenId({
                contract: smartTokenContract,
                symbol: symToBaseSymbol(relay.currency).symbol
            }),
            contract: smartTokenContract,
            amount: 0,
            network: "eos"
        },
        fee: relay.fee / 1000000
    }));

    return relays;
};

function composeMemo(converters, minReturn, destAccount) {
    const version = 1;
    let returnSymbol = undefined;
    const receiver = converters
        .map(({ account, symbol, multiContractSymbol }) => {
            returnSymbol = symbol;
            return `${account}${multiContractSymbol ? `:${multiContractSymbol}` : ""} ${symbol}`;
        })
        .join(" ");

    let base = `${version},${receiver},${minReturn},${destAccount}`;
    return base;
}

function compareString(stringOne, stringTwo) {
    const strings = [stringOne, stringTwo];
    if (!strings.every(str => typeof str == "string"))
        throw new Error(
            `String one: ${stringOne} String two: ${stringTwo} one of them are falsy or not a string`
        );
    return stringOne.toLowerCase() == stringTwo.toLowerCase();
}

const compareEdge = (edge1, edge2) => edge1.every(edge => edge2.some(e => compareString(edge, e)));

const dfs = (fromId, toId, adjacencyList) => new Promise(resolve => callbackDfs(fromId, toId, adjacencyList, resolve));

const callbackDfs = (
    start,
    goal,
    adjacencyList,
    callBack,
    visited = new Set(),
    path = [start]
) => {
    visited.add(start);
    const destinations = adjacencyList.get(start);
    if (destinations.includes(goal)) {
        callBack([...path, goal]);
    }
    for (const destination of destinations) {
        if (!visited.has(destination)) {
            callbackDfs(destination, goal, adjacencyList, callBack, visited, [
                ...path,
                destination
            ]);
        }
    }
};

function multiToDry(relay) {
    return {
        reserves: relay.reserves.map(reserve => ({
            contract: reserve.contract,
            symbol: { code: reserve.symbol, precision: reserve.precision }
        })),
        contract: relay.contract,
        smartToken: {
            symbol: { code: relay.smartToken.symbol, precision: relay.smartToken.precision },
            contract: relay.smartToken.contract
        },
        isMultiContract: relay.isMultiContract
    }
}

function buildAdjacencyList(edges, nodes) {
    const adjacencyList = new Map();
    nodes.forEach(node => adjacencyList.set(node, []));
    edges.forEach(([from, to]) => adjacencyList.get(from).push(to));
    edges.forEach(([from, to]) => adjacencyList.get(to).push(from));
    return adjacencyList;
}

async function findNewPath(fromId, toId, pools, identifier) {
    const edges = _.uniqWith(pools.map(identifier), compareEdge);
    const nodes = _.uniqWith(edges.flat(1), compareString);

    const adjacencyList = buildAdjacencyList(edges, nodes);
    const startExists = adjacencyList.get(fromId);
    const goalExists = adjacencyList.get(toId);

    if (!(startExists && goalExists))
        throw new Error(
            `Start ${fromId} or goal ${toId} does not exist in adjacency list`
        );

    const dfsResult = await dfs(fromId, toId, adjacencyList);
    if (!dfsResult || dfsResult.length == 0)
        throw new Error("Failed to find path");

    const hops = _.chunk(dfsResult, 2).map((tokenIds, index, arr) => {
        let searchAbleIds = undefined;

        if (tokenIds.length < 2) {
            searchAbleIds = [arr[index - 1][1], tokenIds[0]];
        } else searchAbleIds = tokenIds;

        const accomodatingRelays = pools.filter(pool => {
            const ids = identifier(pool);
            return ids.every(id => searchAbleIds.some(i => id == i));
        });

        return accomodatingRelays;
    });

    return {
        path: dfsResult,
        hops
    };
}

function relaysToConvertPaths(from, relays) {
    return relays
        .map(relay =>
            relay.reserves.map(token => {
                const base = {
                    account: relay.contract,
                    symbol: token.symbol.code
                };
                return relay.isMultiContract
                    ? {
                        ...base,
                        multiContractSymbol: relay.smartToken.symbol.code
                    }
                    : base;
            })
        )
        .reduce((prev, curr) => prev.concat(curr))
        .filter(converter => converter.symbol !== from.code)
        .reduce((accum, item) => {
            return accum.find((converter) => converter.symbol == item.symbol) ? accum : [...accum, item];
        }, []);
}

function sortReservesByAsset(asset, reserves) {
    const [quantity, symbol] = asset.split(' ');

    if (!reserves.some(reserve => assetStringtoBaseSymbol(reserve.amount).symbol == symbol))
        throw new Error("Asset does not exist in these reserves");

    return reserves.sort((a, b) =>
        assetStringtoBaseSymbol(a.amount).symbol == symbol ? -1 : 1
    );
}

function calculateReturn(balanceFrom, balanceTo, amount) {
    if (assetStringtoBaseSymbol(balanceFrom).symbol != assetStringtoBaseSymbol(amount).symbol)
        throw new Error("From symbol does not match amount symbol");
    if (parseFloat(amount) >= parseFloat(balanceFrom))
        throw new Error("Impossible to buy the entire reserve or more");

    const balanceFromNumber = parseFloat(balanceFrom);
    const balanceToNumber = parseFloat(balanceTo);
    const amountNumber = parseFloat(amount);

    const [btoAmount, btoSym] = balanceTo.split(' ');
    const bToPrecision = btoAmount.length - 1 - btoAmount.indexOf('.');

    const reward = amountNumber / (balanceFromNumber + amountNumber) * balanceToNumber;
    const rewardAsset = `${reward.toFixed(bToPrecision)} ${btoSym}`;
    const slippage = parseFloat(amount) / parseFloat(balanceFrom);

    return { reward: rewardAsset, slippage };
}

const highestNumber = (number1, number2) => number1 > number2 ? number1 : number2;

function findReturn(amount, relaysPath) {
    return relaysPath.reduce(
        ({ amount, highestSlippage }, relay) => {

            const [fromReserve, toReserve] = sortReservesByAsset(
                amount,
                relay.reserves
            );

            const { reward, slippage } = calculateReturn(
                fromReserve.amount,
                toReserve.amount,
                amount
            );

            const r = {
                amount: chargeFee(reward, relay.fee, 2),
                highestSlippage: highestNumber(highestSlippage, slippage)
            };

            return r;
        },
        { amount, highestSlippage: 0 }
    );
}

function chargeFee(asset, decimalFee, magnitude = 1) {
    const assetAmount = parseFloat(asset);
    const one = 1;

    const totalFee = assetAmount * (1 - Math.pow(1 - decimalFee, magnitude));
    const newAmount = assetAmount - totalFee;

    const [assetAmt, assetSym] = asset.split(' ');
    const precision = assetAmt.length - 1 - assetAmt.indexOf('.');
    return `${newAmount.toFixed(precision)} ${assetSym}`;
}

async function findPath(fromId, toId) {
    const multiRelays = await fetchMultiRelays();
    const allDry = [...multiRelays.map(multiToDry)];

    const foundPath = await findNewPath(fromId, toId, allDry, dry => {
        const [from, to] = dry.reserves.map(r =>
            buildTokenId({
                contract: r.contract,
                symbol: r.symbol.code
            })
        );
        return [from, to];
    });

    const path = foundPath.hops.flatMap(hop => hop[0]);

    return path;
}

async function getReturn(assetAmount, fromId, toId) {
    if (compareString(fromId, toId))
        throw new Error("Cannot convert a token to itself.");

    const path = await findPath(fromId, toId);

    const hydratedRelays = await hydrateRelays(path);

    const calculatedReturn = findReturn(assetAmount, hydratedRelays);

    return {
        amount: calculatedReturn.amount,
        slippage: calculatedReturn.highestSlippage
    };
}

function number_to_asset(amount, symbol) {
    return `${amount.toFixed(symbol.precision)} ${symbol.code}`;
}

async function hydrateRelays(relays) {
    //const v1Relays = relays.filter(relay => !relay.isMultiContract);
    const v2Relays = relays.filter(relay => relay.isMultiContract);
    //const [v1, v2] = await Promise.all([
    //  hydrateV1Relays(v1Relays),
    //  hydrateV2Relays(v2Relays)
    //]);
    //const flat = [...v2, ...v1];
    const flat = await hydrateV2Relays(v2Relays);

    return relays.map(
        relay =>
            flat.find(
                r =>
                    r.smartToken.symbol.code == (relay.smartToken.symbol.code) &&
                    compareString(r.smartToken.contract, relay.smartToken.contract)
            )
    );
}

async function hydrateV2Relays(relays) {
    if (relays.length == 0) return [];

    const freshRelays = await fetchMultiRelays();
    const hydratedRelays = freshRelays.map(eosMultiToHydrated);

    const result = hydratedRelays.filter(relay =>
        relays.some(
            r =>
                compareString(relay.smartToken.contract, r.smartToken.contract) &&
                relay.smartToken.symbol.code == (r.smartToken.symbol.code)
        )
    );

    if (relays.length !== result.length)
        throw new Error(
            "Failed to hydrate all relays requested in hydrateV2Relays"
        );

    return result;
}

function eosMultiToHydrated(relay) {
    return ({
        reserves: relay.reserves.map(
            (reserve) => ({
                contract: reserve.contract,
                amount: number_to_asset(
                    reserve.amount,
                    { code: reserve.symbol, precision: reserve.precision }
                )
            })
        ),
        contract: relay.contract,
        fee: relay.fee,
        isMultiContract: relay.isMultiContract,
        smartToken: {
            symbol: { code: relay.smartToken.symbol, precision: relay.smartToken.precision },
            contract: relay.smartToken.contract
        }
    });
}

async function getXNationQuote(from, swapAmount, swapFromId, swapToId) {

    const { symbol, precision } = assetStringtoBaseSymbol(swapAmount);
    const swapAsset = { code: symbol, precision: precision };

    const estimate = await getReturn(swapAmount, swapFromId, swapToId);
    const path = await findPath(swapFromId, swapToId);
    const convertPath = relaysToConvertPaths(swapAsset, path);

    const { symbol: estimateSymbol, precision: estimatePrecision } = assetStringtoBaseSymbol(estimate.amount);
    const minReturn = String((parseFloat(estimate.amount) * 0.96).toFixed(estimatePrecision));

    const memo = composeMemo(convertPath,
        minReturn,
        from);

    return {
        depositAccount: `thisisbancor`,
        amount: swapAmount,
        from: swapFromId,
        to: swapToId,
        estimate,
        minReturn: `${minReturn} ${estimateSymbol}`,
        memo
    }
}

export {
    getXNationQuote
}