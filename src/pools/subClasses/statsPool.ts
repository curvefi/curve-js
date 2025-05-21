import {IPoolType, IReward} from '../../interfaces.js';
import {_getPoolsFromApi,_getCrvApyFromApi} from '../../cached.js';
import {
    _getUsdRate,
    BN,
    toBN,
    _getRewardsFromApi,
    getVolumeApiController,
} from '../../utils.js';
import {PoolTemplate} from "../PoolTemplate.js";
import memoize from "memoizee";

export interface IStatsParameters {
    lpTokenSupply: string,
    virtualPrice: string,
    fee: string, // %
    adminFee: string, // %
    A: string,
    future_A?: string,
    initial_A?: string,
    future_A_time?: number,
    initial_A_time?: number,
    gamma?: string,
    priceOracle?: string[],
    priceScale?: string[],
}

export interface IStatsPool {
    pool: PoolTemplate;
    parameters(): Promise<IStatsParameters>;
    underlyingBalances(): Promise<string[]>;
    wrappedBalances(): Promise<string[]>;
    totalLiquidity(useApi?: boolean): Promise<string>;
    volume(): Promise<string>;
    baseApy(): Promise<{ day: string; week: string }>;
    tokenApy(useApi?: boolean): Promise<[number, number]>;
    rewardsApy(useApi?: boolean): Promise<IReward[]>;
}

export class StatsPool implements IStatsPool {
    pool: PoolTemplate;

    constructor(pool: PoolTemplate) {
        this.pool = pool;
    }

    public parameters = async (): Promise<IStatsParameters> => {
        const curve = this.pool.curve;
        const multicallContract = curve.contracts[this.pool.address].multicallContract;
        const lpMulticallContract = curve.contracts[this.pool.lpToken].multicallContract;

        const calls = [
            multicallContract.get_virtual_price(),
            multicallContract.fee(),
            "admin_fee" in multicallContract ? multicallContract.admin_fee() : multicallContract.ADMIN_FEE(),
            multicallContract.A(),
            lpMulticallContract.totalSupply(),
        ]
        if (this.pool.isCrypto) {
            calls.push(multicallContract.gamma());

            if (this.pool.wrappedCoins.length === 2) {
                calls.push(multicallContract.price_oracle());
                calls.push(multicallContract.price_scale());
            } else {
                for (let i = 0; i < this.pool.wrappedCoins.length - 1; i++) {
                    calls.push(multicallContract.price_oracle(i));
                    calls.push(multicallContract.price_scale(i));
                }
            }
        }

        const additionalCalls = this.pool.isCrypto ? [] : [multicallContract.future_A()];
        if ('initial_A' in multicallContract) {
            additionalCalls.push(
                multicallContract.initial_A(),
                multicallContract.future_A_time(),
                multicallContract.initial_A_time()
            );
        }

        let _virtualPrice = curve.parseUnits("0");
        let _fee = curve.parseUnits("0");
        let _prices, _adminFee, _A, _lpTokenSupply, _gamma;
        try {
            [_virtualPrice, _fee, _adminFee, _A, _lpTokenSupply, _gamma, ..._prices] = await curve.multicallProvider.all(calls) as bigint[];
        } catch { // Empty pool
            calls.shift();
            if (this.pool.isCrypto) {
                calls.shift();
                [_adminFee, _A, _lpTokenSupply, _gamma, ..._prices] = await curve.multicallProvider.all(calls) as bigint[];
            } else {
                [_fee, _adminFee, _A, _lpTokenSupply, _gamma, ..._prices] = await curve.multicallProvider.all(calls) as bigint[];
            }
        }

        const [virtualPrice, fee, adminFee, A, lpTokenSupply, gamma] = [
            curve.formatUnits(_virtualPrice),
            curve.formatUnits(_fee, 8),
            curve.formatUnits(_adminFee * _fee),
            curve.formatUnits(_A, 0),
            curve.formatUnits(_lpTokenSupply),
            _gamma ? curve.formatUnits(_gamma) : undefined,
        ]

        let priceOracle, priceScale;
        if (this.pool.isCrypto) {
            const prices = _prices.map((_p) => curve.formatUnits(_p));
            priceOracle = [];
            priceScale = [];
            for (let i = 0; i < this.pool.wrappedCoins.length - 1; i++) {
                priceOracle.push(prices.shift() as string);
                priceScale.push(prices.shift() as string);
            }
        }

        const A_PRECISION = curve.chainId === 1 && ['compound', 'usdt', 'y', 'busd', 'susd', 'pax', 'ren', 'sbtc', 'hbtc', '3pool'].includes(this.pool.id) ? 1 : 100;
        const [_future_A, _initial_A, _future_A_time, _initial_A_time] = await curve.multicallProvider.all(additionalCalls) as bigint[]
        const [future_A, initial_A, future_A_time, initial_A_time] = [
            _future_A ? String(Number(curve.formatUnits(_future_A, 0)) / A_PRECISION) : undefined,
            _initial_A ? String(Number(curve.formatUnits(_initial_A, 0)) / A_PRECISION) : undefined,
            _future_A_time ? Number(curve.formatUnits(_future_A_time, 0)) * 1000 : undefined,
            _initial_A_time ? Number(curve.formatUnits(_initial_A_time, 0)) * 1000 : undefined,
        ]

        return { lpTokenSupply, virtualPrice, fee, adminFee, A, future_A, initial_A, future_A_time, initial_A_time, gamma, priceOracle, priceScale };
    }

    public async wrappedBalances(): Promise<string[]> {
        const curve = this.pool.curve;
        const contract = curve.contracts[this.pool.address].multicallContract;
        const calls = [];
        for (let i = 0; i < this.pool.wrappedCoins.length; i++) calls.push(contract.balances(i));
        const _wrappedBalances: bigint[] = await curve.multicallProvider.all(calls);

        return _wrappedBalances.map((_b, i) => curve.formatUnits(_b, this.pool.wrappedDecimals[i]));
    }

    public async underlyingBalances(): Promise<string[]> {
        return await this.wrappedBalances();
    }

    public totalLiquidity = async (useApi = true): Promise<string> => {
        const curve = this.pool.curve;
        if (curve.chainId === 1 && this.pool.id === "crveth") return "0"

        if (this.pool.isLlamma) {
            const stablecoinContract = curve.contracts[this.pool.underlyingCoinAddresses[0]].multicallContract;
            const collateralContract = curve.contracts[this.pool.underlyingCoinAddresses[1]].multicallContract;
            const ammContract = curve.contracts[this.pool.address].multicallContract;

            const [_balance_x, _fee_x, _balance_y, _fee_y]: bigint[] = await curve.multicallProvider.all([
                stablecoinContract.balanceOf(this.pool.address),
                ammContract.admin_fees_x(),
                collateralContract.balanceOf(this.pool.address),
                ammContract.admin_fees_y(),
            ]);
            const collateralRate = await _getUsdRate.call(curve, this.pool.underlyingCoinAddresses[1]);

            const stablecoinTvlBN = toBN(_balance_x).minus(toBN(_fee_x));
            const collateralTvlBN = toBN(_balance_y).minus(toBN(_fee_y)).times(collateralRate);

            return stablecoinTvlBN.plus(collateralTvlBN).toString()
        }

        if (useApi) {
            const network = curve.constants.NETWORK_NAME;
            let poolType = this.pool.isCrypto ? "crypto" : "main";
            if (this.pool.id.startsWith("factory")) {
                poolType = this.pool.id.replace(/-\d+$/, '');
                poolType = poolType.replace(/-v2$/, '');
            }
            const poolsData = (await _getPoolsFromApi(network, poolType as IPoolType)).poolData;

            try {
                const totalLiquidity = poolsData.filter((data) => data.address.toLowerCase() === this.pool.address.toLowerCase())[0].usdTotal;
                return String(totalLiquidity);
            } catch (err) {
                console.log(this.pool.id, (err as Error).message);
            }
        }

        const balances = await this.underlyingBalances();
        const promises = [];
        for (const addr of this.pool.underlyingCoinAddresses) {
            promises.push(_getUsdRate.call(curve, addr))
        }
        const prices = await Promise.all(promises);
        const totalLiquidity = (balances as string[]).reduce(
            (liquidity: number, b: string, i: number) => liquidity + (Number(b) * (prices[i] as number)), 0);

        return totalLiquidity.toFixed(8)
    }

    totalLiquidityMemoized = memoize(this.totalLiquidity.bind(this), {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
    });

    public volume = async (): Promise<string> => {
        const curve = this.pool.curve;
        if(curve.isLiteChain && curve.chainId !== 146) {
            throw Error('This method is not supported for the lite version')
        }


        const network = curve.constants.NETWORK_NAME;
        const {poolsData} = await getVolumeApiController.call(curve, network);
        const poolData = poolsData.find((d) => d.address.toLowerCase() === this.pool.address);

        if(poolData) {
            return poolData.volumeUSD.toString()
        }

        throw Error(`Can't get Volume for ${this.pool.name} (id: ${this.pool.id})`)
    }

    public baseApy = async (): Promise<{ day: string, week: string }> => {
        const curve = this.pool.curve;
        if(curve.isLiteChain && curve.chainId !== 146) {
            throw Error('baseApy is not supported for the lite version')
        }

        const network = curve.constants.NETWORK_NAME;
        const {poolsData} = await getVolumeApiController.call(curve, network);
        const poolData = poolsData.find((d) => d.address.toLowerCase() === this.pool.address);

        if(poolData) {
            return {
                day: poolData.day.toString(),
                week: poolData.week.toString(),
            }
        }
        throw Error(`Can't get base APY for ${this.pool.name} (id: ${this.pool.id})`)
    }

    public tokenApy = async (useApi = true): Promise<[baseApy: number, boostedApy: number]> => {
        const curve = this.pool.curve;
        if(curve.isLiteChain && curve.chainId !== 146) {
            throw Error('tokenApy is not supported for the lite version')
        }

        if (this.pool.rewardsOnly()) throw Error(`${this.pool.name} has Rewards-Only Gauge. Use stats.rewardsApy instead`);

        const isDisabledChain = [1313161554].includes(curve.chainId); // Disable Aurora
        if (useApi && !isDisabledChain) {
            const crvAPYs = await _getCrvApyFromApi.call(curve);
            const poolCrvApy = crvAPYs[this.pool.gauge.address] ?? [0, 0];  // new pools might be missing
            return [poolCrvApy[0], poolCrvApy[1]];
        }

        return await this.pool._calcTokenApy();
    }

    public rewardsApy = async (useApi = true): Promise<IReward[]> => {
        const curve = this.pool.curve;
        if (this.pool.gauge.address === curve.constants.ZERO_ADDRESS) return [];

        const isDisabledChain = [1313161554].includes(curve.chainId); // Disable Aurora
        if (useApi && !isDisabledChain) {
            const rewards = await _getRewardsFromApi.call(curve);
            if (!rewards[this.pool.gauge.address]) return [];
            return rewards[this.pool.gauge.address].map((r) => ({ gaugeAddress: r.gaugeAddress, tokenAddress: r.tokenAddress, symbol: r.symbol, apy: r.apy }));
        }

        const apy: IReward[] = [];
        const rewardTokens = await this.pool.rewardTokens(false);
        for (const rewardToken of rewardTokens) {
            const gaugeContract = curve.contracts[this.pool.gauge.address].multicallContract;
            const lpTokenContract = curve.contracts[this.pool.lpToken].multicallContract;
            const rewardContract = curve.contracts[this.pool.sRewardContract || this.pool.gauge.address].multicallContract;

            const totalLiquidityUSD = await this.totalLiquidity();
            const rewardRate = await _getUsdRate.call(curve, rewardToken.token);

            const [rewardData, _stakedSupply, _totalSupply] = (await curve.multicallProvider.all([
                rewardContract.reward_data(rewardToken.token),
                gaugeContract.totalSupply(),
                lpTokenContract.totalSupply(),
            ]) as any[]);
            const stakedSupplyBN = toBN(_stakedSupply as bigint);
            const totalSupplyBN = toBN(_totalSupply as bigint);
            const inflationBN = toBN(rewardData.rate, rewardToken.decimals);
            const periodFinish = Number(curve.formatUnits(rewardData.period_finish, 0)) * 1000;
            const baseApy = periodFinish > Date.now() ?
                inflationBN.times(31536000).times(rewardRate).div(stakedSupplyBN).times(totalSupplyBN).div(Number(totalLiquidityUSD)) :
                BN(0);

            apy.push({
                gaugeAddress: this.pool.gauge.address,
                tokenAddress: rewardToken.token,
                symbol: rewardToken.symbol,
                apy: baseApy.times(100).toNumber(),
            });
        }

        return apy
    }
}
