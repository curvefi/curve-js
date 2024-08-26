// important: only type imports, the worker needs to be standalone
import type {IChainId, IDict, IPoolData, IRouteStep, ISwapType} from "./interfaces";
import type {curve} from "./curve";

export type IRouteGraphInput = {
    constants: typeof curve['constants'],
    chainId: IChainId,
    allPools: [string, IPoolData][],
    amplificationCoefficientDict: IDict<number>,
    poolTvlDict: IDict<number>
};

export function routeGraphWorker() {
    const GRAPH_MAX_EDGES = 3;
    const SNX = {
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

    const createRouteGraph = ({constants, chainId, allPools, amplificationCoefficientDict, poolTvlDict}: IRouteGraphInput): IDict<IDict<IRouteStep[]>> => {
        const routerGraph: IDict<IDict<IRouteStep[]>> = {}
        // ETH <-> WETH (exclude Celo)
        if (chainId !== 42220) {
            routerGraph[constants.NATIVE_TOKEN.address] = {};
            routerGraph[constants.NATIVE_TOKEN.address][constants.NATIVE_TOKEN.wrappedAddress] = [{
                poolId: "WETH wrapper",
                swapAddress: constants.NATIVE_TOKEN.wrappedAddress,
                inputCoinAddress: constants.NATIVE_TOKEN.address,
                outputCoinAddress: constants.NATIVE_TOKEN.wrappedAddress,
                swapParams: [0, 0, 8, 0, 0],
                poolAddress: constants.ZERO_ADDRESS,
                basePool: constants.ZERO_ADDRESS,
                baseToken: constants.ZERO_ADDRESS,
                secondBasePool: constants.ZERO_ADDRESS,
                secondBaseToken: constants.ZERO_ADDRESS,
                tvl: Infinity,
            }];

            routerGraph[constants.NATIVE_TOKEN.wrappedAddress] = {};
            routerGraph[constants.NATIVE_TOKEN.wrappedAddress][constants.NATIVE_TOKEN.address] = [{
                poolId: "WETH wrapper",
                swapAddress: constants.NATIVE_TOKEN.wrappedAddress,
                inputCoinAddress: constants.NATIVE_TOKEN.wrappedAddress,
                outputCoinAddress: constants.NATIVE_TOKEN.address,
                swapParams: [0, 0, 8, 0, 0],
                poolAddress: constants.ZERO_ADDRESS,
                basePool: constants.ZERO_ADDRESS,
                baseToken: constants.ZERO_ADDRESS,
                secondBasePool: constants.ZERO_ADDRESS,
                secondBaseToken: constants.ZERO_ADDRESS,
                tvl: Infinity,
            }];
        }

        // ETH -> stETH, ETH -> frxETH, ETH -> wBETH (Ethereum only)
        if (chainId == 1) {
            for (const outCoin of ["stETH", "frxETH", "wBETH"]) {
                routerGraph[constants.NATIVE_TOKEN.address][constants.COINS[outCoin.toLowerCase()]] = [{
                    poolId: outCoin + " minter",
                    swapAddress: outCoin === "frxETH" ? "0xbAFA44EFE7901E04E39Dad13167D089C559c1138".toLowerCase() : constants.COINS[outCoin.toLowerCase()],
                    inputCoinAddress: constants.NATIVE_TOKEN.address,
                    outputCoinAddress: constants.COINS[outCoin.toLowerCase()],
                    swapParams: [0, 0, 8, 0, 0],
                    poolAddress: constants.ZERO_ADDRESS,
                    basePool: constants.ZERO_ADDRESS,
                    baseToken: constants.ZERO_ADDRESS,
                    secondBasePool: constants.ZERO_ADDRESS,
                    secondBaseToken: constants.ZERO_ADDRESS,
                    tvl: Infinity,
                }]
            }
        }

        // stETH <-> wstETH (Ethereum only)
        if (chainId === 1) {
            routerGraph[constants.COINS.steth] = {};
            routerGraph[constants.COINS.steth][constants.COINS.wsteth] = [{
                poolId: "wstETH wrapper",
                swapAddress: constants.COINS.wsteth,
                inputCoinAddress: constants.COINS.steth,
                outputCoinAddress: constants.COINS.wsteth,
                swapParams: [0, 0, 8, 0, 0],
                poolAddress: constants.ZERO_ADDRESS,
                basePool: constants.ZERO_ADDRESS,
                baseToken: constants.ZERO_ADDRESS,
                secondBasePool: constants.ZERO_ADDRESS,
                secondBaseToken: constants.ZERO_ADDRESS,
                tvl: Infinity,
            }];

            routerGraph[constants.COINS.wsteth] = {};
            routerGraph[constants.COINS.wsteth][constants.COINS.steth] = [{
                poolId: "wstETH wrapper",
                swapAddress: constants.COINS.wsteth,
                inputCoinAddress: constants.COINS.wsteth,
                outputCoinAddress: constants.COINS.steth,
                swapParams: [0, 0, 8, 0, 0],
                poolAddress: constants.ZERO_ADDRESS,
                basePool: constants.ZERO_ADDRESS,
                baseToken: constants.ZERO_ADDRESS,
                secondBasePool: constants.ZERO_ADDRESS,
                secondBaseToken: constants.ZERO_ADDRESS,
                tvl: Infinity,
            }];
        }

        // frxETH <-> sfrxETH (Ethereum only)
        if (chainId === 1) {
            routerGraph[constants.COINS.frxeth] = {};
            routerGraph[constants.COINS.frxeth][constants.COINS.sfrxeth] = [{
                poolId: "sfrxETH wrapper",
                swapAddress: constants.COINS.sfrxeth,
                inputCoinAddress: constants.COINS.frxeth,
                outputCoinAddress: constants.COINS.sfrxeth,
                swapParams: [0, 0, 8, 0, 0],
                poolAddress: constants.ZERO_ADDRESS,
                basePool: constants.ZERO_ADDRESS,
                baseToken: constants.ZERO_ADDRESS,
                secondBasePool: constants.ZERO_ADDRESS,
                secondBaseToken: constants.ZERO_ADDRESS,
                tvl: Infinity,
            }];

            routerGraph[constants.COINS.sfrxeth] = {};
            routerGraph[constants.COINS.sfrxeth][constants.COINS.frxeth] = [{
                poolId: "sfrxETH wrapper",
                swapAddress: constants.COINS.sfrxeth,
                inputCoinAddress: constants.COINS.sfrxeth,
                outputCoinAddress: constants.COINS.frxeth,
                swapParams: [0, 0, 8, 0, 0],
                poolAddress: constants.ZERO_ADDRESS,
                basePool: constants.ZERO_ADDRESS,
                baseToken: constants.ZERO_ADDRESS,
                secondBasePool: constants.ZERO_ADDRESS,
                secondBaseToken: constants.ZERO_ADDRESS,
                tvl: Infinity,
            }];
        }

        // SNX swaps
        if (chainId in SNX) {
        // @ts-ignore
            for (const inCoin of SNX[chainId].coins) {
            // @ts-ignore
                for (const outCoin of SNX[chainId].coins) {
                    if (inCoin === outCoin) continue;

                    if (!routerGraph[inCoin]) routerGraph[inCoin] = {};
                    routerGraph[inCoin][outCoin] = [{
                        poolId: "SNX exchanger",
                        // @ts-ignore
                        swapAddress: SNX[chainId].swap,
                        inputCoinAddress: inCoin,
                        outputCoinAddress: outCoin,
                        swapParams: [0, 0, 9, 0, 0],
                        poolAddress: constants.ZERO_ADDRESS,
                        basePool: constants.ZERO_ADDRESS,
                        baseToken: constants.ZERO_ADDRESS,
                        secondBasePool: constants.ZERO_ADDRESS,
                        secondBaseToken: constants.ZERO_ADDRESS,
                        tvl: Infinity,
                    }];
                }
            }
        }

        const start = Date.now();
        for (const poolItem of allPools) {
            const poolId = poolItem[0], poolData = poolItem[1];
            const wrappedCoinAddresses = poolData.wrapped_coin_addresses.map((a: string) => a.toLowerCase());
            const underlyingCoinAddresses = poolData.underlying_coin_addresses.map((a: string) => a.toLowerCase());
            const poolAddress = poolData.swap_address.toLowerCase();
            const tokenAddress = poolData.token_address.toLowerCase();
            const isAaveLikeLending = poolData.is_lending && wrappedCoinAddresses.length === 3 && !poolData.deposit_address;
            // pool_type: 1 - stable, 2 - twocrypto, 3 - tricrypto, 4 - llamma
            //            10 - stable-ng, 20 - twocrypto-ng, 30 - tricrypto-ng
            let poolType = poolData.is_llamma ? 4 : poolData.is_crypto ? Math.min(poolData.wrapped_coins.length, 3) : 1;
            if (poolData.is_ng) poolType *= 10;
            const tvlMultiplier = poolData.is_crypto ? 1 : (amplificationCoefficientDict[poolData.swap_address] ?? 1);
            const basePool = poolData.is_meta ? {...constants.POOLS_DATA, ...constants.FACTORY_POOLS_DATA}[poolData.base_pool as string] : null;
            const basePoolAddress = basePool ? basePool.swap_address.toLowerCase() : constants.ZERO_ADDRESS;
            let baseTokenAddress = basePool ? basePool.token_address.toLowerCase() : constants.ZERO_ADDRESS;
            const secondBasePool = basePool && basePool.base_pool ? {
                ...constants.POOLS_DATA,
                ...constants.FACTORY_POOLS_DATA,
                ...constants.CRVUSD_FACTORY_POOLS_DATA,
            }[basePool.base_pool as string] : null;
            const secondBasePoolAddress = secondBasePool ? secondBasePool.swap_address.toLowerCase() : constants.ZERO_ADDRESS;
            // for double meta underlying (crv/tricrypto, wmatic/tricrypto)
            if (basePool && secondBasePoolAddress !== constants.ZERO_ADDRESS) baseTokenAddress = basePool.deposit_address?.toLowerCase() as string;
            const secondBaseTokenAddress = secondBasePool ? secondBasePool.token_address.toLowerCase() : constants.ZERO_ADDRESS;
            const metaCoinAddresses = basePool ? basePool.underlying_coin_addresses.map((a: string) => a.toLowerCase()) : [];
            let swapAddress = poolData.is_fake ? poolData.deposit_address?.toLowerCase() as string : poolAddress;

            const tvl = poolTvlDict[poolId] * tvlMultiplier;
            // Skip empty pools
            if (chainId === 1 && tvl < 1000) continue;
            if (chainId !== 1 && tvl < 100) continue;

            const excludedUnderlyingSwaps = (poolId === 'ib' && chainId === 1) ||
            (poolId === 'geist' && chainId === 250) ||
            (poolId === 'saave' && chainId === 1);

            // Wrapped coin <-> LP "swaps" (actually add_liquidity/remove_liquidity_one_coin)
            if (!poolData.is_fake && !poolData.is_llamma && wrappedCoinAddresses.length < 6) {
                const coins = [tokenAddress].concat(wrappedCoinAddresses);
                for (let k = 0; k < coins.length; k++) {
                    for (let l = 0; l < coins.length; l++) {
                        if (k > 0 && l > 0) continue;
                        if (k == 0 && l == 0) continue;
                        const i = Math.max(k - 1, 0);
                        const j = Math.max(l - 1, 0);
                        const swapType = k == 0 ? 6 : 4;

                        if (!routerGraph[coins[k]]) routerGraph[coins[k]] = {};
                        if (!routerGraph[coins[k]][coins[l]]) routerGraph[coins[k]][coins[l]] = [];
                        routerGraph[coins[k]][coins[l]].push({
                            poolId,
                            swapAddress,
                            inputCoinAddress: coins[k],
                            outputCoinAddress: coins[l],
                            swapParams: [i, j, swapType, poolType, wrappedCoinAddresses.length],
                            poolAddress: constants.ZERO_ADDRESS,
                            basePool: constants.ZERO_ADDRESS,
                            baseToken: constants.ZERO_ADDRESS,
                            secondBasePool: constants.ZERO_ADDRESS,
                            secondBaseToken: constants.ZERO_ADDRESS,
                            tvl,
                        });
                    }
                }
            }

            // Underlying coin <-> LP "swaps" (actually add_liquidity/remove_liquidity_one_coin)
            if ((poolData.is_fake || isAaveLikeLending) && underlyingCoinAddresses.length < 6 && !excludedUnderlyingSwaps) {
                const coins = [tokenAddress].concat(underlyingCoinAddresses);
                for (let k = 0; k < coins.length; k++) {
                    for (let l = 0; l < coins.length; l++) {
                        if (k > 0 && l > 0) continue;
                        if (k == 0 && l == 0) continue;
                        const i = Math.max(k - 1, 0);
                        const j = Math.max(l - 1, 0);
                        let swapType: ISwapType = isAaveLikeLending ? 7 : 6;
                        if (k > 0) swapType = isAaveLikeLending ? 5 : 4;

                        if (!routerGraph[coins[k]]) routerGraph[coins[k]] = {};
                        if (!routerGraph[coins[k]][coins[l]]) routerGraph[coins[k]][coins[l]] = [];
                        routerGraph[coins[k]][coins[l]].push({
                            poolId,
                            swapAddress,
                            inputCoinAddress: coins[k],
                            outputCoinAddress: coins[l],
                            swapParams: [i, j, swapType, poolType, underlyingCoinAddresses.length],
                            poolAddress: constants.ZERO_ADDRESS,
                            basePool: constants.ZERO_ADDRESS,
                            baseToken: constants.ZERO_ADDRESS,
                            secondBasePool: constants.ZERO_ADDRESS,
                            secondBaseToken: constants.ZERO_ADDRESS,
                            tvl,
                        });
                    }
                }
            }

            // Wrapped swaps
            if (!poolData.is_fake) {
                for (let i = 0; i < wrappedCoinAddresses.length; i++) {
                    for (let j = 0; j < wrappedCoinAddresses.length; j++) {
                        if (i == j) continue;
                        if (!routerGraph[wrappedCoinAddresses[i]]) routerGraph[wrappedCoinAddresses[i]] = {};
                        if (!routerGraph[wrappedCoinAddresses[i]][wrappedCoinAddresses[j]]) routerGraph[wrappedCoinAddresses[i]][wrappedCoinAddresses[j]] = [];
                        routerGraph[wrappedCoinAddresses[i]][wrappedCoinAddresses[j]] = routerGraph[wrappedCoinAddresses[i]][wrappedCoinAddresses[j]].concat({
                            poolId,
                            swapAddress,
                            inputCoinAddress: wrappedCoinAddresses[i],
                            outputCoinAddress: wrappedCoinAddresses[j],
                            swapParams: [i, j, 1, poolType, wrappedCoinAddresses.length],
                            poolAddress,
                            basePool: basePoolAddress,
                            baseToken: baseTokenAddress,
                            secondBasePool: secondBasePoolAddress,
                            secondBaseToken: secondBaseTokenAddress,
                            tvl,
                        }).sort((a, b) => b.tvl - a.tvl).slice(0, GRAPH_MAX_EDGES);
                    }
                }
            }

            // Only for underlying swaps
            swapAddress = (poolData.is_crypto && poolData.is_meta) || (basePool?.is_lending && poolData.is_factory) ?
            poolData.deposit_address as string : poolData.swap_address;

            // Underlying swaps
            if (!poolData.is_plain && !excludedUnderlyingSwaps) {
                for (let i = 0; i < underlyingCoinAddresses.length; i++) {
                    for (let j = 0; j < underlyingCoinAddresses.length; j++) {
                        if (i === j) continue;
                        // Don't swap metacoins since they can be swapped directly in base pool
                        if (metaCoinAddresses.includes(underlyingCoinAddresses[i]) && metaCoinAddresses.includes(underlyingCoinAddresses[j])) continue;
                        // avWBTC is frozen by Aave on Avalanche, deposits are not working
                        if (chainId === 43114 && poolId === "atricrypto" && i === 3) continue;

                        const hasEth = underlyingCoinAddresses.includes(constants.NATIVE_TOKEN.address);
                        const swapType = (poolData.is_crypto && poolData.is_meta && poolData.is_factory) || (basePool?.is_lending && poolData.is_factory) ? 3
                            : hasEth && poolId !== 'avaxcrypto' ? 1 : 2;

                        if (!routerGraph[underlyingCoinAddresses[i]]) routerGraph[underlyingCoinAddresses[i]] = {};
                        if (!routerGraph[underlyingCoinAddresses[i]][underlyingCoinAddresses[j]]) routerGraph[underlyingCoinAddresses[i]][underlyingCoinAddresses[j]] = [];
                        routerGraph[underlyingCoinAddresses[i]][underlyingCoinAddresses[j]] = routerGraph[underlyingCoinAddresses[i]][underlyingCoinAddresses[j]].concat({
                            poolId,
                            swapAddress,
                            inputCoinAddress: underlyingCoinAddresses[i],
                            outputCoinAddress: underlyingCoinAddresses[j],
                            swapParams: [i, j, swapType, poolType, underlyingCoinAddresses.length],
                            poolAddress,
                            basePool: basePoolAddress,
                            baseToken: baseTokenAddress,
                            secondBasePool: secondBasePoolAddress,
                            secondBaseToken: secondBaseTokenAddress,
                            tvl,
                        }).sort((a, b) => b.tvl - a.tvl).slice(0, GRAPH_MAX_EDGES);
                    }
                }
            }
        }
        console.log(`Read ${allPools.length} pools`, `${Date.now() - start}ms, routerGraph: ${Object.keys(routerGraph).length} items`);
        return routerGraph;
    }

    if (typeof addEventListener === 'undefined') {
        return createRouteGraph; // for nodejs
    }

    addEventListener('message', (e) => {
        const { type } = e.data;
        if (type === 'createRouteGraph') {
            postMessage({ type, result: createRouteGraph(e.data) });
        }
    });
}

// this is a workaround to avoid importing web-worker in the main bundle (nextjs will try to inject invalid hot-reloading code)
export const routeGraphWorkerCode = `${routeGraphWorker.toString()}; ${routeGraphWorker.name}();`;
