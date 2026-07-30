import memoize from "memoizee";
import {
    IExtendedPoolDataFromApi,
    IPoolDataFromApi,
    IPoolType,
    INetworkName,
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

interface IPricesGauge {
    address: string,
    pool: { address: string, chain: string } | null,
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
