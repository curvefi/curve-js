import memoize from "memoizee";
import BigNumber from "bignumber.js";
import {ethers} from "ethers";
import {curve} from "./curve.js";
import {IDict, IRoute, IRouteOutputAndCost, IRouteStep} from "./interfaces";
import {
    _cutZeros,
    _get_price_impact,
    _get_small_x,
    _getCoinAddresses,
    _getCoinDecimals,
    _getUsdRate,
    BN,
    DIGas,
    ensureAllowance,
    ensureAllowanceEstimateGas,
    ETH_ADDRESS,
    fromBN,
    getGasPriceFromL1,
    getTxCostsUsd,
    hasAllowance,
    isEth,
    parseUnits,
    runWorker,
    smartNumber,
    toBN,
} from "./utils.js";
import {getPool} from "./pools/index.js";
import {_getAmplificationCoefficientsFromApi} from "./pools/utils.js";
import {L2Networks} from "./constants/L2Networks.js";
import {IRouterWorkerInput, routeFinderWorker, routeFinderWorkerCode} from "./route-finder.worker.js";
import {IRouteGraphInput, routeGraphWorker, routeGraphWorkerCode} from "./route-graph.worker.js";

const MAX_STEPS = 5;
const ROUTE_LENGTH = (MAX_STEPS * 2) + 1;

const OLD_CHAINS = [1, 10, 56, 100, 137, 250, 1284, 2222, 8453, 42161, 42220, 43114, 1313161554];  // these chains have non-ng pools

const _getTVL = memoize(
    async (poolId: string) => Number(await (getPool(poolId)).stats.totalLiquidity()),
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
    });

async function entriesToDictAsync<T, U>(entries: [string, T][], mapper: (key: string, value: T) => Promise<U>): Promise<IDict<U>> {
    const result: IDict<U> = {};
    await Promise.all(entries.map(async ([key, value]) => result[key] = await mapper(key, value)));
    return result;
}

function mapDict<T, U>(dict: IDict<T>, mapper: (key: string, value: T) => U): IDict<U> {
    const result: IDict<U> = {};
    Object.entries(dict).forEach(([key, value]) => result[key] = mapper(key, value));
    return result;
}

const _buildRouteGraph = memoize(async (): Promise<IDict<IDict<IRouteStep[]>>> => {
    const constants = curve.constants;
    const chainId = curve.chainId;
    const allPools = Object.entries(curve.getPoolsData()).filter(([id]) => !["crveth", "y", "busd", "pax"].includes(id));
    const amplificationCoefficientDict = await _getAmplificationCoefficientsFromApi();
    const poolTvlDict: IDict<number> = await entriesToDictAsync(allPools, _getTVL);
    const input: IRouteGraphInput = {constants, chainId, allPools, amplificationCoefficientDict, poolTvlDict};
    return runWorker(routeGraphWorkerCode, routeGraphWorker, {type: 'createRouteGraph', ...input});
},
{
    promise: true,
    maxAge: 5 * 1000, // 5m
});

const _findRoutes = async (inputCoinAddress: string, outputCoinAddress: string): Promise<IRoute[]>  => {
    const routerGraph = await _buildRouteGraph();
    // extract only the fields we need for the worker
    const poolData = mapDict(
        curve.getPoolsData(),
        (_, { is_lending, wrapped_coin_addresses, underlying_coin_addresses, token_address }) => ({ is_lending, wrapped_coin_addresses, underlying_coin_addresses, token_address })
    );
    const input: IRouterWorkerInput = {inputCoinAddress, outputCoinAddress, routerGraph, poolData};
    return runWorker(routeFinderWorkerCode, routeFinderWorker, {type: 'findRoutes', ...input});
};

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
    _pools?: string[],
    _basePools?: string[],
    _baseTokens?: string[],
    _secondBasePools?: string[],
    _secondBaseTokens?: string[]
} => {
    if (OLD_CHAINS.includes(curve.chainId)) {
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

        return {_route, _swapParams, _pools, _basePools, _baseTokens, _secondBasePools, _secondBaseTokens}
    } else {  // RouterNgPoolsOnly
        let _route = [];
        if (route.length > 0) _route.push(route[0].inputCoinAddress);
        let _swapParams = [];
        for (const routeStep of route) {
            _route.push(routeStep.swapAddress, routeStep.outputCoinAddress);
            _swapParams.push(routeStep.swapParams.slice(0, 4));
        }
        _route = _route.concat(Array(ROUTE_LENGTH - _route.length).fill(curve.constants.ZERO_ADDRESS));
        _swapParams = _swapParams.concat(Array(MAX_STEPS - _swapParams.length).fill([0, 0, 0, 0]));

        return { _route, _swapParams }
    }
}

const _estimatedGasForDifferentRoutesCache: IDict<{ gas: bigint | bigint[], time: number }> = {};

const _estimateGasForDifferentRoutes = async (routes: IRoute[], inputCoinAddress: string, outputCoinAddress: string, _amount: bigint): Promise<Array<number | number[]>> => {
    inputCoinAddress = inputCoinAddress.toLowerCase();
    outputCoinAddress = outputCoinAddress.toLowerCase();

    const contract = curve.contracts[curve.constants.ALIASES.router].contract;
    const gasPromises: Promise<bigint | bigint[]>[] = [];
    const value = isEth(inputCoinAddress) ? _amount : curve.parseUnits("0");
    for (const route of routes) {
        const routeKey = _getRouteKey(route, inputCoinAddress, outputCoinAddress);
        let gasPromise: Promise<bigint | bigint[]>;
        const { _route, _swapParams, _pools } = _getExchangeArgs(route);

        if ((_estimatedGasForDifferentRoutesCache[routeKey]?.time || 0) + 3600000 < Date.now()) {
            if (_pools) {
                gasPromise = contract.exchange.estimateGas(_route, _swapParams, _amount, 0, _pools, { ...curve.constantOptions, value});
            } else {
                gasPromise = contract.exchange.estimateGas(_route, _swapParams, _amount, 0, { ...curve.constantOptions, value});
            }
        } else {
            gasPromise = Promise.resolve(_estimatedGasForDifferentRoutesCache[routeKey].gas);
        }

        gasPromises.push(gasPromise);
    }
    try {
        const _gasAmounts: Array<bigint | bigint[]> = await Promise.all(gasPromises);

        routes.forEach((route, i: number) => {
            const routeKey = _getRouteKey(route, inputCoinAddress, outputCoinAddress);
            _estimatedGasForDifferentRoutesCache[routeKey] = { 'gas': _gasAmounts[i], 'time': Date.now() };
        })

        return _gasAmounts.map((_g) => smartNumber(_g));
    } catch (err) { // No allowance
        return routes.map(() => 0);
    }
}

const _getBestRoute = memoize(
    async (inputCoinAddress: string, outputCoinAddress: string, amount: number | string): Promise<IRoute> => {
        const [inputCoinDecimals, outputCoinDecimals] = _getCoinDecimals(inputCoinAddress, outputCoinAddress);
        const _amount = parseUnits(amount, inputCoinDecimals);
        if (_amount === curve.parseUnits("0")) return [];

        const routesRaw: IRouteOutputAndCost[] = (await _findRoutes(inputCoinAddress, outputCoinAddress)).map(
            (route) => ({ route, _output: curve.parseUnits("0"), outputUsd: 0, txCostUsd: 0 })
        );
        const routes: IRouteOutputAndCost[] = [];

        try {
            const calls = [];
            const multicallContract = curve.contracts[curve.constants.ALIASES.router].multicallContract;
            for (const r of routesRaw) {
                const { _route, _swapParams, _pools } = _getExchangeArgs(r.route);
                if (_pools) {
                    calls.push(multicallContract.get_dy(_route, _swapParams, _amount, _pools));
                } else {
                    calls.push(multicallContract.get_dy(_route, _swapParams, _amount));
                }
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
                    if (_pools) {
                        _outputs.push(await contract.get_dy(_route, _swapParams, _amount, _pools, curve.constantOptions));
                    } else {
                        _outputs.push(await contract.get_dy(_route, _swapParams, _amount, curve.constantOptions));
                    }
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

        const [gasAmounts, outputCoinUsdRate, {data: gasData}, ethUsdRate] = await Promise.all([
            _estimateGasForDifferentRoutes(routes.map((r) => r.route), inputCoinAddress, outputCoinAddress, _amount),
            _getUsdRate(outputCoinAddress),
            fetch("https://api.curve.fi/api/getGas").then((r) => r.json() as any),
            _getUsdRate(ETH_ADDRESS),
        ]);
        const gasPrice = gasData.gas.standard;
        const expectedAmounts = (routes).map(
            (route) => Number(curve.formatUnits(route._output, outputCoinDecimals))
        );

        const expectedAmountsUsd = expectedAmounts.map((a) => a * outputCoinUsdRate);

        const L1GasPrice = L2Networks.includes(curve.chainId) ? await getGasPriceFromL1() : 0;

        const txCostsUsd = gasAmounts.map((a) => getTxCostsUsd(ethUsdRate, gasPrice, a, L1GasPrice));

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
        if (_pools) {
            return await contract.get_dy(_route, _swapParams, _amount, _pools, curve.constantOptions);
        } else {
            return await contract.get_dy(_route, _swapParams, _amount, curve.constantOptions);
        }
    },
    {
        promise: true,
        maxAge: 15 * 1000, // 15s
    }
);

const _routesCache: IDict<{ route: IRoute, output: string, timestamp: number }> = {};
const _getBestRouteAndOutput = (inputCoin: string, outputCoin: string, amount: number | string): { route: IRoute, output: string, timestamp: number } => {
    const [inputCoinAddress, outputCoinAddress] = _getCoinAddresses(inputCoin, outputCoin);
    const key = `${inputCoinAddress}-${outputCoinAddress}-${amount}`
    if (!(key in _routesCache)) throw Error("You must call getBestRouteAndOutput first");

    return _routesCache[key]
}
export const getBestRouteAndOutput = async (inputCoin: string, outputCoin: string, amount: number | string): Promise<{ route: IRoute, output: string }> => {
    const [inputCoinAddress, outputCoinAddress] = _getCoinAddresses(inputCoin, outputCoin);
    const [inputCoinDecimals, outputCoinDecimals] = _getCoinDecimals(inputCoinAddress, outputCoinAddress);

    const route = await _getBestRoute(inputCoinAddress, outputCoinAddress, amount); // 5 minutes cache
    if (route.length === 0) return { route, output: '0.0' };

    const _output = await _getOutputForRoute(route, parseUnits(amount, inputCoinDecimals)); // 15 seconds cache, so we call it to get fresh output estimation
    _routesCache[`${inputCoinAddress}-${outputCoinAddress}-${amount}`] = {
        route,
        output: curve.formatUnits(_output + BigInt(1), outputCoinDecimals),
        timestamp: Date.now(),
    }

    return { route, output: curve.formatUnits(_output + BigInt(1), outputCoinDecimals) }
}

export const getArgs = (route: IRoute): {
    _route: string[],
    _swapParams: number[][],
    _pools?: string[],
    _basePools?: string[],
    _baseTokens?: string[],
    _secondBasePools?: string[],
    _secondBaseTokens?: string[]
} => _getExchangeArgs(route)

export const swapExpected = async (inputCoin: string, outputCoin: string, amount: number | string): Promise<string> =>
    (await getBestRouteAndOutput(inputCoin, outputCoin, amount))['output']


export const swapRequired = async (inputCoin: string, outputCoin: string, outAmount: number | string): Promise<string> => {
    const [inputCoinAddress, outputCoinAddress] = _getCoinAddresses(inputCoin, outputCoin);
    const [inputCoinDecimals, outputCoinDecimals] = _getCoinDecimals(inputCoinAddress, outputCoinAddress);
    const _outAmount = parseUnits(outAmount, outputCoinDecimals);
    const p1 = (await _getUsdRate(inputCoinAddress)) || 1;
    const p2 = (await _getUsdRate(outputCoinAddress)) || 1;
    const approximateRequiredAmount = Number(outAmount) * p2 / p1;
    const route = await _getBestRoute(inputCoinAddress, outputCoinAddress, approximateRequiredAmount);

    const contract = curve.contracts[curve.constants.ALIASES.router].contract;
    const { _route, _swapParams, _pools, _basePools, _baseTokens, _secondBasePools, _secondBaseTokens } = _getExchangeArgs(route);

    let _required;
    if ("get_dx(address[11],uint256[5][5],uint256,address[5],address[5],address[5],address[5],address[5])" in contract) {
        _required = await contract.get_dx(_route, _swapParams, _outAmount, _pools, _basePools, _baseTokens, _secondBasePools, _secondBaseTokens, curve.constantOptions);
    } else if (_pools) {
        _required = await contract.get_dx(_route, _swapParams, _outAmount, _pools, _basePools, _baseTokens, curve.constantOptions);
    } else {
        _required = await contract.get_dx(_route, _swapParams, _outAmount, curve.constantOptions);
    }

    return curve.formatUnits(_required, inputCoinDecimals)
}

export const swapPriceImpact = async (inputCoin: string, outputCoin: string, amount: number | string): Promise<number> => {
    const [inputCoinAddress, outputCoinAddress] = _getCoinAddresses(inputCoin, outputCoin);
    const [inputCoinDecimals, outputCoinDecimals] = _getCoinDecimals(inputCoinAddress, outputCoinAddress);
    const { route, output } = _getBestRouteAndOutput(inputCoinAddress, outputCoinAddress, amount);
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
        if (_pools) {
            _smallOutput = await contract.get_dy(_route, _swapParams, _smallAmount, _pools, curve.constantOptions);
        } else {
            _smallOutput = await contract.get_dy(_route, _swapParams, _smallAmount, curve.constantOptions);
        }
    } catch (e) {
        _smallAmount = curve.parseUnits("1", inputCoinDecimals);  // Dirty hack
        if (_pools) {
            _smallOutput = await contract.get_dy(_route, _swapParams, _smallAmount, _pools, curve.constantOptions);
        } else {
            _smallOutput = await contract.get_dy(_route, _swapParams, _smallAmount, curve.constantOptions);
        }
    }
    const priceImpactBN = _get_price_impact(_amount, _output, _smallAmount, _smallOutput, inputCoinDecimals, outputCoinDecimals);

    return Number(_cutZeros(priceImpactBN.toFixed(4)))
}

export const swapIsApproved = async (inputCoin: string, amount: number | string): Promise<boolean> => {
    return await hasAllowance([inputCoin], [amount], curve.signerAddress, curve.constants.ALIASES.router);
}

export const swapApproveEstimateGas = async (inputCoin: string, amount: number | string): Promise<number | number[]> => {
    return await ensureAllowanceEstimateGas([inputCoin], [amount], curve.constants.ALIASES.router);
}

export const swapApprove = async (inputCoin: string, amount: number | string): Promise<string[]> => {
    return await ensureAllowance([inputCoin], [amount], curve.constants.ALIASES.router);
}

export const swapEstimateGas = async (inputCoin: string, outputCoin: string, amount: number | string): Promise<number | number[]> => {
    const [inputCoinAddress, outputCoinAddress] = _getCoinAddresses(inputCoin, outputCoin);
    const [inputCoinDecimals] = _getCoinDecimals(inputCoinAddress, outputCoinAddress);
    const { route } = _getBestRouteAndOutput(inputCoinAddress, outputCoinAddress, amount);
    if (route.length === 0) return 0

    const _amount = parseUnits(amount, inputCoinDecimals);
    const [gas] = await _estimateGasForDifferentRoutes([route], inputCoinAddress, outputCoinAddress, _amount);
    return gas
}

export const swap = async (inputCoin: string, outputCoin: string, amount: number | string, slippage = 0.5): Promise<ethers.ContractTransactionResponse> => {
    const [inputCoinAddress, outputCoinAddress] = _getCoinAddresses(inputCoin, outputCoin);
    const [inputCoinDecimals, outputCoinDecimals] = _getCoinDecimals(inputCoinAddress, outputCoinAddress);

    await swapApprove(inputCoin, amount);
    const { route, output } = _getBestRouteAndOutput(inputCoinAddress, outputCoinAddress, amount);

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
    if (_pools) {
        const gasLimit = (DIGas(await contract.exchange.estimateGas(
            _route,
            _swapParams,
            _amount,
            _minRecvAmount,
            _pools,
            { ...curve.constantOptions, value }
        ))) * (curve.chainId === 1 ? curve.parseUnits("130", 0) : curve.parseUnits("160", 0)) / curve.parseUnits("100", 0);
        return await contract.exchange(_route, _swapParams, _amount, _minRecvAmount, _pools, { ...curve.options, value, gasLimit });
    } else {
        const gasLimit = (DIGas(await contract.exchange.estimateGas(
            _route,
            _swapParams,
            _amount,
            _minRecvAmount,
            { ...curve.constantOptions, value }
        ))) * curve.parseUnits("160", 0) / curve.parseUnits("100", 0);
        return await contract.exchange(_route, _swapParams, _amount, _minRecvAmount, { ...curve.options, value, gasLimit });
    }
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
