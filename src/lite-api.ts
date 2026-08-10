import memoize from "memoizee";
import {
    ICurveLiteNetwork,
    IDict,
    IExtendedPoolDataFromApi,
    INetworkName,
    IPoolDataFromApi,
    IPoolType,
} from "./interfaces";

const API2 = "https://api2.curve.finance";

async function fetchJson(url: string): Promise<any> {
    const response = await fetch(url);
    return await response.json() ?? {};
}

async function fetchData(url: string): Promise<any> {
    const { data } = await fetchJson(url);
    return data;
}

interface IApi2PlatformMetadata {
    is_mainnet: boolean,
    rpc_url: string,
    name: string,
    chain_id: number,
    explorer_base_url: string,
    native_currency_symbol: string,
    tvl?: number,
}

interface IApi2PlatformsData {
    platforms: IDict<string[]>,
    platforms_metadata: IDict<IApi2PlatformMetadata>,
}

const _getApi2Platforms = memoize(
    async (): Promise<IApi2PlatformsData> =>
        await fetchData(`${API2}/get_platforms`) ?? { platforms: {}, platforms_metadata: {} },
    {
        promise: true,
        maxAge: 5 * 60 * 1000,
    }
);

export const getLiteNetworksFromApi2 = async (): Promise<ICurveLiteNetwork[]> => {
    const { platforms, platforms_metadata } = await _getApi2Platforms();
    return Object.keys(platforms)
        .map((id) => {
            const meta = platforms_metadata[id];
            return meta?.name && {
                id,
                name: meta.name,
                rpcUrl: meta.rpc_url,
                chainId: meta.chain_id,
                explorerUrl: meta.explorer_base_url,
                nativeCurrencySymbol: meta.native_currency_symbol,
                isTestnet: !meta.is_mainnet,
            };
        })
        .filter(Boolean) as ICurveLiteNetwork[];
};

const getChainIdByNetworkName = async (network: string): Promise<number | undefined> => {
    const { platforms_metadata } = await _getApi2Platforms();
    return platforms_metadata[network]?.chain_id;
};

interface IApi2Coin {
    address: string,
    usd_price: number | null,
    decimals: string,
    is_base_pool_lp_token: boolean,
    symbol: string,
    pool_balance: string,
}

interface IApi2GaugeExtraReward {
    gauge_address: string,
    token_address: string,
    token_price: number | null,
    name: string,
    symbol: string,
    decimals: number | string,
    apy: number | null,
}

interface IApi2Pool {
    id: string,
    chain_id: number,
    address: string,
    registry_id: string,
    name: string,
    symbol: string,
    total_supply: string,
    factory: boolean,
    tvl: number | null,
    coins: IApi2Coin[],
    amplification_coefficient: string | number | null,
    implementation_address: string | null,
    lp_token_address: string | null,
    lp_token_price: number | null,
    is_meta_pool: boolean,
    base_pool?: string | null,
    gauge_address: string | null,
    root_gauge_address: string | null,
    gauge_crv_apy: [number | null, number | null] | null,
    gauge_extra_rewards: IApi2GaugeExtraReward[],
    gauge_is_killed: boolean | null,
    gauge_has_crv: boolean | null,
}

interface IApi2PoolsData {
    pool_data: IApi2Pool[],
    tvl: number,
}

const API2_REGISTRY_TO_POOL_TYPE: IDict<IPoolType> = {
    factory_stable_ng: "factory-stable-ng",
    factory_twocrypto: "factory-twocrypto",
    factory_tricrypto: "factory-tricrypto",
};

const _getApi2PoolsData = memoize(
    async (chainId: number): Promise<IApi2PoolsData> =>
        await fetchData(`${API2}/get_pools/${chainId}`) ?? { pool_data: [], tvl: 0 },
    {
        promise: true,
        maxAge: 5 * 60 * 1000,
    }
);

const adaptLitePool = (pool: IApi2Pool, poolType: IPoolType): IPoolDataFromApi => ({
    id: pool.id.replace(pool.registry_id, poolType),
    name: pool.name,
    symbol: pool.symbol,
    assetTypeName: null,
    address: pool.address,
    isMetaPool: pool.is_meta_pool,
    basePoolAddress: pool.base_pool ?? undefined,
    lpTokenAddress: pool.lp_token_address ?? undefined,
    gaugeAddress: pool.gauge_address ?? undefined,
    implementation: null,
    implementationAddress: pool.implementation_address,
    coins: pool.coins.map((coin) => ({
        address: coin.address,
        symbol: coin.symbol,
        decimals: coin.decimals,
        usdPrice: coin.usd_price,
    })),
    gaugeRewards: [],
    gaugeExtraRewards: (pool.gauge_extra_rewards ?? []).map((reward) => ({
        gaugeAddress: reward.gauge_address,
        tokenAddress: reward.token_address,
        tokenPrice: reward.token_price ?? 0,
        name: reward.name,
        symbol: reward.symbol,
        decimals: reward.decimals,
        apy: reward.apy ?? 0,
    })),
    usdTotal: pool.tvl ?? 0,
    totalSupply: Number(pool.total_supply ?? 0),
    amplificationCoefficient: pool.amplification_coefficient != null ? String(pool.amplification_coefficient) : "0",
    gaugeCrvApy: pool.gauge_crv_apy ?? [null, null],
});

export const getLitePoolsFromApi2 = async (network: INetworkName, poolType: IPoolType): Promise<IExtendedPoolDataFromApi> => {
    const chainId = await getChainIdByNetworkName(network);
    if (chainId == null) return { poolData: [], tvl: 0, tvlAll: 0 };

    const { pool_data, tvl } = await _getApi2PoolsData(chainId);
    const poolsOfType = (pool_data ?? []).filter((pool) => API2_REGISTRY_TO_POOL_TYPE[pool.registry_id] === poolType);
    const poolData = poolsOfType.map((pool) => adaptLitePool(pool, poolType));

    return {
        poolData,
        tvl: poolData.reduce((sum, p) => sum + p.usdTotal, 0),
        tvlAll: tvl ?? 0,
    };
};

export const getLiteDeploymentFromApi2 = async (chainId: number): Promise<any> => {
    const response = await fetch(`${API2}/get_deployment/${chainId}`);
    const { data } = await response.json() ?? {};
    if (response.status !== 200 || !data) {
        console.error('Failed to fetch network data:', response.status, data);
        return null;
    }
    return data;
};
