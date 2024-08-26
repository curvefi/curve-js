import memoize from "memoizee";
import {
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
    async (network: INetworkName, poolType: IPoolType): Promise<IExtendedPoolDataFromApi> => {
        const url = `https://api.curve.fi/api/getPools/${network}/${poolType}`;
        const response = await fetch(url);
        const { data } = await response.json() as { data?: IExtendedPoolDataFromApi };
        return data ?? { poolData: [], tvl: 0, tvlAll: 0 };
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
        _getPoolsFromApi(network, "factory-twocrypto"),
        _getPoolsFromApi(network, "factory-tricrypto"),
        _getPoolsFromApi(network, "factory-stable-ng"),
    ]);
}

export const _getSubgraphData = memoize(
    async (network: INetworkName): Promise<IVolumeAndAPYs> => {
        const url = `https://api.curve.fi/api/getSubgraphData/${network}`;
        const response = await fetch(url);
        const { data } = await response.json() as any;
        const poolsData = data.poolList.map((item: any) => ({
            address: item.address,
            volumeUSD: item.volumeUSD,
            day: item.latestDailyApy,
            week: item.latestWeeklyApy,
        }));
        return {
            poolsData: poolsData ?? [],
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

        const url = `https://api.curve.fi/api/getVolumes/${network}`;
        const response = await fetch(url);
        const { data } = await response.json() as any;

        const poolsData = data.pools.map((item: any) => ({
            address: item.address,
            volumeUSD: item.volumeUSD,
            day: item.latestDailyApyPcent,
            week: item.latestWeeklyApyPcent,
        }));
        return {
            poolsData: poolsData ?? [],
            totalVolume: data.totalVolumes.totalVolume ?? 0,
            cryptoVolume: data.totalVolumes.totalCryptoVolume ?? 0,
            cryptoShare: data.totalVolumes.cryptoVolumeSharePcent ?? 0,
        };
    },
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
    }
)

export const _getFactoryAPYs = memoize(
    async (network: string): Promise<IVolumeAndAPYs> => {
        const urlStable = `https://api.curve.fi/api/getFactoryAPYs/${network}/stable`;
        const urlCrypto = `https://api.curve.fi/api/getFactoryAPYs/${network}/crypto`;
        const [{data: data0}, {data: data1}] = await Promise.all([
            fetch(urlStable),
            fetch(urlCrypto),
        ].map(r => r.then(r => r.json() as any)));

        const stableVolume = data0.totalVolumeUsd || data0.totalVolume || 0;
        const cryptoVolume = data1.totalVolumeUsd || data1.totalVolume || 0;

        const poolsData = [...data0.poolDetails, ...data1.poolDetails].map((item) => ({
            address: item.poolAddress,
            volumeUSD: item.totalVolumeUsd ?? 0,
            day: item.apy ?? 0,
            week: item.apy * 7 ?? 0, //Because api does not return week apy
        }))

        return {
            poolsData: poolsData ?? [],
            totalVolume: stableVolume + cryptoVolume ?? 0,
            cryptoVolume: cryptoVolume ?? 0,
            cryptoShare: 100*cryptoVolume/(stableVolume + cryptoVolume) || 0,
        };
    },
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
    }
)

//4
export const _getTotalVolumes = memoize(
    async (network: string): Promise<{
        totalVolume: number;
        cryptoVolume: number;
        cryptoShare: number;
    }> => {
        if (network === "aurora") return {
            totalVolume: 0,
            cryptoVolume: 0,
            cryptoShare: 0,
        };  // Exclude Aurora

        const url = `https://api.curve.fi/api/getSubgraphData/${network}`;
        const response = await fetch(url);
        return await response.json() as IVolumeAndAPYs;
    },
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
    }
)

export const _getAllGauges = memoize(
    async (): Promise<IDict<IGaugesDataFromApi>> => {
        const url = `https://api.curve.fi/api/getAllGauges`;
        const response = await fetch(url);
        return await response.json() as IDict<IGaugesDataFromApi>;
    },
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
    }
)

export const _getAllGaugesFormatted = memoize(
    async (): Promise<IDict<any>> => {
        const url = `https://api.curve.fi/api/getAllGauges`;
        const response = await fetch(url);
        const { data } = await response.json() as IDict<Partial<IGaugesDataFromApi>>;
        return Object.fromEntries(
            Object.values(data).map((d: any) =>
                [d.gauge.toLowerCase(), {
                    is_killed: d.is_killed ?? false,
                    gaugeStatus: d.gaugeStatus ?? null,
                }]
            )
        );
    },
    {
        promise: true,
        maxAge: 60 * 60 * 1000, // 60m
    }
)

export const _getHiddenPools = memoize(
    async (): Promise<IDict<string[]>> => {
        const url = `https://api.curve.fi/api/getHiddenPools`;
        const response = await fetch(url);
        return await response.json() as IDict<string[]>;
    },
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
    }
)

export const _generateBoostingProof = memoize(
    async (block: number, address: string): Promise<{ block_header_rlp: string, proof_rlp: string }> => {
        const url = `https://prices.curve.fi/v1/general/get_merkle_proof?block=${block}&account_address=${address}`;
        const response = await fetch(url);
        const { proof_rlp, block_header_rlp } = await response.json() as any;
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
    const response = await fetch(url);
    const { proposals } = await response.json() as { proposals: IDaoProposalListItem[] };
    return proposals;
},
{
    promise: true,
    maxAge: 5 * 60 * 1000, // 5m
})

export const _getDaoProposal = memoize(async (type: "PARAMETER" | "OWNERSHIP", id: number): Promise<IDaoProposal> => {
    const url = `https://api-py.llama.airforce/curve/v1/dao/proposals/${type.toLowerCase()}/${id}`;
    const response = await fetch(url);
    return await response.json() as IDaoProposal;
},
{
    promise: true,
    maxAge: 5 * 60 * 1000, // 5m
})