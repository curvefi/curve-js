import { ethers } from "ethers";
import { getPool } from "./poolConstructor";
import { IDict } from "../interfaces";
import { curve } from "../curve";
import { _getUsdRate, _setContracts, toBN } from "../utils";
import { _getPoolsFromApi } from "../external-api";
import ERC20Abi from "../constants/abis/ERC20.json";


export const getPoolList = (): string[] => Object.keys(curve.constants.POOLS_DATA);

export const getFactoryPoolList = (): string[] => Object.keys(curve.constants.FACTORY_POOLS_DATA);

export const getCryptoFactoryPoolList = (): string[] => Object.keys(curve.constants.CRYPTO_FACTORY_POOLS_DATA);

// _userLpBalance: { address: { poolId: { _lpBalance: 0, time: 0 } } }
const _userLpBalanceCache: IDict<IDict<{ _lpBalance: ethers.BigNumber, time: number }>> = {};
const _isUserLpBalanceCacheExpired = (address: string, poolId: string) => (_userLpBalanceCache[address]?.[poolId]?.time || 0) + 600000 < Date.now();

const _getUserLpBalances = async (pools: string[], address: string, useCache: boolean): Promise<ethers.BigNumber[]> => {
    const poolsToFetch: string[] = useCache ? pools.filter((poolId) => _isUserLpBalanceCacheExpired(address as string, poolId)) : pools;
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

            if (!_userLpBalanceCache[address]) _userLpBalanceCache[address] = {};
            _userLpBalanceCache[address][poolId] = {'_lpBalance': _balance, 'time': Date.now()}
        }
    }

    const _lpBalances: ethers.BigNumber[] = []
    for (const poolId of pools) {
        _lpBalances.push(_userLpBalanceCache[address]?.[poolId]._lpBalance as ethers.BigNumber)
    }

    return _lpBalances
}

export const getUserPoolListByLiquidity = async (address = curve.signerAddress): Promise<string[]> => {
    const pools = [...getPoolList(), ...getFactoryPoolList(), ...getCryptoFactoryPoolList()];
    const _lpBalances = await _getUserLpBalances(pools, address, false);

    const userPoolList: string[] = []
    for (let i = 0; i < pools.length; i++) {
        if (_lpBalances[i].gt(0)) {
            userPoolList.push(pools[i]);
        }
    }

    return userPoolList
}

export const getUserLiquidityUSD = async (pools: string[], address = curve.signerAddress): Promise<string[]> => {
    const _lpBalances = await _getUserLpBalances(pools, address, true);

    const userLiquidityUSD: string[] = []
    for (let i = 0; i < pools.length; i++) {
        const pool = getPool(pools[i]);
        const price = await _getUsdRate(pool.lpToken);
        userLiquidityUSD.push(toBN(_lpBalances[i]).times(price).toFixed(8));
    }

    return userLiquidityUSD
}

// _userClaimable: { address: { poolId: { rewards: [ { token: '0x111...', 'symbol': 'TST', '', 'amount': 0 } ], time: 0 } }
const _userClaimableCache: IDict<IDict<{ rewards: { token: string, symbol: string, amount: string }[], time: number }>> = {};
const _isUserClaimableCacheExpired = (address: string, poolId: string) => (_userClaimableCache[address]?.[poolId]?.time || 0) + 600000 < Date.now();

const _getUserClaimable = async (pools: string[], address: string, useCache: boolean):
    Promise<{ token: string, symbol: string, amount: string }[][]> => {
    const poolsToFetch: string[] = useCache ? pools.filter((poolId) => _isUserClaimableCacheExpired(address as string, poolId)) : pools;

    if (poolsToFetch.length > 0) {

        // --- 1. CRV ---

        const hasCrvReward: boolean[] = [];
        for (const poolId of poolsToFetch) {
            const pool = getPool(poolId);
            if (curve.chainId === 2222 || pool.gauge === ethers.constants.AddressZero) { // TODO remove this for Kava
                hasCrvReward.push(false);
                continue;

            }
            const gaugeContract = curve.contracts[pool.gauge].contract;
            hasCrvReward.push('inflation_rate()' in gaugeContract || 'inflation_rate(uint256)' in gaugeContract);
        }

        // --- 2. The number of reward tokens ---

        const rewardCount: number[] = [];
        for (const poolId of poolsToFetch) {
            const pool = getPool(poolId);
            if (pool.gauge === ethers.constants.AddressZero) {
                rewardCount.push(0);
                continue;
            }

            const gaugeContract = curve.contracts[pool.gauge].contract;
            if ("reward_tokens(uint256)" in gaugeContract) { // gauge_v2, gauge_v3, gauge_v4, gauge_v5, gauge_factory, gauge_rewards_only, gauge_child
                rewardCount.push(8);
            } else if ('claimable_reward(address)' in gaugeContract) { // gauge_synthetix
                rewardCount.push(-1);
            } else {  // gauge
                rewardCount.push(0);
            }
        }

        // --- 3. Reward tokens ---

        const rewardTokenCalls = [];
        for (let i = 0; i < poolsToFetch.length; i++) {
            const pool = getPool(poolsToFetch[i]);
            if (rewardCount[i] !== -1) { // no_gauge, gauge, gauge_v2, gauge_v3, gauge_v4, gauge_v5, gauge_factory, gauge_rewards_only, gauge_child
                for (let count = 0; count < rewardCount[i]; count++) {
                    const gaugeContract = curve.contracts[pool.gauge].multicallContract;
                    rewardTokenCalls.push(gaugeContract.reward_tokens(count));
                }
            } else { // gauge_synthetix
                rewardCount[i] = 1;
                const rewardContract = curve.contracts[pool.sRewardContract as string].contract;
                const rewardMulticallContract = curve.contracts[pool.sRewardContract as string].multicallContract;
                const method = "snx()" in rewardContract ? "snx" : "rewardsToken" // susd, tbtc : dusd, musd, rsv, sbtc
                rewardTokenCalls.push(rewardMulticallContract[method]());
            }
        }

        const rawRewardTokens: string[] = (await curve.multicallProvider.all(rewardTokenCalls) as string[]).map((t) => t.toLowerCase());
        const rewardTokens: IDict<string[]> = {};
        for (let i = 0; i < poolsToFetch.length; i++) {
            rewardTokens[poolsToFetch[i]] = [];
            for (let j = 0; j < rewardCount[i]; j++) {
                const rewardAddress = rawRewardTokens.shift();
                if (rewardAddress === ethers.constants.AddressZero) continue;
                rewardTokens[poolsToFetch[i]].push(rewardAddress as string);
            }
        }

        // --- 4. Reward info ---

        const rewardInfoCalls = [];
        for (let i = 0; i < poolsToFetch.length; i++) {
            const poolId = poolsToFetch[i];
            const pool = getPool(poolId);
            if (pool.gauge === ethers.constants.AddressZero) continue;

            const gaugeContract = curve.contracts[pool.gauge].contract;
            const gaugeMulticallContract = curve.contracts[pool.gauge].multicallContract;

            if (hasCrvReward[i]) {
                rewardInfoCalls.push(gaugeMulticallContract.claimable_tokens(address));
            }

            for (const token of rewardTokens[poolId]) {
                _setContracts(token, ERC20Abi);
                const tokenMulticallContract = curve.contracts[token].multicallContract;
                rewardInfoCalls.push(tokenMulticallContract.symbol(), tokenMulticallContract.decimals());

                if ('claimable_reward(address,address)' in gaugeContract) {
                    rewardInfoCalls.push(gaugeMulticallContract.claimable_reward(address, token));
                } else if ('claimable_reward(address)' in gaugeContract) { // Synthetix Gauge
                    rewardInfoCalls.push(gaugeMulticallContract.claimable_reward(address), gaugeMulticallContract.claimed_rewards_for(address));
                }
            }
        }

        const rawRewardInfo = await curve.multicallProvider.all(rewardInfoCalls);
        for (let i = 0; i < poolsToFetch.length; i++) {
            const poolId = poolsToFetch[i];
            const pool = getPool(poolId);

            if (!_userClaimableCache[address]) _userClaimableCache[address] = {};
            _userClaimableCache[address][poolId] = { rewards: [], time: Date.now() };
            if (pool.gauge === ethers.constants.AddressZero) continue;

            const gaugeContract = curve.contracts[pool.gauge].contract;

            if (hasCrvReward[i]) {
                const token = curve.constants.ALIASES.crv;
                const symbol = 'CRV';
                const decimals = 18;
                const _amount = rawRewardInfo.shift() as ethers.BigNumber;
                const amount = ethers.utils.formatUnits(_amount, decimals);

                if (Number(amount) > 0) _userClaimableCache[address][poolId].rewards.push({ token, symbol, amount });
            }

            for (const token of rewardTokens[poolId]) {
                const symbol = rawRewardInfo.shift() as string;
                const decimals = rawRewardInfo.shift() as number;
                let _amount = rawRewardInfo.shift() as ethers.BigNumber;
                if ('claimable_reward(address)' in gaugeContract) {
                    const _claimedAmount = rawRewardInfo.shift() as ethers.BigNumber;
                    _amount = _amount.sub(_claimedAmount);
                }
                const amount = ethers.utils.formatUnits(_amount, decimals);

                if (Number(amount) > 0) _userClaimableCache[address][poolId].rewards.push({ token, symbol, amount });
            }
        }
    }

    const _claimable: { token: string, symbol: string, amount: string }[][] = []
    for (const poolId of pools) {
        _claimable.push(_userClaimableCache[address]?.[poolId].rewards)
    }

    return _claimable
}

export const getUserPoolListByClaimable = async (address = curve.signerAddress): Promise<string[]> => {
    const pools = [...getPoolList(), ...getFactoryPoolList(), ...getCryptoFactoryPoolList()];
    const _claimable = await _getUserClaimable(pools, address, false);

    const userPoolList: string[] = []
    for (let i = 0; i < pools.length; i++) {
        if (_claimable[i].length > 0) {
            userPoolList.push(pools[i]);
        }
    }

    return userPoolList
}

export const getUserClaimable = async (pools: string[], address = curve.signerAddress):
    Promise<{ token: string, symbol: string, amount: string, price: number }[][]> => {
    const _claimable = await _getUserClaimable(pools, address, true);

    const claimableWithPrice: { token: string, symbol: string, amount: string, price: number }[][] = []
    for (let i = 0; i < pools.length; i++) {
        claimableWithPrice.push([]);
        for (const c of _claimable[i]) {
            const price = await _getUsdRate(c.token);
            claimableWithPrice[claimableWithPrice.length - 1].push({ ...c, price })
        }
    }

    return claimableWithPrice
}

export const getUserPoolList = async (address = curve.signerAddress): Promise<string[]> => {
    const pools = [...getPoolList(), ...getFactoryPoolList(), ...getCryptoFactoryPoolList()];
    const [_lpBalances, _claimable] = await Promise.all([
        _getUserLpBalances(pools, address, false),
        _getUserClaimable(pools, address, false),
    ]);

    const userPoolList: string[] = []
    for (let i = 0; i < pools.length; i++) {
        if (_lpBalances[i].gt(0) || _claimable[i].length > 0) {
            userPoolList.push(pools[i]);
        }
    }

    return userPoolList
}

export const _getAmplificationCoefficientsFromApi = async (): Promise<IDict<number>> => {
    const network = curve.constants.NETWORK_NAME;
    const promises = [
        _getPoolsFromApi(network, "main"),
        _getPoolsFromApi(network, "crypto"),
        _getPoolsFromApi(network, "factory"),
        _getPoolsFromApi(network, "factory-crypto"),
    ];
    const allTypesExtendedPoolData = await Promise.all(promises);
    const amplificationCoefficientDict: IDict<number> = {};

    for (const extendedPoolData of allTypesExtendedPoolData) {
        for (const pool of extendedPoolData.poolData) {
            amplificationCoefficientDict[pool.address] = Number(pool.amplificationCoefficient);
        }
    }

    return amplificationCoefficientDict
}
