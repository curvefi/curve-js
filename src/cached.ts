import memoize from "memoizee";
import {IDict, IExtendedPoolDataFromApi, INetworkName, IPoolType} from "./interfaces.js";
import {uncached_getAllPoolsFromApi, uncached_getCrvApyFromApi, uncached_getUsdPricesFromApi} from './external-api.js'
import {curve} from "./curve";

const _getCachedData = memoize(
    async (network: INetworkName, isLiteChain: boolean) => {
        const poolsDict = await uncached_getAllPoolsFromApi(network, isLiteChain);
        const poolLists = Object.values(poolsDict)
        const usdPrices = uncached_getUsdPricesFromApi(poolLists);
        const crvApy = uncached_getCrvApyFromApi(poolLists)
        return { poolsDict, poolLists, usdPrices, crvApy };
    },
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
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
    const {usdPrices} = await _getCachedData(network, false);
    return usdPrices
}

export const _getCrvApyFromApi = async (): Promise<IDict<[number, number]>> => {
    const network = curve.constants.NETWORK_NAME;
    const {crvApy} = await _getCachedData(network, false);
    return crvApy
}
