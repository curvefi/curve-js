import memoize from "memoizee";
import {
    IExtendedPoolDataFromApi,
    IPoolDataFromApi,
    IPoolType,
    INetworkName,
    IVolumeAndAPYs,
    IVolumeAndAPYsPoolData,
} from "./interfaces";

// --- Adapter for https://prices.curve.finance/v1/chains/{network} ---
// This new API returns ALL pool types for a chain in a single call (unlike the legacy
// api[-core].curve.finance/getPools/{network}/{poolType} endpoints, which are per-type).
// It also doesn't provide a curated pool `id`/factory index or a `gaugeAddress` - those
// are reconstructed/nulled below, see getPoolId and adaptPoolFromPricesApi.

export type TPricesPoolType =
    | "main"
    | "crypto"
    | "factory"
    | "crvusd"
    | "factory_crypto"
    | "factory_tricrypto"
    | "stableswapng"
    | "twocryptong"
    | null;

export const LEGACY_POOL_TYPES: readonly IPoolType[] = [
    "main",
    "crypto",
    "factory",
    "factory-crvusd",
    "factory-crypto",
    "factory-twocrypto",
    "factory-tricrypto",
    "factory-stable-ng",
] as const;

export const PRICES_POOL_TYPE_TO_LEGACY: Record<NonNullable<TPricesPoolType>, IPoolType> = {
    main: "main",
    crypto: "crypto",
    factory: "factory",
    crvusd: "factory-crvusd",
    factory_crypto: "factory-crypto",
    factory_tricrypto: "factory-tricrypto",
    stableswapng: "factory-stable-ng",
    twocryptong: "factory-twocrypto",
};

// Prefixes match the ones used when pools are indexed directly from factory contracts
// on-chain (see factory-*.ts: `factory-v2-${i}`, `factory-tricrypto-${i}`, etc.), so that
// ids generated here line up with the on-chain fetch path.
const ID_PREFIX_BY_POOL_TYPE: Record<IPoolType, string> = {
    "main": "main",
    "crypto": "crypto",
    "factory": "factory-v2",
    "factory-crvusd": "factory-crvusd",
    "factory-crypto": "factory-crypto",
    "factory-twocrypto": "factory-twocrypto",
    "factory-tricrypto": "factory-tricrypto",
    "factory-stable-ng": "factory-stable-ng",
};

interface IPricesChainCoin {
    pool_index: number,
    symbol: string,
    name: string,
    address: string,
    decimals: number,
}

interface IPricesChainPool {
    name: string,
    address: string,
    pool_type: TPricesPoolType,
    lp_token_address: string | null,
    lp_token_symbol: string | null,
    lp_token_supply: number | null,
    is_metapool: boolean,
    base_pool: string | null,
    implementation_address: string | null,
    creation_ts: number,
    creation_block_number: number,
    n_coins: number,
    tvl_usd: number | null,
    balances: number[] | null,
    balances_usd: number[] | null,
    trading_volume_24h: number | null,
    base_daily_apr: number | null,
    base_weekly_apr: number | null,
    coins: IPricesChainCoin[],
    amplification_coefficient: number | string | null,
}

interface IPricesChainResponse {
    chain: string,
    data: IPricesChainPool[],
    total?: { total_tvl: number },
}

async function fetchJson(url: string): Promise<any> {
    const response = await fetch(url);
    return await response.json() ?? {};
}

const _getPricesChainData = memoize(
    async (network: INetworkName): Promise<IPricesChainResponse> =>
        fetchJson(`https://prices.curve.finance/v1/chains/${network}`),
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
    }
);

// --- Adapter for https://prices.curve.finance/v1/dao/gauges/overview ---
// Global (all chains) list of gauges, replacing the legacy api.curve.finance/getAllGauges
// as the source of a pool's gauge address.

export interface IPricesGauge {
    address: string,
    effective_address: string,
    name: string,
    lp_token: string,
    pool: { address: string, name: string, chain: string } | null,
    is_killed: boolean,
    gauge_weight: string,
    gauge_relative_weight: number,
}

interface IPricesGaugesOverviewResponse {
    gauges: IPricesGauge[],
}

const _getGaugesOverview = memoize(
    async (): Promise<IPricesGaugesOverviewResponse> =>
        fetchJson(`https://prices.curve.finance/v1/dao/gauges/overview`),
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
    }
);

const getGaugeAddressByPoolAddress = async (network: INetworkName): Promise<Map<string, string>> => {
    const { gauges } = await _getGaugesOverview();
    const map = new Map<string, string>();
    for (const gauge of gauges ?? []) {
        if (gauge.pool?.chain === network) map.set(gauge.pool.address.toLowerCase(), gauge.address.toLowerCase());
    }
    return map;
};

// Used by src/dao.ts (voting gauge list / user gauge votes) - see dao_gauges_migration_report.txt
// for why rootGauge (the mainnet mirror address for L2 gauges) can't be reconstructed from this yet.
export const getGaugesOverview = async (): Promise<IPricesGauge[]> => {
    const { gauges } = await _getGaugesOverview();
    return gauges ?? [];
};

// Curve factories deploy pools in strictly increasing order and never remove them, so
// sorting each pool type's pools by creation block reconstructs their on-chain factory
// index - which is what the legacy API's curated `id` was actually built from.
const getPoolId = (poolType: IPoolType, indexWithinType: number): string =>
    `${ID_PREFIX_BY_POOL_TYPE[poolType]}-${indexWithinType}`;

const adaptPoolFromPricesApi = (pool: IPricesChainPool, id: string, gaugeAddressByPoolAddress: Map<string, string>): IPoolDataFromApi => {
    // For metapools, `coins` also includes the flattened underlying base-pool coins
    // appended after the real pool coins - keep only the first `n_coins` (the pool
    // contract's actual `coins()`), matching the legacy API's `coins` semantics.
    const coins = [...pool.coins].sort((a, b) => a.pool_index - b.pool_index).slice(0, pool.n_coins);

    return {
        id,
        name: pool.name,
        symbol: pool.lp_token_symbol ?? pool.name,
        assetTypeName: null,
        address: pool.address,
        isMetaPool: pool.is_metapool,
        basePoolAddress: pool.base_pool ?? undefined,
        lpTokenAddress: pool.lp_token_address ?? undefined,
        gaugeAddress: gaugeAddressByPoolAddress.get(pool.address.toLowerCase()),
        implementation: null,
        implementationAddress: pool.implementation_address,
        coins: coins.map((coin) => {
            const balance = pool.balances?.[coin.pool_index];
            const balanceUsd = pool.balances_usd?.[coin.pool_index];
            return {
                address: coin.address,
                symbol: coin.symbol,
                decimals: String(coin.decimals),
                usdPrice: balance ? (balanceUsd ?? 0) / balance : null,
            };
        }),
        gaugeRewards: [],
        gaugeExtraRewards: undefined,
        usdTotal: pool.tvl_usd ?? 0,
        // legacy API's totalSupply is denominated like a raw on-chain balance (wei), and
        // consumers (e.g. createUsdPricesDict) divide it by 10**18 - rescale to match.
        totalSupply: (pool.lp_token_supply ?? 0) * 1e18,
        amplificationCoefficient: pool.amplification_coefficient != null ? String(pool.amplification_coefficient) : "0",
        gaugeCrvApy: [null, null],
    };
};

export const getPoolsFromPricesApi = async (network: INetworkName, poolType: IPoolType): Promise<IExtendedPoolDataFromApi> => {
    const [chainData, gaugeAddressByPoolAddress] = await Promise.all([
        _getPricesChainData(network),
        getGaugeAddressByPoolAddress(network),
    ]);
    if (!chainData?.data) return { poolData: [], tvl: 0, tvlAll: 0 };

    const poolsOfType = chainData.data
        .filter((pool) => PRICES_POOL_TYPE_TO_LEGACY[pool.pool_type as NonNullable<TPricesPoolType>] === poolType)
        .sort((a, b) => a.creation_block_number - b.creation_block_number);

    const poolData = poolsOfType.map((pool, i) => adaptPoolFromPricesApi(pool, getPoolId(poolType, i), gaugeAddressByPoolAddress));

    return {
        poolData,
        tvl: poolData.reduce((sum, p) => sum + p.usdTotal, 0),
        tvlAll: chainData.total?.total_tvl ?? 0,
    };
};

// Cryptoswap-family pool types, matching how the legacy getVolumes endpoint split
// totalVolume into totalVolume/totalCryptoVolume/cryptoVolumeSharePcent.
const CRYPTO_POOL_TYPES: readonly TPricesPoolType[] = ["crypto", "factory_crypto", "factory_tricrypto", "twocryptong"];

export const getVolumesFromPricesApi = async (network: INetworkName): Promise<IVolumeAndAPYs> => {
    const chainData = await _getPricesChainData(network);
    if (!chainData?.data) return { poolsData: [], totalVolume: 0, cryptoVolume: 0, cryptoShare: 0 };

    let totalVolume = 0;
    let cryptoVolume = 0;
    const poolsData: IVolumeAndAPYsPoolData[] = chainData.data.map((pool) => {
        const volumeUSD = pool.trading_volume_24h ?? 0;
        totalVolume += volumeUSD;
        if (CRYPTO_POOL_TYPES.includes(pool.pool_type)) cryptoVolume += volumeUSD;

        return {
            address: pool.address,
            volumeUSD,
            // legacy latestDailyApyPcent/latestWeeklyApyPcent are percentages (100 = 100%),
            // the new API's base_daily_apr/base_weekly_apr are fractions (1.0 = 100%).
            day: (pool.base_daily_apr ?? 0) * 100,
            week: (pool.base_weekly_apr ?? 0) * 100,
        };
    });

    return {
        poolsData,
        totalVolume,
        cryptoVolume,
        cryptoShare: totalVolume ? (cryptoVolume / totalVolume) * 100 : 0,
    };
};
