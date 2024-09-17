import { getPool } from "./poolConstructor.js";
import { IDict } from "../interfaces";
import { curve } from "../curve.js";
import { _getRewardsFromApi, _getUsdRate, _setContracts, toBN } from "../utils.js";
import { _getAllPoolsFromApi } from "../external-api.js";
import ERC20Abi from "../constants/abis/ERC20.json" assert { type: 'json' };

// _userLpBalance: { address: { poolId: { _lpBalance: 0, time: 0 } } }
const _userLpBalanceCache: IDict<IDict<{ _lpBalance: bigint, time: number }>> = {};
const _isUserLpBalanceCacheExpired = (address: string, poolId: string) => (_userLpBalanceCache[address]?.[poolId]?.time || 0) + 600000 < Date.now();

const _getUserLpBalances = async (pools: string[], address: string, useCache: boolean): Promise<bigint[]> => {
    if (!curve.multicallProvider) throw Error("Can't get user balances withou a provider");

    const poolsToFetch: string[] = useCache ? pools.filter((poolId) => _isUserLpBalanceCacheExpired(address as string, poolId)) : pools;
    if (poolsToFetch.length > 0) {
        const calls = [];
        for (const poolId of poolsToFetch) {
            const pool = getPool(poolId);
            calls.push(curve.contracts[pool.lpToken].multicallContract.balanceOf(address));
            if (pool.gauge.address !== curve.constants.ZERO_ADDRESS) calls.push(curve.contracts[pool.gauge.address].multicallContract.balanceOf(address));
        }
        const _rawBalances: bigint[] = await curve.multicallProvider.all(calls);
        for (const poolId of poolsToFetch) {
            const pool = getPool(poolId);
            let _balance = _rawBalances.shift() as bigint;
            if (pool.gauge.address !== curve.constants.ZERO_ADDRESS) _balance = _balance + (_rawBalances.shift() as bigint);

            if (!_userLpBalanceCache[address]) _userLpBalanceCache[address] = {};
            _userLpBalanceCache[address][poolId] = {'_lpBalance': _balance, 'time': Date.now()}
        }
    }

    const _lpBalances: bigint[] = []
    for (const poolId of pools) {
        _lpBalances.push(_userLpBalanceCache[address]?.[poolId]._lpBalance as bigint)
    }

    return _lpBalances
}

export const getUserPoolListByLiquidity = async (address = curve.signerAddress): Promise<string[]> => {
    const pools = curve.getPoolList();
    const _lpBalances = await _getUserLpBalances(pools, address, false);

    const userPoolList: string[] = []
    for (let i = 0; i < pools.length; i++) {
        if (_lpBalances[i] > 0) {
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
    if (!curve.multicallProvider) throw Error("Can't get user claimable without a provider");

    const poolsToFetch: string[] = useCache ? pools.filter((poolId) => _isUserClaimableCacheExpired(address as string, poolId)) : pools;

    if (poolsToFetch.length > 0) {

        // --- 1. CRV ---

        const hasCrvReward: boolean[] = [];
        for (const poolId of poolsToFetch) {
            const pool = getPool(poolId);
            if (curve.chainId === 324 || curve.chainId === 2222 || pool.gauge.address === curve.constants.ZERO_ADDRESS) { // TODO remove this for ZkSync and Kava
                hasCrvReward.push(false);
                continue;

            }
            const gaugeContract = curve.contracts[pool.gauge.address].contract;
            hasCrvReward.push('inflation_rate()' in gaugeContract || 'inflation_rate(uint256)' in gaugeContract);
        }

        // --- 2. The number of reward tokens ---

        const rewardCount: number[] = [];
        for (const poolId of poolsToFetch) {
            const pool = getPool(poolId);
            if (pool.gauge.address === curve.constants.ZERO_ADDRESS) {
                rewardCount.push(0);
                continue;
            }

            const gaugeContract = curve.contracts[pool.gauge.address].contract;
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
                    const gaugeContract = curve.contracts[pool.gauge.address].multicallContract;
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
                if (rewardAddress === curve.constants.ZERO_ADDRESS) continue;
                if (curve.chainId !== 1 && rewardAddress === curve.constants.COINS.crv) continue;
                // REYIELD shitcoin which breaks things, because symbol() throws an error
                if (rewardAddress === "0xf228ec3476318aCB4E719D2b290bb2ef8B34DFfA".toLowerCase()) continue;
                rewardTokens[poolsToFetch[i]].push(rewardAddress as string);
            }
        }

        // --- 4. Reward info ---

        const rewardInfoCalls = [];
        for (let i = 0; i < poolsToFetch.length; i++) {
            const poolId = poolsToFetch[i];
            const pool = getPool(poolId);
            if (pool.gauge.address === curve.constants.ZERO_ADDRESS) continue;

            const gaugeContract = curve.contracts[pool.gauge.address].contract;
            const gaugeMulticallContract = curve.contracts[pool.gauge.address].multicallContract;

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
            if (pool.gauge.address === curve.constants.ZERO_ADDRESS) continue;

            const gaugeContract = curve.contracts[pool.gauge.address].contract;

            if (hasCrvReward[i]) {
                const token = curve.constants.ALIASES.crv;
                const symbol = 'CRV';
                const decimals = 18;
                const _amount = rawRewardInfo.shift() as bigint;
                const amount = curve.formatUnits(_amount, decimals);

                if (Number(amount) > 0) _userClaimableCache[address][poolId].rewards.push({ token, symbol, amount });
            }

            for (const token of rewardTokens[poolId]) {
                const symbol = rawRewardInfo.shift() as string;
                const decimals = rawRewardInfo.shift() as number;
                let _amount = rawRewardInfo.shift() as bigint;
                if ('claimable_reward(address)' in gaugeContract) {
                    const _claimedAmount = rawRewardInfo.shift() as bigint;
                    _amount = _amount - _claimedAmount;
                }
                const amount = curve.formatUnits(_amount, decimals);

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

const _getUserClaimableUseApi = async (pools: string[], address: string, useCache: boolean):
    Promise<{ token: string, symbol: string, amount: string }[][]> => {
    if (!curve.multicallProvider) throw Error("Can't get user claimable without a provider");

    const poolsToFetch: string[] = useCache ? pools.filter((poolId) => _isUserClaimableCacheExpired(address as string, poolId)) : pools;

    if (poolsToFetch.length > 0) {

        // --- 1. CRV ---

        const hasCrvReward: boolean[] = [];
        for (const poolId of poolsToFetch) {
            const pool = getPool(poolId);
            if (curve.chainId === 324 || curve.chainId === 2222 || pool.gauge.address === curve.constants.ZERO_ADDRESS) { // TODO remove this for ZkSync and Kava
                hasCrvReward.push(false);
                continue;

            }
            const gaugeContract = curve.contracts[pool.gauge.address].contract;
            hasCrvReward.push('inflation_rate()' in gaugeContract || 'inflation_rate(uint256)' in gaugeContract);
        }

        // --- 2. Reward tokens ---

        const rewardTokens: IDict<{ token: string, symbol: string, decimals: number }[]> = {};
        for (let i = 0; i < poolsToFetch.length; i++) {
            const pool = getPool(poolsToFetch[i]);
            const rewards = await _getRewardsFromApi();
            rewardTokens[poolsToFetch[i]] = (rewards[pool.gauge.address] ?? [])
                .map((r) => ({ token: r.tokenAddress, symbol: r.symbol, decimals: Number(r.decimals)}));
        }

        // --- 3. Reward info ---

        const rewardInfoCalls = [];
        for (let i = 0; i < poolsToFetch.length; i++) {
            const poolId = poolsToFetch[i];
            const pool = getPool(poolId);
            if (pool.gauge.address === curve.constants.ZERO_ADDRESS) continue;

            const gaugeContract = curve.contracts[pool.gauge.address].contract;
            const gaugeMulticallContract = curve.contracts[pool.gauge.address].multicallContract;

            if (hasCrvReward[i]) {
                rewardInfoCalls.push(gaugeMulticallContract.claimable_tokens(address));
            }

            for (const r of rewardTokens[poolId]) {
                _setContracts(r.token, ERC20Abi);
                if ('claimable_reward(address,address)' in gaugeContract) {
                    rewardInfoCalls.push(gaugeMulticallContract.claimable_reward(address, r.token));
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
            if (pool.gauge.address === curve.constants.ZERO_ADDRESS) continue;

            const gaugeContract = curve.contracts[pool.gauge.address].contract;

            if (hasCrvReward[i]) {
                const token = curve.constants.ALIASES.crv;
                const symbol = 'CRV';
                const decimals = 18;
                const _amount = rawRewardInfo.shift() as bigint;
                const amount = curve.formatUnits(_amount, decimals);

                if (Number(amount) > 0) _userClaimableCache[address][poolId].rewards.push({ token, symbol, amount });
            }

            for (const r of rewardTokens[poolId]) {
                let _amount = rawRewardInfo.shift() as bigint;
                if ('claimable_reward(address)' in gaugeContract) {
                    const _claimedAmount = rawRewardInfo.shift() as bigint;
                    _amount = _amount - _claimedAmount;
                }
                const amount = curve.formatUnits(_amount, r.decimals);

                if (Number(amount) > 0) _userClaimableCache[address][poolId].rewards.push({ token: r.token, symbol: r.symbol, amount });
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
    const pools = curve.getPoolList();
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

export const getUserPoolList = async (address = curve.signerAddress, useApi = true): Promise<string[]> => {
    const pools = curve.getPoolList();
    const [_lpBalances, _claimable] = await Promise.all([
        _getUserLpBalances(pools, address, false),
        useApi ? _getUserClaimableUseApi(pools, address, false) : _getUserClaimable(pools, address, false),
    ]);

    const userPoolList: string[] = []
    for (let i = 0; i < pools.length; i++) {
        if (_lpBalances[i] > 0 || _claimable[i].length > 0) {
            userPoolList.push(pools[i]);
        }
    }

    return userPoolList
}

export const _getAmplificationCoefficientsFromApi = async (): Promise<IDict<number>> => {
    const network = curve.constants.NETWORK_NAME;
    const allTypesExtendedPoolData = await _getAllPoolsFromApi(network);
    const amplificationCoefficientDict: IDict<number> = {};

    for (const extendedPoolData of allTypesExtendedPoolData) {
        for (const pool of extendedPoolData.poolData) {
            amplificationCoefficientDict[pool.address.toLowerCase()] = Number(pool.amplificationCoefficient);
        }
    }

    return amplificationCoefficientDict
}
