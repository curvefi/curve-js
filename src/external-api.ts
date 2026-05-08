import memoize from "memoizee";
import BigNumber from "bignumber.js";
import {
    ICurveLiteNetwork,
    IDaoProposal,
    IDaoProposalListItem,
    IDict,
    IExtendedPoolDataFromApi,
    IGaugesDataFromApi,
    INetworkName,
    IPoolType,
    IPricesDaoProposalDetail,
    IPricesDaoProposalListItem,
    IPricesDaoProposalListResponse,
    IPricesDaoProposalVote,
    IPricesGauge,
    IPricesGaugeData,
    IPricesGaugePool,
    IPricesGaugeReward,
    IPricesGaugesOverviewResponse,
    IPricesPool,
    IPricesPoolsResponse,
    IRewardFromApi,
    TPricesPoolType,
    IVolumeAndAPYs,
} from "./interfaces";
import {
    EMPTY_EXTENDED_POOL_DATA,
    LEGACY_POOL_TYPES,
    PRICES_POOL_TYPE_TO_LEGACY,
    SUPPORTED_NON_LITE_POOL_CHAIN_IDS,
} from "./constants/external-api.js";

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

const getAssetType = (assetTypeName: string): string => {
    if (assetTypeName.toUpperCase() === "USD") return "0";
    if (assetTypeName.toUpperCase() === "ETH") return "1";
    if (assetTypeName.toUpperCase() === "BTC") return "2";

    return "3";
}

const getCoinUsdPrice = (balance?: number, balanceUsd?: number): number => {
    if (!balance) return 0;
    return (balanceUsd ?? 0) / balance;
}

const getCoinPoolBalance = (balance: number | undefined, decimals: number | null | undefined): string =>
    new BigNumber(balance ?? 0).times(new BigNumber(10).pow(decimals ?? 18)).integerValue(BigNumber.ROUND_DOWN).toFixed(0);

const getPoolPriceOracle = (priceOracle?: number | number[] | null): number | null =>
    Array.isArray(priceOracle) ? priceOracle[0] ?? null : priceOracle ?? null;

const getPoolPriceOracles = (priceOracle?: number | number[] | null): number[] | null => {
    if (Array.isArray(priceOracle)) return priceOracle;
    if (priceOracle == null) return null;

    return [priceOracle];
}

const getPoolHasMethods = (pool: IPricesPool): { exchange_received: boolean, exchange_extended: boolean } => ({
    exchange_received: pool.pool_methods?.includes("exchange_received") ?? false,
    exchange_extended: pool.pool_methods?.includes("exchange_extended") ?? false,
});

const getGaugeLookupKeys = (...addresses: (string | null | undefined)[]): string[] => {
    const normalizedAddresses = addresses
        .filter((address): address is string => Boolean(address))
        .map((address) => address.toLowerCase());

    return [...new Set(normalizedAddresses)];
}

const isRewardGauge = (gauge: IPricesGauge): boolean => gauge.name?.includes("RewardGauge") ?? false;

const getGaugeTarget = (gauge: IPricesGauge): IPricesGaugePool | null => gauge.pool ?? gauge.market ?? null;

const getGaugeChain = (gauge: IPricesGauge): string => getGaugeTarget(gauge)?.chain ?? "ethereum";

const isSidechainGauge = (gauge: IPricesGauge): boolean => getGaugeChain(gauge) !== "ethereum";

const getRootGaugeAddress = (gauge: IPricesGauge): string => gauge.address.toLowerCase();

const getEffectiveGaugeAddress = (gauge: IPricesGauge): string => (gauge.effective_address ?? gauge.address).toLowerCase();

const resolveGaugeAddress = (gauge: IPricesGauge): string => isSidechainGauge(gauge) ? getEffectiveGaugeAddress(gauge) : getRootGaugeAddress(gauge);

const getGaugeEntryName = (gauge: IPricesGauge): string => gauge.name ?? gauge.pool?.name ?? gauge.market?.name ?? resolveGaugeAddress(gauge);

const getGaugeShortName = (gauge: IPricesGauge): string => gauge.pool?.name ?? gauge.market?.name ?? gauge.name ?? resolveGaugeAddress(gauge);

const getGaugeType = (gauge: IPricesGauge): string | null => {
    if (!gauge.gauge_type) return null;
    return gauge.gauge_type.toLowerCase().includes("crypto") ? "crypto" : "stable";
}

const getGaugeWorkingSupply = (gauge: IPricesGauge): string =>
    new BigNumber(gauge.working_supply ?? 0).times("1e18").integerValue(BigNumber.ROUND_DOWN).toFixed(0);

const buildPoolUrls = (chain: string, poolAddress: string): { swap: string[], deposit: string[], withdraw: string[] } => {
    const base = `https://curve.finance/dex/#/${chain}/pools/${poolAddress}`;

    return {
        swap: [`${base}/swap`],
        deposit: [`${base}/deposit`],
        withdraw: [`${base}/withdraw`],
    };
}

const getGaugeRelativeWeight = (gauge: IPricesGauge): string => {
    if (!gauge.gauge_relative_weight) return "0";
    return new BigNumber(gauge.gauge_relative_weight).times("1e18").integerValue(BigNumber.ROUND_DOWN).toFixed(0);
}

const mapDaoProposalType = (voteType: IPricesDaoProposalListItem["vote_type"]): "PARAMETER" | "OWNERSHIP" => voteType.toUpperCase() as "PARAMETER" | "OWNERSHIP";

const mapDaoProposalListItem = (proposal: IPricesDaoProposalListItem): IDaoProposalListItem => ({
    voteId: proposal.vote_id,
    voteType: mapDaoProposalType(proposal.vote_type),
    creator: proposal.creator,
    startDate: proposal.start_date,
    snapshotBlock: proposal.snapshot_block,
    ipfsMetadata: proposal.ipfs_metadata ?? "",
    metadata: proposal.metadata ?? "",
    votesFor: proposal.votes_for,
    votesAgainst: proposal.votes_against,
    voteCount: proposal.vote_count,
    supportRequired: proposal.support_required,
    minAcceptQuorum: proposal.min_accept_quorum,
    totalSupply: proposal.total_supply,
    executed: proposal.executed,
});

const mapDaoProposalVote = (vote: IPricesDaoProposalVote, proposalVoteId: number) => ({
    tx: vote.transaction_hash,
    voteId: proposalVoteId,
    voter: vote.voter,
    supports: vote.supports,
    stake: Number(vote.voting_power),
});

const mapDaoProposal = (proposal: IPricesDaoProposalDetail): IDaoProposal => ({
    ...mapDaoProposalListItem(proposal),
    tx: proposal.transaction_hash ?? "",
    creatorVotingPower: Number(proposal.creator_voting_power),
    script: proposal.script ?? "",
    votes: proposal.votes.map((vote) => mapDaoProposalVote(vote, proposal.vote_id)),
});

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
    const gaugeAddress = resolveGaugeAddress(primaryGauge);

    return {
        gaugeAddress,
        gaugeRewards: mapGaugeRewards(gaugeAddress, rewardsSource?.extra_rewards),
        gaugeCrvApy: [aprSource?.crv_apr_base ?? 0, aprSource?.crv_apr_boosted ?? 0],
    };
}

const getGaugeRecordKey = (acc: IDict<IGaugesDataFromApi>, gauge: IPricesGauge): string => {
    const baseKey = getGaugeEntryName(gauge);
    if (!(baseKey in acc)) return baseKey;

    const addressKey = `${baseKey} (${resolveGaugeAddress(gauge)})`;
    if (!(addressKey in acc)) return addressKey;

    return `${addressKey}-${Object.keys(acc).length}`;
}

const getGaugeData = (gaugesByAddress: IDict<IPricesGaugeData>, ...addresses: (string | null | undefined)[]): IPricesGaugeData => {
    const gaugeData = getGaugeLookupKeys(...addresses)
        .map((address) => gaugesByAddress[address])
        .find(Boolean);

    return gaugeData ?? getEmptyGaugeData();
}

const uncached_getPoolsFromApi = async (network: INetworkName, poolType: IPoolType): Promise<IExtendedPoolDataFromApi> => {
    const url = `https://api-core.curve.finance/v1/getPools/${network}/${poolType}`;
    return await fetchData(url) ?? { ...EMPTY_EXTENDED_POOL_DATA, poolData: [] };
}

const _getGaugesOverview = memoize(
    async (): Promise<IPricesGaugesOverviewResponse> => await fetchJson("https://prices.curve.finance/v1/dao/gauges/overview") as IPricesGaugesOverviewResponse,
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
    }
)

const _getGaugeOverviewData = memoize(
    async (network: INetworkName): Promise<IDict<IPricesGaugeData>> => {
        const { gauges } = await _getGaugesOverview();
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
                ...poolGauges.map((gauge) => gauge.lp_token)
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
        const assetTypeName = getReferenceAssetName(pool.pool_type);
        const priceOracle = getPoolPriceOracle(pool.price_oracle);
        const priceOracles = getPoolPriceOracles(pool.price_oracle);
        const gaugeCrvApy = [gaugeData.gaugeCrvApy[0] ?? 0, gaugeData.gaugeCrvApy[1] ?? 0] as [number, number];
        poolsDict[legacyPoolType].poolData.push({
            id: pool.address.toLowerCase(),
            name: pool.name,
            symbol: pool.lp_token_symbol ?? pool.name,
            assetTypeName,
            ...(["main", "factory", "crvusd"].includes(pool.pool_type ?? "") ? { assetType: getAssetType(assetTypeName) } : {}),
            address: pool.address,
            coinsAddresses: pool.coins.map((coin) => coin.address),
            decimals: pool.coins.map((coin) => String(coin.decimals ?? 18)),
            virtualPrice: pool.virtual_price == null ? "0" : String(pool.virtual_price),
            isMetaPool: pool.is_metapool ?? false,
            ...(pool.base_pool ? { basePoolAddress: pool.base_pool } : {}),
            lpTokenAddress: pool.lp_token_address ?? pool.address,
            ...(gaugeData.gaugeAddress ? { gaugeAddress: gaugeData.gaugeAddress } : {}),
            implementation: pool.pool_type ?? "",
            ...(pool.implementation_address ? { implementationAddress: pool.implementation_address } : {}),
            priceOracle,
            priceOracles,
            coins: pool.coins.map((coin, index) => ({
                address: coin.address,
                symbol: coin.symbol,
                name: coin.name ?? coin.symbol,
                decimals: String(coin.decimals ?? 18),
                usdPrice: getCoinUsdPrice(pool.balances[index], pool.balances_usd[index]),
                poolBalance: getCoinPoolBalance(pool.balances[index], coin.decimals),
                isBasePoolLpToken: false,
            })),
            poolUrls: buildPoolUrls(network, pool.address),
            gaugeRewards: gaugeData.gaugeRewards,
            usdTotal: pool.tvl_usd ?? 0,
            usdTotalExcludingBasePool: pool.tvl_usd ?? 0,
            totalSupply: (pool.lp_token_supply ?? 0) * 1e18,
            amplificationCoefficient: String(pool.amplification_coefficient ?? ""),
            ...(gaugeData.gaugeAddress ? { gaugeCrvApy, gaugeFutureCrvApy: gaugeCrvApy } : {}),
            usesRateOracle: priceOracle != null,
            isBroken: false,
            hasMethods: getPoolHasMethods(pool),
            creationTs: pool.creation_ts ?? 0,
            creationBlockNumber: pool.creation_block_number ?? 0,
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
    async (): Promise<IDict<IGaugesDataFromApi>> => {
        const { gauges } = await _getGaugesOverview();

        return gauges.reduce((acc, gauge) => {
            const chain = getGaugeChain(gauge);
            const isSidechain = isSidechainGauge(gauge);
            const gaugeAddress = resolveGaugeAddress(gauge);
            const rootGaugeAddress = getRootGaugeAddress(gauge);
            const isPool = gauge.pool != null && gauge.market == null;
            const targetAddress = gauge.pool?.address ?? gauge.market?.address ?? "";
            const lpTokenAddress = isPool ? gauge.lp_token : null;
            const gaugeCrvApy = [gauge.crv_apr_base ?? 0, gauge.crv_apr_boosted ?? 0] as [number, number];

            acc[getGaugeRecordKey(acc, gauge)] = {
                blockchainId: chain,
                isPool,
                name: getGaugeEntryName(gauge),
                gauge: gaugeAddress,
                ...(isSidechain ? { rootGauge: rootGaugeAddress } : {}),
                poolAddress: targetAddress || undefined,
                virtualPrice: 0,
                factory: gauge.is_factory ?? false,
                type: getGaugeType(gauge),
                swap: isPool ? targetAddress.toLowerCase() : "",
                swap_token: lpTokenAddress?.toLowerCase() ?? "",
                lpTokenPrice: gauge.lp_token_price ?? null,
                shortName: getGaugeShortName(gauge),
                gauge_data: {
                    inflation_rate: "0",
                    working_supply: getGaugeWorkingSupply(gauge),
                },
                gauge_controller: {
                    gauge_relative_weight: getGaugeRelativeWeight(gauge),
                    gauge_future_relative_weight: "0",
                    get_gauge_weight: String(gauge.gauge_weight ?? "0"),
                    inflation_rate: "0",
                },
                gaugeCrvApy,
                gaugeFutureCrvApy: gaugeCrvApy,
                side_chain: isSidechain,
                poolUrls: isPool && targetAddress ? buildPoolUrls(chain, targetAddress) : undefined,
                is_killed: gauge.is_killed ?? false,
                hasNoCrv: (gauge.emissions ?? 0) === 0,
                ...(isSidechain ? { gaugeStatus: {} } : {}),
            };

            return acc;
        }, {} as IDict<IGaugesDataFromApi>);
    },
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
    }
)

export const _getAllGaugesFormatted = memoize(
    async (): Promise<IDict<any>> => {
        const data = Object.values(await _getAllGauges());

        const gaugesDict: Record<string, any> = {}

        data.forEach((d: any) => {
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
    const pagination = 100;
    let page = 1;
    let totalCount = Infinity;
    const proposals: IDaoProposalListItem[] = [];

    while (proposals.length < totalCount) {
        const url = `https://prices.curve.finance/v1/dao/proposals?pagination=${pagination}&page=${page}`;
        const response = await fetchJson(url) as IPricesDaoProposalListResponse;
        totalCount = response.count ?? 0;

        if (!response.proposals?.length) break;

        proposals.push(...response.proposals.map(mapDaoProposalListItem));

        if (response.proposals.length < pagination) break;
        page += 1;
    }

    return proposals;
},
{
    promise: true,
    maxAge: 5 * 60 * 1000, // 5m
})

export const _getDaoProposal = memoize(
    async (type: "PARAMETER" | "OWNERSHIP", id: number): Promise<IDaoProposal> =>
        mapDaoProposal(await fetchJson(`https://prices.curve.finance/v1/dao/proposals/details/${type.toLowerCase()}/${id}`) as IPricesDaoProposalDetail),
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
    }
)

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
