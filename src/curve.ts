import { ethers, Contract } from "ethers";
import { Networkish } from "@ethersproject/networks";
import { Provider as MulticallProvider, Contract as MulticallContract } from 'ethcall';
import {PoolDataInterface, DictInterface} from "./interfaces";
import ERC20Abi from './constants/abis/json/ERC20.json';
import cERC20Abi from './constants/abis/json/cERC20.json';
import yERC20Abi from './constants/abis/json/yERC20.json';
import gaugeABI from './constants/abis/json/gauge.json';
import votingEscrowABI from './constants/abis/json/votingescrow.json';
import addressProviderABI from './constants/abis/json/address_provider.json';
import gaugeControllerABI from './constants/abis/json/gaugecontroller.json';
import routerABI from './constants/abis/json/router.json';
import registryExchangeABI from './constants/abis/json/registry_exchange.json';
import { POOLS_DATA_ETHEREUM } from './constants/abis/abis-ethereum';
import { POOLS_DATA_POLYGON } from './constants/abis/abis-polygon';
import {
    BTC_COINS_ETHEREUM,
    BTC_COINS_LOWER_CASE_ETHEREUM,
    ETH_COINS_ETHEREUM,
    ETH_COINS_LOWER_CASE_ETHEREUM,
    LINK_COINS_ETHEREUM,
    LINK_COINS_LOWER_CASE_ETHEREUM,
    EUR_COINS_ETHEREUM,
    EUR_COINS_LOWER_CASE_ETHEREUM,
    USD_COINS_ETHEREUM,
    USD_COINS_LOWER_CASE_ETHEREUM,
    COINS_ETHEREUM,
    DECIMALS_ETHEREUM,
    DECIMALS_LOWER_CASE_ETHEREUM,
    cTokensEthereum,
    ycTokensEthereum,
    yTokensEthereum,
    aTokensEthereum,
} from "./constants/coins-ethereum";
import {
    BTC_COINS_POLYGON,
    BTC_COINS_LOWER_CASE_POLYGON,
    ETH_COINS_POLYGON,
    ETH_COINS_LOWER_CASE_POLYGON,
    LINK_COINS_POLYGON,
    LINK_COINS_LOWER_CASE_POLYGON,
    EUR_COINS_POLYGON,
    EUR_COINS_LOWER_CASE_POLYGON,
    USD_COINS_POLYGON,
    USD_COINS_LOWER_CASE_POLYGON,
    COINS_POLYGON,
    DECIMALS_POLYGON,
    DECIMALS_LOWER_CASE_POLYGON,
    cTokensPolygon,
    ycTokensPolygon,
    yTokensPolygon,
    aTokensPolygon,
} from "./constants/coins-polygon";
import { ALIASES_ETHEREUM, ALIASES_POLYGON } from "./constants/aliases";

export let POOLS_DATA: { [index: string]: PoolDataInterface };
export let LP_TOKENS: string[];
export let GAUGES: string[];

export let BTC_COINS: DictInterface<string>;
export let BTC_COINS_LOWER_CASE: DictInterface<string>;
export let ETH_COINS: DictInterface<string>;
export let ETH_COINS_LOWER_CASE: DictInterface<string>;
export let LINK_COINS: DictInterface<string>;
export let LINK_COINS_LOWER_CASE: DictInterface<string>;
export let EUR_COINS: DictInterface<string>;
export let EUR_COINS_LOWER_CASE: DictInterface<string>;
export let USD_COINS: DictInterface<string>;
export let USD_COINS_LOWER_CASE: DictInterface<string>;
export let COINS: DictInterface<string>;
export let DECIMALS: DictInterface<number>;
export let DECIMALS_LOWER_CASE: DictInterface<number>;

export let ALIASES = {
    "crv": "0xD533a949740bb3306d119CC777fa900bA034cd52",
    "voting_escrow": "0x5f3b5DfEb7B28CDbD7FAba78963EE202a494e2A2",
    "gauge_controller": "0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB",
    "address_provider": "0x0000000022d53366457f9d5e68ec105046fc4383",
    "router": "0xfA9a30350048B2BF66865ee20363067c66f67e58",
    "registry_exchange": "",
}

class Curve {
    provider: ethers.providers.Web3Provider | ethers.providers.JsonRpcProvider;
    multicallProvider: MulticallProvider;
    signer: ethers.Signer;
    signerAddress: string;
    chainId: number;
    contracts: { [index: string]: { contract: Contract, multicallContract: MulticallContract } };
    feeData: { gasPrice?: number, maxFeePerGas?: number, maxPriorityFeePerGas?: number };
    constantOptions: { gasLimit: number };
    options: { gasPrice?: number | ethers.BigNumber, maxFeePerGas?: number | ethers.BigNumber, maxPriorityFeePerGas?: number | ethers.BigNumber };

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
    }

    async init(
        providerType: 'JsonRpc' | 'Web3' | 'Infura',
        providerSettings: { url?: string, privateKey?: string } | { externalProvider: ethers.providers.ExternalProvider } | { network?: Networkish, apiKey?: string },
        options: { gasPrice?: number, maxFeePerGas?: number, maxPriorityFeePerGas?: number, chainId?: number } = {} // gasPrice in Gwei
    ): Promise<void> {
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
        } else {
            throw Error('Wrong providerType');
        }

        let cTokens, yTokens, ycTokens, aTokens;

        const network = await this.provider._networkPromise;
        console.log("CURVE-JS IS CONNECTED TO NETWORK:", network);

        this.chainId = network.chainId;

        if (network.chainId === 1) {
            cTokens = cTokensEthereum;
            yTokens = yTokensEthereum;
            ycTokens = ycTokensEthereum;
            aTokens = aTokensEthereum;

            ALIASES = ALIASES_ETHEREUM;
            POOLS_DATA = POOLS_DATA_ETHEREUM;

            BTC_COINS = BTC_COINS_ETHEREUM;
            BTC_COINS_LOWER_CASE = BTC_COINS_LOWER_CASE_ETHEREUM;
            ETH_COINS = ETH_COINS_ETHEREUM;
            ETH_COINS_LOWER_CASE = ETH_COINS_LOWER_CASE_ETHEREUM;
            LINK_COINS = LINK_COINS_ETHEREUM;
            LINK_COINS_LOWER_CASE = LINK_COINS_LOWER_CASE_ETHEREUM;
            EUR_COINS = EUR_COINS_ETHEREUM;
            EUR_COINS_LOWER_CASE = EUR_COINS_LOWER_CASE_ETHEREUM;
            USD_COINS = USD_COINS_ETHEREUM;
            USD_COINS_LOWER_CASE = USD_COINS_LOWER_CASE_ETHEREUM;
            COINS = COINS_ETHEREUM;
            DECIMALS = DECIMALS_ETHEREUM;
            DECIMALS_LOWER_CASE = DECIMALS_LOWER_CASE_ETHEREUM;
        } else if (network.chainId === 137) {
            cTokens = cTokensPolygon;
            yTokens = yTokensPolygon;
            ycTokens = ycTokensPolygon;
            aTokens = aTokensPolygon;

            ALIASES = ALIASES_POLYGON;
            POOLS_DATA = POOLS_DATA_POLYGON;

            BTC_COINS = BTC_COINS_POLYGON;
            BTC_COINS_LOWER_CASE = BTC_COINS_LOWER_CASE_POLYGON;
            ETH_COINS = ETH_COINS_POLYGON;
            ETH_COINS_LOWER_CASE = ETH_COINS_LOWER_CASE_POLYGON;
            LINK_COINS = LINK_COINS_POLYGON;
            LINK_COINS_LOWER_CASE = LINK_COINS_LOWER_CASE_POLYGON;
            EUR_COINS = EUR_COINS_POLYGON;
            EUR_COINS_LOWER_CASE = EUR_COINS_LOWER_CASE_POLYGON;
            USD_COINS = USD_COINS_POLYGON;
            USD_COINS_LOWER_CASE = USD_COINS_LOWER_CASE_POLYGON;
            COINS = COINS_POLYGON;
            DECIMALS = DECIMALS_POLYGON;
            DECIMALS_LOWER_CASE = DECIMALS_LOWER_CASE_POLYGON;
        } else {
            throw Error(`Network with chainId ${this.provider.network.chainId} is not supported`)
        }

        LP_TOKENS = Object.values(POOLS_DATA).map((data) => data.token_address.toLowerCase());
        GAUGES = Object.values(POOLS_DATA).map((data) => data.gauge_address.toLowerCase());

        const customAbiTokens = [...cTokens, ...yTokens, ...ycTokens, ...aTokens];

        this.multicallProvider = new MulticallProvider();
        await this.multicallProvider.init(this.provider);

        if (this.signer) {
            this.signerAddress = await this.signer.getAddress();
        }

        this.feeData = { gasPrice: options.gasPrice, maxFeePerGas: options.maxFeePerGas, maxPriorityFeePerGas: options.maxPriorityFeePerGas };
        await this.updateFeeData();

        // TODO delete toLowerCase()
        for (const pool of Object.values(POOLS_DATA)) {
            this.contracts[pool.swap_address] = {
                contract: new Contract(pool.swap_address, pool.swap_abi, this.signer || this.provider),
                multicallContract: new MulticallContract(pool.swap_address, pool.swap_abi),
            };
            this.contracts[pool.swap_address.toLowerCase()] = {
                contract: new Contract(pool.swap_address, pool.swap_abi, this.signer || this.provider),
                multicallContract: new MulticallContract(pool.swap_address, pool.swap_abi),
            };

            if (pool.token_address !== pool.swap_address) {
                this.contracts[pool.token_address] = {
                    contract: new Contract(pool.token_address, ERC20Abi, this.signer || this.provider),
                    multicallContract: new MulticallContract(pool.token_address, ERC20Abi),
                }
                this.contracts[pool.token_address.toLowerCase()] = {
                    contract: new Contract(pool.token_address, ERC20Abi, this.signer || this.provider),
                    multicallContract: new MulticallContract(pool.token_address, ERC20Abi),
                }
            }

            this.contracts[pool.gauge_address] = {
                contract: new Contract(pool.gauge_address, gaugeABI, this.signer || this.provider),
                multicallContract: new MulticallContract(pool.gauge_address, gaugeABI),
            }
            this.contracts[pool.gauge_address.toLowerCase()] = {
                contract: new Contract(pool.gauge_address, gaugeABI, this.signer || this.provider),
                multicallContract: new MulticallContract(pool.gauge_address, gaugeABI),
            }

            if (pool.deposit_address && this.contracts[pool.deposit_address] === undefined) {
                this.contracts[pool.deposit_address] = {
                    contract: new Contract(pool.deposit_address, pool.deposit_abi, this.signer || this.provider),
                    multicallContract: new MulticallContract(pool.deposit_address, pool.deposit_abi),
                }
                this.contracts[pool.deposit_address.toLowerCase()] = {
                    contract: new Contract(pool.deposit_address, pool.deposit_abi, this.signer || this.provider),
                    multicallContract: new MulticallContract(pool.deposit_address, pool.deposit_abi),
                }
            }

            for (const coinAddr of pool.underlying_coin_addresses) {
                this.contracts[coinAddr] = {
                    contract: new Contract(coinAddr, ERC20Abi, this.signer || this.provider),
                    multicallContract: new MulticallContract(coinAddr, ERC20Abi),
                }
                this.contracts[coinAddr.toLowerCase()] = {
                    contract: new Contract(coinAddr, ERC20Abi, this.signer || this.provider),
                    multicallContract: new MulticallContract(coinAddr, ERC20Abi),
                }
            }

            for (const coinAddr of pool.coin_addresses) {
                if (customAbiTokens.includes(coinAddr)) continue;

                this.contracts[coinAddr] = {
                    contract: new Contract(coinAddr, ERC20Abi, this.signer || this.provider),
                    multicallContract: new MulticallContract(coinAddr, ERC20Abi),
                }
                this.contracts[coinAddr.toLowerCase()] = {
                    contract: new Contract(coinAddr, ERC20Abi, this.signer || this.provider),
                    multicallContract: new MulticallContract(coinAddr, ERC20Abi),
                }
            }

            // TODO add all coins
            for (const coinAddr of pool.coin_addresses) {
                if (cTokens.includes(coinAddr)) {
                    this.contracts[coinAddr] = {
                        contract: new Contract(coinAddr, cERC20Abi, this.signer || this.provider),
                        multicallContract: new MulticallContract(coinAddr, cERC20Abi),
                    }
                    this.contracts[coinAddr.toLowerCase()] = {
                        contract: new Contract(coinAddr, cERC20Abi, this.signer || this.provider),
                        multicallContract: new MulticallContract(coinAddr, cERC20Abi),
                    }
                }

                if (aTokens.includes(coinAddr)) {
                    this.contracts[coinAddr] = {
                        contract: new Contract(coinAddr, ERC20Abi, this.signer || this.provider),
                        multicallContract: new MulticallContract(coinAddr, ERC20Abi),
                    }
                    this.contracts[coinAddr.toLowerCase()] = {
                        contract: new Contract(coinAddr, ERC20Abi, this.signer || this.provider),
                        multicallContract: new MulticallContract(coinAddr, ERC20Abi),
                    }
                }

                if (yTokens.includes(coinAddr) || ycTokens.includes(coinAddr)) {
                    this.contracts[coinAddr] = {
                        contract: new Contract(coinAddr, yERC20Abi, this.signer || this.provider),
                        multicallContract: new MulticallContract(coinAddr, yERC20Abi),
                    }
                    this.contracts[coinAddr.toLowerCase()] = {
                        contract: new Contract(coinAddr, yERC20Abi, this.signer || this.provider),
                        multicallContract: new MulticallContract(coinAddr, yERC20Abi),
                    }
                }
            }
        }

        this.contracts[ALIASES.crv] = {
            contract: new Contract(ALIASES.crv, ERC20Abi, this.signer || this.provider),
            multicallContract: new MulticallContract(ALIASES.crv, ERC20Abi),
        };
        this.contracts[ALIASES.crv.toLowerCase()] = {
            contract: new Contract(ALIASES.crv, ERC20Abi, this.signer || this.provider),
            multicallContract: new MulticallContract(ALIASES.crv, ERC20Abi),
        };

        this.contracts[ALIASES.voting_escrow] = {
            contract: new Contract(ALIASES.voting_escrow, votingEscrowABI, this.signer || this.provider),
            multicallContract: new MulticallContract(ALIASES.voting_escrow, votingEscrowABI),
        };
        this.contracts[ALIASES.voting_escrow.toLowerCase()] = {
            contract: new Contract(ALIASES.voting_escrow, votingEscrowABI, this.signer || this.provider),
            multicallContract: new MulticallContract(ALIASES.voting_escrow, votingEscrowABI),
        };

        this.contracts[ALIASES.address_provider] = {
            contract: new Contract(ALIASES.address_provider, addressProviderABI, this.signer || this.provider),
            multicallContract: new MulticallContract(ALIASES.address_provider, addressProviderABI),
        };
        this.contracts[ALIASES.address_provider.toLowerCase()] = {
            contract: new Contract(ALIASES.address_provider, addressProviderABI, this.signer || this.provider),
            multicallContract: new MulticallContract(ALIASES.address_provider, addressProviderABI),
        };

        const addressProviderContract = this.contracts[ALIASES.address_provider].contract;
        ALIASES.registry_exchange = await addressProviderContract.get_address(2, this.constantOptions);
        console.log(ALIASES.registry_exchange);

        this.contracts[ALIASES.registry_exchange] = {
            contract: new Contract(ALIASES.registry_exchange, registryExchangeABI, this.signer || this.provider),
            multicallContract: new MulticallContract(ALIASES.registry_exchange, registryExchangeABI),
        };
        this.contracts[ALIASES.registry_exchange.toLowerCase()] = {
            contract: new Contract(ALIASES.registry_exchange, registryExchangeABI, this.signer || this.provider),
            multicallContract: new MulticallContract(ALIASES.registry_exchange, registryExchangeABI),
        };

        this.contracts[ALIASES.gauge_controller] = {
            contract: new Contract(ALIASES.gauge_controller, gaugeControllerABI, this.signer || this.provider),
            multicallContract: new MulticallContract(ALIASES.gauge_controller, gaugeControllerABI),
        };
        this.contracts[ALIASES.gauge_controller.toLowerCase()] = {
            contract: new Contract(ALIASES.gauge_controller, gaugeControllerABI, this.signer || this.provider),
            multicallContract: new MulticallContract(ALIASES.gauge_controller, gaugeControllerABI),
        };

        this.contracts[ALIASES.router] = {
            contract: new Contract(ALIASES.router, routerABI, this.signer || this.provider),
            multicallContract: new MulticallContract(ALIASES.router, routerABI),
        };
        this.contracts[ALIASES.router.toLowerCase()] = {
            contract: new Contract(ALIASES.router, routerABI, this.signer || this.provider),
            multicallContract: new MulticallContract(ALIASES.router, routerABI),
        };
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
