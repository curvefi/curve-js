import axios from 'axios';
import { ethers, BigNumber } from 'ethers';
import { Provider as MulticallProvider, Contract as MulticallContract } from 'ethers-multicall';
import { ObjectInterface, PoolListItemInterface, PoolDataInterface } from './interfaces';
import {Contract as MulticallContract} from "ethers-multicall/dist/contract";
import ERC20Abi from "./abis/ERC20.json";

const GITHUB_POOLS = "https://api.github.com/repos/curvefi/curve-contract/contents/contracts/pools";
const GITHUB_POOL = "https://raw.githubusercontent.com/curvefi/curve-contract/master/contracts/pools/<poolname>/pooldata.json";

async function getPoolData(name: string): Promise<PoolDataInterface> {
    const poolResponse = await axios.get(GITHUB_POOL.replace("<poolname>", name));
    return poolResponse.data;
}

async function get_pools_data(): Promise<ObjectInterface<PoolDataInterface>> {
    const pools_resp = await axios.get(GITHUB_POOLS);
    const pool_names: string[] = pools_resp.data.filter((item: PoolListItemInterface) => item.type === "dir").map((item: PoolListItemInterface) => item.name);

    const pools_data: ObjectInterface<PoolDataInterface> = {};

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


export {
    getPoolData,
}

export const getBalances = async (address: string, ...coins: string[] | string[][]): Promise<BigNumber[]> => {
    if (coins.length == 1 && Array.isArray(coins[0])) coins = coins[0];
    coins = coins as string[];

    // TODO move to init function
    const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545/');
    const multicallProvider = new MulticallProvider(provider);
    await multicallProvider.init();

    const contractCalls = [];
    for (const coin of coins) {
        const coinContract = new MulticallContract(coin, ERC20Abi);
        contractCalls.push(coinContract.balanceOf(address))
    }

    return await multicallProvider.all(contractCalls);
}

export const ALIASES = {
    "token": "0xD533a949740bb3306d119CC777fa900bA034cd52",
    "pool_proxy": "0xeCb456EA5365865EbAb8a2661B0c503410e9B347",
    "gauge_proxy": "0x519AFB566c05E00cfB9af73496D00217A630e4D5",
    "voting_escrow": "0x5f3b5DfEb7B28CDbD7FAba78963EE202a494e2A2",
    "gauge_controller": "0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB",
    "minter": "0xd061D61a4d941c39E5453435B6345Dc261C2fcE0",
    "fee_distributor": "0xA464e6DCda8AC41e03616F95f4BC98a13b8922Dc",
    "address_provider": "0x0000000022d53366457f9d5e68ec105046fc4383",
}
//
// get_pools_data().then((poolsData: ObjectInterface<PoolDataInterface>): void => {
//
// })

