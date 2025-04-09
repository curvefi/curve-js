import {IDict, IExtendedPoolDataFromApi, INetworkName, IPoolType} from "./interfaces.js";
import {uncached_getAllPoolsFromApi, createCrvApyDict, createUsdPricesDict} from './external-api.js'
import {curve} from "./curve";

/**
 * Memoizes a function that returns a promise.
 * Custom function instead of `memoizee` because we want to be able to set the cache manually based on server data.
 * @param fn The function that returns a promise and will be memoized
 * @param maxAge The maximum age of the cache in milliseconds
 * @returns A memoized `fn` function that includes a `set` method to set the cache manually
 */
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
    const usdPrices = createUsdPricesDict(poolLists);
    const crvApy = createCrvApyDict(poolLists)
    return {poolsDict, poolLists, usdPrices, crvApy};
}

/**
 * This function is used to cache the data fetched from the API and the data derived from it.
 * Note: do not expose this function to the outside world, instead encapsulate it in a function that returns the data you need.
 */
const _getCachedData = memoize(async (network: INetworkName, isLiteChain: boolean) =>
    createCache(await uncached_getAllPoolsFromApi(network, isLiteChain)), { maxAge: 1000 * 60 * 5 /* 5 minutes */ })

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
