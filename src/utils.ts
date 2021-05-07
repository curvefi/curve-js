import axios from 'axios';
import { ethers, Contract, BigNumber } from 'ethers';
import { Provider as MulticallProvider, Contract as MulticallContract } from 'ethers-multicall';
import { DictInterface, PoolListItemInterface, PoolDataInterface } from './interfaces';
import ERC20Abi from "./constants/abis/json/ERC20.json";

const GITHUB_POOLS = "https://api.github.com/repos/curvefi/curve-contract/contents/contracts/pools";
const GITHUB_POOL = "https://raw.githubusercontent.com/curvefi/curve-contract/master/contracts/pools/<poolname>/pooldata.json";

const MAX_ALLOWANCE = BigNumber.from(2).pow(BigNumber.from(256)).sub(BigNumber.from(1));

export const getPoolData = async (name: string): Promise<PoolDataInterface> => {
    const poolResponse = await axios.get(GITHUB_POOL.replace("<poolname>", name));
    return poolResponse.data;
}

async function get_pools_data(): Promise<DictInterface<PoolDataInterface>> {
    const pools_resp = await axios.get(GITHUB_POOLS);
    const pool_names: string[] = pools_resp.data.filter((item: PoolListItemInterface) => item.type === "dir").map((item: PoolListItemInterface) => item.name);

    const pools_data: DictInterface<PoolDataInterface> = {};

    for (const pool_name of pool_names) {
        const pool_resp = await axios.get(GITHUB_POOL.replace("<poolname>", pool_name));
        const pool_data: PoolDataInterface = pool_resp.data;

        if (Object.prototype.hasOwnProperty.call(pool_data, "swap_address")) {
            pools_data[pool_name] = pool_data;
        } else {
            console.log(pool_data)
        }
    }
    return pools_data;
}

export const getBalances = async (addresses: string[], coinMulticallContracts: MulticallContract[]): Promise<DictInterface<BigNumber[]>> => {
    // TODO move to init function
    const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545/');
    const multicallProvider = new MulticallProvider(provider);
    await multicallProvider.init();

    const contractCalls = [];
    for (const coinContract of coinMulticallContracts) {
        contractCalls.push(...addresses.map((address: string) => coinContract.balanceOf(address)));
    }
    const response = await multicallProvider.all(contractCalls)

    const result: DictInterface<BigNumber[]>  = {};
    addresses.forEach((address: string, i: number) => {
        result[address] = coinMulticallContracts.map((_, j: number ) => response[i + (j * addresses.length)])
    });

    return result;
}

export const getAllowance = async (tokens: string[], address: string, spender: string): Promise<ethers.BigNumber[]> => {
    // TODO move to init function
    const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545/');
    const multicallProvider = new MulticallProvider(provider);

    // TODO caching contracts
    if (tokens.length === 1) {
        const contract = new Contract(tokens[0], ERC20Abi, provider)
        return [await contract.allowance(address, spender)]
    }

    const contractCalls = []
    for (const token of tokens) {
        const multicall_contract = new MulticallContract(token, ERC20Abi)
        contractCalls.push(multicall_contract.allowance(address, spender));
    }

    return await multicallProvider.all(contractCalls);
}

export const ensureAllowance = async (tokens: string[], amounts: BigNumber[], spender: string): Promise<void> => {
    // TODO move to init function
    const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545/');
    const signer = provider.getSigner();

    const address = await signer.getAddress();
    const allowance: BigNumber[] = await getAllowance(tokens, address, spender);

    // TODO caching contracts
    for (let i = 0; i < allowance.length; i++) {
        if (allowance[i].lt(amounts[i])) {
            const contract = new Contract(tokens[0], ERC20Abi, signer);
            if (allowance[i].gt(BigNumber.from(0))) {
                await contract.approve(spender, BigNumber.from(0))
            }
            await contract.approve(spender, MAX_ALLOWANCE)
        }
    }
}

export const getDecimals = async (coin: string): Promise<number> => {
    // TODO move to init function
    const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545/');

    const ERC20Contract = new ethers.Contract(coin, ERC20Abi, provider);
    return await ERC20Contract.decimals()
}

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
//
// get_pools_data().then((poolsData: DictInterface<PoolDataInterface>): void => {
//
// })
