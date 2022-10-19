import { ethers } from "ethers";
import { getPool } from "./poolConstructor";
import { IDict } from "../interfaces";
import { curve } from "../curve";
import { _getUsdRate, toBN } from "../utils";


export const getPoolList = (): string[] => Object.keys(curve.constants.POOLS_DATA);

export const getFactoryPoolList = (): string[] => Object.keys(curve.constants.FACTORY_POOLS_DATA);

export const getCryptoFactoryPoolList = (): string[] => Object.keys(curve.constants.CRYPTO_FACTORY_POOLS_DATA);

const _userLpBalance: IDict<IDict<{ _lpBalance: ethers.BigNumber, time: number }>> = {}
const _isUserLpBalanceExpired = (address: string, poolId: string) => {
    return (_userLpBalance[address]?.[poolId]?.time || 0) + 600000 < Date.now()
}

export const _getUserLpBalances = async (pools: string[], address?: string): Promise<ethers.BigNumber[]> => {
    if (!address) address = curve.signerAddress;
    address = address as string;

    const poolsToFetch: string[] = [];
    for (const poolId of pools) {
        if (_isUserLpBalanceExpired(address, poolId)) poolsToFetch.push(poolId);
    }

    if (poolsToFetch.length > 0) {
        const calls = [];
        for (const poolId of poolsToFetch) {
            const pool = getPool(poolId);
            calls.push(curve.contracts[pool.lpToken].multicallContract.balanceOf(address));
            if (pool.gauge !== ethers.constants.AddressZero) calls.push(curve.contracts[pool.gauge].multicallContract.balanceOf(address));
        }
        const _rawBalances: ethers.BigNumber[] = await curve.multicallProvider.all(calls);
        for (const poolId of poolsToFetch) {
            const pool = getPool(poolId);
            let _balance = _rawBalances.shift() as ethers.BigNumber;
            if (pool.gauge !== ethers.constants.AddressZero) _balance = _balance.add(_rawBalances.shift() as ethers.BigNumber);

            if (!_userLpBalance[address]) _userLpBalance[address] = {};
            _userLpBalance[address][poolId] = {'_lpBalance': _balance, 'time': Date.now()}
        }
    }

    const _lpBalances: ethers.BigNumber[] = []
    for (const poolId of pools) {
        _lpBalances.push(_userLpBalance[address]?.[poolId]._lpBalance as ethers.BigNumber)
    }

    return _lpBalances
}

export const getUserPoolList = async (address?: string): Promise<string[]> => {
    const pools = [...getPoolList(), ...getFactoryPoolList(), ...getCryptoFactoryPoolList()];
    const _lpBalances = await _getUserLpBalances(pools, address);

    const userPoolList: string[] = []
    for (let i = 0; i < pools.length; i++) {
        if (_lpBalances[i].gt(0)) {
            userPoolList.push(pools[i]);
        }
    }

    return userPoolList
}

export const getUserLiquidityUSD = async (pools: string[], address?: string): Promise<string[]> => {
    const _lpBalances = await _getUserLpBalances(pools, address);

    const userLiquidityUSD: string[] = []
    for (let i = 0; i < pools.length; i++) {
        const pool = getPool(pools[i]);
        const price = await _getUsdRate(pool.lpToken);
        userLiquidityUSD.push(toBN(_lpBalances[i]).times(price).toFixed(8));
    }

    return userLiquidityUSD
}
