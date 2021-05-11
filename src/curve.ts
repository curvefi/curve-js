import { ethers, Contract } from "ethers";
import { Provider as MulticallProvider, Contract as MulticallContract} from 'ethers-multicall';
import ERC20Abi from './constants/abis/json/ERC20.json';
import gaugeABI from './constants/abis/json/gauge.json';
import votingEscrowABI from './constants/abis/json/votingescrow.json';
import addressProviderABI from './constants/abis/json/address_provider.json';
import { poolsData } from './constants/abis/abis-ethereum';

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

class Curve {
    provider: ethers.providers.JsonRpcProvider;
    multicallProvider: MulticallProvider;
    signer: ethers.providers.JsonRpcSigner;
    contracts: { [index: string]: { contract: Contract, multicallContract: MulticallContract } }

    constructor() {
        this.provider = new ethers.providers.JsonRpcProvider('http://localhost:8545/');
        this.signer = this.provider.getSigner();
        this.multicallProvider = new MulticallProvider(this.provider);
        this.contracts = {};
    }

    async init(): Promise<void> {
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

            // TODO add coins
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


        await this.multicallProvider.init();
    }
}

export const curve = new Curve();

Object.freeze(curve);
Object.preventExtensions(curve);
