import axios from "axios";
import memoize from "memoizee";
import BigNumber from "bignumber.js";
import { ethers } from "ethers";
import { curve } from "./curve";
import { IDict, IRoute, IRouteStep, IPoolData } from "./interfaces";
import {
    _getCoinAddresses,
    _getCoinDecimals,
    _getUsdRate,
    ensureAllowance,
    ensureAllowanceEstimateGas,
    fromBN,
    hasAllowance,
    isEth,
    toBN,
    BN,
    parseUnits,
    _cutZeros,
} from "./utils";
import { getPool } from "./pools";

// TODO make working or remove
const IMBALANCED_POOLS: string[] = [];

// Inspired by Dijkstra's algorithm
export const _findAllRoutes = async (inputCoinAddress: string, outputCoinAddress: string): Promise<IRouteStep[][]> => {
    inputCoinAddress = inputCoinAddress.toLowerCase();
    outputCoinAddress = outputCoinAddress.toLowerCase();

    const ALL_POOLS = Object.entries({
        ...curve.constants.POOLS_DATA,
        ...curve.constants.FACTORY_POOLS_DATA as IDict<IPoolData>,
        ...curve.constants.CRYPTO_FACTORY_POOLS_DATA as IDict<IPoolData>,
    });

    const basePoolsSet: Set<string> = new Set();
    for (const pool of ALL_POOLS) {
        if (pool[1].base_pool) basePoolsSet.add(pool[1].base_pool);
    }
    const basePoolIds = Array.from(basePoolsSet);


    // Coins for which all routes have already been found
    const markedCoins: string[] = [];
    // Coins we are searching routes for on the current step
    let curCoins: string[] = [inputCoinAddress];
    // Coins we will search routes for on the next step
    let nextCoins: Set<string> = new Set();
    // Routes for all coins found
    const routes: IDict<IRouteStep[][]> = {
        [inputCoinAddress]: [[]],
    };

    // No more than 4 steps (swaps)
    for (let step = 0; step < 4; step++) {
        for (const inCoin of curCoins) {
            for (const [poolId, poolData] of ALL_POOLS) {
                const wrapped_coin_addresses = poolData.wrapped_coin_addresses.map((a: string) => a.toLowerCase());
                const underlying_coin_addresses = poolData.underlying_coin_addresses.map((a: string) => a.toLowerCase());
                const meta_coin_addresses = poolData.is_meta ? 
                    curve.constants.POOLS_DATA[poolData.base_pool as string].underlying_coin_addresses.map((a: string) => a.toLowerCase()) : [];
                const token_address = poolData.token_address.toLowerCase();
                const is_lending = poolData.is_lending ?? false;

                const inCoinIndexes = {
                    wrapped_coin: wrapped_coin_addresses.indexOf(inCoin),
                    underlying_coin: underlying_coin_addresses.indexOf(inCoin),
                    meta_coin: meta_coin_addresses ? meta_coin_addresses.indexOf(inCoin) : -1,
                }

                // Find all LP -> underlying coin "swaps" (actually remove_liquidity_one_coin)
                if (basePoolIds.includes(poolId) && inCoin === token_address) {
                    for (let j = 0; j < underlying_coin_addresses.length; j++) {
                        // If this coin already marked or will be marked on the current step, no need to consider it on the next step
                        if (markedCoins.includes(underlying_coin_addresses[j]) || curCoins.includes(underlying_coin_addresses[j])) continue;
                        // Looking for outputCoinAddress only on the final step
                        if (step === 3 && underlying_coin_addresses[j] !== outputCoinAddress) continue;

                        const swapType = poolId === 'aave' ? 10 : 9;
                        for (const inCoinRoute of routes[inCoin]) {
                            routes[underlying_coin_addresses[j]] = (routes[underlying_coin_addresses[j]] ?? []).concat(
                                [[
                                    ...inCoinRoute,
                                    {
                                        poolId,
                                        poolAddress: poolData.swap_address,
                                        outputCoinAddress: underlying_coin_addresses[j],
                                        i: 0,
                                        j,
                                        swapType,
                                        swapAddress: ethers.constants.AddressZero,
                                    },
                                ]]
                            );
                        }

                        nextCoins.add(underlying_coin_addresses[j]);
                    }
                }

                // Find all underlying coin -> LP "swaps" (actually add_liquidity)
                if (basePoolIds.includes(poolId) && underlying_coin_addresses.includes(inCoin)) {
                    // If this coin already marked or will be marked on the current step, no need to consider it on the next step
                    if (markedCoins.includes(token_address) || curCoins.includes(token_address)) continue;
                    // Looking for outputCoinAddress only on the final step
                    if (step === 3 && token_address !== outputCoinAddress) continue;

                    const swapType = is_lending ? 8 : underlying_coin_addresses.length === 2 ? 6 : 7;
                    for (const inCoinRoute of routes[inCoin]) {
                        routes[token_address] = (routes[token_address] ?? []).concat(
                            [[
                                ...inCoinRoute,
                                {
                                    poolId,
                                    poolAddress: poolData.swap_address,
                                    outputCoinAddress: token_address,
                                    i: underlying_coin_addresses.indexOf(inCoin),
                                    j: 0,
                                    swapType,
                                    swapAddress: ethers.constants.AddressZero,
                                },
                            ]]
                        );
                    }

                    nextCoins.add(token_address);
                }

                // No input coin in this pool --> skip
                if (inCoinIndexes.wrapped_coin === -1 && inCoinIndexes.underlying_coin === -1 && inCoinIndexes.meta_coin === -1) continue;

                // Find all straight swaps
                if (inCoinIndexes.wrapped_coin >= 0 && poolId !== "atricrypto3") {
                    for (let j = 0; j < wrapped_coin_addresses.length; j++) {
                        // If this coin already marked or will be marked on the current step, no need to consider it on the next step
                        if (markedCoins.includes(wrapped_coin_addresses[j]) || curCoins.includes(wrapped_coin_addresses[j])) continue;
                        // Looking for outputCoinAddress only on the final step
                        if (step === 3 && wrapped_coin_addresses[j] !== outputCoinAddress) continue;
                        // Skip empty pools
                        const tvl = Number(await (getPool(poolId)).stats.totalLiquidity());
                        if (tvl === 0) continue;
                        // Skip imbalanced pools
                        if (IMBALANCED_POOLS.includes(poolId)) continue;

                        const swapType = poolData.is_crypto ? 3 : 1;
                        for (const inCoinRoute of routes[inCoin]) {
                            routes[wrapped_coin_addresses[j]] = (routes[wrapped_coin_addresses[j]] ?? []).concat(
                                [[
                                    ...inCoinRoute,
                                    {
                                        poolId,
                                        poolAddress: poolData.swap_address,
                                        outputCoinAddress: wrapped_coin_addresses[j],
                                        i: inCoinIndexes.wrapped_coin,
                                        j,
                                        swapType,
                                        swapAddress: ethers.constants.AddressZero,
                                    },
                                ]]
                            );
                        }

                        nextCoins.add(wrapped_coin_addresses[j]);
                    }
                }

                // Only for underlying swaps
                const poolAddress = ["eurtusd", "xautusd", "atricrypto3"].includes(poolId) ||
                (curve.chainId === 137 && poolData.is_factory) ? poolData.deposit_address as string : poolData.swap_address;

                // Find all underlying swaps
                if (wrapped_coin_addresses.join("|") !== underlying_coin_addresses.join("|") && inCoinIndexes.underlying_coin >= 0) {
                    for (let j = 0; j < underlying_coin_addresses.length; j++) {
                        if (poolId === "atricrypto3" && inCoinIndexes.meta_coin >= 0 && meta_coin_addresses.includes(underlying_coin_addresses[j])) continue;
                        // If this coin already marked or will be marked on the current step, no need to consider it on the next step
                        if (markedCoins.includes(underlying_coin_addresses[j]) || curCoins.includes(underlying_coin_addresses[j])) continue;
                        // Looking for outputCoinAddress only on the final step
                        if (step === 3 && underlying_coin_addresses[j] !== outputCoinAddress) continue;
                        // Skip empty pools
                        const tvl = Number(await (getPool(poolId)).stats.totalLiquidity());
                        if (tvl === 0) continue;
                        // Skip imbalanced pools
                        if (IMBALANCED_POOLS.includes(poolId)) continue;

                        const swapType = poolData.is_crypto && (poolData.is_fake || poolData.is_meta) ? 4 : poolData.is_crypto ? 3 : 2;
                        for (const inCoinRoute of routes[inCoin]) {
                            routes[underlying_coin_addresses[j]] = (routes[underlying_coin_addresses[j]] ?? []).concat(
                                [[
                                    ...inCoinRoute,
                                    {
                                        poolId,
                                        poolAddress,
                                        outputCoinAddress: underlying_coin_addresses[j],
                                        i: inCoinIndexes.underlying_coin,
                                        j,
                                        swapType,
                                        swapAddress: ethers.constants.AddressZero,
                                    },
                                ]]
                            );
                        }

                        nextCoins.add(underlying_coin_addresses[j]);
                    }
                }

                // Find all meta swaps where input coin is NOT meta
                if (inCoinIndexes.wrapped_coin === 0 && meta_coin_addresses.length > 0 && poolId !== "atricrypto3") {
                    for (let j = 0; j < meta_coin_addresses.length; j++) {
                        // If this coin already marked or will be marked on the current step, no need to consider it on the next step
                        if (markedCoins.includes(meta_coin_addresses[j]) || curCoins.includes(meta_coin_addresses[j])) continue;
                        // Looking for outputCoinAddress only on the final step
                        if (step === 3 && meta_coin_addresses[j] !== outputCoinAddress) continue;
                        // Skip empty pools
                        const tvl = Number(await (getPool(poolId)).stats.totalLiquidity());
                        if (tvl === 0) continue;
                        // Skip imbalanced pools
                        if (IMBALANCED_POOLS.includes(poolId)) continue;

                        const swapType = (curve.chainId === 137 && poolData.is_factory) ? 5 : poolData.is_crypto ? 4 : 2;
                        for (const inCoinRoute of routes[inCoin]) {
                            routes[meta_coin_addresses[j]] = (routes[meta_coin_addresses[j]] ?? []).concat(
                                [[
                                    ...inCoinRoute,
                                    {
                                        poolId,
                                        poolAddress,
                                        outputCoinAddress: meta_coin_addresses[j],
                                        i: inCoinIndexes.wrapped_coin,
                                        j: j + 1,
                                        swapType,
                                        swapAddress: swapType === 5 ? poolData.swap_address : ethers.constants.AddressZero,
                                    },
                                ]]
                            );
                        }

                        nextCoins.add(meta_coin_addresses[j]);
                    }
                }

                // Find all meta swaps where input coin is meta
                if (inCoinIndexes.meta_coin >= 0 && poolId !== "atricrypto3") {
                    // If this coin already marked or will be marked on the current step, no need to consider it on the next step
                    if (markedCoins.includes(wrapped_coin_addresses[0]) || curCoins.includes(wrapped_coin_addresses[0])) continue;
                    // Looking for outputCoinAddress only on the final step
                    if (step === 3 && wrapped_coin_addresses[0] !== outputCoinAddress) continue;
                    // Skip empty pools
                    const tvl = Number(await (getPool(poolId)).stats.totalLiquidity());
                    if (tvl === 0) continue;
                    // Skip imbalanced pools
                    if (IMBALANCED_POOLS.includes(poolId)) continue;

                    const swapType = (curve.chainId === 137 && poolData.is_factory) ? 5 : poolData.is_crypto ? 4 : 2;
                    for (const inCoinRoute of routes[inCoin]) {
                        routes[wrapped_coin_addresses[0]] = (routes[wrapped_coin_addresses[0]] ?? []).concat(
                            [[
                                ...inCoinRoute,
                                {
                                    poolId,
                                    poolAddress,
                                    outputCoinAddress: wrapped_coin_addresses[0],
                                    i: inCoinIndexes.meta_coin + 1,
                                    j: 0,
                                    swapType,
                                    swapAddress: swapType === 5 ? poolData.swap_address : ethers.constants.AddressZero,
                                },
                            ]]
                        );

                        nextCoins.add(wrapped_coin_addresses[0]);
                    }
                }
            }
        }

        // If target output coin is reached, search is finished. Assumption: the shorter route, the better.
        if (outputCoinAddress in routes) break;

        markedCoins.push(...curCoins);
        curCoins = Array.from(nextCoins);
        nextCoins = new Set();
    }

    return routes[outputCoinAddress] ?? []
}

const _getRouteKey = (route: IRoute, inputCoinAddress: string, outputCoinAddress: string): string => {
    const sortedCoins = [inputCoinAddress, outputCoinAddress].sort();
    let key = `${sortedCoins[0]}-->`;
    for (const routeStep of route.steps) {
        key += `${routeStep.poolId}-->`;
    }
    key += sortedCoins[1];

    return key
}

const _getExchangeMultipleArgs = (inputCoinAddress: string, route: IRoute): { _route: string[], _swapParams: number[][], _factorySwapAddresses: string[] } => {
    let _route = [inputCoinAddress];
    let _swapParams = [];
    let _factorySwapAddresses = [];
    for (const routeStep of route.steps) {
        _route.push(routeStep.poolAddress, routeStep.outputCoinAddress);
        _swapParams.push([routeStep.i, routeStep.j, routeStep.swapType]);
        _factorySwapAddresses.push(routeStep.swapAddress);
    }
    _route = _route.concat(Array(9 - _route.length).fill(ethers.constants.AddressZero));
    _swapParams = _swapParams.concat(Array(4 - _swapParams.length).fill([0, 0, 0]));
    _factorySwapAddresses = _factorySwapAddresses.concat(Array(4 - _factorySwapAddresses.length).fill(ethers.constants.AddressZero));

    return { _route, _swapParams, _factorySwapAddresses }
}

const _estimatedGasForDifferentRoutesCache: IDict<{ gas: ethers.BigNumber, time: number }> = {};

const _estimateGasForDifferentRoutes = async (routes: IRoute[], inputCoinAddress: string, outputCoinAddress: string, _amount: ethers.BigNumber): Promise<number[]> => {
    inputCoinAddress = inputCoinAddress.toLowerCase();
    outputCoinAddress = outputCoinAddress.toLowerCase();

    const contract = curve.contracts[curve.constants.ALIASES.registry_exchange].contract;
    const gasPromises: Promise<ethers.BigNumber>[] = [];
    const value = isEth(inputCoinAddress) ? _amount : ethers.BigNumber.from(0);
    for (const route of routes) {
        const routeKey = _getRouteKey(route, inputCoinAddress, outputCoinAddress);
        let gasPromise: Promise<ethers.BigNumber>;
        const { _route, _swapParams, _factorySwapAddresses } = _getExchangeMultipleArgs(inputCoinAddress, route);

        if ((_estimatedGasForDifferentRoutesCache[routeKey]?.time || 0) + 3600000 < Date.now()) {
            gasPromise = contract.estimateGas.exchange_multiple(_route, _swapParams, _amount, 0, _factorySwapAddresses, { ...curve.constantOptions, value});
        } else {
            gasPromise = Promise.resolve(_estimatedGasForDifferentRoutesCache[routeKey].gas);
        }

        gasPromises.push(gasPromise);
    }

    try {
        const _gasAmounts: ethers.BigNumber[] = await Promise.all(gasPromises);

        routes.forEach((route, i: number) => {
            const routeKey = _getRouteKey(route, inputCoinAddress, outputCoinAddress);
            _estimatedGasForDifferentRoutesCache[routeKey] = { 'gas': _gasAmounts[i], 'time': Date.now() };
        })

        return _gasAmounts.map((_g) => Number(ethers.utils.formatUnits(_g, 0)));
    } catch (err) { // No allowance
        return routes.map(() => 0);
    }
}

const _getBestRouteAndOutput = memoize(
    async (inputCoinAddress: string, outputCoinAddress: string, amount: number | string): Promise<IRoute> => {
        const [inputCoinDecimals, outputCoinDecimals] = _getCoinDecimals(inputCoinAddress, outputCoinAddress);
        const _amount = parseUnits(amount, inputCoinDecimals);

        const routesRaw: IRoute[] = (await _findAllRoutes(inputCoinAddress, outputCoinAddress)).map(
            (steps) => ({ steps, _output: ethers.BigNumber.from(0), outputUsd: 0, txCostUsd: 0 })
        );
        const routes: IRoute[] = [];

        try {
            const calls = [];
            const multicallContract = curve.contracts[curve.constants.ALIASES.registry_exchange].multicallContract;
            for (const route of routesRaw) {
                const { _route, _swapParams, _factorySwapAddresses } = _getExchangeMultipleArgs(inputCoinAddress, route);
                calls.push(multicallContract.get_exchange_multiple_amount(_route, _swapParams, _amount, _factorySwapAddresses));
            }

            const _outputAmounts = await curve.multicallProvider.all(calls) as ethers.BigNumber[];

            for (let i = 0; i < _outputAmounts.length; i++) {
                routesRaw[i]._output = _outputAmounts[i];
                routes.push(routesRaw[i]);
            }
        } catch (err) {
            const promises = [];
            const contract = curve.contracts[curve.constants.ALIASES.registry_exchange].contract;
            for (const route of routesRaw) {
                const { _route, _swapParams, _factorySwapAddresses } = _getExchangeMultipleArgs(inputCoinAddress, route);
                promises.push(contract.get_exchange_multiple_amount(_route, _swapParams, _amount, _factorySwapAddresses, curve.constantOptions));
            }

            // @ts-ignore
            const res = await Promise.allSettled(promises);

            for (let i = 0; i < res.length; i++) {
                if (res[i].status === 'rejected') {
                    console.log(`Route ${(routesRaw[i].steps.map((s) => s.poolId)).join(" --> ")} is anavailable`);
                    continue;
                }
                routesRaw[i]._output = res[i].value;
                routes.push(routesRaw[i]);
            }
        }

        if (routes.length === 0) {
            return {
                steps: [],
                _output: ethers.BigNumber.from(0),
                outputUsd: 0,
                txCostUsd: 0,
            }
        }
        if (routes.length === 1) return routes[0];

        const [gasAmounts, outputCoinUsdRate, gasData, ethUsdRate] = await Promise.all([
            _estimateGasForDifferentRoutes(routes, inputCoinAddress, outputCoinAddress, _amount),
            _getUsdRate(outputCoinAddress),
            axios.get("https://api.curve.fi/api/getGas"),
            _getUsdRate(curve.chainId === 137 ? curve.constants.COINS.matic : curve.constants.COINS.eth),
        ]);
        const gasPrice = gasData.data.data.gas.standard;
        const expectedAmounts = (routes).map(
            (route) => Number(ethers.utils.formatUnits(route._output, outputCoinDecimals))
        );

        const expectedAmountsUsd = expectedAmounts.map((a) => a * outputCoinUsdRate);
        const txCostsUsd = gasAmounts.map((a) => ethUsdRate * a * gasPrice / 1e18);

        routes.forEach((route, i) => {
            route.outputUsd = expectedAmountsUsd[i];
            route.txCostUsd = txCostsUsd[i]
        });

        return  routes.reduce(
            (route1, route2) => (route1.outputUsd - route1.txCostUsd) - (route2.outputUsd - route2.txCostUsd) >= 0 ? route1 : route2
        );
    },
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
    }
)

export const getBestRouteAndOutput = async (inputCoin: string, outputCoin: string, amount: number | string): Promise<{ route: IRouteStep[], output: string }> => {
    const [inputCoinAddress, outputCoinAddress] = _getCoinAddresses(inputCoin, outputCoin);
    const [outputCoinDecimals] = _getCoinDecimals(outputCoinAddress);

    const { steps, _output } = await _getBestRouteAndOutput(inputCoinAddress, outputCoinAddress, amount);

    return { route: steps, output: ethers.utils.formatUnits(_output, outputCoinDecimals) }
}

export const swapExpected = async (inputCoin: string, outputCoin: string, amount: number | string): Promise<string> => {
    return (await getBestRouteAndOutput(inputCoin, outputCoin, amount))['output'];
}

export const swapPriceImpact = async (inputCoin: string, outputCoin: string, amount: number | string): Promise<string> => {
    const [inputCoinAddress, outputCoinAddress] = _getCoinAddresses(inputCoin, outputCoin);
    const [inputCoinDecimals, outputCoinDecimals] = _getCoinDecimals(inputCoinAddress, outputCoinAddress);
    const route = await _getBestRouteAndOutput(inputCoinAddress, outputCoinAddress, amount);

    // Find k for which x * k = 10^12 or y * k = 10^12: k = max(10^12 / x, 10^12 / y)
    // For coins with d (decimals) <= 12: k = min(k, 0.2), and x0 = min(x * k. 10^d)
    // x0 = min(x * min(max(10^12 / x, 10^12 / y), 0.2), 10^d), if x0 == 0 then priceImpact = 0
    const target = BN(10 ** 12);
    const amountIntBN = BN(amount).times(10 ** inputCoinDecimals);
    const outputIntBN = toBN(route._output, 0);
    const k = BigNumber.min(BigNumber.max(target.div(amountIntBN), target.div(outputIntBN)), 0.2);
    const smallAmountIntBN = BigNumber.min(amountIntBN.times(k), BN(10 ** inputCoinDecimals));
    if (smallAmountIntBN.toFixed(0) === '0') return '0';

    const contract = curve.contracts[curve.constants.ALIASES.registry_exchange].contract;
    const _smallAmount = fromBN(smallAmountIntBN.div(10 ** inputCoinDecimals), inputCoinDecimals);
    const { _route, _swapParams, _factorySwapAddresses } = _getExchangeMultipleArgs(inputCoinAddress, route);
    const _smallOutput = await contract.get_exchange_multiple_amount(_route, _swapParams, _smallAmount, _factorySwapAddresses, curve.constantOptions);

    const amountBN = BN(amount);
    const outputBN = toBN(route._output, outputCoinDecimals);
    const smallAmountBN = toBN(_smallAmount, inputCoinDecimals);
    const smallOutputBN = toBN(_smallOutput, outputCoinDecimals);

    const rateBN = outputBN.div(amountBN);
    const smallRateBN = smallOutputBN.div(smallAmountBN);
    const slippageBN = BN(1).minus(rateBN.div(smallRateBN)).times(100);

    return _cutZeros(slippageBN.toFixed(6)).replace('-', '')
}

export const swapIsApproved = async (inputCoin: string, amount: number | string): Promise<boolean> => {
    return await hasAllowance([inputCoin], [amount], curve.signerAddress, curve.constants.ALIASES.registry_exchange);
}

export const swapApproveEstimateGas = async (inputCoin: string, amount: number | string): Promise<number> => {
    return await ensureAllowanceEstimateGas([inputCoin], [amount], curve.constants.ALIASES.registry_exchange);
}

export const swapApprove = async (inputCoin: string, amount: number | string): Promise<string[]> => {
    return await ensureAllowance([inputCoin], [amount], curve.constants.ALIASES.registry_exchange);
}

export const swapEstimateGas = async (inputCoin: string, outputCoin: string, amount: number | string): Promise<number> => {
    const [inputCoinAddress, outputCoinAddress] = _getCoinAddresses(inputCoin, outputCoin);
    const [inputCoinDecimals] = _getCoinDecimals(inputCoinAddress, outputCoinAddress);
    const route = await _getBestRouteAndOutput(inputCoinAddress, outputCoinAddress, amount);
    const _amount = parseUnits(amount, inputCoinDecimals);
    const [gas] = await _estimateGasForDifferentRoutes([route], inputCoinAddress, outputCoinAddress, _amount);

    return gas
}

export const swap = async (inputCoin: string, outputCoin: string, amount: number | string, slippage = 0.5): Promise<string> => {
    const [inputCoinAddress, outputCoinAddress] = _getCoinAddresses(inputCoin, outputCoin);
    const [inputCoinDecimals, outputCoinDecimals] = _getCoinDecimals(inputCoinAddress, outputCoinAddress);

    await swapApprove(inputCoin, amount);
    const route = await _getBestRouteAndOutput(inputCoinAddress, outputCoinAddress, amount);

    if (route.steps.length === 0) {
        throw new Error("This pair can't be exchanged");
    }

    const { _route, _swapParams, _factorySwapAddresses } = _getExchangeMultipleArgs(inputCoinAddress, route);
    const _amount = parseUnits(amount, inputCoinDecimals);
    const minRecvAmountBN: BigNumber = toBN(route._output, outputCoinDecimals).times(100 - slippage).div(100);
    const _minRecvAmount = fromBN(minRecvAmountBN, outputCoinDecimals);

    const contract = curve.contracts[curve.constants.ALIASES.registry_exchange].contract;
    const value = isEth(inputCoinAddress) ? _amount : ethers.BigNumber.from(0);

    await curve.updateFeeData();
    const gasLimit = (await contract.estimateGas.exchange_multiple(
        _route,
        _swapParams,
        _amount,
        _minRecvAmount,
        _factorySwapAddresses,
        { ...curve.constantOptions, value }
    )).mul(curve.chainId === 1 ? 130 : 160).div(100);
    return (await contract.exchange_multiple(_route, _swapParams, _amount, _minRecvAmount, _factorySwapAddresses, { ...curve.options, value, gasLimit })).hash
}
