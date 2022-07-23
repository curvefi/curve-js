import { ethers } from "ethers";
import { curve } from "../curve";
import { getPool } from "./poolConstructor";

export const getPoolList = (): string[] => Object.keys(curve.constants.POOLS_DATA);

export const getFactoryPoolList = (): string[] => Object.keys(curve.constants.FACTORY_POOLS_DATA);

export const getCryptoFactoryPoolList = (): string[] => Object.keys(curve.constants.CRYPTO_FACTORY_POOLS_DATA);

export const getUserPoolList = async (address?: string): Promise<string[]> => {
    if (!address) address = curve.signerAddress;
    address = address as string;

    const poolIds = [...getPoolList(), ...getFactoryPoolList(), ...getCryptoFactoryPoolList()];
    const calls = [];
    for (const poolId of poolIds) {
        const pool = getPool(poolId);
        calls.push(curve.contracts[pool.lpToken].multicallContract.balanceOf(address));
        if (pool.gauge !== ethers.constants.AddressZero) calls.push(curve.contracts[pool.gauge].multicallContract.balanceOf(address));
    }

    const userPoolList: string[] = []
    const _rawBalances: ethers.BigNumber[] = await curve.multicallProvider.all(calls);
    for (const poolId of poolIds) {
        const pool = getPool(poolId);
        let _balance = _rawBalances.shift() as ethers.BigNumber;
        if (pool.gauge !== ethers.constants.AddressZero) _balance = _balance.add(_rawBalances.shift() as ethers.BigNumber);
        if (_balance.gt(0)) {
            userPoolList.push(poolId);
        }
    }

    return userPoolList
}
