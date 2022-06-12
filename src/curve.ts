import { ethers, Contract } from "ethers";
import { Networkish } from "@ethersproject/networks";
import { Provider as MulticallProvider, Contract as MulticallContract } from 'ethcall';
import { getFactoryPoolData } from "./factory/factory";
import { getFactoryPoolsDataFromApi } from "./factory/factory-api";
import { getCryptoFactoryPoolData } from "./factory/factory-crypto";
import {IPoolData, IDict, ICurve} from "./interfaces";
import ERC20Abi from './constants/abis/ERC20.json';
import cERC20Abi from './constants/abis/cERC20.json';
import yERC20Abi from './constants/abis/yERC20.json';
import minterABI from './constants/abis/minter.json';
import votingEscrowABI from './constants/abis/votingescrow.json';
import addressProviderABI from './constants/abis/address_provider.json';
import gaugeControllerABI from './constants/abis/gaugecontroller.json';
import routerABI from './constants/abis/router.json';
import depositAndStakeABI from './constants/abis/deposit_and_stake.json';
import registryExchangeABI from './constants/abis/registry_exchange.json';
import streamerABI from './constants/abis/streamer.json';
import factoryABI from './constants/abis/factory.json';
import cryptoFactoryABI from './constants/abis/factory-crypto.json';
import { POOLS_DATA_ETHEREUM, POOLS_DATA_POLYGON } from './constants/pools';
import { COINS_ETHEREUM, cTokensEthereum, yTokensEthereum, ycTokensEthereum, aTokensEthereum } from "./constants/coins/ethereum";
import { COINS_POLYGON, cTokensPolygon,  yTokensPolygon, ycTokensPolygon, aTokensPolygon } from "./constants/coins/polygon";
import { ALIASES_ETHEREUM, ALIASES_POLYGON } from "./constants/aliases";
import { lowerCasePoolDataAddresses, extractDecimals, extractGauges } from "./constants/utils";

const CONSTANTS: { [index: number]: any } = {
    1: {
        ALIASES: ALIASES_ETHEREUM,
        POOLS_DATA: POOLS_DATA_ETHEREUM,
        COINS: COINS_ETHEREUM,
        cTokens: cTokensEthereum,
        yTokens: yTokensEthereum,
        ycTokens: ycTokensEthereum,
        aTokens: aTokensEthereum,
    },
    137: {
        ALIASES: ALIASES_POLYGON,
        POOLS_DATA: POOLS_DATA_POLYGON,
        COINS: COINS_POLYGON,
        cTokens: cTokensPolygon,
        yTokens: yTokensPolygon,
        ycTokens: ycTokensPolygon,
        aTokens: aTokensPolygon,
    },
}

class Curve implements ICurve {
    provider: ethers.providers.Web3Provider | ethers.providers.JsonRpcProvider;
    multicallProvider: MulticallProvider;
    signer: ethers.Signer | null;
    signerAddress: string;
    chainId: number;
    contracts: { [index: string]: { contract: Contract, multicallContract: MulticallContract } };
    feeData: { gasPrice?: number, maxFeePerGas?: number, maxPriorityFeePerGas?: number };
    constantOptions: { gasLimit: number };
    options: { gasPrice?: number | ethers.BigNumber, maxFeePerGas?: number | ethers.BigNumber, maxPriorityFeePerGas?: number | ethers.BigNumber };
    constants: {
        ALIASES: IDict<string>,
        POOLS_DATA: IDict<IPoolData>,
        FACTORY_POOLS_DATA: IDict<IPoolData>,
        CRYPTO_FACTORY_POOLS_DATA: IDict<IPoolData>,
        COINS: IDict<string>,
        DECIMALS: IDict<number>,
        GAUGES: string[],
    };

    constructor() {
        // @ts-ignore
        this.provider = null;
        // @ts-ignore
        this.signer = null;
        this.signerAddress = '';
        this.chainId = 0;
        // @ts-ignore
        this.multicallProvider = null;
        this.contracts = {};
        this.feeData = {}
        this.constantOptions = { gasLimit: 12000000 }
        this.options = {};
        this.constants ={
            ALIASES: {},
            POOLS_DATA: {},
            FACTORY_POOLS_DATA: {},
            CRYPTO_FACTORY_POOLS_DATA: {},
            COINS: {},
            DECIMALS: {},
            GAUGES: [],
        };
    }

    async init(
        providerType: 'JsonRpc' | 'Web3' | 'Infura' | 'Alchemy',
        providerSettings: { url?: string, privateKey?: string } | { externalProvider: ethers.providers.ExternalProvider } | { network?: Networkish, apiKey?: string },
        options: { gasPrice?: number, maxFeePerGas?: number, maxPriorityFeePerGas?: number, chainId?: number } = {} // gasPrice in Gwei
    ): Promise<void> {
        // @ts-ignore
        this.provider = null;
        // @ts-ignore
        this.signer = null;
        this.signerAddress = '';
        this.chainId = 0;
        // @ts-ignore
        this.multicallProvider = null;
        this.contracts = {};
        this.feeData = {}
        this.constantOptions = { gasLimit: 12000000 }
        this.options = {};
        this.constants ={
            ALIASES: {},
            POOLS_DATA: {},
            FACTORY_POOLS_DATA: {},
            CRYPTO_FACTORY_POOLS_DATA: {},
            COINS: {},
            DECIMALS: {},
            GAUGES: [],
        };

        // JsonRpc provider
        if (providerType.toLowerCase() === 'JsonRpc'.toLowerCase()) {
            providerSettings = providerSettings as { url: string, privateKey: string };

            if (providerSettings.url) {
                this.provider = this.provider = new ethers.providers.JsonRpcProvider(providerSettings.url);
            } else {
                this.provider = new ethers.providers.JsonRpcProvider('http://localhost:8545/');
            }

            if (providerSettings.privateKey) {
                this.signer = new ethers.Wallet(providerSettings.privateKey, this.provider);
            } else {
                this.signer = this.provider.getSigner();
            }
        // Web3 provider
        } else if (providerType.toLowerCase() === 'Web3'.toLowerCase()) {
            providerSettings = providerSettings as { externalProvider: ethers.providers.ExternalProvider };
            this.provider = new ethers.providers.Web3Provider(providerSettings.externalProvider);
            this.signer = this.provider.getSigner();
        // Infura provider
        } else if (providerType.toLowerCase() === 'Infura'.toLowerCase()) {
            providerSettings = providerSettings as { network?: Networkish, apiKey?: string };
            this.provider = new ethers.providers.InfuraProvider(providerSettings.network, providerSettings.apiKey);
            this.signer = null;
        // Alchemy provider
        } else if (providerType.toLowerCase() === 'Alchemy'.toLowerCase()) {
            providerSettings = providerSettings as { network?: Networkish, apiKey?: string };
            this.provider = new ethers.providers.AlchemyProvider(providerSettings.network, providerSettings.apiKey);
            this.signer = null;
        } else {
            throw Error('Wrong providerType');
        }

        const network = this.provider.network || await this.provider._networkPromise;
        console.log("CURVE-JS IS CONNECTED TO NETWORK:", network);
        this.chainId = network.chainId === 1337 ? 1 : network.chainId;

        this.constants.ALIASES = CONSTANTS[this.chainId].ALIASES;
        this.constants.POOLS_DATA = CONSTANTS[this.chainId].POOLS_DATA;
        this.constants.COINS = CONSTANTS[this.chainId].COINS;
        this.constants.DECIMALS = extractDecimals(this.constants.POOLS_DATA);
        this.constants.GAUGES = extractGauges(this.constants.POOLS_DATA);
        const [cTokens, yTokens, ycTokens, aTokens] = [
            CONSTANTS[this.chainId].cTokens,
            CONSTANTS[this.chainId].yTokens,
            CONSTANTS[this.chainId].ycTokens,
            CONSTANTS[this.chainId].aTokens,
        ];
        const customAbiTokens = [...cTokens, ...yTokens, ...ycTokens, ...aTokens];

        this.multicallProvider = new MulticallProvider();
        await this.multicallProvider.init(this.provider);

        if (this.signer) {
            this.signerAddress = await this.signer.getAddress();
        } else {
            this.signerAddress = '';
        }

        this.feeData = { gasPrice: options.gasPrice, maxFeePerGas: options.maxFeePerGas, maxPriorityFeePerGas: options.maxPriorityFeePerGas };
        await this.updateFeeData();

        for (const pool of Object.values(this.constants.POOLS_DATA)) {
            this.contracts[pool.swap_address] = {
                contract: new Contract(pool.swap_address, pool.swap_abi, this.signer || this.provider),
                multicallContract: new MulticallContract(pool.swap_address, pool.swap_abi),
            };

            if (pool.token_address !== pool.swap_address) {
                this.contracts[pool.token_address] = {
                    contract: new Contract(pool.token_address, ERC20Abi, this.signer || this.provider),
                    multicallContract: new MulticallContract(pool.token_address, ERC20Abi),
                }
            }

            this.contracts[pool.gauge_address] = {
                contract: new Contract(pool.gauge_address, pool.gauge_abi, this.signer || this.provider),
                multicallContract: new MulticallContract(pool.gauge_address, pool.gauge_abi),
            }

            if (pool.deposit_address && !this.contracts[pool.deposit_address]) {
                this.contracts[pool.deposit_address] = {
                    contract: new Contract(pool.deposit_address, pool.deposit_abi, this.signer || this.provider),
                    multicallContract: new MulticallContract(pool.deposit_address, pool.deposit_abi),
                }
            }

            for (const coinAddr of pool.underlying_coin_addresses) {
                this.contracts[coinAddr] = {
                    contract: new Contract(coinAddr, ERC20Abi, this.signer || this.provider),
                    multicallContract: new MulticallContract(coinAddr, ERC20Abi),
                }
            }

            for (const coinAddr of pool.wrapped_coin_addresses) {
                if (customAbiTokens.includes(coinAddr)) continue;

                this.contracts[coinAddr] = {
                    contract: new Contract(coinAddr, ERC20Abi, this.signer || this.provider),
                    multicallContract: new MulticallContract(coinAddr, ERC20Abi),
                }
            }

            // TODO add all coins
            for (const coinAddr of pool.wrapped_coin_addresses) {
                if (cTokens.includes(coinAddr)) {
                    this.contracts[coinAddr] = {
                        contract: new Contract(coinAddr, cERC20Abi, this.signer || this.provider),
                        multicallContract: new MulticallContract(coinAddr, cERC20Abi),
                    }
                }

                if (aTokens.includes(coinAddr)) {
                    this.contracts[coinAddr] = {
                        contract: new Contract(coinAddr, ERC20Abi, this.signer || this.provider),
                        multicallContract: new MulticallContract(coinAddr, ERC20Abi),
                    }
                }

                if (yTokens.includes(coinAddr) || ycTokens.includes(coinAddr)) {
                    this.contracts[coinAddr] = {
                        contract: new Contract(coinAddr, yERC20Abi, this.signer || this.provider),
                        multicallContract: new MulticallContract(coinAddr, yERC20Abi),
                    }
                }
            }

            if (pool.reward_contract) {
                this.contracts[pool.reward_contract] = {
                    contract: new Contract(pool.reward_contract, streamerABI, this.signer || this.provider),
                    multicallContract: new MulticallContract(pool.reward_contract, streamerABI),
                }
            }

            for (const rewardTokenAddr of pool.reward_tokens || []) {
                this.contracts[rewardTokenAddr] = {
                    contract: new Contract(rewardTokenAddr, ERC20Abi, this.signer || this.provider),
                    multicallContract: new MulticallContract(rewardTokenAddr, ERC20Abi),
                }
            }
        }

        this.contracts[this.constants.ALIASES.crv] = {
            contract: new Contract(this.constants.ALIASES.crv, ERC20Abi, this.signer || this.provider),
            multicallContract: new MulticallContract(this.constants.ALIASES.crv, ERC20Abi),
        };
        this.contracts[this.constants.ALIASES.crv.toLowerCase()] = {
            contract: new Contract(this.constants.ALIASES.crv, ERC20Abi, this.signer || this.provider),
            multicallContract: new MulticallContract(this.constants.ALIASES.crv, ERC20Abi),
        };

        this.contracts[this.constants.ALIASES.minter] = {
            contract: new Contract(this.constants.ALIASES.minter, minterABI, this.signer || this.provider),
            multicallContract: new MulticallContract(this.constants.ALIASES.minter, minterABI),
        };
        this.contracts[this.constants.ALIASES.minter.toLowerCase()] = {
            contract: new Contract(this.constants.ALIASES.minter, minterABI, this.signer || this.provider),
            multicallContract: new MulticallContract(this.constants.ALIASES.minter, minterABI),
        };

        this.contracts[this.constants.ALIASES.voting_escrow] = {
            contract: new Contract(this.constants.ALIASES.voting_escrow, votingEscrowABI, this.signer || this.provider),
            multicallContract: new MulticallContract(this.constants.ALIASES.voting_escrow, votingEscrowABI),
        };
        this.contracts[this.constants.ALIASES.voting_escrow.toLowerCase()] = {
            contract: new Contract(this.constants.ALIASES.voting_escrow, votingEscrowABI, this.signer || this.provider),
            multicallContract: new MulticallContract(this.constants.ALIASES.voting_escrow, votingEscrowABI),
        };

        this.contracts[this.constants.ALIASES.address_provider] = {
            contract: new Contract(this.constants.ALIASES.address_provider, addressProviderABI, this.signer || this.provider),
            multicallContract: new MulticallContract(this.constants.ALIASES.address_provider, addressProviderABI),
        };
        this.contracts[this.constants.ALIASES.address_provider.toLowerCase()] = {
            contract: new Contract(this.constants.ALIASES.address_provider, addressProviderABI, this.signer || this.provider),
            multicallContract: new MulticallContract(this.constants.ALIASES.address_provider, addressProviderABI),
        };

        const addressProviderContract = this.contracts[this.constants.ALIASES.address_provider].contract;
        this.constants.ALIASES.registry_exchange = await addressProviderContract.get_address(2, this.constantOptions);

        this.contracts[this.constants.ALIASES.registry_exchange] = {
            contract: new Contract(this.constants.ALIASES.registry_exchange, registryExchangeABI, this.signer || this.provider),
            multicallContract: new MulticallContract(this.constants.ALIASES.registry_exchange, registryExchangeABI),
        };
        this.contracts[this.constants.ALIASES.registry_exchange.toLowerCase()] = {
            contract: new Contract(this.constants.ALIASES.registry_exchange, registryExchangeABI, this.signer || this.provider),
            multicallContract: new MulticallContract(this.constants.ALIASES.registry_exchange, registryExchangeABI),
        };

        this.contracts[this.constants.ALIASES.gauge_controller] = {
            contract: new Contract(this.constants.ALIASES.gauge_controller, gaugeControllerABI, this.signer || this.provider),
            multicallContract: new MulticallContract(this.constants.ALIASES.gauge_controller, gaugeControllerABI),
        };
        this.contracts[this.constants.ALIASES.gauge_controller.toLowerCase()] = {
            contract: new Contract(this.constants.ALIASES.gauge_controller, gaugeControllerABI, this.signer || this.provider),
            multicallContract: new MulticallContract(this.constants.ALIASES.gauge_controller, gaugeControllerABI),
        };

        this.contracts[this.constants.ALIASES.router] = {
            contract: new Contract(this.constants.ALIASES.router, routerABI, this.signer || this.provider),
            multicallContract: new MulticallContract(this.constants.ALIASES.router, routerABI),
        };
        this.contracts[this.constants.ALIASES.router.toLowerCase()] = {
            contract: new Contract(this.constants.ALIASES.router, routerABI, this.signer || this.provider),
            multicallContract: new MulticallContract(this.constants.ALIASES.router, routerABI),
        };

        this.contracts[this.constants.ALIASES.deposit_and_stake] = {
            contract: new Contract(this.constants.ALIASES.deposit_and_stake, depositAndStakeABI, this.signer || this.provider),
            multicallContract: new MulticallContract(this.constants.ALIASES.deposit_and_stake, depositAndStakeABI),
        };
        this.contracts[this.constants.ALIASES.deposit_and_stake.toLowerCase()] = {
            contract: new Contract(this.constants.ALIASES.deposit_and_stake, depositAndStakeABI, this.signer || this.provider),
            multicallContract: new MulticallContract(this.constants.ALIASES.deposit_and_stake, depositAndStakeABI),
        };

        this.contracts[this.constants.ALIASES.factory] = {
            contract: new Contract(this.constants.ALIASES.factory, factoryABI, this.signer || this.provider),
            multicallContract: new MulticallContract(this.constants.ALIASES.factory, factoryABI),
        };
        this.contracts[this.constants.ALIASES.factory.toLowerCase()] = {
            contract: new Contract(this.constants.ALIASES.factory, factoryABI, this.signer || this.provider),
            multicallContract: new MulticallContract(this.constants.ALIASES.factory, factoryABI),
        };

        this.contracts[this.constants.ALIASES.crypto_factory] = {
            contract: new Contract(this.constants.ALIASES.crypto_factory, cryptoFactoryABI, this.signer || this.provider),
            multicallContract: new MulticallContract(this.constants.ALIASES.crypto_factory, cryptoFactoryABI),
        };
        this.contracts[this.constants.ALIASES.crypto_factory.toLowerCase()] = {
            contract: new Contract(this.constants.ALIASES.crypto_factory, cryptoFactoryABI, this.signer || this.provider),
            multicallContract: new MulticallContract(this.constants.ALIASES.crypto_factory, cryptoFactoryABI),
        };
    }

    async fetchFactoryPools(useApi = true): Promise<void> {
        if (useApi) {
            this.constants.FACTORY_POOLS_DATA = lowerCasePoolDataAddresses(await getFactoryPoolsDataFromApi.call(this, false));
        } else {
            this.constants.FACTORY_POOLS_DATA = lowerCasePoolDataAddresses(await getFactoryPoolData.call(this));
        }
        this.constants.DECIMALS = { ...this.constants.DECIMALS, ...extractDecimals(this.constants.FACTORY_POOLS_DATA) };
        this.constants.GAUGES = [ ...this.constants.GAUGES, ...extractGauges(this.constants.FACTORY_POOLS_DATA) ];
    }

    async fetchCryptoFactoryPools(useApi = true): Promise<void> {
        if (this.chainId !== 1 && this.chainId !== 1337) return

        if (useApi) {
            this.constants.CRYPTO_FACTORY_POOLS_DATA = lowerCasePoolDataAddresses(await getFactoryPoolsDataFromApi.call(this, true));
        } else {
            this.constants.CRYPTO_FACTORY_POOLS_DATA = lowerCasePoolDataAddresses(await getCryptoFactoryPoolData.call(this));
        }
        this.constants.DECIMALS = { ...this.constants.DECIMALS, ...extractDecimals(this.constants.CRYPTO_FACTORY_POOLS_DATA) };
        this.constants.GAUGES = [ ...this.constants.GAUGES, ...extractGauges(this.constants.CRYPTO_FACTORY_POOLS_DATA) ];
    }

    setCustomFeeData(customFeeData: { gasPrice?: number, maxFeePerGas?: number, maxPriorityFeePerGas?: number }): void {
        this.feeData = { ...this.feeData, ...customFeeData };
    }

    async updateFeeData(): Promise<void> {
        const feeData = await this.provider.getFeeData();
        if (feeData.maxFeePerGas === null || feeData.maxPriorityFeePerGas === null) {
            delete this.options.maxFeePerGas;
            delete this.options.maxPriorityFeePerGas;

            this.options.gasPrice = this.feeData.gasPrice !== undefined ?
                ethers.utils.parseUnits(this.feeData.gasPrice.toString(), "gwei") :
                (feeData.gasPrice || await this.provider.getGasPrice());
        } else {
            delete this.options.gasPrice;

            this.options.maxFeePerGas = this.feeData.maxFeePerGas !== undefined ?
                ethers.utils.parseUnits(this.feeData.maxFeePerGas.toString(), "gwei") :
                feeData.maxFeePerGas;
            this.options.maxPriorityFeePerGas = this.feeData.maxPriorityFeePerGas !== undefined ?
                ethers.utils.parseUnits(this.feeData.maxPriorityFeePerGas.toString(), "gwei") :
                feeData.maxPriorityFeePerGas;
        }
    }
}

export const curve = new Curve();
