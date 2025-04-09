import {IDict, IExtendedPoolDataFromApi, INetworkName, IPoolType} from "./interfaces.js";
import {uncached_getAllPoolsFromApi, uncached_getCrvApyFromApi, uncached_getUsdPricesFromApi} from './external-api.js'
import {curve} from "./curve";

const memoize = <TResult, TParams extends any[], TFunc extends (...args: TParams) => Promise<TResult>>(fn: TFunc, {maxAge}: {
    maxAge: number
}) => {
    const cache: Record<string, Promise<TResult>> = {};
    const cachedFn = async (...args: TParams): Promise<TResult> => {
        const key = JSON.stringify(args);
        if (key in cache) {
            return cache[key];
        }
        const promise = fn(...args);
        cache[key] = promise;
        try {
            const result = await promise;
            setTimeout(() => delete cache[key], maxAge);
            return result;
        } catch (e) {
            delete cache[key];
            throw e;
        }
    };
    cachedFn.set = (result: TResult, ...args: TParams) => {
        const key = JSON.stringify(args);
        setTimeout(() => delete cache[key], maxAge);
        cache[key] = Promise.resolve(result);
    }
    return cachedFn as TFunc & { set: (result: TResult, ...args: TParams) => void };
}

function createCache(poolsDict: Record<"main" | "crypto" | "factory" | "factory-crvusd" | "factory-eywa" | "factory-crypto" | "factory-twocrypto" | "factory-tricrypto" | "factory-stable-ng", IExtendedPoolDataFromApi>) {
    const poolLists = Object.values(poolsDict)
    const usdPrices = uncached_getUsdPricesFromApi(poolLists);
    const crvApy = uncached_getCrvApyFromApi(poolLists)
    return {poolsDict, poolLists, usdPrices, crvApy};
}

const _getCachedData = memoize(
    async (network: INetworkName, isLiteChain: boolean) => createCache(await uncached_getAllPoolsFromApi(network, isLiteChain))
    , {
        maxAge: 1000 * 60 * 5, // 5 minutes
    })

export const _getPoolsFromApi =
    async (network: INetworkName, poolType: IPoolType, isLiteChain = false): Promise<IExtendedPoolDataFromApi> => {
        const {poolsDict} = await _getCachedData(network, isLiteChain);
        return poolsDict[poolType]
    }

export const _setPoolsFromApi =
    (network: INetworkName, isLiteChain: boolean, data: Record<IPoolType, IExtendedPoolDataFromApi>): void =>
        _getCachedData.set(
            createCache(data),
            network,
            isLiteChain
        )

export const _getAllPoolsFromApi = async (network: INetworkName, isLiteChain = false): Promise<IExtendedPoolDataFromApi[]> => {
    const {poolLists} = await _getCachedData(network, isLiteChain);
    return poolLists
}

export const _getUsdPricesFromApi = async (): Promise<IDict<number>> => {
    const network = curve.constants.NETWORK_NAME;
    const {usdPrices} = await _getCachedData(network, false);
    return usdPrices
}

export const _getCrvApyFromApi = async (): Promise<IDict<[number, number]>> => {
    const network = curve.constants.NETWORK_NAME;
    const {crvApy} = await _getCachedData(network, false);
    return crvApy
}
