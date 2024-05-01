import {AbstractProvider, BigNumberish, Contract, ethers, JsonRpcProvider, Networkish, Numeric} from "ethers";
import {Contract as MulticallContract, Provider as MulticallProvider} from 'ethcall';
import {getFactoryPoolData} from "./factory/factory.js";
import {getFactoryPoolsDataFromApi} from "./factory/factory-api.js";
import {getCryptoFactoryPoolData} from "./factory/factory-crypto.js";
import {getTricryptoFactoryPoolData} from "./factory/factory-tricrypto.js";
import {IChainId, ICurve, IDict, IFactoryPoolType, INetworkName, IPoolData} from "./interfaces";
import ERC20Abi from './constants/abis/ERC20.json' assert {type: 'json'};
import cERC20Abi from './constants/abis/cERC20.json' assert {type: 'json'};
import yERC20Abi from './constants/abis/yERC20.json' assert {type: 'json'};
import gaugeFactoryABI from './constants/abis/gauge_factory_mainnet.json' assert {type: 'json'};
import gaugeFactoryForFraxtalABI from './constants/abis/gauge_factory_mainnet_for_fraxtal.json' assert {type: 'json'};
import gaugeFactorySidechainABI from './constants/abis/gauge_factory_sidechain.json' assert {type: 'json'};
import minterMainnetABI from './constants/abis/minter_mainnet.json' assert {type: 'json'};
import votingEscrowABI from './constants/abis/votingescrow.json' assert {type: 'json'};
import anycallABI from './constants/abis/anycall.json' assert {type: 'json'};
import votingEscrowOracleABI from './constants/abis/voting_escrow_oracle.json' assert {type: 'json'};
import votingEscrowOracleEthABI from './constants/abis/voting_escrow_oracle_eth.json' assert {type: 'json'};
import feeDistributorABI from './constants/abis/fee_distributor.json' assert {type: 'json'};
import gaugeControllerABI from './constants/abis/gaugecontroller.json' assert {type: 'json'};
import depositAndStakeABI from './constants/abis/deposit_and_stake.json' assert {type: 'json'};
import cryptoCalcZapABI from './constants/abis/crypto_calc.json' assert {type: 'json'};
import StableCalcZapABI from './constants/abis/stable_calc.json' assert {type: 'json'};
import routerABI from './constants/abis/router.json' assert {type: 'json'};
import routerPolygonABI from './constants/abis/routerPolygon.json' assert {type: 'json'};
import streamerABI from './constants/abis/streamer.json' assert {type: 'json'};
import factoryABI from './constants/abis/factory.json' assert {type: 'json'};
import factoryEywaABI from './constants/abis/factory-eywa.json' assert {type: 'json'};
import factoryAdminABI from './constants/abis/factory-admin.json' assert {type: 'json'};
import cryptoFactoryABI from './constants/abis/factory-crypto.json' assert {type: 'json'};
import twocryptoFactoryABI from './constants/abis/factory-twocrypto-ng.json' assert {type: 'json'};
import tricryptoFactoryABI from './constants/abis/factory-tricrypto.json' assert {type: 'json'};
import stableNgFactoryABI from './constants/abis/factory-stable-ng.json' assert {type: 'json'};
import gasOracleABI from './constants/abis/gas_oracle_optimism.json' assert {type: 'json'};
import gasOracleBlobABI from './constants/abis/gas_oracle_optimism_blob.json' assert {type: 'json'};
import votingProposalABI from './constants/abis/voting_proposal.json' assert {type: 'json'};
import circulatingSupplyABI from './constants/abis/circulating_supply.json' assert {type: 'json'};


import {
    LLAMMAS_DATA_ETHEREUM,
    POOLS_DATA_ARBITRUM,
    POOLS_DATA_AURORA,
    POOLS_DATA_AVALANCHE,
    POOLS_DATA_BASE,
    POOLS_DATA_BSC,
    POOLS_DATA_CELO,
    POOLS_DATA_ETHEREUM,
    POOLS_DATA_FANTOM,
    POOLS_DATA_FRAXTAL,
    POOLS_DATA_KAVA,
    POOLS_DATA_MOONBEAM,
    POOLS_DATA_OPTIMISM,
    POOLS_DATA_POLYGON,
    POOLS_DATA_XDAI,
    POOLS_DATA_ZKSYNC,
} from './constants/pools/index.js';
import {
    ALIASES_ARBITRUM,
    ALIASES_AURORA,
    ALIASES_AVALANCHE,
    ALIASES_BASE,
    ALIASES_BSC,
    ALIASES_CELO,
    ALIASES_ETHEREUM,
    ALIASES_FANTOM,
    ALIASES_FRAXTAL,
    ALIASES_KAVA,
    ALIASES_MOONBEAM,
    ALIASES_OPTIMISM,
    ALIASES_POLYGON,
    ALIASES_XDAI,
    ALIASES_ZKSYNC,
} from "./constants/aliases.js";
import {
    aTokensEthereum,
    COINS_ETHEREUM,
    cTokensEthereum,
    ycTokensEthereum,
    yTokensEthereum,
} from "./constants/coins/ethereum.js";
import {
    aTokensOptimism,
    COINS_OPTIMISM,
    cTokensOptimism,
    ycTokensOptimism,
    yTokensOptimism,
} from "./constants/coins/optimism.js";
import {
    aTokensPolygon,
    COINS_POLYGON,
    cTokensPolygon,
    ycTokensPolygon,
    yTokensPolygon,
} from "./constants/coins/polygon.js";
import {aTokensFantom, COINS_FANTOM, cTokensFantom, ycTokensFantom, yTokensFantom} from "./constants/coins/fantom.js";
import {
    aTokensAvalanche,
    COINS_AVALANCHE,
    cTokensAvalanche,
    ycTokensAvalanche,
    yTokensAvalanche,
} from "./constants/coins/avalanche.js";
import {
    aTokensArbitrum,
    COINS_ARBITRUM,
    cTokensArbitrum,
    ycTokensArbitrum,
    yTokensArbitrum,
} from "./constants/coins/arbitrum.js";
import {aTokensXDai, COINS_XDAI, cTokensXDai, ycTokensXDai, yTokensXDai} from "./constants/coins/xdai.js";
import {
    aTokensMoonbeam,
    COINS_MOONBEAM,
    cTokensMoonbeam,
    ycTokensMoonbeam,
    yTokensMoonbeam,
} from "./constants/coins/moonbeam.js";
import {aTokensAurora, COINS_AURORA, cTokensAurora, ycTokensAurora, yTokensAurora} from "./constants/coins/aurora.js";
import {aTokensKava, COINS_KAVA, cTokensKava, ycTokensKava, yTokensKava} from "./constants/coins/kava.js";
import {aTokensCelo, COINS_CELO, cTokensCelo, ycTokensCelo, yTokensCelo} from "./constants/coins/celo.js";
import {aTokensZkSync, COINS_ZKSYNC, cTokensZkSync, ycTokensZkSync, yTokensZkSync} from "./constants/coins/zksync.js";
import {aTokensBase, COINS_BASE, cTokensBase, ycTokensBase, yTokensBase} from "./constants/coins/base.js";
import {aTokensBsc, COINS_BSC, cTokensBsc, ycTokensBsc, yTokensBsc} from "./constants/coins/bsc.js";
import {
    aTokensFraxtal,
    COINS_FRAXTAL,
    cTokensFraxtal,
    ycTokensFraxtal,
    yTokensFraxtal,
} from "./constants/coins/fraxtal.js";
import {extractDecimals, extractGauges, lowerCasePoolDataAddresses} from "./constants/utils.js";
import {_getAllGauges, _getHiddenPools} from "./external-api.js";
import {L2Networks} from "./constants/L2Networks.js";
import {getTwocryptoFactoryPoolData} from "./factory/factory-twocrypto";

const _killGauges = async (poolsData: IDict<IPoolData>): Promise<void> => {
    const gaugeData = await _getAllGauges();
    const isKilled: IDict<boolean> = {};
    const gaugeStatuses: IDict<Record<string, boolean> | null> = {};
    Object.values(gaugeData).forEach((d) => {
        isKilled[d.gauge.toLowerCase()] = d.is_killed ?? false;
        gaugeStatuses[d.gauge.toLowerCase()] = d.gaugeStatus ?? null;
    });

    for (const poolId in poolsData) {
        if (isKilled[poolsData[poolId].gauge_address]) {
            poolsData[poolId].is_gauge_killed = true;
        }
        if (gaugeStatuses[poolsData[poolId].gauge_address]) {
            poolsData[poolId].gauge_status = gaugeStatuses[poolsData[poolId].gauge_address];
        }
    }
}

export const NATIVE_TOKENS: { [index: number]: { symbol: string, wrappedSymbol: string, address: string, wrappedAddress: string }} = {
    1: {  // ETH
        symbol: 'ETH',
        wrappedSymbol: 'WETH',
        address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        wrappedAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'.toLowerCase(),
    },
    10: { // OPTIMISM
        symbol: 'ETH',
        wrappedSymbol: 'WETH',
        address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        wrappedAddress: '0x4200000000000000000000000000000000000006'.toLowerCase(),
    },
    56: { // BSC
        symbol: 'BNB',
        wrappedSymbol: 'WBNB',
        address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        wrappedAddress: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'.toLowerCase(),
    },
    100: { // XDAI
        symbol: 'XDAi',
        wrappedSymbol: 'WXDAI',
        address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        wrappedAddress: '0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d'.toLowerCase(),
    },
    137: {  // POLYGON
        symbol: 'MATIC',
        wrappedSymbol: 'WMATIC',
        address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        wrappedAddress: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270'.toLowerCase(),
    },
    250: {  // FANTOM
        symbol: 'FTM',
        wrappedSymbol: 'WFTM',
        address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        wrappedAddress: '0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83'.toLowerCase(),
    },
    252: { // FRAXTAL
        symbol: 'frxETH',
        wrappedSymbol: 'wfrxETH',
        address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        wrappedAddress: '0xfc00000000000000000000000000000000000006'.toLowerCase(),
    },
    324: {  // ZKSYNC
        symbol: 'ETH',
        wrappedSymbol: 'WETH',
        address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        wrappedAddress: '0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91'.toLowerCase(),
    },
    1284: {  // MOONBEAM
        symbol: 'GLMR',
        wrappedSymbol: 'WGLMR',
        address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        wrappedAddress: '0xAcc15dC74880C9944775448304B263D191c6077F'.toLowerCase(),
    },
    2222: {  // KAVA
        symbol: 'KAVA',
        wrappedSymbol: 'WKAVA',
        address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        wrappedAddress: '0xc86c7C0eFbd6A49B35E8714C5f59D99De09A225b'.toLowerCase(),
    },
    8453: {  // BASE
        symbol: 'ETH',
        wrappedSymbol: 'WETH',
        address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        wrappedAddress: '0x4200000000000000000000000000000000000006'.toLowerCase(),
    },
    42161: {  // ARBITRUM
        symbol: 'ETH',
        wrappedSymbol: 'WETH',
        address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        wrappedAddress: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1'.toLowerCase(),
    },
    42220: {  // CELO
        symbol: 'CELO',
        wrappedSymbol: 'WCELO',
        address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        wrappedAddress: '0x3Ad443d769A07f287806874F8E5405cE3Ac902b9'.toLowerCase(),
    },
    43114: {  // AVALANCHE
        symbol: 'AVAX',
        wrappedSymbol: 'WAVAX',
        address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        wrappedAddress: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7'.toLowerCase(),
    },
    1313161554: {  // AURORA
        symbol: 'ETH',
        wrappedSymbol: 'WETH',
        address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        wrappedAddress: '0xC9BdeEd33CD01541e1eeD10f90519d2C06Fe3feB'.toLowerCase(),
    },
}

export const NETWORK_CONSTANTS: { [index: number]: any } = {
    1: {
        NAME: 'ethereum',
        ALIASES: ALIASES_ETHEREUM,
        POOLS_DATA: POOLS_DATA_ETHEREUM,
        LLAMMAS_DATA: LLAMMAS_DATA_ETHEREUM,
        COINS: COINS_ETHEREUM,
        cTokens: cTokensEthereum,
        yTokens: yTokensEthereum,
        ycTokens: ycTokensEthereum,
        aTokens: aTokensEthereum,
    },
    10: {
        NAME: 'optimism',
        ALIASES: ALIASES_OPTIMISM,
        POOLS_DATA: POOLS_DATA_OPTIMISM,
        COINS: COINS_OPTIMISM,
        cTokens: cTokensOptimism,
        yTokens: yTokensOptimism,
        ycTokens: ycTokensOptimism,
        aTokens: aTokensOptimism,
    },
    56: {
        NAME: 'bsc',
        ALIASES: ALIASES_BSC,
        POOLS_DATA: POOLS_DATA_BSC,
        COINS: COINS_BSC,
        cTokens: cTokensBsc,
        yTokens: yTokensBsc,
        ycTokens: ycTokensBsc,
        aTokens: aTokensBsc ,
    },
    100: {
        NAME: 'xdai',
        ALIASES: ALIASES_XDAI,
        POOLS_DATA: POOLS_DATA_XDAI,
        COINS: COINS_XDAI,
        cTokens: cTokensXDai,
        yTokens: yTokensXDai,
        ycTokens: ycTokensXDai,
        aTokens: aTokensXDai,
    },
    137: {
        NAME: 'polygon',
        ALIASES: ALIASES_POLYGON,
        POOLS_DATA: POOLS_DATA_POLYGON,
        COINS: COINS_POLYGON,
        cTokens: cTokensPolygon,
        yTokens: yTokensPolygon,
        ycTokens: ycTokensPolygon,
        aTokens: aTokensPolygon,
    },
    250: {
        NAME: 'fantom',
        ALIASES: ALIASES_FANTOM,
        POOLS_DATA: POOLS_DATA_FANTOM,
        COINS: COINS_FANTOM,
        cTokens: cTokensFantom,
        yTokens: yTokensFantom,
        ycTokens: ycTokensFantom,
        aTokens: aTokensFantom,
    },
    252: {
        NAME: 'fraxtal',
        ALIASES: ALIASES_FRAXTAL,
        POOLS_DATA: POOLS_DATA_FRAXTAL,
        COINS: COINS_FRAXTAL,
        cTokens: cTokensFraxtal,
        yTokens: yTokensFraxtal,
        ycTokens: ycTokensFraxtal,
        aTokens: aTokensFraxtal,
    },
    324: {
        NAME: 'zksync',
        ALIASES: ALIASES_ZKSYNC,
        POOLS_DATA: POOLS_DATA_ZKSYNC,
        COINS: COINS_ZKSYNC,
        cTokens: cTokensZkSync,
        yTokens: yTokensZkSync,
        ycTokens: ycTokensZkSync,
        aTokens: aTokensZkSync,
    },
    1284: {
        NAME: 'moonbeam',
        ALIASES: ALIASES_MOONBEAM,
        POOLS_DATA: POOLS_DATA_MOONBEAM,
        COINS: COINS_MOONBEAM,
        cTokens: cTokensMoonbeam,
        yTokens: yTokensMoonbeam,
        ycTokens: ycTokensMoonbeam,
        aTokens: aTokensMoonbeam,
    },
    2222: {
        NAME: 'kava',
        ALIASES: ALIASES_KAVA,
        POOLS_DATA: POOLS_DATA_KAVA,
        COINS: COINS_KAVA,
        cTokens: cTokensKava,
        yTokens: yTokensKava,
        ycTokens: ycTokensKava,
        aTokens: aTokensKava,
    },
    8453: {
        NAME: 'base',
        ALIASES: ALIASES_BASE,
        POOLS_DATA: POOLS_DATA_BASE,
        COINS: COINS_BASE,
        cTokens: cTokensBase,
        yTokens: yTokensBase,
        ycTokens: ycTokensBase,
        aTokens: aTokensBase,
    },
    42161: {
        NAME: 'arbitrum',
        ALIASES: ALIASES_ARBITRUM,
        POOLS_DATA: POOLS_DATA_ARBITRUM,
        COINS: COINS_ARBITRUM,
        cTokens: cTokensArbitrum,
        yTokens: yTokensArbitrum,
        ycTokens: ycTokensArbitrum,
        aTokens: aTokensArbitrum,
    },
    42220: {
        NAME: 'celo',
        ALIASES: ALIASES_CELO,
        POOLS_DATA: POOLS_DATA_CELO,
        COINS: COINS_CELO,
        cTokens: cTokensCelo,
        yTokens: yTokensCelo,
        ycTokens: ycTokensCelo,
        aTokens: aTokensCelo,
    },
    43114: {
        NAME: 'avalanche',
        ALIASES: ALIASES_AVALANCHE,
        POOLS_DATA: POOLS_DATA_AVALANCHE,
        COINS: COINS_AVALANCHE,
        cTokens: cTokensAvalanche,
        yTokens: yTokensAvalanche,
        ycTokens: ycTokensAvalanche,
        aTokens: aTokensAvalanche,
    },
    1313161554: {
        NAME: 'aurora',
        ALIASES: ALIASES_AURORA,
        POOLS_DATA: POOLS_DATA_AURORA,
        COINS: COINS_AURORA,
        cTokens: cTokensAurora,
        yTokens: yTokensAurora,
        ycTokens: ycTokensAurora,
        aTokens: aTokensAurora,
    },
}

export type ProviderType = 'JsonRpc' | 'Web3' | 'Infura' | 'Alchemy' | 'External';

export async function createProvider(
    providerType: ProviderType,
    providerSettings: { url?: string, privateKey?: string, batchMaxCount?: number } | {
        externalProvider: ethers.Eip1193Provider
    } | { network?: Networkish, apiKey?: string }
): Promise<[
        ethers.BrowserProvider | ethers.JsonRpcProvider,
        ethers.Signer | null
]> {

    // JsonRpc provider
    if (providerType.toLowerCase() === 'JsonRpc'.toLowerCase()) {
        const { url, privateKey, batchMaxCount } = providerSettings as {
            url: string,
            privateKey: string,
            batchMaxCount?: number
        }

        const jsonRpcApiProviderOptions = batchMaxCount ? { batchMaxCount } : undefined
        const provider = new ethers.JsonRpcProvider(url || 'http://localhost:8545/', undefined, jsonRpcApiProviderOptions)
        if (privateKey) {
            return [provider, new ethers.Wallet(privateKey, provider)]
        }
        if (!url?.startsWith('https://rpc.gnosischain.com')) {
            try {
                return [provider, await provider.getSigner()]
            } catch (e) {
            }
        }
        return [provider, null]
    }

    if (providerType.toLowerCase() === 'Web3'.toLowerCase()) {
        const { externalProvider } = providerSettings as { externalProvider: ethers.Eip1193Provider }
        const provider = new ethers.BrowserProvider(externalProvider)
        return [provider, await provider.getSigner()]
    }

    if (providerType.toLowerCase() === 'External'.toLowerCase()) {
        const { externalProvider } = providerSettings as { externalProvider: JsonRpcProvider }
        return [externalProvider, await externalProvider.getSigner()]
    }

    if (providerType.toLowerCase() === 'Infura'.toLowerCase()) {
        const { network, apiKey } = providerSettings as { network?: Networkish, apiKey?: string }
        return [new ethers.InfuraProvider(network, apiKey), null]
    }

    if (providerType.toLowerCase() === 'Alchemy'.toLowerCase()) {
        const { network, apiKey } = providerSettings as { network?: Networkish, apiKey?: string }
        return [new ethers.AlchemyProvider(network, apiKey), null]
    }

    throw Error('Wrong providerType ' + providerType)
}


class Curve implements ICurve {
    provider: ethers.BrowserProvider | ethers.JsonRpcProvider;
    multicallProvider: MulticallProvider;
    signer: ethers.Signer | null;
    signerAddress: string;
    chainId: IChainId;
    contracts: { [index: string]: { contract: Contract, multicallContract: MulticallContract } };
    feeData: { gasPrice?: number, maxFeePerGas?: number, maxPriorityFeePerGas?: number };
    constantOptions: { gasLimit: number };
    options: { gasPrice?: number | bigint, maxFeePerGas?: number | bigint, maxPriorityFeePerGas?: number | bigint };
    constants: {
        NATIVE_TOKEN: { symbol: string, wrappedSymbol: string, address: string, wrappedAddress: string },
        NETWORK_NAME: INetworkName,
        ALIASES: IDict<string>,
        POOLS_DATA: IDict<IPoolData>,
        FACTORY_POOLS_DATA: IDict<IPoolData>,
        CRVUSD_FACTORY_POOLS_DATA: IDict<IPoolData>,
        EYWA_FACTORY_POOLS_DATA: IDict<IPoolData>,
        CRYPTO_FACTORY_POOLS_DATA: IDict<IPoolData>,
        TWOCRYPTO_FACTORY_POOLS_DATA: IDict<IPoolData>
        TRICRYPTO_FACTORY_POOLS_DATA: IDict<IPoolData>,
        STABLE_NG_FACTORY_POOLS_DATA: IDict<IPoolData>,
        BASE_POOLS: IDict<number>
        LLAMMAS_DATA: IDict<IPoolData>,
        COINS: IDict<string>,
        DECIMALS: IDict<number>,
        GAUGES: string[],
        FACTORY_GAUGE_IMPLEMENTATIONS: IDict<IFactoryPoolType>,
        ZERO_ADDRESS: string,
    };

    constructor() {
        // @ts-ignore
        this.provider = null;
        // @ts-ignore
        this.signer = null;
        this.signerAddress = '';
        this.chainId = 1;
        // @ts-ignore
        this.multicallProvider = null;
        this.contracts = {};
        this.feeData = {}
        this.constantOptions = { gasLimit: 12000000 }
        this.options = {};
        this.constants ={
            NATIVE_TOKEN: NATIVE_TOKENS[1],
            NETWORK_NAME: 'ethereum',
            ALIASES: {},
            POOLS_DATA: {},
            FACTORY_POOLS_DATA: {},
            CRVUSD_FACTORY_POOLS_DATA: {},
            EYWA_FACTORY_POOLS_DATA: {},
            CRYPTO_FACTORY_POOLS_DATA: {},
            TWOCRYPTO_FACTORY_POOLS_DATA: {},
            TRICRYPTO_FACTORY_POOLS_DATA: {},
            STABLE_NG_FACTORY_POOLS_DATA: {},
            BASE_POOLS: {},
            LLAMMAS_DATA: {},
            COINS: {},
            DECIMALS: {},
            GAUGES: [],
            FACTORY_GAUGE_IMPLEMENTATIONS: {},
            ZERO_ADDRESS: ethers.ZeroAddress,
        };
    }

    async init(
        providerType: ProviderType,
        providerSettings: { url?: string, privateKey?: string, batchMaxCount? : number } | { externalProvider: ethers.Eip1193Provider } | { network?: Networkish, apiKey?: string },
        options: { gasPrice?: number, maxFeePerGas?: number, maxPriorityFeePerGas?: number, chainId?: number } = {} // gasPrice in Gwei
    ): Promise<void> {
        // @ts-ignore
        this.provider = null;
        // @ts-ignore
        this.signer = null;
        this.signerAddress = '';
        this.chainId = 1;
        // @ts-ignore
        this.multicallProvider = null;
        this.contracts = {};
        this.feeData = {}
        this.constantOptions = { gasLimit: 12000000 }
        this.options = {};
        this.constants = {
            NATIVE_TOKEN: NATIVE_TOKENS[1],
            NETWORK_NAME: 'ethereum',
            ALIASES: {},
            POOLS_DATA: {},
            FACTORY_POOLS_DATA: {},
            CRVUSD_FACTORY_POOLS_DATA: {},
            EYWA_FACTORY_POOLS_DATA: {},
            CRYPTO_FACTORY_POOLS_DATA: {},
            TWOCRYPTO_FACTORY_POOLS_DATA: {},
            TRICRYPTO_FACTORY_POOLS_DATA: {},
            STABLE_NG_FACTORY_POOLS_DATA: {},
            BASE_POOLS: {},
            LLAMMAS_DATA: {},
            COINS: {},
            DECIMALS: {},
            GAUGES: [],
            FACTORY_GAUGE_IMPLEMENTATIONS: {},
            ZERO_ADDRESS: ethers.ZeroAddress,
        };
        [this.provider, this.signer] = await createProvider(providerType, providerSettings);

        const network = await this.provider.getNetwork();
        console.log("CURVE-JS IS CONNECTED TO NETWORK:", { name: network.name.toUpperCase(), chainId: Number(network.chainId) });
        this.chainId = Number(network.chainId) === 133 || Number(network.chainId) === 31337 ? 1 : Number(network.chainId) as IChainId;

        this.constants.NATIVE_TOKEN = NATIVE_TOKENS[this.chainId];
        this.constants.NETWORK_NAME = NETWORK_CONSTANTS[this.chainId].NAME;
        this.constants.ALIASES = NETWORK_CONSTANTS[this.chainId].ALIASES;
        this.constants.ALIASES.anycall = "0x37414a8662bc1d25be3ee51fb27c2686e2490a89";
        this.constants.ALIASES.voting_escrow_oracle = "0x12F407340697Ae0b177546E535b91A5be021fBF9";
        this.constants.POOLS_DATA = NETWORK_CONSTANTS[this.chainId].POOLS_DATA;
        if (this.chainId === 1) this.constants.LLAMMAS_DATA = NETWORK_CONSTANTS[this.chainId].LLAMMAS_DATA;
        for (const poolId in this.constants.POOLS_DATA) this.constants.POOLS_DATA[poolId].in_api = true;
        this.constants.COINS = NETWORK_CONSTANTS[this.chainId].COINS;
        this.constants.DECIMALS = extractDecimals({...this.constants.POOLS_DATA, ...this.constants.LLAMMAS_DATA});
        this.constants.DECIMALS[this.constants.NATIVE_TOKEN.address] = 18;
        this.constants.DECIMALS[this.constants.NATIVE_TOKEN.wrappedAddress] = 18;
        this.constants.GAUGES = extractGauges(this.constants.POOLS_DATA);
        const [cTokens, yTokens, ycTokens, aTokens] = [
            NETWORK_CONSTANTS[this.chainId].cTokens,
            NETWORK_CONSTANTS[this.chainId].yTokens,
            NETWORK_CONSTANTS[this.chainId].ycTokens,
            NETWORK_CONSTANTS[this.chainId].aTokens,
        ];
        const customAbiTokens = [...cTokens, ...yTokens, ...ycTokens, ...aTokens];

        await _killGauges(this.constants.POOLS_DATA);

        this.multicallProvider = new MulticallProvider(this.chainId, this.provider);

        if (this.signer) {
            try {
                this.signerAddress = await this.signer.getAddress();
            } catch (err) {
                this.signer = null;
            }
        } else {
            this.signerAddress = '';
        }

        this.feeData = { gasPrice: options.gasPrice, maxFeePerGas: options.maxFeePerGas, maxPriorityFeePerGas: options.maxPriorityFeePerGas };
        await this.updateFeeData();

        for (const pool of Object.values({...this.constants.POOLS_DATA, ...this.constants.LLAMMAS_DATA})) {
            this.setContract(pool.swap_address, pool.swap_abi);

            if (pool.token_address !== pool.swap_address) {
                this.setContract(pool.token_address, ERC20Abi);
            }

            if (pool.gauge_address !== this.constants.ZERO_ADDRESS) {
                this.setContract(pool.gauge_address, pool.gauge_abi);
            }

            if (pool.deposit_address && !this.contracts[pool.deposit_address]) {
                this.setContract(pool.deposit_address, pool.deposit_abi);
            }

            for (const coinAddr of pool.underlying_coin_addresses) {
                this.setContract(coinAddr, ERC20Abi);
            }

            for (const coinAddr of pool.wrapped_coin_addresses) {
                if (customAbiTokens.includes(coinAddr)) continue;
                if (coinAddr in this.contracts) continue;

                this.setContract(coinAddr, ERC20Abi);
            }

            // TODO add all coins
            for (const coinAddr of pool.wrapped_coin_addresses) {
                if (cTokens.includes(coinAddr)) {
                    this.setContract(coinAddr, cERC20Abi);
                }

                if (aTokens.includes(coinAddr)) {
                    this.setContract(coinAddr, ERC20Abi);
                }

                if (yTokens.includes(coinAddr) || ycTokens.includes(coinAddr)) {
                    this.setContract(coinAddr, yERC20Abi);
                }
            }

            if (pool.reward_contract) {
                this.setContract(pool.reward_contract, streamerABI);
            }

            if (pool.sCurveRewards_address) {
                this.setContract(pool.sCurveRewards_address, pool.sCurveRewards_abi);
            }
        }

        this.setContract(this.constants.NATIVE_TOKEN.wrappedAddress, ERC20Abi);

        this.setContract(this.constants.ALIASES.crv, ERC20Abi);
        this.constants.DECIMALS[this.constants.ALIASES.crv] = 18;

        const _gaugeFactoryABI = this.chainId === 1 ? gaugeFactoryABI : gaugeFactorySidechainABI
        this.setContract(this.constants.ALIASES.gauge_factory, _gaugeFactoryABI);

        if(this.chainId === 1) {
            this.setContract(this.constants.ALIASES.minter, minterMainnetABI)
            this.setContract(this.constants.ALIASES.gauge_factory_fraxtal, gaugeFactoryForFraxtalABI)
        }

        this.setContract(this.constants.ALIASES.voting_escrow, votingEscrowABI);

        this.setContract(this.constants.ALIASES.fee_distributor, feeDistributorABI);

        this.setContract(this.constants.ALIASES.gauge_controller, gaugeControllerABI);

        if (this.chainId == 137) {
            this.setContract(this.constants.ALIASES.router, routerPolygonABI);
        } else {
            this.setContract(this.constants.ALIASES.router, routerABI);
        }

        this.setContract(this.constants.ALIASES.deposit_and_stake, depositAndStakeABI);

        this.setContract(this.constants.ALIASES.crypto_calc, cryptoCalcZapABI);

        this.setContract(this.constants.ALIASES.stable_calc, StableCalcZapABI);

        this.setContract(this.constants.ALIASES.factory, factoryABI);

        if (this.chainId !== 1313161554 && this.chainId !== 252) {
            const factoryContract = this.contracts[this.constants.ALIASES.factory].contract;
            this.constants.ALIASES.factory_admin = (await factoryContract.admin(this.constantOptions) as string).toLowerCase();
            this.setContract(this.constants.ALIASES.factory_admin, factoryAdminABI);

        }

        this.setContract(this.constants.ALIASES.crvusd_factory, factoryABI);

        this.setContract(this.constants.ALIASES.eywa_factory, factoryEywaABI);

        this.setContract(this.constants.ALIASES.crypto_factory, cryptoFactoryABI);

        this.setContract(this.constants.ALIASES.twocrypto_factory, twocryptoFactoryABI);

        this.setContract(this.constants.ALIASES.tricrypto_factory, tricryptoFactoryABI);

        this.setContract(this.constants.ALIASES.stable_ng_factory, stableNgFactoryABI);

        this.setContract(this.constants.ALIASES.anycall, anycallABI);

        this.setContract(this.constants.ALIASES.voting_escrow_oracle, this.chainId === 1 ? votingEscrowOracleEthABI : votingEscrowOracleABI);

        if (this.chainId === 1) {
            this.setContract(this.constants.ALIASES.voting_parameter, votingProposalABI);
            this.setContract(this.constants.ALIASES.voting_ownership, votingProposalABI);
            this.setContract(this.constants.ALIASES.circulating_supply, circulatingSupplyABI);
        }

        if(L2Networks.includes(this.chainId)) {
            // eslint-disable-next-line @typescript-eslint/no-this-alias
            const curveInstance = this;
            curveInstance.setContract(curveInstance.constants.ALIASES.gas_oracle, gasOracleABI);
            curveInstance.setContract(curveInstance.constants.ALIASES.gas_oracle_blob, gasOracleBlobABI);

            // @ts-ignore
            if(AbstractProvider.prototype.originalEstimate) {
                // @ts-ignore
                AbstractProvider.prototype.estimateGas = AbstractProvider.prototype.originalEstimate;
            }

            const originalEstimate = AbstractProvider.prototype.estimateGas;

            const oldEstimate = async function(arg: any) {
                // @ts-ignore
                const originalEstimateFunc = originalEstimate.bind(this);

                const gas = await originalEstimateFunc(arg);

                return gas;
            }

            //Override
            const newEstimate = async function(arg: any) {
                // @ts-ignore
                const L2EstimateGas = originalEstimate.bind(this);

                const L1GasUsed = await curveInstance.contracts[curveInstance.constants.ALIASES.gas_oracle].contract.getL1GasUsed(arg.data);

                const L2GasUsed = await L2EstimateGas(arg);

                return [L2GasUsed,L1GasUsed];
            }

            // @ts-ignore
            AbstractProvider.prototype.estimateGas = newEstimate;
            // @ts-ignore
            AbstractProvider.prototype.originalEstimate = oldEstimate;
        } else {
            // @ts-ignore
            if(AbstractProvider.prototype.originalEstimate) {
                // @ts-ignore
                AbstractProvider.prototype.estimateGas = AbstractProvider.prototype.originalEstimate;
            }
        }
    }

    setContract(address: string, abi: any): void {
        this.contracts[address] = {
            contract: new Contract(address, abi, this.signer || this.provider),
            multicallContract: new MulticallContract(address, abi),
        }
    }

    async _filterHiddenPools(pools: IDict<IPoolData>): Promise<IDict<IPoolData>> {
        const hiddenPools = (await _getHiddenPools())[this.constants.NETWORK_NAME] || [];
        // @ts-ignore
        return Object.fromEntries(Object.entries(pools).filter(([id]) => !hiddenPools.includes(id)));
    }

    _updateDecimalsAndGauges(pools: IDict<IPoolData>): void {
        this.constants.DECIMALS = { ...this.constants.DECIMALS, ...extractDecimals(pools) };
        this.constants.GAUGES = [ ...this.constants.GAUGES, ...extractGauges(pools) ];
    }

    fetchFactoryPools = async (useApi = true): Promise<void> => {
        if ([252, 1313161554].includes(this.chainId)) return;

        if (useApi) {
            this.constants.FACTORY_POOLS_DATA = lowerCasePoolDataAddresses(await getFactoryPoolsDataFromApi.call(this, "factory"));
        } else {
            this.constants.FACTORY_POOLS_DATA = lowerCasePoolDataAddresses(await getFactoryPoolData.call(this));
        }
        this.constants.FACTORY_POOLS_DATA = await this._filterHiddenPools(this.constants.FACTORY_POOLS_DATA);
        this._updateDecimalsAndGauges(this.constants.FACTORY_POOLS_DATA);

        await _killGauges(this.constants.FACTORY_POOLS_DATA);

        this.constants.FACTORY_GAUGE_IMPLEMENTATIONS["factory"] = await this.contracts[this.constants.ALIASES.factory].contract.gauge_implementation(this.constantOptions);
    }

    fetchCrvusdFactoryPools = async (useApi = true): Promise<void> => {
        if (this.chainId != 1) return;

        if (useApi) {
            this.constants.CRVUSD_FACTORY_POOLS_DATA = lowerCasePoolDataAddresses(await getFactoryPoolsDataFromApi.call(this, "factory-crvusd"));
        } else {
            this.constants.CRVUSD_FACTORY_POOLS_DATA = lowerCasePoolDataAddresses(
                await getFactoryPoolData.call(this, 0, undefined, this.constants.ALIASES.crvusd_factory)
            );
        }
        this.constants.CRVUSD_FACTORY_POOLS_DATA = await this._filterHiddenPools(this.constants.CRVUSD_FACTORY_POOLS_DATA);
        this._updateDecimalsAndGauges(this.constants.CRVUSD_FACTORY_POOLS_DATA);

        await _killGauges(this.constants.CRVUSD_FACTORY_POOLS_DATA);
    }

    fetchEywaFactoryPools = async (useApi = true): Promise<void> => {
        if (this.chainId != 250) return;

        if (useApi) {
            this.constants.EYWA_FACTORY_POOLS_DATA = lowerCasePoolDataAddresses(await getFactoryPoolsDataFromApi.call(this, "factory-eywa"));
        } else {
            this.constants.EYWA_FACTORY_POOLS_DATA = lowerCasePoolDataAddresses(
                await getFactoryPoolData.call(this, 0, undefined, this.constants.ALIASES.eywa_factory)
            );
        }
        this.constants.EYWA_FACTORY_POOLS_DATA = await this._filterHiddenPools(this.constants.EYWA_FACTORY_POOLS_DATA);
        this._updateDecimalsAndGauges(this.constants.EYWA_FACTORY_POOLS_DATA);

        await _killGauges(this.constants.EYWA_FACTORY_POOLS_DATA);
    }

    fetchCryptoFactoryPools = async (useApi = true): Promise<void> => {
        if (![1, 56, 137, 250, 8453].includes(this.chainId)) return;

        if (useApi) {
            this.constants.CRYPTO_FACTORY_POOLS_DATA = lowerCasePoolDataAddresses(await getFactoryPoolsDataFromApi.call(this, "factory-crypto"));
        } else {
            this.constants.CRYPTO_FACTORY_POOLS_DATA = lowerCasePoolDataAddresses(await getCryptoFactoryPoolData.call(this));
        }
        this.constants.CRYPTO_FACTORY_POOLS_DATA = await this._filterHiddenPools(this.constants.CRYPTO_FACTORY_POOLS_DATA);
        this._updateDecimalsAndGauges(this.constants.CRYPTO_FACTORY_POOLS_DATA);

        await _killGauges(this.constants.CRYPTO_FACTORY_POOLS_DATA);

        this.constants.FACTORY_GAUGE_IMPLEMENTATIONS["factory-crypto"] = await this.contracts[this.constants.ALIASES.crypto_factory].contract.gauge_implementation(this.constantOptions);
    }

    fetchTworyptoFactoryPools = async (useApi = true): Promise<void> => {
        if ([324, 1284].includes(this.chainId)) return;

        if (useApi) {
            this.constants.TWOCRYPTO_FACTORY_POOLS_DATA = lowerCasePoolDataAddresses(await getFactoryPoolsDataFromApi.call(this, "factory-twocrypto"));
        } else {
            this.constants.TWOCRYPTO_FACTORY_POOLS_DATA = lowerCasePoolDataAddresses(await getTwocryptoFactoryPoolData.call(this));
        }
        this.constants.TWOCRYPTO_FACTORY_POOLS_DATA = await this._filterHiddenPools(this.constants.TWOCRYPTO_FACTORY_POOLS_DATA);
        this._updateDecimalsAndGauges(this.constants.TWOCRYPTO_FACTORY_POOLS_DATA);

        await _killGauges(this.constants.TWOCRYPTO_FACTORY_POOLS_DATA);

        this.constants.FACTORY_GAUGE_IMPLEMENTATIONS["factory-twocrypto"] = await this.contracts[this.constants.ALIASES.twocrypto_factory].contract.gauge_implementation(this.constantOptions);
    }

    fetchTricryptoFactoryPools = async (useApi = true): Promise<void> => {
        if ([324, 1284].includes(this.chainId)) return;

        if (useApi) {
            this.constants.TRICRYPTO_FACTORY_POOLS_DATA = lowerCasePoolDataAddresses(await getFactoryPoolsDataFromApi.call(this, "factory-tricrypto"));
        } else {
            this.constants.TRICRYPTO_FACTORY_POOLS_DATA = lowerCasePoolDataAddresses(await getTricryptoFactoryPoolData.call(this));
        }
        this.constants.TRICRYPTO_FACTORY_POOLS_DATA = await this._filterHiddenPools(this.constants.TRICRYPTO_FACTORY_POOLS_DATA);
        this._updateDecimalsAndGauges(this.constants.TRICRYPTO_FACTORY_POOLS_DATA);

        await _killGauges(this.constants.TRICRYPTO_FACTORY_POOLS_DATA);

        if (this.chainId === 1) {
            this.constants.FACTORY_GAUGE_IMPLEMENTATIONS["factory-tricrypto"] =
                await this.contracts[this.constants.ALIASES.tricrypto_factory].contract.gauge_implementation(this.constantOptions);
        } else {
            this.constants.FACTORY_GAUGE_IMPLEMENTATIONS["factory-tricrypto"] =
                await this.contracts[this.constants.ALIASES.gauge_factory].contract.get_implementation(this.constantOptions);
        }
    }

    fetchStableNgFactoryPools = async (useApi = true): Promise<void> => {
        if (this.chainId === 1313161554) return;

        if (useApi) {
            this.constants.STABLE_NG_FACTORY_POOLS_DATA = lowerCasePoolDataAddresses(await getFactoryPoolsDataFromApi.call(this, "factory-stable-ng"));
        } else {
            this.constants.STABLE_NG_FACTORY_POOLS_DATA = lowerCasePoolDataAddresses(await getFactoryPoolData.call(this, 0, undefined, this.constants.ALIASES.stable_ng_factory));
        }

        this.constants.STABLE_NG_FACTORY_POOLS_DATA = await this._filterHiddenPools(this.constants.STABLE_NG_FACTORY_POOLS_DATA);
        this._updateDecimalsAndGauges(this.constants.STABLE_NG_FACTORY_POOLS_DATA);

        await _killGauges(this.constants.STABLE_NG_FACTORY_POOLS_DATA);
    }

    fetchNewFactoryPools = async (): Promise<string[]> => {
        if ([252,1313161554].includes(this.chainId)) return [];

        const currentPoolIds = Object.keys(this.constants.FACTORY_POOLS_DATA);
        const lastPoolIdx = currentPoolIds.length === 0 ? -1 : Number(currentPoolIds[currentPoolIds.length - 1].split("-")[2]);
        const poolData = lowerCasePoolDataAddresses(await getFactoryPoolData.call(this, lastPoolIdx + 1));
        this.constants.FACTORY_POOLS_DATA = { ...this.constants.FACTORY_POOLS_DATA, ...poolData };
        this._updateDecimalsAndGauges(this.constants.FACTORY_POOLS_DATA);

        return Object.keys(poolData)
    }

    fetchNewStableNgFactoryPools = async (): Promise<string[]> => {
        const currentPoolIds = Object.keys(this.constants.STABLE_NG_FACTORY_POOLS_DATA);
        const lastPoolIdx = currentPoolIds.length === 0 ? -1 : Number(currentPoolIds[currentPoolIds.length - 1].split("-")[3]);
        const poolData = lowerCasePoolDataAddresses(await getFactoryPoolData.call(this, lastPoolIdx + 1, undefined, this.constants.ALIASES.stable_ng_factory));
        this.constants.STABLE_NG_FACTORY_POOLS_DATA = { ...this.constants.STABLE_NG_FACTORY_POOLS_DATA, ...poolData };
        this._updateDecimalsAndGauges(this.constants.STABLE_NG_FACTORY_POOLS_DATA);

        return Object.keys(poolData)
    }

    fetchNewCryptoFactoryPools = async (): Promise<string[]> => {
        if (![1, 56, 137, 250, 8453].includes(this.chainId)) return [];

        const currentPoolIds = Object.keys(this.constants.CRYPTO_FACTORY_POOLS_DATA);
        const lastPoolIdx = currentPoolIds.length === 0 ? -1 : Number(currentPoolIds[currentPoolIds.length - 1].split("-")[2]);
        const poolData = lowerCasePoolDataAddresses(await getCryptoFactoryPoolData.call(this, lastPoolIdx + 1));
        this.constants.CRYPTO_FACTORY_POOLS_DATA = { ...this.constants.CRYPTO_FACTORY_POOLS_DATA, ...poolData };
        this._updateDecimalsAndGauges(this.constants.CRYPTO_FACTORY_POOLS_DATA);

        return Object.keys(poolData)
    }

    fetchNewTwocryptoFactoryPools = async (): Promise<string[]> => {
        if ([324, 1284].includes(this.chainId)) return [];

        const currentPoolIds = Object.keys(this.constants.TWOCRYPTO_FACTORY_POOLS_DATA);
        const lastPoolIdx = currentPoolIds.length === 0 ? -1 : Number(currentPoolIds[currentPoolIds.length - 1].split("-")[2]);
        const poolData = lowerCasePoolDataAddresses(await getTwocryptoFactoryPoolData.call(this, lastPoolIdx + 1));
        this.constants.TWOCRYPTO_FACTORY_POOLS_DATA = { ...this.constants.TWOCRYPTO_FACTORY_POOLS_DATA, ...poolData };
        this._updateDecimalsAndGauges(this.constants.TWOCRYPTO_FACTORY_POOLS_DATA);

        return Object.keys(poolData)
    }

    fetchNewTricryptoFactoryPools = async (): Promise<string[]> => {
        if ([324, 1284].includes(this.chainId)) return [];

        const currentPoolIds = Object.keys(this.constants.TRICRYPTO_FACTORY_POOLS_DATA);
        const lastPoolIdx = currentPoolIds.length === 0 ? -1 : Number(currentPoolIds[currentPoolIds.length - 1].split("-")[2]);
        const poolData = lowerCasePoolDataAddresses(await getTricryptoFactoryPoolData.call(this, lastPoolIdx + 1));
        this.constants.TRICRYPTO_FACTORY_POOLS_DATA = { ...this.constants.TRICRYPTO_FACTORY_POOLS_DATA, ...poolData };
        this._updateDecimalsAndGauges(this.constants.TRICRYPTO_FACTORY_POOLS_DATA);

        return Object.keys(poolData)
    }

    fetchRecentlyDeployedFactoryPool = async (poolAddress: string): Promise<string> => {
        if ([252,1313161554].includes(this.chainId)) return '';

        const poolData = lowerCasePoolDataAddresses(await getFactoryPoolData.call(this, 0, poolAddress));
        this.constants.FACTORY_POOLS_DATA = { ...this.constants.FACTORY_POOLS_DATA, ...poolData };
        this._updateDecimalsAndGauges(this.constants.FACTORY_POOLS_DATA);

        return Object.keys(poolData)[0]  // id
    }

    fetchRecentlyDeployedStableNgFactoryPool = async (poolAddress: string): Promise<string> => {
        if (this.chainId === 1313161554) return '';

        const poolData = lowerCasePoolDataAddresses(await getFactoryPoolData.call(this, 0, poolAddress, this.constants.ALIASES.stable_ng_factory));
        this.constants.STABLE_NG_FACTORY_POOLS_DATA = { ...this.constants.STABLE_NG_FACTORY_POOLS_DATA, ...poolData };
        this._updateDecimalsAndGauges(this.constants.STABLE_NG_FACTORY_POOLS_DATA);

        return Object.keys(poolData)[0]  // id
    }

    fetchRecentlyDeployedCryptoFactoryPool = async (poolAddress: string): Promise<string> => {
        if (![1, 56, 137, 250, 8453].includes(this.chainId)) return '';
        const poolData = lowerCasePoolDataAddresses(await getCryptoFactoryPoolData.call(this, 0, poolAddress));
        this.constants.CRYPTO_FACTORY_POOLS_DATA = { ...this.constants.CRYPTO_FACTORY_POOLS_DATA, ...poolData };
        this._updateDecimalsAndGauges(this.constants.CRYPTO_FACTORY_POOLS_DATA);

        return Object.keys(poolData)[0]  // id
    }

    fetchRecentlyDeployedTwocryptoFactoryPool = async (poolAddress: string): Promise<string> => {
        if ([324, 1284].includes(this.chainId)) return '';
        const poolData = lowerCasePoolDataAddresses(await getTwocryptoFactoryPoolData.call(this, 0, poolAddress));
        this.constants.TWOCRYPTO_FACTORY_POOLS_DATA = { ...this.constants.TWOCRYPTO_FACTORY_POOLS_DATA, ...poolData };
        this._updateDecimalsAndGauges(this.constants.TWOCRYPTO_FACTORY_POOLS_DATA);

        return Object.keys(poolData)[0]  // id
    }

    fetchRecentlyDeployedTricryptoFactoryPool = async (poolAddress: string): Promise<string> => {
        if ([324, 1284].includes(this.chainId)) return '';
        const poolData = lowerCasePoolDataAddresses(await getTricryptoFactoryPoolData.call(this, 0, poolAddress));
        this.constants.TRICRYPTO_FACTORY_POOLS_DATA = { ...this.constants.TRICRYPTO_FACTORY_POOLS_DATA, ...poolData };
        this._updateDecimalsAndGauges(this.constants.TRICRYPTO_FACTORY_POOLS_DATA);

        return Object.keys(poolData)[0]  // id
    }

    getMainPoolList = (): string[] => Object.keys(this.constants.POOLS_DATA);

    getFactoryPoolList = (): string[] => Object.keys(this.constants.FACTORY_POOLS_DATA);

    getCrvusdFactoryPoolList = (): string[] => Object.keys(this.constants.CRVUSD_FACTORY_POOLS_DATA);

    getEywaFactoryPoolList = (): string[] => Object.keys(this.constants.EYWA_FACTORY_POOLS_DATA);

    getCryptoFactoryPoolList = (): string[] => Object.keys(this.constants.CRYPTO_FACTORY_POOLS_DATA);

    getTworyptoFactoryPoolList = (): string[] => Object.keys(this.constants.TWOCRYPTO_FACTORY_POOLS_DATA);

    getTricryptoFactoryPoolList = (): string[] => Object.keys(this.constants.TRICRYPTO_FACTORY_POOLS_DATA);

    getStableNgFactoryPoolList = (): string[] => Object.keys(this.constants.STABLE_NG_FACTORY_POOLS_DATA);

    getPoolList = (): string[] => {
        return [
            ...this.getMainPoolList(),
            ...this.getFactoryPoolList(),
            ...this.getCrvusdFactoryPoolList(),
            ...this.getEywaFactoryPoolList(),
            ...this.getCryptoFactoryPoolList(),
            ...this.getTworyptoFactoryPoolList(),
            ...this.getTricryptoFactoryPoolList(),
            ...this.getStableNgFactoryPoolList(),
        ]
    };

    getPoolsData = (): IDict<IPoolData> => ({
        ...this.constants.POOLS_DATA,
        ...this.constants.FACTORY_POOLS_DATA,
        ...this.constants.CRVUSD_FACTORY_POOLS_DATA,
        ...this.constants.EYWA_FACTORY_POOLS_DATA,
        ...this.constants.CRYPTO_FACTORY_POOLS_DATA,
        ...this.constants.TWOCRYPTO_FACTORY_POOLS_DATA,
        ...this.constants.TRICRYPTO_FACTORY_POOLS_DATA,
        ...this.constants.STABLE_NG_FACTORY_POOLS_DATA,
        ...this.constants.LLAMMAS_DATA,
    });

    getGaugeImplementation = (factoryType: IFactoryPoolType): string => this.constants.FACTORY_GAUGE_IMPLEMENTATIONS[factoryType] || this.constants.ZERO_ADDRESS;

    setCustomFeeData(customFeeData: { gasPrice?: number, maxFeePerGas?: number, maxPriorityFeePerGas?: number }): void {
        this.feeData = { ...this.feeData, ...customFeeData };
    }

    formatUnits(value: BigNumberish, unit?: string | Numeric): string {
        return ethers.formatUnits(value, unit);
    }

    parseUnits(value: string, unit?: string | Numeric): bigint {
        return ethers.parseUnits(value, unit);
    }

    async updateFeeData(): Promise<void> {
        const feeData = await this.provider.getFeeData();
        if (feeData.maxFeePerGas === null || feeData.maxPriorityFeePerGas === null) {
            delete this.options.maxFeePerGas;
            delete this.options.maxPriorityFeePerGas;

            this.options.gasPrice = this.feeData.gasPrice !== undefined ?
                this.parseUnits(this.feeData.gasPrice.toString(), "gwei") :
                (feeData.gasPrice || this.parseUnits("20", "gwei"));
        } else {
            delete this.options.gasPrice;

            this.options.maxFeePerGas = this.feeData.maxFeePerGas !== undefined ?
                this.parseUnits(this.feeData.maxFeePerGas.toString(), "gwei") :
                feeData.maxFeePerGas;
            this.options.maxPriorityFeePerGas = this.feeData.maxPriorityFeePerGas !== undefined ?
                this.parseUnits(this.feeData.maxPriorityFeePerGas.toString(), "gwei") :
                feeData.maxPriorityFeePerGas;
        }
    }
}

export const curve = new Curve();
