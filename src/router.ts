import axios from "axios";
import memoize from "memoizee";
import BigNumber from "bignumber.js";
import { ethers } from "ethers";
import { curve } from "./curve.js";
import { IDict, IRoute, IRouteTvl, IRouteOutputAndCost } from "./interfaces";
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
    ETH_ADDRESS,
    _get_small_x,
    _get_price_impact,
} from "./utils.js";
import { getPool } from "./pools/index.js";
import { _getAmplificationCoefficientsFromApi } from "./pools/utils.js";


const _getNewRoute = (
    routeTvl: IRouteTvl,
    poolId: string,
    poolAddress: string,
    inputCoinAddress: string,
    outputCoinAddress: string,
    i: number,
    j: number,
    swapType: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
    swapAddress: string,
    tvl: number
): IRouteTvl => {
    const routePoolIds = routeTvl.route.map((s) => s.poolId);
    // Steps <= 4
    if (routePoolIds.length >= 4) return { route: [], minTvl: Infinity, totalTvl: 0 };
    // Exclude such cases as cvxeth -> tricrypto2 -> tricrypto2 -> susd
    if (routePoolIds.includes(poolId)) return { route: [], minTvl: Infinity, totalTvl: 0 };
    return {
        route: [...routeTvl.route, { poolId, poolAddress, inputCoinAddress, outputCoinAddress, i, j, swapType, swapAddress }],
        minTvl: Math.min(tvl, routeTvl.minTvl),
        totalTvl: routeTvl.totalTvl + tvl,
    }
}

// TODO REMOVE IT!!!
const _filterAvax = (routes: IRouteTvl[]) => {
    return routes.filter((r) => {
        for (const step of r.route) {
            if (step.poolId == 'avaxcrypto' && step.swapType == 4 && (step.i === 3 || step.j === 3)) return false;
        }

        return true
    });
}

const MAX_ROUTES_FOR_ONE_COIN = 3;
const _filterRoutes = (routes: IRouteTvl[], inputCoinAddress: string, sortFn: (a: IRouteTvl, b: IRouteTvl) => number) => {
    // TODO REMOVE IT!!!
    if (curve.chainId === 43114) routes = _filterAvax(routes);
    return routes
        .filter((r) => r.route.length > 0)
        .filter((r) => r.route[0].inputCoinAddress === inputCoinAddress) // Truncated routes
        .filter((r, i, _routes) => {
            const routesByPoolIds = _routes.map((r) => r.route.map((s) => s.poolId).toString());
            return routesByPoolIds.indexOf(r.route.map((s) => s.poolId).toString()) === i;
        }) // Route duplications
        .sort(sortFn).slice(0, MAX_ROUTES_FOR_ONE_COIN);
}

const _sortByTvl = (a: IRouteTvl, b: IRouteTvl) => b.minTvl - a.minTvl || b.totalTvl - a.totalTvl || a.route.length - b.route.length;
const _sortByLength = (a: IRouteTvl, b: IRouteTvl) => a.route.length - b.route.length || b.minTvl - a.minTvl || b.totalTvl - a.totalTvl;

const _updateRoutes = (
    inputCoinAddress: string,
    routesByTvl: IDict<IRouteTvl[]>,
    routesByLength: IDict<IRouteTvl[]>,
    poolId: string,
    poolAddress: string,
    inCoin: string,
    outCoin: string,
    i: number,
    j: number,
    swapType: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
    swapAddress: string,
    tvl: number
): void => {
    const newRoutesByTvl: IRouteTvl[] = routesByTvl[inCoin].map(
        (route) => _getNewRoute(route, poolId, poolAddress, inCoin, outCoin, i, j, swapType, swapAddress, tvl)
    );

    const newRoutesByLength: IRouteTvl[] = routesByLength[inCoin].map(
        (route) => _getNewRoute(route, poolId, poolAddress, inCoin, outCoin, i, j, swapType, swapAddress, tvl)
    );

    routesByTvl[outCoin] = [...(routesByTvl[outCoin] ?? []), ...newRoutesByTvl]
    routesByTvl[outCoin] = _filterRoutes(routesByTvl[outCoin], inputCoinAddress, _sortByTvl);

    routesByLength[outCoin] = [...(routesByLength[outCoin] ?? []), ...newRoutesByLength]
    routesByLength[outCoin] = _filterRoutes(routesByLength[outCoin], inputCoinAddress, _sortByLength);
}

const _getTVL = memoize(
    async (poolId: string) => Number(await (getPool(poolId)).stats.totalLiquidity()),
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
    });

// Inspired by Dijkstra's algorithm
const _findAllRoutes = async (inputCoinAddress: string, outputCoinAddress: string): Promise<IRoute[]> => {
    inputCoinAddress = inputCoinAddress.toLowerCase();
    outputCoinAddress = outputCoinAddress.toLowerCase();

    const ALL_POOLS = Object.entries(curve.getPoolsData()).filter(([id, _]) => id !== "crveth");
    const amplificationCoefficientDict = await _getAmplificationCoefficientsFromApi();

    // Coins we are searching routes for on the current step
    let curCoins: string[] = [inputCoinAddress];
    // Coins we will search routes for on the next step
    let nextCoins: Set<string> = new Set();
    // Routes for all coins found
    const routesByTvl: IDict<IRouteTvl[]> = {
        [inputCoinAddress]: [{ route: [], minTvl: Infinity, totalTvl: 0 }],
    };
    const routesByLength: IDict<IRouteTvl[]> = {
        [inputCoinAddress]: [{ route: [], minTvl: Infinity, totalTvl: 0 }],
    };

    // No more than 4 steps (swaps)
    for (let step = 0; step < 4; step++) {
        for (const inCoin of curCoins) {

            // ETH <-> WETH (exclude Celo)
            if (curve.chainId !== 42220 && [curve.constants.NATIVE_TOKEN.address, curve.constants.NATIVE_TOKEN.wrappedAddress].includes(inCoin)) {
                const outCoin = inCoin === curve.constants.NATIVE_TOKEN.address ? curve.constants.NATIVE_TOKEN.wrappedAddress : curve.constants.NATIVE_TOKEN.address;

                _updateRoutes(
                    inputCoinAddress,
                    routesByTvl,
                    routesByLength,
                    "WETH",
                    curve.constants.NATIVE_TOKEN.wrappedAddress,
                    inCoin,
                    outCoin,
                    0,
                    0,
                    8,
                    curve.constants.ZERO_ADDRESS,
                    Infinity
                )

                nextCoins.add(outCoin);
            }

            // ETH -> stETH, ETH -> frxETH, ETH -> wBETH (Ethereum only)
            if (curve.chainId == 1 && inCoin === curve.constants.NATIVE_TOKEN.address) {
                for (const outCoin of ["stETH", "frxETH", "wBETH"]) {
                    _updateRoutes(
                        inputCoinAddress,
                        routesByTvl,
                        routesByLength,
                        outCoin,
                        curve.constants.NATIVE_TOKEN.wrappedAddress,
                        inCoin,
                        curve.constants.COINS[outCoin.toLowerCase()],
                        0,
                        0,
                        8,
                        curve.constants.ZERO_ADDRESS,
                        Infinity
                    )

                    nextCoins.add(curve.constants.COINS[outCoin.toLowerCase()]);
                }
            }

            // stETH <-> wstETH (Ethereum only)
            if (curve.chainId === 1 && [curve.constants.COINS.steth, curve.constants.COINS.wsteth].includes(inCoin)) {
                const outCoin = inCoin === curve.constants.COINS.steth ? curve.constants.COINS.wsteth : curve.constants.COINS.steth;

                _updateRoutes(
                    inputCoinAddress,
                    routesByTvl,
                    routesByLength,
                    "wstETH",
                    curve.constants.NATIVE_TOKEN.wrappedAddress,
                    inCoin,
                    outCoin,
                    0,
                    0,
                    8,
                    curve.constants.ZERO_ADDRESS,
                    Infinity
                )

                nextCoins.add(outCoin);
            }

            // frxETH <-> sfrxETH (Ethereum only)
            if (curve.chainId === 1 && [curve.constants.COINS.frxeth, curve.constants.COINS.sfrxeth].includes(inCoin)) {
                const outCoin = inCoin === curve.constants.COINS.frxeth ? curve.constants.COINS.sfrxeth : curve.constants.COINS.frxeth;

                _updateRoutes(
                    inputCoinAddress,
                    routesByTvl,
                    routesByLength,
                    "frxETH",
                    curve.constants.NATIVE_TOKEN.wrappedAddress,
                    inCoin,
                    outCoin,
                    0,
                    0,
                    8,
                    curve.constants.ZERO_ADDRESS,
                    Infinity
                )

                nextCoins.add(outCoin);
            }
            for (const [poolId, poolData] of ALL_POOLS) {
                const wrapped_coin_addresses = poolData.wrapped_coin_addresses.map((a: string) => a.toLowerCase());
                const underlying_coin_addresses = poolData.underlying_coin_addresses.map((a: string) => a.toLowerCase());
                const base_pool = poolData.is_meta ? { ...curve.constants.POOLS_DATA, ...curve.constants.FACTORY_POOLS_DATA }[poolData.base_pool as string] : null;
                const meta_coin_addresses = base_pool ? base_pool.underlying_coin_addresses.map((a: string) => a.toLowerCase()) : [];
                const token_address = poolData.token_address.toLowerCase();
                const is_aave_like_lending = poolData.is_lending && wrapped_coin_addresses.length === 3 && !poolData.deposit_address;
                const tvlMultiplier = poolData.is_crypto ? 1 : (amplificationCoefficientDict[poolData.swap_address] ?? 1);

                const inCoinIndexes = {
                    wrapped_coin: wrapped_coin_addresses.indexOf(inCoin),
                    underlying_coin: underlying_coin_addresses.indexOf(inCoin),
                    meta_coin: meta_coin_addresses ? meta_coin_addresses.indexOf(inCoin) : -1,
                }

                // Skip pools which don't contain inCoin
                if (inCoinIndexes.wrapped_coin === -1 && inCoinIndexes.underlying_coin === -1 && inCoinIndexes.meta_coin === -1 && inCoin !== token_address) continue;

                // TODO remove it!!!!
                const tvl = poolId.startsWith('factory-crvusd-') ? 500000 * 100 : (await _getTVL(poolId)) * tvlMultiplier;
                // Skip empty pools
                if (tvl === 0) continue;

                let poolAddress = poolData.is_fake ? poolData.deposit_address as string : poolData.swap_address;
                const coin_addresses = (is_aave_like_lending || poolData.is_fake) ? underlying_coin_addresses : wrapped_coin_addresses;

                // LP -> wrapped coin (underlying for lending or fake pool) "swaps" (actually remove_liquidity_one_coin)
                if (coin_addresses.length < 6 && inCoin === token_address) {
                    for (let j = 0; j < coin_addresses.length; j++) {
                        // Looking for outputCoinAddress only on the final step
                        if (step === 3 && coin_addresses[j] !== outputCoinAddress) continue;

                        // Exclude such cases as cvxeth -> tricrypto2 -> tusd -> susd or cvxeth -> tricrypto2 -> susd -> susd
                        const outputCoinIdx = coin_addresses.indexOf(outputCoinAddress);
                        if (outputCoinIdx >= 0 && j !== outputCoinIdx) continue;

                        const swapType = is_aave_like_lending ? 7 : 6;

                        _updateRoutes(
                            inputCoinAddress,
                            routesByTvl,
                            routesByLength,
                            poolId,
                            poolAddress,
                            inCoin,
                            coin_addresses[j],
                            0,
                            j,
                            swapType,
                            curve.constants.ZERO_ADDRESS,
                            tvl
                        )

                        nextCoins.add(coin_addresses[j]);
                    }
                }

                // Wrapped coin (underlying for lending or fake pool) -> LP "swaps" (actually add_liquidity)
                const inCoinIndex = (is_aave_like_lending || poolData.is_fake) ? inCoinIndexes.underlying_coin : inCoinIndexes.wrapped_coin;
                if (coin_addresses.length < 6 && inCoinIndex >= 0 && !poolData.is_llamma) {
                    // Looking for outputCoinAddress only on the final step
                    if (!(step === 3 && token_address !== outputCoinAddress)) {
                        const swapType = is_aave_like_lending ? 5 : 4;

                        _updateRoutes(
                            inputCoinAddress,
                            routesByTvl,
                            routesByLength,
                            poolId,
                            poolAddress,
                            inCoin,
                            token_address,
                            coin_addresses.indexOf(inCoin),
                            0,
                            swapType,
                            curve.constants.ZERO_ADDRESS,
                            tvl
                        )

                        nextCoins.add(token_address);
                    }
                }

                // Wrapped swaps
                if (inCoinIndexes.wrapped_coin >= 0 && !poolData.is_fake) {
                    for (let j = 0; j < wrapped_coin_addresses.length; j++) {
                        if (j === inCoinIndexes.wrapped_coin) continue;
                        // Native swaps spend less gas
                        if (wrapped_coin_addresses[j] !== outputCoinAddress && wrapped_coin_addresses[j] === curve.constants.NATIVE_TOKEN.wrappedAddress) continue;
                        // Looking for outputCoinAddress only on the final step
                        if (step === 3 && wrapped_coin_addresses[j] !== outputCoinAddress) continue;
                        // Exclude such cases as cvxeth -> tricrypto2 -> tusd -> susd or cvxeth -> tricrypto2 -> susd -> susd
                        const outputCoinIdx = wrapped_coin_addresses.indexOf(outputCoinAddress);
                        if (outputCoinIdx >= 0 && j !== outputCoinIdx) continue;

                        _updateRoutes(
                            inputCoinAddress,
                            routesByTvl,
                            routesByLength,
                            poolId,
                            poolData.swap_address,
                            inCoin,
                            wrapped_coin_addresses[j],
                            inCoinIndexes.wrapped_coin,
                            j,
                            1,
                            curve.constants.ZERO_ADDRESS,
                            tvl
                        )

                        nextCoins.add(wrapped_coin_addresses[j]);
                    }
                }

                // Only for underlying swaps
                poolAddress = (poolData.is_crypto && poolData.is_meta) || (base_pool?.is_lending && poolData.is_factory) ?
                    poolData.deposit_address as string : poolData.swap_address;

                // Underlying swaps
                if (!poolData.is_plain && inCoinIndexes.underlying_coin >= 0) {
                    for (let j = 0; j < underlying_coin_addresses.length; j++) {
                        if (j === inCoinIndexes.underlying_coin) continue;
                        // Don't swap metacoins since they can be swapped directly in base pool
                        if (inCoinIndexes.meta_coin >= 0 && meta_coin_addresses.includes(underlying_coin_addresses[j])) continue;
                        // Looking for outputCoinAddress only on the final step
                        if (step === 3 && underlying_coin_addresses[j] !== outputCoinAddress) continue;
                        // Exclude such cases as cvxeth -> tricrypto2 -> tusd -> susd or cvxeth -> tricrypto2 -> susd -> susd
                        const outputCoinIdx = underlying_coin_addresses.indexOf(outputCoinAddress);
                        if (outputCoinIdx >= 0 && j !== outputCoinIdx) continue;
                        // Skip empty pools
                        if (tvl === 0) continue;

                        const hasEth = (inCoin === curve.constants.NATIVE_TOKEN.address || underlying_coin_addresses[j] === curve.constants.NATIVE_TOKEN.address);
                        const swapType = (poolData.is_crypto && poolData.is_meta && poolData.is_factory) || (base_pool?.is_lending && poolData.is_factory) ? 3
                            : hasEth && poolId !== 'avaxcrypto' ? 1
                            : 2;

                        _updateRoutes(
                            inputCoinAddress,
                            routesByTvl,
                            routesByLength,
                            poolId,
                            poolAddress,
                            inCoin,
                            underlying_coin_addresses[j],
                            inCoinIndexes.underlying_coin,
                            j,
                            swapType,
                            (swapType === 3) ? poolData.swap_address : curve.constants.ZERO_ADDRESS,
                            tvl
                        )

                        nextCoins.add(underlying_coin_addresses[j]);
                    }
                }
            }
        }

        curCoins = Array.from(nextCoins);
        nextCoins = new Set();
    }

    const routes = [...(routesByTvl[outputCoinAddress] ?? []), ...(routesByLength[outputCoinAddress] ?? [])];

    return routes.map((r) => r.route);
}

const _getRouteKey = (route: IRoute, inputCoinAddress: string, outputCoinAddress: string): string => {
    const sortedCoins = [inputCoinAddress, outputCoinAddress].sort();
    let key = `${sortedCoins[0]}-->`;
    for (const routeStep of route) {
        key += `${routeStep.poolId}-->`;
    }
    key += sortedCoins[1];

    return key
}

const _getExchangeMultipleArgs = (route: IRoute): { _route: string[], _swapParams: number[][], _factorySwapAddresses: string[] } => {
    let _route = [];
    if (route.length > 0) _route.push(route[0].inputCoinAddress);
    let _swapParams = [];
    let _factorySwapAddresses = [];
    for (const routeStep of route) {
        _route.push(routeStep.poolAddress, routeStep.outputCoinAddress);
        _swapParams.push([routeStep.i, routeStep.j, routeStep.swapType]);
        _factorySwapAddresses.push(routeStep.swapAddress);
    }
    _route = _route.concat(Array(9 - _route.length).fill(curve.constants.ZERO_ADDRESS));
    _swapParams = _swapParams.concat(Array(4 - _swapParams.length).fill([0, 0, 0]));
    _factorySwapAddresses = _factorySwapAddresses.concat(Array(4 - _factorySwapAddresses.length).fill(curve.constants.ZERO_ADDRESS));

    return { _route, _swapParams, _factorySwapAddresses }
}

const _estimatedGasForDifferentRoutesCache: IDict<{ gas: bigint, time: number }> = {};

const _estimateGasForDifferentRoutes = async (routes: IRoute[], inputCoinAddress: string, outputCoinAddress: string, _amount: bigint): Promise<number[]> => {
    inputCoinAddress = inputCoinAddress.toLowerCase();
    outputCoinAddress = outputCoinAddress.toLowerCase();

    const contract = curve.contracts[curve.constants.ALIASES.registry_exchange].contract;
    const gasPromises: Promise<bigint>[] = [];
    const value = isEth(inputCoinAddress) ? _amount : curve.parseUnits("0");
    for (const route of routes) {
        const routeKey = _getRouteKey(route, inputCoinAddress, outputCoinAddress);
        let gasPromise: Promise<bigint>;
        const { _route, _swapParams, _factorySwapAddresses } = _getExchangeMultipleArgs(route);

        if ((_estimatedGasForDifferentRoutesCache[routeKey]?.time || 0) + 3600000 < Date.now()) {
            gasPromise = contract.exchange_multiple.estimateGas(_route, _swapParams, _amount, 0, _factorySwapAddresses, { ...curve.constantOptions, value});
        } else {
            gasPromise = Promise.resolve(_estimatedGasForDifferentRoutesCache[routeKey].gas);
        }

        gasPromises.push(gasPromise);
    }

    try {
        const _gasAmounts: bigint[] = await Promise.all(gasPromises);

        routes.forEach((route, i: number) => {
            const routeKey = _getRouteKey(route, inputCoinAddress, outputCoinAddress);
            _estimatedGasForDifferentRoutesCache[routeKey] = { 'gas': _gasAmounts[i], 'time': Date.now() };
        })

        return _gasAmounts.map((_g) => Number(curve.formatUnits(_g, 0)));
    } catch (err) { // No allowance
        return routes.map(() => 0);
    }
}

const _getBestRoute = memoize(
    async (inputCoinAddress: string, outputCoinAddress: string, amount: number | string): Promise<IRoute> => {
        const [inputCoinDecimals, outputCoinDecimals] = _getCoinDecimals(inputCoinAddress, outputCoinAddress);
        const _amount = parseUnits(amount, inputCoinDecimals);
        if (_amount === curve.parseUnits("0")) return [];

        const routesRaw: IRouteOutputAndCost[] = (await _findAllRoutes(inputCoinAddress, outputCoinAddress)).map(
            (route) => ({ route, _output: curve.parseUnits("0"), outputUsd: 0, txCostUsd: 0 })
        );
        const routes: IRouteOutputAndCost[] = [];

        try {
            const calls = [];
            const multicallContract = curve.contracts[curve.constants.ALIASES.registry_exchange].multicallContract;
            for (const r of routesRaw) {
                const { _route, _swapParams, _factorySwapAddresses } = _getExchangeMultipleArgs(r.route);
                calls.push(multicallContract.get_exchange_multiple_amount(_route, _swapParams, _amount, _factorySwapAddresses));
            }

            const _outputAmounts = await curve.multicallProvider.all(calls) as bigint[];

            for (let i = 0; i < _outputAmounts.length; i++) {
                routesRaw[i]._output = _outputAmounts[i];
                routes.push(routesRaw[i]);
            }
        } catch (err) {
            // const promises = [];
            // const contract = curve.contracts[curve.constants.ALIASES.registry_exchange].contract;
            // for (const r of routesRaw) {
            //     const { _route, _swapParams, _factorySwapAddresses } = _getExchangeMultipleArgs(r.route);
            //     promises.push(contract.get_exchange_multiple_amount(_route, _swapParams, _amount, _factorySwapAddresses, curve.constantOptions));
            // }
            //
            // const res = await Promise.allSettled(promises);
            //
            // for (let i = 0; i < res.length; i++) {
            //     if (res[i].status === 'rejected') {
            //         console.log(`Route ${(routesRaw[i].route.map((s) => s.poolId)).join(" --> ")} is unavailable`);
            //         continue;
            //     }
            //     routesRaw[i]._output = (res[i] as PromiseFulfilledResult<bigint>).value;
            //     routes.push(routesRaw[i]);
            // }

            const contract = curve.contracts[curve.constants.ALIASES.registry_exchange].contract;
            const _outputs = [];
            for (const r of routesRaw) {
                const { _route, _swapParams, _factorySwapAddresses } = _getExchangeMultipleArgs(r.route);
                try {
                    _outputs.push(await contract.get_exchange_multiple_amount(_route, _swapParams, _amount, _factorySwapAddresses, curve.constantOptions));
                } catch (e) {
                    _outputs.push(curve.parseUnits('-1', 0));
                }
            }

            for (let i = 0; i < _outputs.length; i++) {
                if (_outputs[i] < 0) {
                    console.log(`Route ${(routesRaw[i].route.map((s) => s.poolId)).join(" --> ")} is unavailable`);
                    continue;
                }
                routesRaw[i]._output = _outputs[i];
                routes.push(routesRaw[i]);
            }
        }

        if (routes.length === 0) return [];
        if (routes.length === 1) return routes[0].route;

        const [gasAmounts, outputCoinUsdRate, gasData, ethUsdRate] = await Promise.all([
            _estimateGasForDifferentRoutes(routes.map((r) => r.route), inputCoinAddress, outputCoinAddress, _amount),
            _getUsdRate(outputCoinAddress),
            axios.get("https://api.curve.fi/api/getGas"),
            _getUsdRate(ETH_ADDRESS),
        ]);
        const gasPrice = gasData.data.data.gas.standard;
        const expectedAmounts = (routes).map(
            (route) => Number(curve.formatUnits(route._output, outputCoinDecimals))
        );

        const expectedAmountsUsd = expectedAmounts.map((a) => a * outputCoinUsdRate);
        const txCostsUsd = gasAmounts.map((a) => ethUsdRate * a * gasPrice / 1e18);

        routes.forEach((route, i) => {
            route.outputUsd = expectedAmountsUsd[i];
            route.txCostUsd = txCostsUsd[i]
        });

        return routes.reduce((route1, route2) => {
            const diff = (route1.outputUsd - route1.txCostUsd) - (route2.outputUsd - route2.txCostUsd);
            if (diff > 0) return route1
            if (diff === 0 && route1.route.length < route2.route.length) return route1
            return route2
        }).route;
    },
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
    }
)

const _getOutputForRoute = memoize(
    async (route: IRoute, _amount: bigint): Promise<bigint> => {
        const contract = curve.contracts[curve.constants.ALIASES.registry_exchange].contract;
        const { _route, _swapParams, _factorySwapAddresses } = _getExchangeMultipleArgs(route);
        return await contract.get_exchange_multiple_amount(_route, _swapParams, _amount, _factorySwapAddresses, curve.constantOptions);
    },
    {
        promise: true,
        maxAge: 15 * 1000, // 15s
    }
);

export const getBestRouteAndOutput = async (inputCoin: string, outputCoin: string, amount: number | string): Promise<{ route: IRoute, output: string }> => {
    const [inputCoinAddress, outputCoinAddress] = _getCoinAddresses(inputCoin, outputCoin);
    const [inputCoinDecimals, outputCoinDecimals] = _getCoinDecimals(inputCoinAddress, outputCoinAddress);

    const route = await _getBestRoute(inputCoinAddress, outputCoinAddress, amount); // 5 minutes cache
    if (route.length === 0) return { route, output: '0.0' };

    const _output = await _getOutputForRoute(route, parseUnits(amount, inputCoinDecimals)); // 15 seconds cache, so we call it to get fresh output estimation

    return { route, output: curve.formatUnits(_output, outputCoinDecimals) }
}

export const swapExpected = async (inputCoin: string, outputCoin: string, amount: number | string): Promise<string> => {
    return (await getBestRouteAndOutput(inputCoin, outputCoin, amount))['output'];
}

export const swapPriceImpact = async (inputCoin: string, outputCoin: string, amount: number | string): Promise<number> => {
    const [inputCoinAddress, outputCoinAddress] = _getCoinAddresses(inputCoin, outputCoin);
    const [inputCoinDecimals, outputCoinDecimals] = _getCoinDecimals(inputCoinAddress, outputCoinAddress);
    const { route, output } = await getBestRouteAndOutput(inputCoinAddress, outputCoinAddress, amount);
    const _amount = parseUnits(amount, inputCoinDecimals);
    const _output = parseUnits(output, outputCoinDecimals);

    const smallAmountIntBN = _get_small_x(_amount, _output, inputCoinDecimals, outputCoinDecimals);
    const amountIntBN = toBN(_amount, 0);
    if (smallAmountIntBN.gte(amountIntBN)) return 0;

    const contract = curve.contracts[curve.constants.ALIASES.registry_exchange].contract;
    let _smallAmount = fromBN(smallAmountIntBN.div(10 ** inputCoinDecimals), inputCoinDecimals);
    const { _route, _swapParams, _factorySwapAddresses } = _getExchangeMultipleArgs(route);
    let _smallOutput: bigint;
    try {
        _smallOutput = await contract.get_exchange_multiple_amount(_route, _swapParams, _smallAmount, _factorySwapAddresses, curve.constantOptions);
    } catch (e) {
        _smallAmount = curve.parseUnits("1", inputCoinDecimals);  // Dirty hack
        _smallOutput = await contract.get_exchange_multiple_amount(_route, _swapParams, _smallAmount, _factorySwapAddresses, curve.constantOptions);
    }
    const priceImpactBN = _get_price_impact(_amount, _output, _smallAmount, _smallOutput, inputCoinDecimals, outputCoinDecimals);

    return Number(_cutZeros(priceImpactBN.toFixed(4)))
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
    const { route } = await getBestRouteAndOutput(inputCoinAddress, outputCoinAddress, amount);
    if (route.length === 0) return 0

    const _amount = parseUnits(amount, inputCoinDecimals);
    const [gas] = await _estimateGasForDifferentRoutes([route], inputCoinAddress, outputCoinAddress, _amount);
    return gas
}

export const swap = async (inputCoin: string, outputCoin: string, amount: number | string, slippage = 0.5): Promise<ethers.ContractTransactionResponse> => {
    const [inputCoinAddress, outputCoinAddress] = _getCoinAddresses(inputCoin, outputCoin);
    const [inputCoinDecimals, outputCoinDecimals] = _getCoinDecimals(inputCoinAddress, outputCoinAddress);

    await swapApprove(inputCoin, amount);
    const { route, output } = await getBestRouteAndOutput(inputCoinAddress, outputCoinAddress, amount);

    if (route.length === 0) {
        throw new Error("This pair can't be exchanged");
    }

    const { _route, _swapParams, _factorySwapAddresses } = _getExchangeMultipleArgs(route);
    const _amount = parseUnits(amount, inputCoinDecimals);
    const minRecvAmountBN: BigNumber = BN(output).times(100 - slippage).div(100);
    const _minRecvAmount = fromBN(minRecvAmountBN, outputCoinDecimals);

    const contract = curve.contracts[curve.constants.ALIASES.registry_exchange].contract;
    const value = isEth(inputCoinAddress) ? _amount : curve.parseUnits("0");

    await curve.updateFeeData();
    const gasLimit = (await contract.exchange_multiple.estimateGas(
        _route,
        _swapParams,
        _amount,
        _minRecvAmount,
        _factorySwapAddresses,
        { ...curve.constantOptions, value }
    )) * (curve.chainId === 1 ? curve.parseUnits("130", 0) : curve.parseUnits("160", 0)) / curve.parseUnits("100", 0);
    return await contract.exchange_multiple(_route, _swapParams, _amount, _minRecvAmount, _factorySwapAddresses, { ...curve.options, value, gasLimit })
}

export const getSwappedAmount = async (tx: ethers.ContractTransactionResponse, outputCoin: string): Promise<string> => {
    const [outputCoinAddress] = _getCoinAddresses(outputCoin);
    const [outputCoinDecimals] = _getCoinDecimals(outputCoinAddress);
    const txInfo: ethers.ContractTransactionReceipt | null = await tx.wait();

    if (txInfo === null) return '0.0'

    let res;
    for (let i = 1; i <= txInfo.logs.length; i++) {
        try {
            const abiCoder = ethers.AbiCoder.defaultAbiCoder()
            res = abiCoder.decode(
                ['address[9]', 'uint256[3][4]', 'address[4]', 'uint256', 'uint256'],
                ethers.dataSlice(txInfo.logs[txInfo.logs.length - i].data, 0)
            );
            break;
        } catch (err) {}
    }

    if (res === undefined) return '0.0'

    return curve.formatUnits(res[res.length - 1], outputCoinDecimals);
}
