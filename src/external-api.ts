import { IExtendedPoolDataFromApi, ISubgraphPoolData, IReward, IDict, INetworkName } from "./interfaces";
import axios from "axios";
import memoize from "memoizee";

export const _getPoolsFromApi = memoize(
    async (network: INetworkName, poolType: "main" | "crypto" | "factory" | "factory-crypto"): Promise<IExtendedPoolDataFromApi> => {
        const url = `https://api.curve.fi/api/getPools/${network}/${poolType}`;
        const response = await axios.get(url, { validateStatus: () => true });
        return response.data.data ?? { poolData: [], tvl: 0, tvlAll: 0 };
    },
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
    }
)

export const _getSubgraphData = memoize(
    async (network: INetworkName): Promise<ISubgraphPoolData[]> => {
        const url = `https://api.curve.fi/api/getSubgraphData/${network}`;
        const response = await axios.get(url, { validateStatus: () => true });
        return response.data.data.poolList ?? [];
    },
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
    }
)

export const _getMainPoolsGaugeRewards = memoize(async (): Promise<IDict<IReward[]>> => {
    const url = "https://api.curve.fi/api/getMainPoolsGaugeRewards";
    const response = await axios.get(url, { validateStatus: () => true });
    return response.data.data.mainPoolsGaugeRewards;
},
{
    promise: true,
    maxAge: 5 * 60 * 1000, // 5m
});
