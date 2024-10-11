import axios from "axios";
import memoize from "memoizee";
import {
    IExtendedPoolDataFromApi,
    IDict,
    INetworkName,
    IPoolType,
    IGaugesDataFromApi,
    IDaoProposal,
    IDaoProposalListItem,
    IVolumeAndAPYs,
} from "./interfaces";


export const _getPoolsFromApi = memoize(
    async (network: INetworkName, poolType: IPoolType, isLiteChain = false): Promise<IExtendedPoolDataFromApi> => {
        const api = isLiteChain ? "https://api-core.curve.fi/v1/" : "https://api.curve.fi/api";
        const url = `${api}/getPools/${network}/${poolType}`;
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
        _getPoolsFromApi(network, "factory-twocrypto"),
        _getPoolsFromApi(network, "factory-tricrypto"),
        _getPoolsFromApi(network, "factory-stable-ng"),
    ]);
}

export const _getSubgraphData = memoize(
    async (network: INetworkName): Promise<IVolumeAndAPYs> => {
        const url = `https://api.curve.fi/api/getSubgraphData/${network}`;
        const response = await axios.get(url, { validateStatus: () => true });

        const poolsData = response.data.data.poolList.map((item: any) => {
            return {
                address: item.address,
                volumeUSD: item.volumeUSD,
                day: item.latestDailyApy,
                week: item.latestWeeklyApy,
            }
        })

        return {
            poolsData: poolsData ?? [],
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

export const _getVolumes = memoize(
    async (network: string): Promise<IVolumeAndAPYs> => {

        const url = `https://api.curve.fi/api/getVolumes/${network}`;
        const response = await axios.get(url, { validateStatus: () => true });

        const poolsData = response.data.data.pools.map((item: any) => {
            return {
                address: item.address,
                volumeUSD: item.volumeUSD,
                day: item.latestDailyApyPcent,
                week: item.latestWeeklyApyPcent,
            }
        })

        return {
            poolsData: poolsData ?? [],
            totalVolume: response.data.data.totalVolumes.totalVolume ?? 0,
            cryptoVolume: response.data.data.totalVolumes.totalCryptoVolume ?? 0,
            cryptoShare: response.data.data.totalVolumes.cryptoVolumeSharePcent ?? 0,
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
        const response = await Promise.all([
            axios.get(urlStable, { validateStatus: () => true }),
            axios.get(urlCrypto, { validateStatus: () => true }),
        ]);

        const stableVolume = response[0].data.data.totalVolumeUsd || response[0].data.data.totalVolume || 0;
        const cryptoVolume = response[1].data.data.totalVolumeUsd || response[1].data.data.totalVolume || 0;

        const poolsData = [...response[0].data.data.poolDetails, ...response[1].data.data.poolDetails].map((item) => {
            return {
                address: item.poolAddress,
                volumeUSD: item.totalVolumeUsd ?? 0,
                day: item.apy ?? 0,
                week: item.apy*7 ?? 0, //Because api does not return week apy
            }
        })

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
        const response = await axios.get(url, { validateStatus: () => true });

        return response.data.data;
    },
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
    }
)

export const _getAllGauges = memoize(
    async (): Promise<IDict<IGaugesDataFromApi>> => {
        const url = `https://api.curve.fi/api/getAllGauges`;
        const response = await axios.get(url, { validateStatus: () => true });

        return response.data.data;
    },
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
    }
)

export const _getAllGaugesFormatted = memoize(
    async (): Promise<IDict<any>> => {
        const url = `https://api.curve.fi/api/getAllGauges`;
        const response = await axios.get(url, { validateStatus: () => true });

        const gaugesDict: Record<string, any> = {}

        Object.values(response.data.data).forEach((d: any) => {
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


// --- DAO ---

export const _getDaoProposalList = memoize(async (): Promise<IDaoProposalListItem[]> => {
    const url = "https://api-py.llama.airforce/curve/v1/dao/proposals";
    const response = await axios.get(url, { validateStatus: () => true });

    return response.data.proposals;
},
{
    promise: true,
    maxAge: 5 * 60 * 1000, // 5m
})

export const _getDaoProposal = memoize(async (type: "PARAMETER" | "OWNERSHIP", id: number): Promise<IDaoProposal> => {
    const url = `https://api-py.llama.airforce/curve/v1/dao/proposals/${type.toLowerCase()}/${id}`;
    const response = await axios.get(url, { validateStatus: () => true });

    return response.data;
},
{
    promise: true,
    maxAge: 5 * 60 * 1000, // 5m
})

// --- CURVE LITE ---

export const _getLiteNetworksData = memoize(async (chainId: number): Promise<any> => {
    const network_name = "arbitrum-sepolia";
    const native_currency_symbol = "ETH";
    const wrapped_letter = native_currency_symbol[0].toLowerCase() === native_currency_symbol[0] ? "w" : "W";
    const wrapped_native_token = '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73'.toLowerCase();

    const stable_ng_factory = "0x5eeE3091f747E60a045a2E715a4c71e600e31F6E".toLowerCase();
    const twocrypto_factory =  "0x98EE851a00abeE0d95D08cF4CA2BdCE32aeaAF7F".toLowerCase();
    const tricrypto_factory = "0x0C9D8c7e486e822C29488Ff51BFf0167B4650953".toLowerCase();
    const gauge_factory = "0xB4c6A1e8A14e9Fe74c88b06275b747145DD41206".toLowerCase();

    const router = "0x148ac020221D4690457812b2AE23f6Ba5001DDCf".toLowerCase();
    const deposit_and_stake = "0xFfd9A3490B5E0F4f19D917048C5362Ef80919C7B".toLowerCase();
    const stable_ng_meta_zap = "0xcb38785B2CceD9B40F6C5120BC8e803d3a884977".toLowerCase();

    const crv = "0x50FB01Ee521b9D22cdcb713a505019f41b8BBFf4".toLowerCase();


    return {
        NAME: network_name,
        ALIASES: {
            stable_ng_factory,
            twocrypto_factory,
            tricrypto_factory,
            "child_gauge_factory": gauge_factory,
            "root_gauge_factory": gauge_factory,

            router,
            deposit_and_stake,
            stable_ng_meta_zap,

            crv,
        },
        NATIVE_COIN: {
            symbol: native_currency_symbol,
            address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
            wrappedSymbol: wrapped_letter + native_currency_symbol,
            wrappedAddress: wrapped_native_token.toLowerCase(),
        },
    }
},
{
    promise: true,
    maxAge: 5 * 60 * 1000, // 5m
})
