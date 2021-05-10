import axios from 'axios';
import { ethers, BigNumber } from 'ethers';
import { DictInterface, PoolListItemInterface, PoolDataInterface } from './interfaces';

import { curve } from "./curve";

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

export const getBalances = async (addresses: string[], coins: string[]): Promise<DictInterface<BigNumber[]>> => {
    const contractCalls = [];
    for (const coinAddr of coins) {
        contractCalls.push(...addresses.map((address: string) => curve.contracts[coinAddr].multicallContract.balanceOf(address)));
    }
    const response = await curve.multicallProvider.all(contractCalls)

    const result: DictInterface<BigNumber[]>  = {};
    addresses.forEach((address: string, i: number) => {
        result[address] = coins.map((_, j: number ) => response[i + (j * addresses.length)])
    });

    return result;
}

export const getAllowance = async (tokens: string[], address: string, spender: string): Promise<ethers.BigNumber[]> => {
    if (tokens.length === 1) {
        return [await curve.contracts[tokens[0]].contract.allowance(address, spender)]
    }

    const contractCalls = []
    for (const token of tokens) {
        contractCalls.push(curve.contracts[token].multicallContract.allowance(address, spender));
    }

    return await curve.multicallProvider.all(contractCalls);
}

export const ensureAllowance = async (tokens: string[], amounts: BigNumber[], spender: string): Promise<void> => {
    const address = await curve.signer.getAddress();
    const allowance: BigNumber[] = await getAllowance(tokens, address, spender);

    for (let i = 0; i < allowance.length; i++) {
        if (allowance[i].lt(amounts[i])) {
            if (allowance[i].gt(BigNumber.from(0))) {
                await curve.contracts[tokens[i]].contract.approve(spender, BigNumber.from(0))
            }
            await curve.contracts[tokens[i]].contract.approve(spender, MAX_ALLOWANCE)
        }
    }
}

export const getDecimals = async (coin: string): Promise<number> => {
    return await curve.contracts[coin].contract.decimals()
}
