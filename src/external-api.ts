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
    IVolumeAndAPYs,
} from "./interfaces";


export const _getPoolsFromApi = memoize(
    async (network: INetworkName, poolType: IPoolType, isLiteChain = false): Promise<IExtendedPoolDataFromApi> => {
        const api = isLiteChain ? "https://dy9z253d96rct.cloudfront.net/v1/" : "https://api.curve.finance/api";
        const url = `${api}/getPools/${network}/${poolType}`;
        return await fetchData(url) ?? { poolData: [], tvl: 0, tvlAll: 0 };
    },
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
    }
)

export const _getAllPoolsFromApi = async (network: INetworkName, isLiteChain = false): Promise<IExtendedPoolDataFromApi[]> => {
    if(isLiteChain) {
        return await Promise.all([
            _getPoolsFromApi(network, "factory-twocrypto", isLiteChain),
            _getPoolsFromApi(network, "factory-tricrypto", isLiteChain),
            _getPoolsFromApi(network, "factory-stable-ng", isLiteChain),
        ]);
    } else {
        return await Promise.all([
            _getPoolsFromApi(network, "main", isLiteChain),
            _getPoolsFromApi(network, "crypto", isLiteChain),
            _getPoolsFromApi(network, "factory", isLiteChain),
            _getPoolsFromApi(network, "factory-crvusd", isLiteChain),
            _getPoolsFromApi(network, "factory-eywa", isLiteChain),
            _getPoolsFromApi(network, "factory-crypto", isLiteChain),
            _getPoolsFromApi(network, "factory-twocrypto", isLiteChain),
            _getPoolsFromApi(network, "factory-tricrypto", isLiteChain),
            _getPoolsFromApi(network, "factory-stable-ng", isLiteChain),
        ]);
    }
}

export const _getSubgraphData = memoize(
    async (network: INetworkName): Promise<IVolumeAndAPYs> => {
        const data = await fetchData(`https://api.curve.finance/api/getSubgraphData/${network}`);
        const poolsData = data.poolList.map((data: any) => ({
            address: data.address,
            volumeUSD: data.volumeUSD,
            day: data.latestDailyApy,
            week: data.latestWeeklyApy,
        }));

        return {
            poolsData: poolsData,
            totalVolume: data.totalVolume ?? 0,
            cryptoVolume: data.cryptoVolume ?? 0,
            cryptoShare: data.cryptoShare ?? 0,
        };
    },
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
    }
)

export const _getVolumes = memoize(
    async (network: string): Promise<IVolumeAndAPYs> => {

        const { pools, totalVolumes } = await fetchData(`https://api.curve.finance/api/getVolumes/${network}`);
        const poolsData = pools.map((data: any) => ({
            address: data.address,
            volumeUSD: data.volumeUSD,
            day: data.latestDailyApyPcent,
            week: data.latestWeeklyApyPcent,
        }));

        return {
            poolsData: poolsData ?? [],
            totalVolume: totalVolumes.totalVolume ?? 0,
            cryptoVolume: totalVolumes.totalCryptoVolume ?? 0,
            cryptoShare: totalVolumes.cryptoVolumeSharePcent ?? 0,
        };
    },
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
    }
)

export const _getFactoryAPYs = memoize(
    async (network: string): Promise<IVolumeAndAPYs> => {
        const [stableData, cryptoData] = await Promise.all(
            ['stable', 'crypto'].map((type) => fetchData(`https://api.curve.finance/api/getFactoryAPYs/${network}/${type}`))
        );
        const stableVolume = stableData.totalVolumeUsd || stableData.totalVolume || 0;
        const cryptoVolume = cryptoData.totalVolumeUsd || cryptoData.totalVolume || 0;
        return {
            poolsData: [...stableData.poolDetails, ...cryptoData.poolDetails].map((item) => ({
                address: item.poolAddress,
                volumeUSD: item.totalVolumeUsd ?? 0,
                day: item.apy ?? 0,
                week: (item.apy ?? 0) * 7, // Because api does not return week apy
            })),
            totalVolume: stableVolume + cryptoVolume,
            cryptoVolume,
            cryptoShare: 100 * cryptoVolume / (stableVolume + cryptoVolume),
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
    (): Promise<IDict<string[]>> => fetchData(`https://api.curve.finance/api/getHiddenPools`),
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
            const url = `https://dy9z253d96rct.cloudfront.net/v1/getDeployment/${networkName}`;
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
                    address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                    wrappedSymbol:
                        native_currency_symbol[0].toLowerCase() === native_currency_symbol[0]
                            ? `w${native_currency_symbol}`
                            : `W${native_currency_symbol}`,
                    wrappedAddress: wrapped_native_token,
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
        const response = await fetch(`https://dy9z253d96rct.cloudfront.net/v1/getPlatforms`);
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