import memoize from "memoizee";
import {IDict, IExtendedPoolDataFromApi, INetworkName, IPoolType} from "./interfaces.js";
import {uncached_getAllPoolsFromApi, createCrvApyDict, createUsdPricesDict} from './external-api.js'
import {curve} from "./curve";

/**
 * This function is used to cache the data fetched from the API and the data derived from it.
 * Note: do not expose this function to the outside world, instead encapsulate it in a function that returns the data you need.
 */
const _getCachedData = memoize(
    async (network: INetworkName, isLiteChain: boolean) => {
        const poolsDict = await uncached_getAllPoolsFromApi(network, isLiteChain);
        const poolLists = Object.values(poolsDict)
        const usdPrices = createUsdPricesDict(poolLists);
        const crvApy = createCrvApyDict(poolLists)
        return { poolsDict, poolLists, usdPrices, crvApy };
    },
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
        primitive: true,
    }
)

export const _getPoolsFromApi =
    async (network: INetworkName, poolType: IPoolType, isLiteChain = false): Promise<IExtendedPoolDataFromApi> => {
        const {poolsDict} = await _getCachedData(network, isLiteChain);
        return poolsDict[poolType]
    }

export const _getAllPoolsFromApi = async (network: INetworkName, isLiteChain = false): Promise<IExtendedPoolDataFromApi[]> => {
    const {poolLists} = await _getCachedData(network, isLiteChain);
    return poolLists
}

export const _getUsdPricesFromApi = async (): Promise<IDict<number>> => {
    const network = curve.constants.NETWORK_NAME;
    const {usdPrices} = await _getCachedData(network, curve.isLiteChain);
    return usdPrices
}

export const _getCrvApyFromApi = async (): Promise<IDict<[number, number]>> => {
    const network = curve.constants.NETWORK_NAME;
    const {crvApy} = await _getCachedData(network, curve.isLiteChain);
    return crvApy
}
