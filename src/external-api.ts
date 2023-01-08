import { IExtendedPoolDataFromApi, ISubgraphPoolData, IReward, IDict, INetworkName } from "./interfaces";
import axios from "axios";
import memoize from "memoizee";
import {curve} from "./curve";

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

// Moonbeam and Aurora only
export const _getLegacyAPYsAndVolumes = memoize(
    async (network: string): Promise<IDict<{ apy: { day: number, week: number }, volume: number }>> => {
        if (curve.chainId === 2222 || curve.chainId === 42220) return {}; // Exclude Kava and Celo
        const url = `https://stats.curve.fi/raw-stats-${network}/apys.json`;
        const data = (await axios.get(url, { validateStatus: () => true })).data;
        const result: IDict<{ apy: { day: number, week: number }, volume: number }> = {};
        Object.keys(data.apy.day).forEach((poolId) => {
            result[poolId] = { apy: { day: 0, week: 0 }, volume: 0};
            result[poolId].apy.day = data.apy.day[poolId] * 100;
            result[poolId].apy.week = data.apy.week[poolId] * 100;
            result[poolId].volume = data.volume[poolId];
        })

        return result;
    },
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
    }
)

// Moonbeam, Kava and Celo only
export const _getFactoryAPYsAndVolumes = memoize(
    async (network: string): Promise<{ poolAddress: string, apy: number, volume: number }[]> => {
        if (curve.chainId === 1313161554) return [];  // Exclude Aurora

        const url = `https://api.curve.fi/api/getFactoryAPYs-${network}`;
        const response = await axios.get(url, { validateStatus: () => true });

        return response.data.data.poolDetails ?? [];
    },
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
    }
)

export const _getAllGauges = memoize(
    async (): Promise<IDict<{ gauge: string, is_killed?: boolean }>> => {
        const url = `https://api.curve.fi/api/getAllGauges`;
        const response = await axios.get(url, { validateStatus: () => true });

        return response.data.data;
    },
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
    }
)

export const _getHiddenPools = memoize(
    async (): Promise<IDict<string[]>> => {
        const url = `https://api.curve.fi/api/getHiddenPools`;
        const response = await axios.get(url, { validateStatus: () => true });

        return response.data.data;
    },
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
    }
)
