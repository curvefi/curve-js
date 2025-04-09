import memoize from "memoizee";
import {IDict, IExtendedPoolDataFromApi, INetworkName, IPoolType} from "./interfaces.js";
import {uncached_getAllPoolsFromApi, uncached_getUsdPricesFromApi} from './external-api.js'

const _getCachedData = memoize(
    async (network: INetworkName, isLiteChain: boolean) => {
        const allPools = await uncached_getAllPoolsFromApi(network, isLiteChain);
        const poolLists = Object.values(allPools)
        const usdPrices = uncached_getUsdPricesFromApi(poolLists);
        return { allPools, poolLists, usdPrices }
    },
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
    }
)

export const _getPoolsFromApi =
    async (network: INetworkName, poolType: IPoolType, isLiteChain = false): Promise<IExtendedPoolDataFromApi> => {
        const {allPools} = await _getCachedData(network, isLiteChain);
        return allPools[poolType]
    }

export const _getAllPoolsFromApi = async (network: INetworkName, isLiteChain = false): Promise<IExtendedPoolDataFromApi[]> => {
    const {poolLists} = await _getCachedData(network, isLiteChain);
    return poolLists
}

export const _getUsdPricesFromApi = async (): Promise<IDict<number>> => {
    const {usdPrices} = await _getCachedData("ethereum", false);
    return usdPrices
}
