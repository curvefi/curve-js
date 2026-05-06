import memoize from "memoizee";
import {
    ICurveLiteNetwork,
    IDaoProposal,
    IDaoProposalListItem,
    IDict,
    IExtendedPoolDataFromApi,
    IGaugesDataFromApi,
    INetworkName,
    IPoolType,
    IRewardFromApi,
    IVolumeAndAPYs,
} from "./interfaces";
import { volumeNetworks } from "./constants/volumeNetworks.js";

type TPricesPoolType = "main" | "crypto" | "factory" | "factory_crypto" | "crvusd" | "factory_tricrypto" | "stableswapng" | "twocryptong";

interface IPricesPoolCoin {
    symbol: string,
    address: string,
    decimals: number | null,
}

interface IPricesPool {
    name: string,
    address: string,
    pool_type: TPricesPoolType | null,
    lp_token_address?: string | null,
    lp_token_symbol?: string | null,
    lp_token_supply?: number | null,
    daily_volume?: number | null,
    base_daily_apr?: number | null,
    base_weekly_apr?: number | null,
    balances: number[],
    balances_usd: number[],
    coins: IPricesPoolCoin[],
    tvl_usd: number,
    base_pool?: string | null,
    is_metapool?: boolean | null,
    implementation_address?: string | null,
    amplification_coefficient?: number | null,
}

interface IPricesPoolsResponse {
    total?: {
        total_tvl?: number,
        trading_volume_24h?: number,
    },
    data: IPricesPool[],
}

interface IPricesGaugeReward {
    apr?: number | null,
    name: string,
    price?: number | null,
    symbol: string,
    address: string,
    decimals?: number | null,
}

interface IPricesGaugePool {
    address: string,
    chain: string,
}

interface IPricesGauge {
    address: string,
    name?: string | null,
    lp_token?: string | null,
    pool?: IPricesGaugePool | null,
    crv_apr_base?: number | null,
    crv_apr_boosted?: number | null,
    extra_rewards?: IPricesGaugeReward[] | null,
}

interface IPricesGaugesOverviewResponse {
    gauges: IPricesGauge[],
}

interface IPricesGaugeData {
    gaugeAddress?: string,
    gaugeRewards: IRewardFromApi[],
    gaugeCrvApy: [number | null, number | null],
}

const EMPTY_EXTENDED_POOL_DATA: IExtendedPoolDataFromApi = { poolData: [], tvl: 0, tvlAll: 0 };
const LEGACY_POOL_TYPES: readonly IPoolType[] = ["main", "crypto", "factory", "factory-crvusd", "factory-crypto", "factory-twocrypto", "factory-tricrypto", "factory-stable-ng"] as const;
const PRICES_POOL_TYPE_TO_LEGACY: Record<NonNullable<TPricesPoolType>, IPoolType> = {
    main: "main",
    crypto: "crypto",
    factory: "factory",
    crvusd: "factory-crvusd",
    factory_crypto: "factory-crypto",
    factory_tricrypto: "factory-tricrypto",
    stableswapng: "factory-stable-ng",
    twocryptong: "factory-twocrypto",
};
const SUPPORTED_NON_LITE_POOL_CHAIN_IDS = new Set<number>(volumeNetworks.getVolumes);

const createEmptyPoolsDict = (): Record<IPoolType, IExtendedPoolDataFromApi> => ({
    "main": { ...EMPTY_EXTENDED_POOL_DATA, poolData: [] },
    "crypto": { ...EMPTY_EXTENDED_POOL_DATA, poolData: [] },
    "factory": { ...EMPTY_EXTENDED_POOL_DATA, poolData: [] },
    "factory-crvusd": { ...EMPTY_EXTENDED_POOL_DATA, poolData: [] },
    "factory-crypto": { ...EMPTY_EXTENDED_POOL_DATA, poolData: [] },
    "factory-twocrypto": { ...EMPTY_EXTENDED_POOL_DATA, poolData: [] },
    "factory-tricrypto": { ...EMPTY_EXTENDED_POOL_DATA, poolData: [] },
    "factory-stable-ng": { ...EMPTY_EXTENDED_POOL_DATA, poolData: [] },
});

const getLitePoolTypes = () => ["factory-twocrypto", "factory-tricrypto", "factory-stable-ng"] as const;

const getLegacyPoolType = (poolType: TPricesPoolType | null): IPoolType | null => {
    if (!poolType) return null;
    return PRICES_POOL_TYPE_TO_LEGACY[poolType] ?? null;
}

const isCryptoPoolType = (poolType: TPricesPoolType | null): boolean =>
    poolType === "crypto" || poolType === "factory_crypto" || poolType === "factory_tricrypto" || poolType === "twocryptong";

const getReferenceAssetName = (poolType: TPricesPoolType | null): string => {
    if (isCryptoPoolType(poolType)) {
        return "CRYPTO";
    }

    if (poolType === "crvusd") {
        return "USD";
    }

    return "UNKNOWN";
}

const getCoinUsdPrice = (balance?: number, balanceUsd?: number): number => {
    if (!balance) return 0;
    return (balanceUsd ?? 0) / balance;
}

const getGaugeLookupKeys = (...addresses: (string | null | undefined)[]): string[] => {
    const normalizedAddresses = addresses
        .filter((address): address is string => Boolean(address))
        .map((address) => address.toLowerCase());

    return [...new Set(normalizedAddresses)];
}

const isRewardGauge = (gauge: IPricesGauge): boolean => gauge.name?.includes("RewardGauge") ?? false;

const mapGaugeRewards = (gaugeAddress: string, rewards?: IPricesGaugeReward[] | null): IRewardFromApi[] => (rewards ?? []).map((reward) => ({
    gaugeAddress,
    tokenAddress: reward.address,
    tokenPrice: reward.price ?? 0,
    name: reward.name,
    symbol: reward.symbol,
    decimals: reward.decimals ?? 18,
    apy: reward.apr ?? 0,
}));

const getEmptyGaugeData = (): IPricesGaugeData => ({
    gaugeRewards: [],
    gaugeCrvApy: [0, 0],
});

const buildGaugeData = (gauges: IPricesGauge[]): IPricesGaugeData => {
    const primaryGauge = gauges.find((gauge) => !isRewardGauge(gauge)) ?? gauges[0];
    const aprSource = gauges.find((gauge) => gauge.crv_apr_base != null || gauge.crv_apr_boosted != null) ?? primaryGauge;
    const rewardsSource = gauges.find((gauge) => (gauge.extra_rewards?.length ?? 0) > 0) ?? primaryGauge;

    if (!primaryGauge?.address) return getEmptyGaugeData();

    return {
        gaugeAddress: primaryGauge.address,
        gaugeRewards: mapGaugeRewards(primaryGauge.address, rewardsSource?.extra_rewards),
        gaugeCrvApy: [aprSource?.crv_apr_base ?? 0, aprSource?.crv_apr_boosted ?? 0],
    };
}

const getGaugeData = (gaugesByAddress: IDict<IPricesGaugeData>, ...addresses: (string | null | undefined)[]): IPricesGaugeData => {
    const gaugeData = getGaugeLookupKeys(...addresses)
        .map((address) => gaugesByAddress[address])
        .find(Boolean);

    return gaugeData ?? getEmptyGaugeData();
}

const uncached_getPoolsFromApi = async (network: INetworkName, poolType: IPoolType): Promise<IExtendedPoolDataFromApi> => {
    const url = `https://api-core.curve.finance/v1/getPools/${network}/${poolType}`;
    return await fetchData(url) ?? { poolData: [], tvl: 0, tvlAll: 0 };
}

const _getGaugeOverviewData = memoize(
    async (network: INetworkName): Promise<IDict<IPricesGaugeData>> => {
        const { gauges } = await fetchJson("https://prices.curve.finance/v1/dao/gauges/overview") as IPricesGaugesOverviewResponse;
        const gaugesByPoolAddress: IDict<IPricesGauge[]> = {};

        for (const gauge of gauges) {
            if (gauge.pool?.chain !== network || !gauge.pool.address) continue;

            const poolAddress = gauge.pool.address.toLowerCase();
            if (!(poolAddress in gaugesByPoolAddress)) gaugesByPoolAddress[poolAddress] = [];
            gaugesByPoolAddress[poolAddress].push(gauge);
        }

        return Object.values(gaugesByPoolAddress).reduce((acc, poolGauges) => {
            const gaugeData = buildGaugeData(poolGauges);
            const lookupKeys = getGaugeLookupKeys(
                ...poolGauges.map((gauge) => gauge.pool?.address),
                ...poolGauges.map((gauge) => gauge.lp_token),
            );

            lookupKeys.forEach((key) => {
                acc[key] = gaugeData;
            });

            return acc;
        }, {} as IDict<IPricesGaugeData>);
    },
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
    }
)

const _getPricesChainData = memoize(
    async (network: INetworkName): Promise<IPricesPoolsResponse> => await fetchJson(`https://prices.curve.finance/v1/chains/${network}`) as IPricesPoolsResponse,
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
    }
)

const fetchNonLitePoolsFromApi = async (network: INetworkName, chainId: number): Promise<Record<IPoolType, IExtendedPoolDataFromApi>> => {
    if (!SUPPORTED_NON_LITE_POOL_CHAIN_IDS.has(chainId)) {
        console.warn(`Pool data via prices.curve.finance is not supported for non-lite chain id: ${chainId}`);
        return createEmptyPoolsDict();
    }

    const [{ data, total }, gaugesByAddress] = await Promise.all([
        _getPricesChainData(network),
        _getGaugeOverviewData(network),
    ]);
    const poolsDict = createEmptyPoolsDict();
    const totalTvl = total?.total_tvl ?? data.reduce((sum, pool) => sum + (pool.tvl_usd ?? 0), 0);

    for (const pool of data) {
        const legacyPoolType = getLegacyPoolType(pool.pool_type);
        if (!legacyPoolType) continue;

        const gaugeData = getGaugeData(gaugesByAddress, pool.address, pool.lp_token_address);
        poolsDict[legacyPoolType].poolData.push({
            id: pool.address.toLowerCase(),
            name: pool.name,
            symbol: pool.lp_token_symbol ?? pool.name,
            assetTypeName: getReferenceAssetName(pool.pool_type),
            address: pool.address,
            isMetaPool: pool.is_metapool ?? false,
            basePoolAddress: pool.base_pool ?? undefined,
            lpTokenAddress: pool.lp_token_address ?? pool.address,
            gaugeAddress: gaugeData.gaugeAddress,
            implementation: pool.pool_type ?? "",
            implementationAddress: pool.implementation_address ?? "",
            coins: pool.coins.map((coin, index) => ({
                address: coin.address,
                symbol: coin.symbol,
                decimals: String(coin.decimals ?? 18),
                usdPrice: getCoinUsdPrice(pool.balances[index], pool.balances_usd[index]),
            })),
            gaugeRewards: gaugeData.gaugeRewards,
            gaugeExtraRewards: gaugeData.gaugeRewards,
            usdTotal: pool.tvl_usd ?? 0,
            totalSupply: (pool.lp_token_supply ?? 0) * 1e18,
            amplificationCoefficient: String(pool.amplification_coefficient ?? ""),
            gaugeCrvApy: gaugeData.gaugeCrvApy,
        });
        poolsDict[legacyPoolType].tvl = (poolsDict[legacyPoolType].tvl ?? 0) + (pool.tvl_usd ?? 0);
    }

    LEGACY_POOL_TYPES.forEach((poolType) => {
        poolsDict[poolType].tvlAll = totalTvl;
    });

    return poolsDict;
}

export const uncached_getAllPoolsFromApi = async (network: INetworkName, chainId: number, isLiteChain: boolean): Promise<Record<IPoolType, IExtendedPoolDataFromApi>> =>
    isLiteChain ? Object.fromEntries(
        await Promise.all(getLitePoolTypes().map(async (poolType) => {
            const data = await uncached_getPoolsFromApi(network, poolType);
            return [poolType, data];
        }))
    ) as Record<IPoolType, IExtendedPoolDataFromApi> : await fetchNonLitePoolsFromApi(network, chainId)

export const createUsdPricesDict = (allTypesExtendedPoolData:  IExtendedPoolDataFromApi[]): IDict<number> => {
    const priceDict: IDict<Record<string, number>[]> = {};
    const priceDictByMaxTvl: IDict<number> = {};

    for (const extendedPoolData of allTypesExtendedPoolData) {
        for (const pool of extendedPoolData.poolData) {
            const lpTokenAddress = pool.lpTokenAddress ?? pool.address;
            const totalSupply = pool.totalSupply / (10 ** 18);
            if(lpTokenAddress.toLowerCase() in priceDict) {
                priceDict[lpTokenAddress.toLowerCase()].push({
                    price: pool.usdTotal && totalSupply ? pool.usdTotal / totalSupply : 0,
                    tvl: pool.usdTotal,
                })
            } else {
                priceDict[lpTokenAddress.toLowerCase()] = []
                priceDict[lpTokenAddress.toLowerCase()].push({
                    price: pool.usdTotal && totalSupply ? pool.usdTotal / totalSupply : 0,
                    tvl: pool.usdTotal,
                })
            }

            for (const coin of pool.coins) {
                if (typeof coin.usdPrice === "number") {
                    if(coin.address.toLowerCase() in priceDict) {
                        priceDict[coin.address.toLowerCase()].push({
                            price: coin.usdPrice,
                            tvl: pool.usdTotal,
                        })
                    } else {
                        priceDict[coin.address.toLowerCase()] = []
                        priceDict[coin.address.toLowerCase()].push({
                            price: coin.usdPrice,
                            tvl: pool.usdTotal,
                        })
                    }
                }
            }

            for (const coin of pool.gaugeRewards ?? []) {
                if (typeof coin.tokenPrice === "number") {
                    if(coin.tokenAddress.toLowerCase() in priceDict) {
                        priceDict[coin.tokenAddress.toLowerCase()].push({
                            price: coin.tokenPrice,
                            tvl: pool.usdTotal,
                        });
                    } else {
                        priceDict[coin.tokenAddress.toLowerCase()] = []
                        priceDict[coin.tokenAddress.toLowerCase()].push({
                            price: coin.tokenPrice,
                            tvl: pool.usdTotal,
                        });
                    }
                }
            }
        }
    }

    for(const address in priceDict) {
        if (priceDict[address].length) {
            const maxTvlItem = priceDict[address].reduce((prev, current) => +current.tvl > +prev.tvl ? current : prev);
            priceDictByMaxTvl[address] = maxTvlItem.price
        } else {
            priceDictByMaxTvl[address] = 0
        }
    }

    return priceDictByMaxTvl
}

export const createCrvApyDict = (allTypesExtendedPoolData:  IExtendedPoolDataFromApi[]): IDict<[number, number]> => {
    const apyDict: IDict<[number, number]> = {};

    for (const extendedPoolData of allTypesExtendedPoolData) {
        for (const pool of extendedPoolData.poolData) {
            if (pool.gaugeAddress) {
                if (!pool.gaugeCrvApy) {
                    apyDict[pool.gaugeAddress.toLowerCase()] = [0, 0];
                } else {
                    apyDict[pool.gaugeAddress.toLowerCase()] = [pool.gaugeCrvApy[0] ?? 0, pool.gaugeCrvApy[1] ?? 0];
                }
            }
        }
    }

    return apyDict
}

export const _getVolumes = memoize(
    async (network: string): Promise<IVolumeAndAPYs> => {
        const { data, total } = await _getPricesChainData(network);
        const poolsData = data.map((pool) => ({
            address: pool.address,
            volumeUSD: pool.daily_volume ?? 0,
            day: pool.base_daily_apr ?? 0,
            week: pool.base_weekly_apr ?? 0,
        }));
        const totalVolume = total?.trading_volume_24h ?? data.reduce((sum, pool) => sum + (pool.daily_volume ?? 0), 0);
        const cryptoVolume = data.reduce((sum, pool) => sum + (isCryptoPoolType(pool.pool_type) ? (pool.daily_volume ?? 0) : 0), 0);

        return {
            poolsData: poolsData ?? [],
            totalVolume,
            cryptoVolume,
            cryptoShare: totalVolume ? 100 * cryptoVolume / totalVolume : 0,
        };
    },
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
    }
)

export const _getAllGauges = memoize(
    (): Promise<IDict<IGaugesDataFromApi>> => fetchData(`https://api.curve.finance/api/getAllGauges`),
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
    }
)

export const _getAllGaugesFormatted = memoize(
    async (): Promise<IDict<any>> => {
        const data = await fetchData(`https://api.curve.finance/api/getAllGauges`);

        const gaugesDict: Record<string, any> = {}

        Object.values(data).forEach((d: any) => {
            gaugesDict[d.gauge.toLowerCase()] = {
                is_killed: d.is_killed ?? false,
                gaugeStatus: d.gaugeStatus ?? null,
            }
        });

        return gaugesDict;
    },
    {
        promise: true,
        maxAge: 60 * 60 * 1000, // 60m
    }
)

export const _getHiddenPools = memoize(
    (isLiteChain: boolean): Promise<IDict<string[]>> => fetchData(`https://${isLiteChain ? 'api-core' : 'api'}.curve.finance/v1/getHiddenPools`),
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
    }
)

export const _generateBoostingProof = memoize(
    async (block: number, address: string): Promise<{ block_header_rlp: string, proof_rlp: string }> => {
        const url = `https://prices.curve.finance/v1/general/get_merkle_proof?block=${block}&account_address=${address}`;
        const { block_header_rlp, proof_rlp } = await fetchJson(url);
        return { block_header_rlp, proof_rlp };
    },
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
    }
)


// --- DAO ---

export const _getDaoProposalList = memoize(async (): Promise<IDaoProposalListItem[]> => {
    const url = "https://api-py.llama.airforce/curve/v1/dao/proposals";
    const {proposals} = await fetchJson(url);
    return proposals;
},
{
    promise: true,
    maxAge: 5 * 60 * 1000, // 5m
})

export const _getDaoProposal = memoize((type: "PARAMETER" | "OWNERSHIP", id: number): Promise<IDaoProposal> =>
    fetchJson(`https://api-py.llama.airforce/curve/v1/dao/proposals/${type.toLowerCase()}/${id}`),
{
    promise: true,
    maxAge: 5 * 60 * 1000, // 5m
})

// --- CURVE LITE ---

export const _getLiteNetworksData = memoize(
    async (networkName: string): Promise<any> => {
        try {
            const url = `https://api-core.curve.finance/v1/getDeployment/${networkName}`;
            const response = await fetch(url);
            const {data} = await response.json() ?? {};

            if (response.status !== 200 || !data) {
                console.error('Failed to fetch network data:', response.status, data);
                return null;
            }

            const { config, contracts } = data;

            const network_name = config.network_name || 'Unknown Network';
            const native_currency_symbol = config.native_currency_symbol || 'N/A';
            const wrapped_native_token = config.wrapped_native_token?.toLowerCase() || '';
            const native_token = config.native_token?.toLowerCase() || '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
            const wrapper = config.wrapper?.toLowerCase() || wrapped_native_token;

            return {
                NAME: network_name,
                ALIASES: {
                    stable_ng_factory: contracts.amm.stableswap.factory.address.toLowerCase(),
                    twocrypto_factory: contracts.amm.twocryptoswap.factory.address.toLowerCase(),
                    tricrypto_factory: contracts.amm.tricryptoswap.factory.address.toLowerCase(),
                    child_gauge_factory: contracts.gauge.child_gauge.factory.address.toLowerCase(),
                    root_gauge_factory: contracts.gauge.child_gauge.factory.address.toLowerCase(),

                    router: contracts.helpers.router.address.toLowerCase(),
                    deposit_and_stake: contracts.helpers.deposit_and_stake_zap.address.toLowerCase(),
                    stable_ng_meta_zap: contracts.helpers.stable_swap_meta_zap.address.toLowerCase(),

                    crv: config.dao.crv ? config.dao.crv.toLowerCase() : '0x0000000000000000000000000000000000000000',
                },
                NATIVE_COIN: {
                    symbol: native_currency_symbol,
                    address: native_token,
                    wrappedSymbol:
                        native_currency_symbol[0].toLowerCase() === native_currency_symbol[0]
                            ? `w${native_currency_symbol}`
                            : `W${native_currency_symbol}`,
                    wrappedAddress: wrapped_native_token,
                    wrapperAddress: wrapper,
                },
                API_CONSTANTS: {
                    nativeTokenName: config.native_currency_coingecko_id,
                    wrappedNativeTokenAddress: config.wrapped_native_token,
                },
            };
        } catch (error) {
            console.error('Error fetching network data:', error);
            return null;
        }
    },
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5 minutes
    }
);

export const _getCurveLiteNetworks = memoize(
    async (): Promise<ICurveLiteNetwork[]> => {
        const response = await fetch(`https://api-core.curve.finance/v1/getPlatforms`);
        const {data} = await response.json() ?? {};

        if (response.status !== 200 || !data?.platforms) {
            console.error('Failed to fetch Curve platforms:', response);
            return [];
        }

        const { platforms, platformsMetadata } = data;
        return Object.keys(platforms)
            .map((id) => {
                const { name, rpcUrl, nativeCurrencySymbol, explorerBaseUrl, isMainnet, chainId} = platformsMetadata[id] ?? {};
                return name && {
                    id,
                    name,
                    rpcUrl,
                    chainId,
                    explorerUrl: explorerBaseUrl,
                    nativeCurrencySymbol,
                    isTestnet: !isMainnet,
                };
            })
            .filter(Boolean);
    },
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5 minutes
    }
);

async function fetchJson(url: string) {
    const response = await fetch(url);
    return await response.json() ?? {};
}

async function fetchData(url: string) {
    const {data} = await fetchJson(url);
    return data;
}
