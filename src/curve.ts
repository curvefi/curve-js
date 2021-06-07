import { ethers, Contract } from "ethers";
import { Provider as MulticallProvider, Contract as MulticallContract} from 'ethers-multicall';
import ERC20Abi from './constants/abis/json/ERC20.json';
import cERC20Abi from './constants/abis/json/cERC20.json';
import yERC20Abi from './constants/abis/json/yERC20.json';
import gaugeABI from './constants/abis/json/gauge.json';
import votingEscrowABI from './constants/abis/json/votingescrow.json';
import addressProviderABI from './constants/abis/json/address_provider.json';
import gaugeControllerABI from './constants/abis/json/gaugecontroller.json';
import { poolsData } from './constants/abis/abis-ethereum';
import {DictInterface} from "./interfaces";

export const ALIASES = {
    "crv": "0xD533a949740bb3306d119CC777fa900bA034cd52",
    "pool_proxy": "0xeCb456EA5365865EbAb8a2661B0c503410e9B347",
    "gauge_proxy": "0x519AFB566c05E00cfB9af73496D00217A630e4D5",
    "voting_escrow": "0x5f3b5DfEb7B28CDbD7FAba78963EE202a494e2A2",
    "gauge_controller": "0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB",
    "minter": "0xd061D61a4d941c39E5453435B6345Dc261C2fcE0",
    "fee_distributor": "0xA464e6DCda8AC41e03616F95f4BC98a13b8922Dc",
    "address_provider": "0x0000000022d53366457f9d5e68ec105046fc4383",
}

const cTokens = [
    '0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643', // cDAI
    '0x39AA39c021dfbaE8faC545936693aC917d5E7563', // cUSDC
]

const yTokens = [
    "0xC2cB1040220768554cf699b0d863A3cd4324ce32",  // busd/yDAI
    "0x26EA744E5B887E5205727f55dFBE8685e3b21951",  // busd/yUSDC
    "0xE6354ed5bC4b393a5Aad09f21c46E101e692d447",  // busd/yUSDT
    "0x16de59092dAE5CcF4A1E6439D611fd0653f0Bd01",  // y/yDAI
    "0xd6aD7a6750A7593E092a9B218d66C0A814a3436e",  // y/yUSDC
    "0x83f798e925BcD4017Eb265844FDDAbb448f1707D",  // y/yUSDT
    "0x04bC0Ab673d88aE9dbC9DA2380cB6B79C4BCa9aE",  // yTUSD
    "0x73a052500105205d34Daf004eAb301916DA8190f",  // yBUSD
]

const ycTokens = [
    "0x99d1Fa417f94dcD62BfE781a1213c092a47041Bc",  // ycDAI
    "0x9777d7E2b60bB01759D0E2f8be2095df444cb07E",  // ycUSDC
    "0x1bE5d71F2dA660BFdee8012dDc58D024448A0A59",  // ycUSDT
]

class Curve {
    provider: ethers.providers.JsonRpcProvider;
    multicallProvider: MulticallProvider;
    signer: ethers.providers.JsonRpcSigner;
    contracts: { [index: string]: { contract: Contract, multicallContract: MulticallContract } };
    options: DictInterface<any>;

    constructor() {
        this.provider = new ethers.providers.JsonRpcProvider('http://localhost:8545/');
        this.signer = this.provider.getSigner();
        this.multicallProvider = new MulticallProvider(this.provider);
        this.contracts = {};
        this.options = { gasLimit: 12000000 };
    }

    // TODO gasPrice in gwei
    async init(options: { gasPrice?: number } = {}): Promise<void> {
        this.options.gasPrice = options.gasPrice ?? await this.provider.getGasPrice();

        // TODO delete toLowerCase()
        for (const pool of Object.values(poolsData)) {
            this.contracts[pool.swap_address] = {
                contract: new Contract(pool.swap_address, pool.swap_abi, this.signer),
                multicallContract: new MulticallContract(pool.swap_address, pool.swap_abi),
            };
            this.contracts[pool.swap_address.toLowerCase()] = {
                contract: new Contract(pool.swap_address, pool.swap_abi, this.signer),
                multicallContract: new MulticallContract(pool.swap_address, pool.swap_abi),
            };

            this.contracts[pool.token_address] = {
                contract: new Contract(pool.token_address, ERC20Abi, this.signer),
                multicallContract: new MulticallContract(pool.token_address, ERC20Abi),
            }
            this.contracts[pool.token_address.toLowerCase()] = {
                contract: new Contract(pool.token_address, ERC20Abi, this.signer),
                multicallContract: new MulticallContract(pool.token_address, ERC20Abi),
            }

            this.contracts[pool.gauge_address] = {
                contract: new Contract(pool.gauge_address, gaugeABI, this.signer),
                multicallContract: new MulticallContract(pool.gauge_address, gaugeABI),
            }
            this.contracts[pool.gauge_address.toLowerCase()] = {
                contract: new Contract(pool.gauge_address, gaugeABI, this.signer),
                multicallContract: new MulticallContract(pool.gauge_address, gaugeABI),
            }

            if (pool.deposit_address) {
                this.contracts[pool.deposit_address] = {
                    contract: new Contract(pool.deposit_address, pool.deposit_abi, this.signer),
                    multicallContract: new MulticallContract(pool.deposit_address, pool.deposit_abi),
                }
                this.contracts[pool.deposit_address.toLowerCase()] = {
                    contract: new Contract(pool.deposit_address, pool.deposit_abi, this.signer),
                    multicallContract: new MulticallContract(pool.deposit_address, pool.deposit_abi),
                }
            }

            for (const coinAddr of pool.underlying_coins) {
                this.contracts[coinAddr] = {
                    contract: new Contract(coinAddr, ERC20Abi, this.signer),
                    multicallContract: new MulticallContract(coinAddr, ERC20Abi),
                }
                this.contracts[coinAddr.toLowerCase()] = {
                    contract: new Contract(coinAddr, ERC20Abi, this.signer),
                    multicallContract: new MulticallContract(coinAddr, ERC20Abi),
                }
            }

            // TODO add all coins
            for (const coinAddr of pool.coins) {
                if (cTokens.includes(coinAddr)) {
                    this.contracts[coinAddr] = {
                        contract: new Contract(coinAddr, cERC20Abi, this.signer),
                        multicallContract: new MulticallContract(coinAddr, cERC20Abi),
                    }
                    this.contracts[coinAddr.toLowerCase()] = {
                        contract: new Contract(coinAddr, cERC20Abi, this.signer),
                        multicallContract: new MulticallContract(coinAddr, cERC20Abi),
                    }
                }

                if (yTokens.includes(coinAddr) || ycTokens.includes(coinAddr)) {
                    this.contracts[coinAddr] = {
                        contract: new Contract(coinAddr, yERC20Abi, this.signer),
                        multicallContract: new MulticallContract(coinAddr, yERC20Abi),
                    }
                    this.contracts[coinAddr.toLowerCase()] = {
                        contract: new Contract(coinAddr, yERC20Abi, this.signer),
                        multicallContract: new MulticallContract(coinAddr, yERC20Abi),
                    }
                }
            }
        }

        this.contracts[ALIASES.crv] = {
            contract: new Contract(ALIASES.crv, ERC20Abi, this.signer),
            multicallContract: new MulticallContract(ALIASES.crv, ERC20Abi),
        };
        this.contracts[ALIASES.crv.toLowerCase()] = {
            contract: new Contract(ALIASES.crv, ERC20Abi, this.signer),
            multicallContract: new MulticallContract(ALIASES.crv, ERC20Abi),
        };

        this.contracts[ALIASES.voting_escrow] = {
            contract: new Contract(ALIASES.voting_escrow, votingEscrowABI, this.signer),
            multicallContract: new MulticallContract(ALIASES.voting_escrow, votingEscrowABI),
        };
        this.contracts[ALIASES.voting_escrow.toLowerCase()] = {
            contract: new Contract(ALIASES.voting_escrow, votingEscrowABI, this.signer),
            multicallContract: new MulticallContract(ALIASES.voting_escrow, votingEscrowABI),
        };

        this.contracts[ALIASES.address_provider] = {
            contract: new Contract(ALIASES.address_provider, addressProviderABI, this.signer),
            multicallContract: new MulticallContract(ALIASES.address_provider, addressProviderABI),
        };
        this.contracts[ALIASES.address_provider.toLowerCase()] = {
            contract: new Contract(ALIASES.address_provider, addressProviderABI, this.signer),
            multicallContract: new MulticallContract(ALIASES.address_provider, addressProviderABI),
        };

        this.contracts[ALIASES.gauge_controller] = {
            contract: new Contract(ALIASES.gauge_controller, gaugeControllerABI, this.signer),
            multicallContract: new MulticallContract(ALIASES.gauge_controller, gaugeControllerABI),
        };
        this.contracts[ALIASES.gauge_controller.toLowerCase()] = {
            contract: new Contract(ALIASES.gauge_controller, gaugeControllerABI, this.signer),
            multicallContract: new MulticallContract(ALIASES.gauge_controller, gaugeControllerABI),
        };

        await this.multicallProvider.init();
    }
}

export const curve = new Curve();

Object.freeze(curve);
Object.preventExtensions(curve);
