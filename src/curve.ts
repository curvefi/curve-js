import {
    ethers,
    Contract,
    Networkish,
    BigNumberish,
    Numeric,
    AbstractProvider,
    BrowserProvider,
    JsonRpcProvider,
    Signer,
} from "ethers";
import { Provider as MulticallProvider, Contract as MulticallContract } from "@curvefi/ethcall";
import { NETWORK_CONSTANTS } from "./constants/network_constants.js";
import { STABLE_FACTORY_CONSTANTS, CRYPTO_FACTORY_CONSTANTS } from "./constants/factory/index.js";
import { getFactoryPoolData } from "./factory/factory.js";
import { getFactoryPoolsDataFromApi } from "./factory/factory-api.js";
import { getCryptoFactoryPoolData } from "./factory/factory-crypto.js";
import { getTricryptoFactoryPoolData } from "./factory/factory-tricrypto.js";
import {IPoolData, IDict, ICurve, IChainId, IFactoryPoolType, Abi, INetworkConstants} from "./interfaces";
import ERC20Abi from './constants/abis/ERC20.json' with { type: 'json' };
import cERC20Abi from './constants/abis/cERC20.json' with { type: 'json' };
import yERC20Abi from './constants/abis/yERC20.json' with { type: 'json' };
import childGaugeFactoryABI from './constants/abis/gauge_factory/child_gauge_factory.json' with { type: 'json' };
import minterMainnetABI from './constants/abis/minter_mainnet.json' with { type: 'json' };
import votingEscrowABI from './constants/abis/votingescrow.json' with { type: 'json' };
import anycallABI from './constants/abis/anycall.json' with { type: 'json' };
import votingEscrowOracleABI from './constants/abis/voting_escrow_oracle.json' with { type: 'json' };
import votingEscrowOracleEthABI from './constants/abis/voting_escrow_oracle_eth.json' with { type: 'json' };
import feeDistributorABI from './constants/abis/fee_distributor.json' with { type: 'json' };
import feeDistributorCrvUSDABI from './constants/abis/fee_distributor_crvusd.json' with { type: 'json' };
import gaugeControllerABI from './constants/abis/gaugecontroller.json' with { type: 'json' };
import depositAndStakeABI from './constants/abis/deposit_and_stake.json' with { type: 'json' };
import depositAndStakeNgOnlyABI from './constants/abis/deposit_and_stake_ng_only.json' with { type: 'json' };
import cryptoCalcZapABI from './constants/abis/crypto_calc.json' assert { type: 'json'};
import StableCalcZapABI from './constants/abis/stable_calc.json' with { type: 'json' };
import routerABI from './constants/abis/router.json' with { type: 'json' };
import routerPolygonABI from './constants/abis/routerPolygon.json' with { type: 'json' };
import routerNgPoolsOnlyABI from './constants/abis/router-ng-pools-only.json' with { type: 'json' };
import streamerABI from './constants/abis/streamer.json' with { type: 'json' };
import factoryABI from './constants/abis/factory.json' with { type: 'json' };
import factoryEywaABI from './constants/abis/factory-eywa.json' with { type: 'json' };
import factoryAdminABI from './constants/abis/factory-admin.json' with { type: 'json' };
import cryptoFactoryABI from './constants/abis/factory-crypto.json' with { type: 'json' };
import twocryptoFactoryABI from './constants/abis/factory-twocrypto-ng.json' with { type: 'json' };
import tricryptoFactoryMainnetABI from './constants/abis/factory-tricrypto-mainnet.json' with { type: 'json' };
import tricryptoFactorySidechainABI from './constants/abis/factory-tricrypto-sidechain.json' with { type: 'json' };
import stableNgFactoryABI from './constants/abis/factory-stable-ng.json' with { type: 'json' };
import gasOracleABI from './constants/abis/gas_oracle_optimism.json' assert { type: 'json'};
import gasOracleBlobABI from './constants/abis/gas_oracle_optimism_blob.json' assert { type: 'json'};
import votingProposalABI from './constants/abis/voting_proposal.json' assert { type: 'json'};
import circulatingSupplyABI from './constants/abis/circulating_supply.json' assert { type: 'json'};
import rootGaugeFactoryABI from "./constants/abis/gauge_factory/root_gauge_factory.json" assert { type: 'json'};

import { lowerCasePoolDataAddresses, extractDecimals, extractGauges } from "./constants/utils.js";
import {_getHiddenPools} from "./external-api.js";
import { L2Networks } from "./constants/L2Networks.js";
import { getTwocryptoFactoryPoolData } from "./factory/factory-twocrypto.js";
import {getNetworkConstants} from "./utils.js";


export const OLD_CHAINS = [1, 10, 56, 100, 137, 250, 1284, 2222, 8453, 42161, 42220, 43114, 1313161554];  // these chains have non-ng pools

export const memoizedContract = (): (address: string, abi: any, provider: BrowserProvider | JsonRpcProvider | Signer) => Contract => {
    const cache: Record<string, Contract> = {};
    return (address: string, abi: any, provider: BrowserProvider | JsonRpcProvider | Signer): Contract => {
        if (address in cache) {
            return cache[address];
        }
        else {
            const result = new Contract(address, abi, provider)
            cache[address] = result;
            return result;
        }
    }
}

export const memoizedMulticallContract = (): (address: string, abi: any) => MulticallContract => {
    const cache: Record<string, MulticallContract> = {};
    return (address: string, abi: any): MulticallContract => {
        if (address in cache) {
            return cache[address];
        }
        else {
            const result = new MulticallContract(address, abi)
            cache[address] = result;
            return result;
        }
    }
}

export type ContractItem = { contract: Contract, multicallContract: MulticallContract, abi: Abi };

class Curve implements ICurve {
    provider: ethers.BrowserProvider | ethers.JsonRpcProvider;
    abstractProvider?: {chainId: number, name: string};
    isNoRPC: boolean;
    multicallProvider: MulticallProvider;
    signer: ethers.Signer | null;
    signerAddress: string;
    chainId: IChainId;
    isLiteChain: boolean;
    contracts: { [index: string]: ContractItem };
    feeData: { gasPrice?: number, maxFeePerGas?: number, maxPriorityFeePerGas?: number };
    constantOptions: { gasLimit?: number };
    options: { gasPrice?: number | bigint, maxFeePerGas?: number | bigint, maxPriorityFeePerGas?: number | bigint };
    L1WeightedGasPrice?: number;
    constants: INetworkConstants;

    constructor() {
        // @ts-ignore
        this.provider = null;
        // @ts-ignore
        this.signer = null;
        this.isNoRPC = false;
        this.signerAddress = '';
        this.chainId = 1;
        this.isLiteChain = false;
        // @ts-ignore
        this.multicallProvider = null;
        this.contracts = {};
        this.feeData = {}
        this.constantOptions = { gasLimit: 12000000 }
        this.options = {};
        this.constants = {
            NATIVE_TOKEN: NETWORK_CONSTANTS[1].NATIVE_COIN,
            NETWORK_NAME: 'ethereum',
            ALIASES: {},
            POOLS_DATA: {},
            STABLE_FACTORY_CONSTANTS: {},
            CRYPTO_FACTORY_CONSTANTS: {},
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
        providerType: 'JsonRpc' | 'Web3' | 'Infura' | 'Alchemy' | 'NoRPC',
        providerSettings: { url?: string, privateKey?: string, batchMaxCount? : number } | { externalProvider: ethers.Eip1193Provider } | { network?: Networkish, apiKey?: string } | {chainId: number, networkName: string},
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
            NATIVE_TOKEN: NETWORK_CONSTANTS[1].NATIVE_COIN,
            NETWORK_NAME: 'ethereum',
            ALIASES: {},
            POOLS_DATA: {},
            STABLE_FACTORY_CONSTANTS: {},
            CRYPTO_FACTORY_CONSTANTS: {},
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

        this.initContract = memoizedContract()
        this.initMulticallContract = memoizedMulticallContract()

        // JsonRpc provider
        if (providerType.toLowerCase() === 'JsonRpc'.toLowerCase()) {
            providerSettings = providerSettings as { url: string, privateKey: string, batchMaxCount? : number };

            let jsonRpcApiProviderOptions;
            if ( providerSettings.batchMaxCount ) {
                jsonRpcApiProviderOptions = {
                    batchMaxCount: providerSettings.batchMaxCount,
                };
            }

            if (providerSettings.url) {
                this.provider = new ethers.JsonRpcProvider(providerSettings.url, undefined, jsonRpcApiProviderOptions);
            } else {
                this.provider = new ethers.JsonRpcProvider('http://localhost:8545/', undefined, jsonRpcApiProviderOptions);
            }

            if (providerSettings.privateKey) {
                this.signer = new ethers.Wallet(providerSettings.privateKey, this.provider);
            } else if (!providerSettings.url?.startsWith("https://rpc.gnosischain.com")) {
                try {
                    this.signer = await this.provider.getSigner();
                } catch (e) {
                    this.signer = null;
                }
            }
            // Web3 provider
        } else if (providerType.toLowerCase() === 'Web3'.toLowerCase()) {
            providerSettings = providerSettings as { externalProvider: ethers.Eip1193Provider };
            this.provider = new ethers.BrowserProvider(providerSettings.externalProvider);
            this.signer = await this.provider.getSigner();
            // Infura provider
        } else if (providerType.toLowerCase() === 'Infura'.toLowerCase()) {
            providerSettings = providerSettings as { network?: Networkish, apiKey?: string };
            this.provider = new ethers.InfuraProvider(providerSettings.network, providerSettings.apiKey);
            this.signer = null;
            // Alchemy provider
        } else if (providerType.toLowerCase() === 'Alchemy'.toLowerCase()) {
            providerSettings = providerSettings as { network?: Networkish, apiKey?: string };
            this.provider = new ethers.AlchemyProvider(providerSettings.network, providerSettings.apiKey);
            this.signer = null;
        } else if (providerType.toLowerCase() === 'NoRPC'.toLowerCase()) {
            providerSettings = providerSettings as { chainId: number, networkName: string };
            this.isNoRPC = true;
            this.abstractProvider = {
                chainId: providerSettings.chainId as number,
                name: providerSettings.networkName as string,
            }
            this.signer = null;
        } else {
            throw Error('Wrong providerType');
        }

        const network = this.abstractProvider || await this.provider.getNetwork();
        console.log("CURVE-JS IS CONNECTED TO NETWORK:", { name: network.name.toUpperCase(), chainId: Number(network.chainId) });
        this.chainId = Number(network.chainId) === 133 || Number(network.chainId) === 31337 ? 1 : Number(network.chainId) as IChainId;

        this.isLiteChain = !(this.chainId in NETWORK_CONSTANTS);

        const network_constants = await getNetworkConstants(this.chainId);
        this.constants.NATIVE_TOKEN = network_constants.NATIVE_COIN;
        this.constants.NETWORK_NAME = network_constants.NAME;
        this.constants.ALIASES = network_constants.ALIASES;
        this.constants.ALIASES.anycall = "0x37414a8662bc1d25be3ee51fb27c2686e2490a89";
        this.constants.ALIASES.voting_escrow_oracle = "0x12F407340697Ae0b177546E535b91A5be021fBF9";
        this.constants.POOLS_DATA = network_constants.POOLS_DATA ?? {};
        this.constants.LLAMMAS_DATA = network_constants.LLAMMAS_DATA ?? {};
        for (const poolId in this.constants.POOLS_DATA) this.constants.POOLS_DATA[poolId].in_api = true;
        this.constants.COINS = network_constants.COINS ?? {};
        this.constants.DECIMALS = extractDecimals({...this.constants.POOLS_DATA, ...this.constants.LLAMMAS_DATA});
        this.constants.DECIMALS[this.constants.NATIVE_TOKEN.address] = 18;
        this.constants.DECIMALS[this.constants.NATIVE_TOKEN.wrappedAddress] = 18;
        this.constants.GAUGES = extractGauges(this.constants.POOLS_DATA);

        if(this.isLiteChain) {
            this.constants.API_CONSTANTS = network_constants.API_CONSTANTS
        }

        const [cTokens, yTokens, ycTokens, aTokens] = [
            network_constants.cTokens ?? [],
            network_constants.yTokens ?? [],
            network_constants.ycTokens ?? [],
            network_constants.aTokens ?? [],
        ];
        const customAbiTokens = [...cTokens, ...yTokens, ...ycTokens, ...aTokens];
        if (this.isLiteChain) {
            this.constants.STABLE_FACTORY_CONSTANTS.stableNgBasePoolZap = network_constants.stableNgBasePoolZap;
        } else {
            this.constants.STABLE_FACTORY_CONSTANTS = STABLE_FACTORY_CONSTANTS[this.chainId] ?? {};
            this.constants.CRYPTO_FACTORY_CONSTANTS = CRYPTO_FACTORY_CONSTANTS[this.chainId] ?? {};
        }

        if(this.chainId === 5000) {
            this.constantOptions = {}
        }

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
        this.setContract(this.constants.COINS.scrvusd, ERC20Abi);
        this.constants.DECIMALS[this.constants.COINS.scrvusd] = 18;

        if(this.chainId === 1) {
            this.setContract(this.constants.ALIASES.minter, minterMainnetABI);
            this.setContract(this.constants.ALIASES.fee_distributor_crvusd, feeDistributorCrvUSDABI);
            this.setContract(this.constants.ALIASES.root_gauge_factory, rootGaugeFactoryABI);
            //TODO should be deleted
            this.setContract(this.constants.ALIASES.root_gauge_factory_arbitrum, rootGaugeFactoryABI);
        } else {
            this.setContract(this.constants.ALIASES.child_gauge_factory, childGaugeFactoryABI);
            if ("child_gauge_factory_old" in this.constants.ALIASES) {
                this.setContract(this.constants.ALIASES.child_gauge_factory_old, childGaugeFactoryABI);
            }
        }


        this.setContract(this.constants.ALIASES.voting_escrow, votingEscrowABI);

        this.setContract(this.constants.ALIASES.fee_distributor, feeDistributorABI);

        this.setContract(this.constants.ALIASES.gauge_controller, gaugeControllerABI);

        if (this.chainId == 137) {
            this.setContract(this.constants.ALIASES.router, routerPolygonABI);
        } else if ("factory" in this.constants.ALIASES) {
            this.setContract(this.constants.ALIASES.router, routerABI);
        } else {
            this.setContract(this.constants.ALIASES.router, routerNgPoolsOnlyABI);
        }

        if (OLD_CHAINS.includes(this.chainId)) {
            this.setContract(this.constants.ALIASES.deposit_and_stake, depositAndStakeABI);
        } else {
            this.setContract(this.constants.ALIASES.deposit_and_stake, depositAndStakeNgOnlyABI);
        }

        this.setContract(this.constants.ALIASES.crypto_calc, cryptoCalcZapABI);

        this.setContract(this.constants.ALIASES.stable_calc, StableCalcZapABI);

        // --------- POOL FACTORY ---------

        if ("factory" in this.constants.ALIASES) {
            this.setContract(this.constants.ALIASES.factory, factoryABI);

            const factoryContract = this.contracts[this.constants.ALIASES.factory].contract;
            if(!this.isNoRPC) {
                this.constants.ALIASES.factory_admin = (await factoryContract.admin(this.constantOptions) as string).toLowerCase();
                this.setContract(this.constants.ALIASES.factory_admin, factoryAdminABI);
            }
        }

        this.setContract(this.constants.ALIASES.crvusd_factory, factoryABI);

        this.setContract(this.constants.ALIASES.eywa_factory, factoryEywaABI);

        this.setContract(this.constants.ALIASES.crypto_factory, cryptoFactoryABI);

        this.setContract(this.constants.ALIASES.stable_ng_factory, stableNgFactoryABI);

        this.setContract(this.constants.ALIASES.twocrypto_factory, twocryptoFactoryABI);

        if (this.chainId == 1) {
            this.setContract(this.constants.ALIASES.tricrypto_factory, tricryptoFactoryMainnetABI);
        } else {
            this.setContract(this.constants.ALIASES.tricrypto_factory, tricryptoFactorySidechainABI);
        }

        // --------------------------------

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

                const L1GasUsed = await curveInstance.contracts[curveInstance.constants.ALIASES.gas_oracle_blob].contract.getL1GasUsed(arg.data);
                const L1Fee = await curveInstance.contracts[curveInstance.constants.ALIASES.gas_oracle_blob].contract.getL1Fee(arg.data);

                curveInstance.L1WeightedGasPrice = Number(L1Fee)/Number(L1GasUsed);

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

    initContract = memoizedContract()
    initMulticallContract = memoizedMulticallContract()

    setContract(address: string | undefined, abi: any): void {
        if (address === this.constants.ZERO_ADDRESS || address === undefined) return;

        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const curveInstance = this;

        const proxyHandler: ProxyHandler<any> = {
            get: function(target: any, name: string) {
                if(name === 'contract') {
                    return curveInstance.initContract(target['address'], target['abi'], curveInstance.signer || curveInstance.provider)
                } else if(name === 'multicallContract') {
                    return curveInstance.initMulticallContract(target['address'], target['abi'])
                } else {
                    return target[name];
                }
            },
        }

        const coreContract = {
            address,
            abi,
        }

        this.contracts[address] = new Proxy(coreContract, proxyHandler)
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
        if (!("factory" in this.constants.ALIASES)) return;

        if (useApi) {
            this.constants.FACTORY_POOLS_DATA = lowerCasePoolDataAddresses(await getFactoryPoolsDataFromApi.call(this, "factory"));
        } else {
            this.constants.FACTORY_POOLS_DATA = lowerCasePoolDataAddresses(await getFactoryPoolData.call(this));
        }
        this.constants.FACTORY_POOLS_DATA = await this._filterHiddenPools(this.constants.FACTORY_POOLS_DATA);
        this._updateDecimalsAndGauges(this.constants.FACTORY_POOLS_DATA);

        this.constants.FACTORY_GAUGE_IMPLEMENTATIONS["factory"] = this.isNoRPC ? null : await this.contracts[this.constants.ALIASES.factory].contract.gauge_implementation(this.constantOptions);
    }

    fetchCrvusdFactoryPools = async (useApi = true): Promise<void> => {
        if (!("crvusd_factory" in this.constants.ALIASES)) return;

        if (useApi) {
            this.constants.CRVUSD_FACTORY_POOLS_DATA = lowerCasePoolDataAddresses(await getFactoryPoolsDataFromApi.call(this, "factory-crvusd"));
        } else {
            if (this.isNoRPC) {
                throw new Error('RPC connection is required');
            }
            this.constants.CRVUSD_FACTORY_POOLS_DATA = lowerCasePoolDataAddresses(
                await getFactoryPoolData.call(this, 0, undefined, this.constants.ALIASES.crvusd_factory)
            );
        }
        this.constants.CRVUSD_FACTORY_POOLS_DATA = await this._filterHiddenPools(this.constants.CRVUSD_FACTORY_POOLS_DATA);
        this._updateDecimalsAndGauges(this.constants.CRVUSD_FACTORY_POOLS_DATA);
    }

    fetchEywaFactoryPools = async (useApi = true): Promise<void> => {
        if (!("eywa_factory" in this.constants.ALIASES)) return;

        if (useApi) {
            this.constants.EYWA_FACTORY_POOLS_DATA = lowerCasePoolDataAddresses(await getFactoryPoolsDataFromApi.call(this, "factory-eywa"));
        } else {
            if (this.isNoRPC) {
                throw new Error('RPC connection is required');
            }
            this.constants.EYWA_FACTORY_POOLS_DATA = lowerCasePoolDataAddresses(
                await getFactoryPoolData.call(this, 0, undefined, this.constants.ALIASES.eywa_factory)
            );
        }
        this.constants.EYWA_FACTORY_POOLS_DATA = await this._filterHiddenPools(this.constants.EYWA_FACTORY_POOLS_DATA);
        this._updateDecimalsAndGauges(this.constants.EYWA_FACTORY_POOLS_DATA);
    }

    fetchCryptoFactoryPools = async (useApi = true): Promise<void> => {
        if (!("crypto_factory" in this.constants.ALIASES)) return;

        if (useApi) {
            this.constants.CRYPTO_FACTORY_POOLS_DATA = lowerCasePoolDataAddresses(await getFactoryPoolsDataFromApi.call(this, "factory-crypto"));
        } else {
            if (this.isNoRPC) {
                throw new Error('RPC connection is required');
            }
            this.constants.CRYPTO_FACTORY_POOLS_DATA = lowerCasePoolDataAddresses(await getCryptoFactoryPoolData.call(this));
        }
        this.constants.CRYPTO_FACTORY_POOLS_DATA = await this._filterHiddenPools(this.constants.CRYPTO_FACTORY_POOLS_DATA);
        this._updateDecimalsAndGauges(this.constants.CRYPTO_FACTORY_POOLS_DATA);

        this.constants.FACTORY_GAUGE_IMPLEMENTATIONS["factory-crypto"] = this.isNoRPC? null : await this.contracts[this.constants.ALIASES.crypto_factory].contract.gauge_implementation(this.constantOptions);
    }

    fetchStableNgFactoryPools = async (useApi = true): Promise<void> => {
        if (!("stable_ng_factory" in this.constants.ALIASES)) return;

        if (useApi) {
            this.constants.STABLE_NG_FACTORY_POOLS_DATA = lowerCasePoolDataAddresses(await getFactoryPoolsDataFromApi.call(this, "factory-stable-ng"));
        } else {
            if (this.isNoRPC) {
                throw new Error('RPC connection is required');
            }
            this.constants.STABLE_NG_FACTORY_POOLS_DATA = lowerCasePoolDataAddresses(await getFactoryPoolData.call(this, 0, undefined, this.constants.ALIASES.stable_ng_factory));
        }

        this.constants.STABLE_NG_FACTORY_POOLS_DATA = await this._filterHiddenPools(this.constants.STABLE_NG_FACTORY_POOLS_DATA);
        this._updateDecimalsAndGauges(this.constants.STABLE_NG_FACTORY_POOLS_DATA);
    }

    fetchTworyptoFactoryPools = async (useApi = true): Promise<void> => {
        if (!("twocrypto_factory" in this.constants.ALIASES)) return;

        if (useApi) {
            this.constants.TWOCRYPTO_FACTORY_POOLS_DATA = lowerCasePoolDataAddresses(await getFactoryPoolsDataFromApi.call(this, "factory-twocrypto"));
        } else {
            if (this.isNoRPC) {
                throw new Error('RPC connection is required');
            }
            this.constants.TWOCRYPTO_FACTORY_POOLS_DATA = lowerCasePoolDataAddresses(await getTwocryptoFactoryPoolData.call(this));
        }
        this.constants.TWOCRYPTO_FACTORY_POOLS_DATA = await this._filterHiddenPools(this.constants.TWOCRYPTO_FACTORY_POOLS_DATA);
        this._updateDecimalsAndGauges(this.constants.TWOCRYPTO_FACTORY_POOLS_DATA);

        if (this.chainId === 1) {
            this.constants.FACTORY_GAUGE_IMPLEMENTATIONS["factory-twocrypto"] = this.isNoRPC ? null :
                await this.contracts[this.constants.ALIASES.twocrypto_factory].contract.gauge_implementation(this.constantOptions);
        } else {
            this.constants.FACTORY_GAUGE_IMPLEMENTATIONS["factory-twocrypto"] = this.isNoRPC ? null :
                await this.contracts[this.constants.ALIASES.child_gauge_factory].contract.get_implementation(this.constantOptions);
        }
    }

    fetchTricryptoFactoryPools = async (useApi = true): Promise<void> => {
        if (!("tricrypto_factory" in this.constants.ALIASES)) return;

        if (useApi) {
            this.constants.TRICRYPTO_FACTORY_POOLS_DATA = lowerCasePoolDataAddresses(await getFactoryPoolsDataFromApi.call(this, "factory-tricrypto"));
        } else {
            if (this.isNoRPC) {
                throw new Error('RPC connection is required');
            }
            this.constants.TRICRYPTO_FACTORY_POOLS_DATA = lowerCasePoolDataAddresses(await getTricryptoFactoryPoolData.call(this));
        }
        this.constants.TRICRYPTO_FACTORY_POOLS_DATA = await this._filterHiddenPools(this.constants.TRICRYPTO_FACTORY_POOLS_DATA);
        this._updateDecimalsAndGauges(this.constants.TRICRYPTO_FACTORY_POOLS_DATA);

        if (this.chainId === 1) {
            this.constants.FACTORY_GAUGE_IMPLEMENTATIONS["factory-tricrypto"] = this.isNoRPC ? null :
                await this.contracts[this.constants.ALIASES.tricrypto_factory].contract.gauge_implementation(this.constantOptions);
        } else {
            this.constants.FACTORY_GAUGE_IMPLEMENTATIONS["factory-tricrypto"] = this.isNoRPC ? null :
                await this.contracts[this.constants.ALIASES.child_gauge_factory].contract.get_implementation(this.constantOptions);
        }
    }

    fetchNewFactoryPools = async (): Promise<string[]> => {
        if (!("factory" in this.constants.ALIASES)) return [];

        const currentPoolIds = Object.keys(this.constants.FACTORY_POOLS_DATA);
        const lastPoolIdx = currentPoolIds.length === 0 ? -1 : Number(currentPoolIds[currentPoolIds.length - 1].split("-")[2]);
        const poolData = lowerCasePoolDataAddresses(await getFactoryPoolData.call(this, lastPoolIdx + 1));
        this.constants.FACTORY_POOLS_DATA = { ...this.constants.FACTORY_POOLS_DATA, ...poolData };
        this._updateDecimalsAndGauges(this.constants.FACTORY_POOLS_DATA);

        return Object.keys(poolData)
    }

    fetchNewCryptoFactoryPools = async (): Promise<string[]> => {
        if (!("crypto_factory" in this.constants.ALIASES)) return [];

        const currentPoolIds = Object.keys(this.constants.CRYPTO_FACTORY_POOLS_DATA);
        const lastPoolIdx = currentPoolIds.length === 0 ? -1 : Number(currentPoolIds[currentPoolIds.length - 1].split("-")[2]);
        const poolData = lowerCasePoolDataAddresses(await getCryptoFactoryPoolData.call(this, lastPoolIdx + 1));
        this.constants.CRYPTO_FACTORY_POOLS_DATA = { ...this.constants.CRYPTO_FACTORY_POOLS_DATA, ...poolData };
        this._updateDecimalsAndGauges(this.constants.CRYPTO_FACTORY_POOLS_DATA);

        return Object.keys(poolData)
    }

    fetchNewStableNgFactoryPools = async (): Promise<string[]> => {
        if (!("stable_ng_factory" in this.constants.ALIASES)) return [];

        const currentPoolIds = Object.keys(this.constants.STABLE_NG_FACTORY_POOLS_DATA);
        const lastPoolIdx = currentPoolIds.length === 0 ? -1 : Number(currentPoolIds[currentPoolIds.length - 1].split("-")[3]);
        const poolData = lowerCasePoolDataAddresses(await getFactoryPoolData.call(this, lastPoolIdx + 1, undefined, this.constants.ALIASES.stable_ng_factory));
        this.constants.STABLE_NG_FACTORY_POOLS_DATA = { ...this.constants.STABLE_NG_FACTORY_POOLS_DATA, ...poolData };
        this._updateDecimalsAndGauges(this.constants.STABLE_NG_FACTORY_POOLS_DATA);

        return Object.keys(poolData)
    }

    fetchNewTwocryptoFactoryPools = async (): Promise<string[]> => {
        if (!("twocrypto_factory" in this.constants.ALIASES)) return [];

        const currentPoolIds = Object.keys(this.constants.TWOCRYPTO_FACTORY_POOLS_DATA);
        const lastPoolIdx = currentPoolIds.length === 0 ? -1 : Number(currentPoolIds[currentPoolIds.length - 1].split("-")[2]);
        const poolData = lowerCasePoolDataAddresses(await getTwocryptoFactoryPoolData.call(this, lastPoolIdx + 1));
        this.constants.TWOCRYPTO_FACTORY_POOLS_DATA = { ...this.constants.TWOCRYPTO_FACTORY_POOLS_DATA, ...poolData };
        this._updateDecimalsAndGauges(this.constants.TWOCRYPTO_FACTORY_POOLS_DATA);

        return Object.keys(poolData)
    }

    fetchNewTricryptoFactoryPools = async (): Promise<string[]> => {
        if (!("tricrypto_factory" in this.constants.ALIASES)) return [];

        const currentPoolIds = Object.keys(this.constants.TRICRYPTO_FACTORY_POOLS_DATA);
        const lastPoolIdx = currentPoolIds.length === 0 ? -1 : Number(currentPoolIds[currentPoolIds.length - 1].split("-")[2]);
        const poolData = lowerCasePoolDataAddresses(await getTricryptoFactoryPoolData.call(this, lastPoolIdx + 1));
        this.constants.TRICRYPTO_FACTORY_POOLS_DATA = { ...this.constants.TRICRYPTO_FACTORY_POOLS_DATA, ...poolData };
        this._updateDecimalsAndGauges(this.constants.TRICRYPTO_FACTORY_POOLS_DATA);

        return Object.keys(poolData)
    }

    fetchRecentlyDeployedFactoryPool = async (poolAddress: string): Promise<string> => {
        if (!("factory" in this.constants.ALIASES)) return '';

        const poolData = lowerCasePoolDataAddresses(await getFactoryPoolData.call(this, 0, poolAddress));
        this.constants.FACTORY_POOLS_DATA = { ...this.constants.FACTORY_POOLS_DATA, ...poolData };
        this._updateDecimalsAndGauges(this.constants.FACTORY_POOLS_DATA);

        return Object.keys(poolData)[0]  // id
    }

    fetchRecentlyDeployedCryptoFactoryPool = async (poolAddress: string): Promise<string> => {
        if (!("crypto_factory" in this.constants.ALIASES)) return '';

        const poolData = lowerCasePoolDataAddresses(await getCryptoFactoryPoolData.call(this, 0, poolAddress));
        this.constants.CRYPTO_FACTORY_POOLS_DATA = { ...this.constants.CRYPTO_FACTORY_POOLS_DATA, ...poolData };
        this._updateDecimalsAndGauges(this.constants.CRYPTO_FACTORY_POOLS_DATA);

        return Object.keys(poolData)[0]  // id
    }

    fetchRecentlyDeployedStableNgFactoryPool = async (poolAddress: string): Promise<string> => {
        if (!("stable_ng_factory" in this.constants.ALIASES)) return '';

        const poolData = lowerCasePoolDataAddresses(await getFactoryPoolData.call(this, 0, poolAddress, this.constants.ALIASES.stable_ng_factory));
        this.constants.STABLE_NG_FACTORY_POOLS_DATA = { ...this.constants.STABLE_NG_FACTORY_POOLS_DATA, ...poolData };
        this._updateDecimalsAndGauges(this.constants.STABLE_NG_FACTORY_POOLS_DATA);

        return Object.keys(poolData)[0]  // id
    }

    fetchRecentlyDeployedTwocryptoFactoryPool = async (poolAddress: string): Promise<string> => {
        if (!("twocrypto_factory" in this.constants.ALIASES)) return '';

        const poolData = lowerCasePoolDataAddresses(await getTwocryptoFactoryPoolData.call(this, 0, poolAddress));
        this.constants.TWOCRYPTO_FACTORY_POOLS_DATA = { ...this.constants.TWOCRYPTO_FACTORY_POOLS_DATA, ...poolData };
        this._updateDecimalsAndGauges(this.constants.TWOCRYPTO_FACTORY_POOLS_DATA);

        return Object.keys(poolData)[0]  // id
    }

    fetchRecentlyDeployedTricryptoFactoryPool = async (poolAddress: string): Promise<string> => {
        if (!("tricrypto_factory" in this.constants.ALIASES)) return '';

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

    getStableNgFactoryPoolList = (): string[] => Object.keys(this.constants.STABLE_NG_FACTORY_POOLS_DATA);

    getTworyptoFactoryPoolList = (): string[] => Object.keys(this.constants.TWOCRYPTO_FACTORY_POOLS_DATA);

    getTricryptoFactoryPoolList = (): string[] => Object.keys(this.constants.TRICRYPTO_FACTORY_POOLS_DATA);

    getPoolList = (): string[] => {
        return [
            ...this.getMainPoolList(),
            ...this.getFactoryPoolList(),
            ...this.getCrvusdFactoryPoolList(),
            ...this.getEywaFactoryPoolList(),
            ...this.getCryptoFactoryPoolList(),
            ...this.getStableNgFactoryPoolList(),
            ...this.getTworyptoFactoryPoolList(),
            ...this.getTricryptoFactoryPoolList(),
        ]
    };

    getPoolsData = (): IDict<IPoolData> => ({
        ...this.constants.POOLS_DATA,
        ...this.constants.FACTORY_POOLS_DATA,
        ...this.constants.CRVUSD_FACTORY_POOLS_DATA,
        ...this.constants.EYWA_FACTORY_POOLS_DATA,
        ...this.constants.CRYPTO_FACTORY_POOLS_DATA,
        ...this.constants.STABLE_NG_FACTORY_POOLS_DATA,
        ...this.constants.TWOCRYPTO_FACTORY_POOLS_DATA,
        ...this.constants.TRICRYPTO_FACTORY_POOLS_DATA,
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
        if(this.isNoRPC) {
            return
        }

        const feeData = await this.provider.getFeeData();
        if (feeData.maxFeePerGas === null || feeData.maxPriorityFeePerGas === null) {
            delete this.options.maxFeePerGas;
            delete this.options.maxPriorityFeePerGas;

            this.options.gasPrice = this.feeData.gasPrice !== undefined ?
                this.parseUnits(this.feeData.gasPrice.toString(), "gwei") :
                (feeData.gasPrice || this.parseUnits("20", "gwei"));
        } else {
            delete this.options.gasPrice;

            this.options.maxFeePerGas = (this.feeData.maxFeePerGas !== undefined && this.feeData.maxFeePerGas !== null) ?
                this.parseUnits(this.feeData.maxFeePerGas.toString(), "gwei") :
                feeData.maxFeePerGas;
            this.options.maxPriorityFeePerGas = (this.feeData.maxPriorityFeePerGas !== undefined && this.feeData.maxPriorityFeePerGas !== null) ?
                this.parseUnits(this.feeData.maxPriorityFeePerGas.toString(), "gwei") :
                feeData.maxPriorityFeePerGas;
        }
    }

    getNetworkConstants = (): INetworkConstants => {
        return this.constants
    }

    getIsLiteChain = (): boolean => {
        return this.isLiteChain
    }
}

export const curve = new Curve();
