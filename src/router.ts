import axios from "axios";
import memoize from "memoizee";
import BigNumber from "bignumber.js";
import { ethers } from "ethers";
import { curve } from "./curve.js";
import { IDict, ISwapType, IRoute, IRouteTvl, IRouteOutputAndCost } from "./interfaces";
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


const MAX_STEPS = 5;
const ROUTE_LENGTH = (MAX_STEPS * 2) + 1;

// 4 --> 6, 5 --> 7 not allowed
// 4 --> 7, 5 --> 6 allowed
const _handleSwapType = (swapType: ISwapType): string => {
    if (swapType === 6) return "4";
    if (swapType === 7) return "5";
    return swapType.toString()
}

const _getNewRoute = (
    routeTvl: IRouteTvl,
    poolId: string,
    swapAddress: string,
    inputCoinAddress: string,
    outputCoinAddress: string,
    swapParams: [number, number, ISwapType, number, number],  // i, j, swap_type, pool_type, n_coins
    poolAddress: string,
    basePool: string,
    baseToken: string,
    secondBasePool: string,
    secondBaseToken: string,
    tvl: number
): IRouteTvl => {
    const routePoolIdsPlusSwapType = routeTvl.route.map((s) => s.poolId + "+" + _handleSwapType(s.swapParams[2]));
    // Steps <= MAX_STEPS
    if (routePoolIdsPlusSwapType.length >= MAX_STEPS) return { route: [], minTvl: Infinity, totalTvl: 0 };
    // Exclude such cases as cvxeth -> tricrypto2 -> tricrypto2 -> susd
    if (routePoolIdsPlusSwapType.includes(poolId + "+" + _handleSwapType(swapParams[2]))) return { route: [], minTvl: Infinity, totalTvl: 0 };
    return {
        route: [
            ...routeTvl.route,
            { poolId, swapAddress, inputCoinAddress, outputCoinAddress, swapParams, poolAddress, basePool, baseToken, secondBasePool, secondBaseToken },
        ],
        minTvl: Math.min(tvl, routeTvl.minTvl),
        totalTvl: routeTvl.totalTvl + tvl,
    }
}

const MAX_ROUTES_FOR_ONE_COIN = 3;
const _filterRoutes = (routes: IRouteTvl[], inputCoinAddress: string, sortFn: (a: IRouteTvl, b: IRouteTvl) => number) => {
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
    swapAddress: string,
    inCoin: string,
    outCoin: string,
    swapParams: [number, number, ISwapType, number, number],  // i, j, swap_type, pool_type, n_coins
    poolAddress: string,
    basePool: string,
    baseToken: string,
    secondBasePool: string,
    secondBaseToken: string,
    tvl: number
): void => {
    const newRoutesByTvl: IRouteTvl[] = routesByTvl[inCoin].map((route) =>
        _getNewRoute(route, poolId, swapAddress, inCoin, outCoin, swapParams, poolAddress, basePool, baseToken, secondBasePool, secondBaseToken, tvl)
    );

    const newRoutesByLength: IRouteTvl[] = routesByLength[inCoin].map((route) =>
        _getNewRoute(route, poolId, swapAddress, inCoin, outCoin, swapParams, poolAddress, basePool, baseToken, secondBasePool, secondBaseToken, tvl)
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

const SNX = {
    1: {
        swap: "0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F".toLowerCase(),
        coins: [  // Ethereum
            "0x57Ab1ec28D129707052df4dF418D58a2D46d5f51", // sUSD
            "0xD71eCFF9342A5Ced620049e616c5035F1dB98620", // sEUR
            "0x5e74C9036fb86BD7eCdcb084a0673EFc32eA31cb", // sETH
            "0xfE18be6b3Bd88A2D2A7f928d00292E7a9963CfC6", // sBTC
        ].map((a) => a.toLowerCase()),
    },
    10: {
        swap: "0x8700dAec35aF8Ff88c16BdF0418774CB3D7599B4".toLowerCase(),
        coins: [  // Optimism
            "0x8c6f28f2f1a3c87f0f938b96d27520d9751ec8d9", // sUSD
            "0xFBc4198702E81aE77c06D58f81b629BDf36f0a71", // sEUR
            "0xe405de8f52ba7559f9df3c368500b6e6ae6cee49", // sETH
            "0x298b9b95708152ff6968aafd889c6586e9169f1d", // sBTC
        ].map((a) => a.toLowerCase()),
    },
}

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

    for (let step = 0; step < MAX_STEPS; step++) {
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
                    [0, 0, 8, 0, 0],
                    curve.constants.ZERO_ADDRESS,
                    curve.constants.ZERO_ADDRESS,
                    curve.constants.ZERO_ADDRESS,
                    curve.constants.ZERO_ADDRESS,
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
                        outCoin === "frxETH" ? "frxETH minter" : outCoin,
                        outCoin === "frxETH" ? "0xbAFA44EFE7901E04E39Dad13167D089C559c1138".toLowerCase() : curve.constants.COINS[outCoin.toLowerCase()],
                        inCoin,
                        curve.constants.COINS[outCoin.toLowerCase()],
                        [0, 0, 8, 0, 0],
                        curve.constants.ZERO_ADDRESS,
                        curve.constants.ZERO_ADDRESS,
                        curve.constants.ZERO_ADDRESS,
                        curve.constants.ZERO_ADDRESS,
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
                    curve.constants.COINS["wsteth"],
                    inCoin,
                    outCoin,
                    [0, 0, 8, 0, 0],
                    curve.constants.ZERO_ADDRESS,
                    curve.constants.ZERO_ADDRESS,
                    curve.constants.ZERO_ADDRESS,
                    curve.constants.ZERO_ADDRESS,
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
                    "sfrxETH",
                    curve.constants.COINS["sfrxeth"],
                    inCoin,
                    outCoin,
                    [0, 0, 8, 0, 0],
                    curve.constants.ZERO_ADDRESS,
                    curve.constants.ZERO_ADDRESS,
                    curve.constants.ZERO_ADDRESS,
                    curve.constants.ZERO_ADDRESS,
                    curve.constants.ZERO_ADDRESS,
                    Infinity
                )

                nextCoins.add(outCoin);
            }

            // SNX swaps
            // @ts-ignore
            if ((SNX[curve.chainId]?.coins ?? []).includes(inCoin)) {
                // @ts-ignore
                for (const outCoin of SNX[curve.chainId].coins) {
                    if (inCoin === outCoin) continue;
                    _updateRoutes(
                        inputCoinAddress,
                        routesByTvl,
                        routesByLength,
                        "SNX exchange",
                        // @ts-ignore
                        SNX[curve.chainId].swap,
                        inCoin,
                        outCoin,
                        [0, 0, 9, 0, 0],
                        curve.constants.ZERO_ADDRESS,
                        curve.constants.ZERO_ADDRESS,
                        curve.constants.ZERO_ADDRESS,
                        curve.constants.ZERO_ADDRESS,
                        curve.constants.ZERO_ADDRESS,
                        Infinity
                    )

                    nextCoins.add(outCoin);
                }
            }

            for (const [poolId, poolData] of ALL_POOLS) {
                const wrapped_coin_addresses = poolData.wrapped_coin_addresses.map((a: string) => a.toLowerCase());
                const underlying_coin_addresses = poolData.underlying_coin_addresses.map((a: string) => a.toLowerCase());
                const pool_address = poolData.swap_address.toLowerCase();
                const token_address = poolData.token_address.toLowerCase();
                const is_aave_like_lending = poolData.is_lending && wrapped_coin_addresses.length === 3 && !poolData.deposit_address;
                const pool_type = poolData.is_llamma ? 4 : poolData.is_crypto ? Math.min(poolData.wrapped_coins.length, 3) : 1;
                const tvl_multiplier = poolData.is_crypto ? 1 : (amplificationCoefficientDict[poolData.swap_address] ?? 1);
                const base_pool = poolData.is_meta ? { ...curve.constants.POOLS_DATA, ...curve.constants.FACTORY_POOLS_DATA }[poolData.base_pool as string] : null;
                const base_pool_address = base_pool ? base_pool.swap_address.toLowerCase() : curve.constants.ZERO_ADDRESS;
                let base_token_address = base_pool ? base_pool.token_address.toLowerCase() : curve.constants.ZERO_ADDRESS;
                const second_base_pool = base_pool && base_pool.base_pool ? {
                    ...curve.constants.POOLS_DATA,
                    ...curve.constants.FACTORY_POOLS_DATA,
                    ...curve.constants.CRVUSD_FACTORY_POOLS_DATA,
                }[base_pool.base_pool as string] : null;
                const second_base_pool_address = second_base_pool ? second_base_pool.swap_address.toLowerCase() : curve.constants.ZERO_ADDRESS;
                // for double meta underlying (crv/tricrypto, wmatic/tricrypto)
                if (base_pool && second_base_pool_address !== curve.constants.ZERO_ADDRESS) base_token_address = base_pool.deposit_address?.toLowerCase() as string;
                const second_base_token_address = second_base_pool ? second_base_pool.token_address.toLowerCase() : curve.constants.ZERO_ADDRESS;
                const meta_coin_addresses = base_pool ? base_pool.underlying_coin_addresses.map((a: string) => a.toLowerCase()) : [];
                let swap_address = poolData.is_fake ? poolData.deposit_address?.toLowerCase() as string : pool_address;

                const inCoinIndexes = {
                    wrapped_coin: wrapped_coin_addresses.indexOf(inCoin),
                    underlying_coin: underlying_coin_addresses.indexOf(inCoin),
                    meta_coin: meta_coin_addresses ? meta_coin_addresses.indexOf(inCoin) : -1,
                }

                // Skip pools which don't contain inCoin
                if (inCoinIndexes.wrapped_coin === -1 && inCoinIndexes.underlying_coin === -1 && inCoinIndexes.meta_coin === -1 && inCoin !== token_address) continue;

                const tvl = (await _getTVL(poolId)) * tvl_multiplier;
                // Skip empty pools
                if (curve.chainId === 1 && tvl < 1000) continue;
                if (curve.chainId !== 1 && tvl < 100) continue;

                // LP -> wrapped coin "swaps" (actually remove_liquidity_one_coin)
                if (!poolData.is_fake && !poolData.is_llamma && wrapped_coin_addresses.length < 6 && inCoin === token_address) {
                    for (let j = 0; j < wrapped_coin_addresses.length; j++) {
                        // Looking for outputCoinAddress only on the final step
                        if (step === MAX_STEPS - 1 && wrapped_coin_addresses[j] !== outputCoinAddress) continue;

                        // Exclude such cases as cvxeth -> tricrypto2 -> tusd -> susd or cvxeth -> tricrypto2 -> susd -> susd
                        const outputCoinIdx = wrapped_coin_addresses.indexOf(outputCoinAddress);
                        if (outputCoinIdx >= 0 && j !== outputCoinIdx) continue;

                        _updateRoutes(
                            inputCoinAddress,
                            routesByTvl,
                            routesByLength,
                            poolId,
                            swap_address,
                            inCoin,
                            wrapped_coin_addresses[j],
                            [0, j, 6, pool_type, wrapped_coin_addresses.length],
                            curve.constants.ZERO_ADDRESS,
                            curve.constants.ZERO_ADDRESS,
                            curve.constants.ZERO_ADDRESS,
                            curve.constants.ZERO_ADDRESS,
                            curve.constants.ZERO_ADDRESS,
                            tvl
                        )

                        nextCoins.add(wrapped_coin_addresses[j]);
                    }
                }

                // LP -> underlying coin "swaps" (actually remove_liquidity_one_coin)
                if ((poolData.is_fake || is_aave_like_lending) && underlying_coin_addresses.length < 6 && inCoin === token_address) {
                    for (let j = 0; j < underlying_coin_addresses.length; j++) {
                        // Looking for outputCoinAddress only on the final step
                        if (step === MAX_STEPS - 1 && underlying_coin_addresses[j] !== outputCoinAddress) continue;

                        // Exclude such cases as cvxeth -> tricrypto2 -> tusd -> susd or cvxeth -> tricrypto2 -> susd -> susd
                        const outputCoinIdx = underlying_coin_addresses.indexOf(outputCoinAddress);
                        if (outputCoinIdx >= 0 && j !== outputCoinIdx) continue;

                        const swapType = is_aave_like_lending ? 7 : 6;

                        _updateRoutes(
                            inputCoinAddress,
                            routesByTvl,
                            routesByLength,
                            poolId,
                            swap_address,
                            inCoin,
                            underlying_coin_addresses[j],
                            [0, j, swapType, pool_type, underlying_coin_addresses.length],
                            curve.constants.ZERO_ADDRESS,
                            curve.constants.ZERO_ADDRESS,
                            curve.constants.ZERO_ADDRESS,
                            curve.constants.ZERO_ADDRESS,
                            curve.constants.ZERO_ADDRESS,
                            tvl
                        )

                        nextCoins.add(underlying_coin_addresses[j]);
                    }
                }

                // Wrapped coin -> LP "swaps" (actually add_liquidity)
                if (!poolData.is_fake && !poolData.is_llamma && wrapped_coin_addresses.length < 6 && inCoinIndexes.wrapped_coin >= 0) {
                    // Looking for outputCoinAddress only on the final step
                    if (!(step === MAX_STEPS - 1 && token_address !== outputCoinAddress)) {

                        _updateRoutes(
                            inputCoinAddress,
                            routesByTvl,
                            routesByLength,
                            poolId,
                            swap_address,
                            inCoin,
                            token_address,
                            [wrapped_coin_addresses.indexOf(inCoin), 0, 4, pool_type, wrapped_coin_addresses.length],
                            curve.constants.ZERO_ADDRESS,
                            curve.constants.ZERO_ADDRESS,
                            curve.constants.ZERO_ADDRESS,
                            curve.constants.ZERO_ADDRESS,
                            curve.constants.ZERO_ADDRESS,
                            tvl
                        )

                        nextCoins.add(token_address);
                    }
                }

                // Underlying coin -> LP "swaps" (actually add_liquidity)
                if ((poolData.is_fake || is_aave_like_lending) && underlying_coin_addresses.length < 6 && inCoinIndexes.underlying_coin >= 0) {
                    // Looking for outputCoinAddress only on the final step
                    if (!(step === MAX_STEPS - 1 && token_address !== outputCoinAddress)) {
                        const swapType = is_aave_like_lending ? 5 : 4;

                        _updateRoutes(
                            inputCoinAddress,
                            routesByTvl,
                            routesByLength,
                            poolId,
                            swap_address,
                            inCoin,
                            token_address,
                            [underlying_coin_addresses.indexOf(inCoin), 0, swapType, pool_type, underlying_coin_addresses.length],
                            curve.constants.ZERO_ADDRESS,
                            curve.constants.ZERO_ADDRESS,
                            curve.constants.ZERO_ADDRESS,
                            curve.constants.ZERO_ADDRESS,
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
                        if (step === MAX_STEPS - 1 && wrapped_coin_addresses[j] !== outputCoinAddress) continue;
                        // Exclude such cases as cvxeth -> tricrypto2 -> tusd -> susd or cvxeth -> tricrypto2 -> susd -> susd
                        const outputCoinIdx = wrapped_coin_addresses.indexOf(outputCoinAddress);
                        if (outputCoinIdx >= 0 && j !== outputCoinIdx) continue;

                        _updateRoutes(
                            inputCoinAddress,
                            routesByTvl,
                            routesByLength,
                            poolId,
                            pool_address,
                            inCoin,
                            wrapped_coin_addresses[j],
                            [inCoinIndexes.wrapped_coin, j, 1, pool_type, wrapped_coin_addresses.length],
                            pool_address,
                            base_pool_address,
                            base_token_address,
                            second_base_pool_address,
                            second_base_token_address,
                            tvl
                        )

                        nextCoins.add(wrapped_coin_addresses[j]);
                    }
                }

                // Only for underlying swaps
                swap_address = (poolData.is_crypto && poolData.is_meta) || (base_pool?.is_lending && poolData.is_factory) ?
                    poolData.deposit_address as string : poolData.swap_address;

                // Underlying swaps
                if (!poolData.is_plain && inCoinIndexes.underlying_coin >= 0) {
                    for (let j = 0; j < underlying_coin_addresses.length; j++) {
                        if (j === inCoinIndexes.underlying_coin) continue;
                        // Don't swap metacoins since they can be swapped directly in base pool
                        if (inCoinIndexes.meta_coin >= 0 && meta_coin_addresses.includes(underlying_coin_addresses[j])) continue;
                        // Looking for outputCoinAddress only on the final step
                        if (step === MAX_STEPS - 1 && underlying_coin_addresses[j] !== outputCoinAddress) continue;
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
                            swap_address,
                            inCoin,
                            underlying_coin_addresses[j],
                            [inCoinIndexes.underlying_coin, j, swapType, pool_type, underlying_coin_addresses.length],
                            pool_address,
                            base_pool_address,
                            base_token_address,
                            second_base_pool_address,
                            second_base_token_address,
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

const _getExchangeArgs = (route: IRoute): {
    _route: string[],
    _swapParams: number[][],
    _pools: string[],
    _basePools: string[],
    _baseTokens: string[],
    _secondBasePools: string[],
    _secondBaseTokens: string[]
} => {
    let _route = [];
    if (route.length > 0) _route.push(route[0].inputCoinAddress);
    let _swapParams = [];
    let _pools = [];
    let _basePools = [];
    let _baseTokens = [];
    let _secondBasePools = [];
    let _secondBaseTokens = [];
    for (const routeStep of route) {
        _route.push(routeStep.swapAddress, routeStep.outputCoinAddress);
        _swapParams.push(routeStep.swapParams);
        _pools.push(routeStep.poolAddress);
        _basePools.push(routeStep.basePool);
        _baseTokens.push(routeStep.baseToken);
        _secondBasePools.push(routeStep.secondBasePool);
        _secondBaseTokens.push(routeStep.secondBaseToken);
    }
    _route = _route.concat(Array(ROUTE_LENGTH - _route.length).fill(curve.constants.ZERO_ADDRESS));
    _swapParams = _swapParams.concat(Array(MAX_STEPS - _swapParams.length).fill([0, 0, 0, 0, 0]));
    _pools = _pools.concat(Array(MAX_STEPS - _pools.length).fill(curve.constants.ZERO_ADDRESS));
    _basePools = _basePools.concat(Array(MAX_STEPS - _basePools.length).fill(curve.constants.ZERO_ADDRESS));
    _baseTokens = _baseTokens.concat(Array(MAX_STEPS - _baseTokens.length).fill(curve.constants.ZERO_ADDRESS));
    _secondBasePools = _secondBasePools.concat(Array(MAX_STEPS - _secondBasePools.length).fill(curve.constants.ZERO_ADDRESS));
    _secondBaseTokens = _secondBaseTokens.concat(Array(MAX_STEPS - _secondBaseTokens.length).fill(curve.constants.ZERO_ADDRESS));

    return { _route, _swapParams, _pools, _basePools, _baseTokens, _secondBasePools, _secondBaseTokens }
}

const _estimatedGasForDifferentRoutesCache: IDict<{ gas: bigint, time: number }> = {};

const _estimateGasForDifferentRoutes = async (routes: IRoute[], inputCoinAddress: string, outputCoinAddress: string, _amount: bigint): Promise<number[]> => {
    inputCoinAddress = inputCoinAddress.toLowerCase();
    outputCoinAddress = outputCoinAddress.toLowerCase();

    const contract = curve.contracts[curve.constants.ALIASES.router].contract;
    const gasPromises: Promise<bigint>[] = [];
    const value = isEth(inputCoinAddress) ? _amount : curve.parseUnits("0");
    for (const route of routes) {
        const routeKey = _getRouteKey(route, inputCoinAddress, outputCoinAddress);
        let gasPromise: Promise<bigint>;
        const { _route, _swapParams, _pools } = _getExchangeArgs(route);

        if ((_estimatedGasForDifferentRoutesCache[routeKey]?.time || 0) + 3600000 < Date.now()) {
            gasPromise = contract.exchange.estimateGas(_route, _swapParams, _amount, 0, _pools, { ...curve.constantOptions, value});
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
            const multicallContract = curve.contracts[curve.constants.ALIASES.router].multicallContract;
            for (const r of routesRaw) {
                const { _route, _swapParams, _pools } = _getExchangeArgs(r.route);
                calls.push(multicallContract.get_dy(_route, _swapParams, _amount, _pools));
            }

            const _outputAmounts = await curve.multicallProvider.all(calls) as bigint[];

            for (let i = 0; i < _outputAmounts.length; i++) {
                routesRaw[i]._output = _outputAmounts[i];
                routes.push(routesRaw[i]);
            }
        } catch (err) {
            // const promises = [];
            // const contract = curve.contracts[curve.constants.ALIASES.router].contract;
            // for (const r of routesRaw) {
            //     const { _route, _swapParams, _pools } = _getExchangeArgs(r.route);
            //     promises.push(contract.get_dy(_route, _swapParams, _amount, _pools, curve.constantOptions));
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

            const contract = curve.contracts[curve.constants.ALIASES.router].contract;
            const _outputs = [];
            for (const r of routesRaw) {
                const { _route, _swapParams, _pools } = _getExchangeArgs(r.route);
                try {
                    _outputs.push(await contract.get_dy(_route, _swapParams, _amount, _pools, curve.constantOptions));
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
        const contract = curve.contracts[curve.constants.ALIASES.router].contract;
        const { _route, _swapParams, _pools } = _getExchangeArgs(route);
        return await contract.get_dy(_route, _swapParams, _amount, _pools, curve.constantOptions);
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

export const swapRequired = async (route: IRoute, outAmount: number | string): Promise<string> => {
    const inputCoinAddress = route[0].inputCoinAddress;
    const outputCoinAddress = route[route.length - 1].outputCoinAddress;
    const [inputCoinDecimals, outputCoinDecimals] = _getCoinDecimals(inputCoinAddress, outputCoinAddress);
    const _outAmount = parseUnits(outAmount, outputCoinDecimals);
    const contract = curve.contracts[curve.constants.ALIASES.router].contract;
    const { _route, _swapParams, _pools, _basePools, _baseTokens, _secondBasePools, _secondBaseTokens } = _getExchangeArgs(route);

    let _required = 0;
    if ("get_dx(address[11],uint256[5][5],uint256,address[5],address[5],address[5],address[5],address[5])" in contract) {
        _required = await contract.get_dx(_route, _swapParams, _outAmount, _pools, _basePools, _baseTokens, _secondBasePools, _secondBaseTokens, curve.constantOptions);
    } else {
        _required = await contract.get_dx(_route, _swapParams, _outAmount, _pools, _basePools, _baseTokens, curve.constantOptions);
    }

    return curve.formatUnits(_required, inputCoinDecimals)
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

    const contract = curve.contracts[curve.constants.ALIASES.router].contract;
    let _smallAmount = fromBN(smallAmountIntBN.div(10 ** inputCoinDecimals), inputCoinDecimals);
    const { _route, _swapParams, _pools } = _getExchangeArgs(route);
    let _smallOutput: bigint;
    try {
        _smallOutput = await contract.get_dy(_route, _swapParams, _smallAmount, _pools, curve.constantOptions);
    } catch (e) {
        _smallAmount = curve.parseUnits("1", inputCoinDecimals);  // Dirty hack
        _smallOutput = await contract.get_dy(_route, _swapParams, _smallAmount, _pools, curve.constantOptions);
    }
    const priceImpactBN = _get_price_impact(_amount, _output, _smallAmount, _smallOutput, inputCoinDecimals, outputCoinDecimals);

    return Number(_cutZeros(priceImpactBN.toFixed(4)))
}

export const swapIsApproved = async (inputCoin: string, amount: number | string): Promise<boolean> => {
    return await hasAllowance([inputCoin], [amount], curve.signerAddress, curve.constants.ALIASES.router);
}

export const swapApproveEstimateGas = async (inputCoin: string, amount: number | string): Promise<number> => {
    return await ensureAllowanceEstimateGas([inputCoin], [amount], curve.constants.ALIASES.router);
}

export const swapApprove = async (inputCoin: string, amount: number | string): Promise<string[]> => {
    return await ensureAllowance([inputCoin], [amount], curve.constants.ALIASES.router);
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

    const { _route, _swapParams, _pools } = _getExchangeArgs(route);
    const _amount = parseUnits(amount, inputCoinDecimals);
    const minRecvAmountBN: BigNumber = BN(output).times(100 - slippage).div(100);
    const _minRecvAmount = fromBN(minRecvAmountBN, outputCoinDecimals);

    const contract = curve.contracts[curve.constants.ALIASES.router].contract;
    const value = isEth(inputCoinAddress) ? _amount : curve.parseUnits("0");

    await curve.updateFeeData();
    const gasLimit = (await contract.exchange.estimateGas(
        _route,
        _swapParams,
        _amount,
        _minRecvAmount,
        _pools,
        { ...curve.constantOptions, value }
    )) * (curve.chainId === 1 ? curve.parseUnits("130", 0) : curve.parseUnits("160", 0)) / curve.parseUnits("100", 0);
    return await contract.exchange(_route, _swapParams, _amount, _minRecvAmount, _pools, { ...curve.options, value, gasLimit })
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
                [`address[${ROUTE_LENGTH}]`, `uint256[${MAX_STEPS}][${MAX_STEPS}]`, `address[${MAX_STEPS}]`, 'uint256', 'uint256'],
                ethers.dataSlice(txInfo.logs[txInfo.logs.length - i].data, 0)
            );
            break;
        } catch (err) {}
    }

    if (res === undefined) return '0.0'

    return curve.formatUnits(res[res.length - 1], outputCoinDecimals);
}
