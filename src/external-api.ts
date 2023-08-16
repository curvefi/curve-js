import axios from "axios";
import memoize from "memoizee";
import { IExtendedPoolDataFromApi, ISubgraphPoolData, IDict, INetworkName, IPoolType } from "./interfaces";


export const _getPoolsFromApi = memoize(
    async (network: INetworkName, poolType: IPoolType): Promise<IExtendedPoolDataFromApi> => {
        const url = `https://api.curve.fi/api/getPools/${network}/${poolType}`;
        const response = await axios.get(url, { validateStatus: () => true });
        return response.data.data ?? { poolData: [], tvl: 0, tvlAll: 0 };
    },
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
    }
)

export const _getAllPoolsFromApi = async (network: INetworkName): Promise<IExtendedPoolDataFromApi[]> => {
    return await Promise.all([
        _getPoolsFromApi(network, "main"),
        _getPoolsFromApi(network, "crypto"),
        _getPoolsFromApi(network, "factory"),
        _getPoolsFromApi(network, "factory-crvusd"),
        _getPoolsFromApi(network, "factory-eywa"),
        _getPoolsFromApi(network, "factory-crypto"),
        _getPoolsFromApi(network, "factory-tricrypto"),
    ]);
}

export const _getSubgraphData = memoize(
    async (network: INetworkName): Promise<{ poolsData: ISubgraphPoolData[], totalVolume: number, cryptoVolume: number, cryptoShare: number }> => {
        const url = `https://api.curve.fi/api/getSubgraphData/${network}`;
        const response = await axios.get(url, { validateStatus: () => true });
        return {
            poolsData: response.data.data.poolList ?? [],
            totalVolume: response.data.data.totalVolume ?? 0,
            cryptoVolume: response.data.data.cryptoVolume ?? 0,
            cryptoShare: response.data.data.cryptoShare ?? 0,
        };
    },
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
    }
)

// Moonbeam and Aurora only
export const _getLegacyAPYsAndVolumes = memoize(
    async (network: string): Promise<IDict<{ apy: { day: number, week: number }, volume: number }>> => {
        if (["kava", "celo", "zksync", "base"].includes(network)) return {}; // Exclude Kava, Celo, ZkSync and Base
        const url = "https://api.curve.fi/api/getMainPoolsAPYs/" + network;
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

// Base, ZkSync, Moonbeam, Kava and Celo only
export const _getFactoryAPYsAndVolumes = memoize(
    async (network: string): Promise<{ poolAddress: string, apy: number, volume: number }[]> => {
        if (network === "aurora") return [];  // Exclude Aurora

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

export const _generateBoostingProof = memoize(
    async (block: number, address: string): Promise<{ block_header_rlp: string, proof_rlp: string }> => {
        const url = `https://prices.curve.fi/v1/general/get_merkle_proof?block=${block}&account_address=${address}`;
        const response = await axios.get(url, { validateStatus: () => true });

        return { block_header_rlp: response.data.block_header_rlp, proof_rlp: response.data.proof_rlp };
    },
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
    }
)
