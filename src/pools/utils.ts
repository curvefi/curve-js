import {getPool} from "./poolConstructor.js";
import {IDict} from "../interfaces";
import {type Curve} from "../curve.js";
import {_getRewardsFromApi, _getUsdRate, _setContracts, toBN} from "../utils.js";
import {_getAllPoolsFromApi} from "../cached.js";
import ERC20Abi from "../constants/abis/ERC20.json" with {type: "json"};

const BATCH_SIZE = 50;

async function batchedMulticall(this: Curve, calls: any[]): Promise<bigint[] | string[]> {
    const results: bigint[] = [];

    for (let i = 0; i < calls.length; i += BATCH_SIZE) {
        const batch = calls.slice(i, i + BATCH_SIZE);
        const res: bigint[] = await this.multicallProvider.all(batch);
        results.push(...res);
    }

    return results;
}

// _userLpBalance: { address: { poolId: { _lpBalance: 0, time: 0 } } }
const _userLpBalanceCache: IDict<IDict<{ _lpBalance: bigint, time: number }>> = {};
const _isUserLpBalanceCacheExpired = (address: string, poolId: string) => (_userLpBalanceCache[address]?.[poolId]?.time || 0) + 600000 < Date.now();

async function _getUserLpBalances(this: Curve, pools: string[], address: string, useCache: boolean): Promise<bigint[]> {
    const poolsToFetch: string[] = useCache ? pools.filter((poolId) => _isUserLpBalanceCacheExpired(address as string, poolId)) : pools;
    if (poolsToFetch.length > 0) {
        const calls = [];
        for (const poolId of poolsToFetch) {
            const pool = getPool.call(this, poolId);
            calls.push(this.contracts[pool.lpToken].multicallContract.balanceOf(address));
            if (pool.gauge.address && pool.gauge.address !== this.constants.ZERO_ADDRESS) {
                calls.push(this.contracts[pool.gauge.address].multicallContract.balanceOf(address));
            }
        }
        const _rawBalances: bigint[] = (await batchedMulticall.call(this, calls as any[]) as bigint[]);
        for (const poolId of poolsToFetch) {
            const pool = getPool.call(this, poolId);
            let _balance = _rawBalances.shift() as bigint;
            if (pool.gauge.address && pool.gauge.address !== this.constants.ZERO_ADDRESS) _balance = _balance + (_rawBalances.shift() as bigint);

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

export async function getUserPoolListByLiquidity(this: Curve, address = this.signerAddress): Promise<string[]> {
    const pools = this.getPoolList();
    const _lpBalances = await _getUserLpBalances.call(this, pools, address, false);

    const userPoolList: string[] = []
    for (let i = 0; i < pools.length; i++) {
        if (_lpBalances[i] > 0) {
            userPoolList.push(pools[i]);
        }
    }

    return userPoolList
}

export async function getUserLiquidityUSD(this: Curve, pools: string[], address = this.signerAddress): Promise<string[]> {
    const _lpBalances = await _getUserLpBalances.call(this, pools, address, true);

    const userLiquidityUSD: string[] = []
    for (let i = 0; i < pools.length; i++) {
        const pool = getPool.call(this, pools[i]);
        const price = await _getUsdRate.call(this, pool.lpToken);
        userLiquidityUSD.push(toBN(_lpBalances[i]).times(price).toFixed(8));
    }

    return userLiquidityUSD
}

// _userClaimable: { address: { poolId: { rewards: [ { token: '0x111...', 'symbol': 'TST', '', 'amount': 0 } ], time: 0 } }
const _userClaimableCache: IDict<IDict<{ rewards: { token: string, symbol: string, amount: string }[], time: number }>> = {};
const _isUserClaimableCacheExpired = (address: string, poolId: string) => (_userClaimableCache[address]?.[poolId]?.time || 0) + 600000 < Date.now();

async function _getUserClaimable(this: Curve, pools: string[], address: string, useCache: boolean):
    Promise<{ token: string, symbol: string, amount: string }[][]> {
    const poolsToFetch: string[] = useCache ? pools.filter((poolId) => _isUserClaimableCacheExpired(address as string, poolId)) : pools;

    if (poolsToFetch.length > 0) {

        // --- 1. CRV ---
        const hasCrvReward: boolean[] = [];
        for (const poolId of poolsToFetch) {
            const pool = getPool.call(this, poolId);
            if (this.chainId === 324 || this.chainId === 2222 || pool.gauge.address === this.constants.ZERO_ADDRESS) { // TODO remove this for ZkSync and Kava
                hasCrvReward.push(false);
                continue;

            }
            const gaugeContract = this.contracts[pool.gauge.address].contract;
            hasCrvReward.push('inflation_rate()' in gaugeContract || 'inflation_rate(uint256)' in gaugeContract);
        }

        // --- 2. The number of reward tokens ---

        const rewardCount: number[] = [];
        for (const poolId of poolsToFetch) {
            const pool = getPool.call(this, poolId);
            if (pool.gauge.address === this.constants.ZERO_ADDRESS) {
                rewardCount.push(0);
                continue;
            }

            const gaugeContract = this.contracts[pool.gauge.address].contract;
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
            const pool = getPool.call(this, poolsToFetch[i]);
            if (rewardCount[i] !== -1) { // no_gauge, gauge, gauge_v2, gauge_v3, gauge_v4, gauge_v5, gauge_factory, gauge_rewards_only, gauge_child
                for (let count = 0; count < rewardCount[i]; count++) {
                    const gaugeContract = this.contracts[pool.gauge.address].multicallContract;
                    rewardTokenCalls.push(gaugeContract.reward_tokens(count));
                }
            } else { // gauge_synthetix
                rewardCount[i] = 1;
                const rewardContract = this.contracts[pool.sRewardContract as string].contract;
                const rewardMulticallContract = this.contracts[pool.sRewardContract as string].multicallContract;
                const method = "snx()" in rewardContract ? "snx" : "rewardsToken" // susd, tbtc : dusd, musd, rsv, sbtc
                rewardTokenCalls.push(rewardMulticallContract[method]());
            }
        }

        const rawRewardTokens: string[] = (await batchedMulticall.call(this, rewardTokenCalls) as string[]).map((t) => t.toLowerCase());
        const rewardTokens: IDict<string[]> = {};
        for (let i = 0; i < poolsToFetch.length; i++) {
            rewardTokens[poolsToFetch[i]] = [];
            for (let j = 0; j < rewardCount[i]; j++) {
                const rewardAddress = rawRewardTokens.shift();
                if (rewardAddress === this.constants.ZERO_ADDRESS) continue;
                if (this.chainId !== 1 && rewardAddress === this.constants.COINS.crv) continue;
                // REYIELD shitcoin which breaks things, because symbol() throws an error
                if (rewardAddress === "0xf228ec3476318aCB4E719D2b290bb2ef8B34DFfA".toLowerCase()) continue;
                rewardTokens[poolsToFetch[i]].push(rewardAddress as string);
            }
        }

        // --- 4. Reward info ---

        const rewardInfoCalls = [];
        for (let i = 0; i < poolsToFetch.length; i++) {
            const poolId = poolsToFetch[i];
            const pool = getPool.call(this, poolId);
            if (pool.gauge.address === this.constants.ZERO_ADDRESS) continue;

            const gaugeContract = this.contracts[pool.gauge.address].contract;
            const gaugeMulticallContract = this.contracts[pool.gauge.address].multicallContract;

            if (hasCrvReward[i]) {
                rewardInfoCalls.push(gaugeMulticallContract.claimable_tokens(address));
            }

            for (const token of rewardTokens[poolId]) {
                // Don't reset ABI if its already set, we might override an LP token ABI
                const { multicallContract } = this.contracts[token] || _setContracts.call(this, token, ERC20Abi)
                rewardInfoCalls.push(multicallContract.symbol(), multicallContract.decimals());

                if ('claimable_reward(address,address)' in gaugeContract) {
                    rewardInfoCalls.push(gaugeMulticallContract.claimable_reward(address, token));
                } else if ('claimable_reward(address)' in gaugeContract) { // Synthetix Gauge
                    rewardInfoCalls.push(gaugeMulticallContract.claimable_reward(address), gaugeMulticallContract.claimed_rewards_for(address));
                }
            }
        }

        const rawRewardInfo = await batchedMulticall.call(this, rewardInfoCalls);
        for (let i = 0; i < poolsToFetch.length; i++) {
            const poolId = poolsToFetch[i];
            const pool = getPool.call(this, poolId);

            if (!_userClaimableCache[address]) _userClaimableCache[address] = {};
            _userClaimableCache[address][poolId] = { rewards: [], time: Date.now() };
            if (pool.gauge.address === this.constants.ZERO_ADDRESS) continue;

            const gaugeContract = this.contracts[pool.gauge.address].contract;

            if (hasCrvReward[i]) {
                const token = this.constants.ALIASES.crv;
                const symbol = 'CRV';
                const decimals = 18;
                const _amount = rawRewardInfo.shift() as bigint;
                const amount = this.formatUnits(_amount, decimals);

                if (Number(amount) > 0) _userClaimableCache[address][poolId].rewards.push({ token, symbol, amount });
            }

            for (const token of rewardTokens[poolId]) {
                const symbol = rawRewardInfo.shift() as string;
                const decimals = Number(rawRewardInfo.shift()) as number;
                let _amount = rawRewardInfo.shift() as bigint;
                if ('claimable_reward(address)' in gaugeContract) {
                    const _claimedAmount = rawRewardInfo.shift() as bigint;
                    _amount = _amount - _claimedAmount;
                }
                const amount = this.formatUnits(_amount, decimals);

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

async function _getUserClaimableUseApi(this: Curve, pools: string[], address: string, useCache: boolean):
    Promise<{ token: string, symbol: string, amount: string }[][]> {
    const poolsToFetch: string[] = useCache ? pools.filter((poolId) => _isUserClaimableCacheExpired(address as string, poolId)) : pools;

    if (poolsToFetch.length > 0) {

        // --- 1. CRV ---

        const hasCrvReward: boolean[] = [];
        for (const poolId of poolsToFetch) {
            const pool = getPool.call(this, poolId);
            if (this.chainId === 324 || this.chainId === 2222 || pool.gauge.address === this.constants.ZERO_ADDRESS) { // TODO remove this for ZkSync and Kava
                hasCrvReward.push(false);
                continue;

            }
            const gaugeContract = this.contracts[pool.gauge.address].contract;
            hasCrvReward.push('inflation_rate()' in gaugeContract || 'inflation_rate(uint256)' in gaugeContract);
        }

        // --- 2. Reward tokens ---

        const rewardTokens: IDict<{ token: string, symbol: string, decimals: number }[]> = {};
        for (let i = 0; i < poolsToFetch.length; i++) {
            const pool = getPool.call(this, poolsToFetch[i]);
            const rewards = await _getRewardsFromApi.call(this);
            rewardTokens[poolsToFetch[i]] = (rewards[pool.gauge.address] ?? [])
                .map((r) => ({ token: r.tokenAddress, symbol: r.symbol, decimals: Number(r.decimals)}));
        }

        // --- 3. Reward info ---

        const rewardInfoCalls = [];
        for (let i = 0; i < poolsToFetch.length; i++) {
            const poolId = poolsToFetch[i];
            const pool = getPool.call(this, poolId);
            if (pool.gauge.address === this.constants.ZERO_ADDRESS) continue;

            const gaugeContract = this.contracts[pool.gauge.address].contract;
            const gaugeMulticallContract = this.contracts[pool.gauge.address].multicallContract;

            if (hasCrvReward[i]) {
                rewardInfoCalls.push(gaugeMulticallContract.claimable_tokens(address));
            }

            for (const r of rewardTokens[poolId]) {
                // Don't reset ABI if its already set, we might override an LP token ABI
                if (!this.contracts[r.token]) {
                    _setContracts.call(this, r.token, ERC20Abi)
                }

                if ('claimable_reward(address,address)' in gaugeContract) {
                    rewardInfoCalls.push(gaugeMulticallContract.claimable_reward(address, r.token));
                } else if ('claimable_reward(address)' in gaugeContract) { // Synthetix Gauge
                    rewardInfoCalls.push(gaugeMulticallContract.claimable_reward(address), gaugeMulticallContract.claimed_rewards_for(address));
                }
            }
        }

        const rawRewardInfo = await batchedMulticall.call(this, rewardInfoCalls);
        for (let i = 0; i < poolsToFetch.length; i++) {
            const poolId = poolsToFetch[i];
            const pool = getPool.call(this, poolId);

            if (!_userClaimableCache[address]) _userClaimableCache[address] = {};
            _userClaimableCache[address][poolId] = { rewards: [], time: Date.now() };
            if (pool.gauge.address === this.constants.ZERO_ADDRESS) continue;

            const gaugeContract = this.contracts[pool.gauge.address].contract;

            if (hasCrvReward[i]) {
                const token = this.constants.ALIASES.crv;
                const symbol = 'CRV';
                const decimals = 18;
                const _amount = rawRewardInfo.shift() as bigint;
                const amount = this.formatUnits(_amount, decimals);

                if (Number(amount) > 0) _userClaimableCache[address][poolId].rewards.push({ token, symbol, amount });
            }

            for (const r of rewardTokens[poolId]) {
                let _amount = rawRewardInfo.shift() as bigint;
                if ('claimable_reward(address)' in gaugeContract) {
                    const _claimedAmount = rawRewardInfo.shift() as bigint;
                    _amount = _amount - _claimedAmount;
                }
                const amount = this.formatUnits(_amount, r.decimals);

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

export async function getUserPoolListByClaimable(this: Curve, address = this.signerAddress): Promise<string[]> {
    const pools = this.getPoolList();
    const _claimable = await _getUserClaimable.call(this, pools, address, false);

    const userPoolList: string[] = []
    for (let i = 0; i < pools.length; i++) {
        if (_claimable[i].length > 0) {
            userPoolList.push(pools[i]);
        }
    }

    return userPoolList
}

export async function getUserClaimable(this: Curve, pools: string[], address = this.signerAddress):
    Promise<{ token: string, symbol: string, amount: string, price: number }[][]> {
    const _claimable = await _getUserClaimable.call(this, pools, address, true);

    const claimableWithPrice: { token: string, symbol: string, amount: string, price: number }[][] = []
    for (let i = 0; i < pools.length; i++) {
        claimableWithPrice.push([]);
        for (const c of _claimable[i]) {
            const price = await _getUsdRate.call(this, c.token);
            claimableWithPrice[claimableWithPrice.length - 1].push({ ...c, price })
        }
    }

    return claimableWithPrice
}

export async function getUserPoolList(this: Curve, address = this.signerAddress, useApi = true): Promise<string[]> {
    const pools = this.getPoolList();
    const [_lpBalances, _claimable] = await Promise.all([
        _getUserLpBalances.call(this, pools, address, false),
        useApi ? _getUserClaimableUseApi.call(this, pools, address, false) : _getUserClaimable.call(this, pools, address, false),
    ]);

    const userPoolList: string[] = []
    for (let i = 0; i < pools.length; i++) {
        if (_lpBalances[i] > 0 || _claimable[i].length > 0) {
            userPoolList.push(pools[i]);
        }
    }

    return userPoolList
}

export async function _getAmplificationCoefficientsFromApi(this: Curve): Promise<IDict<number>> {
    const network = this.constants.NETWORK_NAME;
    const allTypesExtendedPoolData = await _getAllPoolsFromApi(network, this.isLiteChain);
    const amplificationCoefficientDict: IDict<number> = {};

    for (const extendedPoolData of allTypesExtendedPoolData) {
        for (const pool of extendedPoolData.poolData) {
            amplificationCoefficientDict[pool.address.toLowerCase()] = Number(pool.amplificationCoefficient);
        }
    }

    return amplificationCoefficientDict
}


export const checkVyperVulnerability = (
    chainId: number,
    poolId: string,
    implementation: string | null
): boolean => {
    if (chainId === 1 && poolId === "crveth") return true;
    if (chainId === 42161 && poolId === "tricrypto") return true;

    const vulnerableImplementations: { [chainId: number]: string[] } = {
        1: [ // Ethereum
            "0x6326DEbBAa15bCFE603d831e7D75f4fc10d9B43E",
            "0x8c1aB78601c259E1B43F19816923609dC7d7de9B",
            "0x88855cdF2b0A8413D470B86952E726684de915be",
        ].map((a) => a.toLowerCase()),
        137: [ // Polygon
            "0xAe00f57663F4C85FC948B13963cd4627dAF01061",
            "0xA9134FaE98F92217f457918505375Ae91fdc5e3c",
            "0xf31bcdf0B9a5eCD7AB463eB905551fBc32e51856",
        ].map((a) => a.toLowerCase()),
        250: [ // Fantom
            "0xE6358f6a45B502477e83CC1CDa759f540E4459ee",
            "0x5d58Eb45e97B43e471AF05cD2b11CeB4106E1b1a",
            "0xb11Dc44A9f981fAF1669dca6DD40c3cc2554A2ce",
        ].map((a) => a.toLowerCase()),
        42161: [ // Arbitrum
            "0x7DA64233Fefb352f8F501B357c018158ED8aA455",
            "0xAAe75FAebCae43b9d541Fd875622BE48D9B4f5D0",
            "0x89287c32c2CAC1C76227F6d300B2DBbab6b75C08",
        ].map((a) => a.toLowerCase()),
        43114: [ // Avalanche
            "0x64448B78561690B70E17CBE8029a3e5c1bB7136e",
            "0xF1f85a74AD6c64315F85af52d3d46bF715236ADc",
            "0x0eb0F1FaF5F509Ac53fA224477509EAD167cf410",
        ].map((a) => a.toLowerCase()),
    };

    const implementations = vulnerableImplementations[chainId] ?? [];
    return implementations.includes(implementation?.toLowerCase() ?? "");
}