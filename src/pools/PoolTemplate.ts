import BigNumber from 'bignumber.js';
import memoize from "memoizee";
import {_getAllGaugesFormatted} from '../external-api.js';
import {
    _cutZeros,
    _ensureAllowance,
    _get_price_impact,
    _get_small_x,
    _getAddress,
    _getCoinAddresses,
    _getRewardsFromApi,
    _getUsdRate,
    _setContracts,
    BN,
    checkNumber,
    DIGas,
    ensureAllowance,
    ensureAllowanceEstimateGas,
    findAbiFunction,
    fromBN,
    hasAllowance,
    mulBy1_3,
    parseUnits,
    PERIODS,
    smartNumber,
    toBN,
    toStringFromBN,
} from '../utils.js';
import {IDict, IProfit, ISwapMethodInfo} from '../interfaces';
import {Curve, OLD_CHAINS} from "../curve.js";
import ERC20Abi from '../constants/abis/ERC20.json' with {type: 'json'};
import {CorePool} from "./subClasses/corePool.js";
import {StatsPool} from "./subClasses/statsPool.js";
import {WalletPool} from "./subClasses/walletPool.js";
import {checkVyperVulnerability} from "./utils.js";


export class PoolTemplate extends CorePool {
    isGaugeKilled: () => Promise<boolean>;
    gaugeStatus: () => Promise<any>;
    estimateGas: {
        depositApprove: (amounts: (number | string)[]) => Promise<number | number[]>,
        deposit: (amounts: (number | string)[]) => Promise<number | number[]>,
        depositWrappedApprove: (amounts: (number | string)[]) => Promise<number | number[]>,
        depositWrapped: (amounts: (number | string)[]) => Promise<number | number[]>,
        stakeApprove: (lpTokenAmount: number | string) => Promise<number | number[]>,
        stake: (lpTokenAmount: number | string) => Promise<number | number[]>,
        unstake: (lpTokenAmount: number | string) => Promise<number | number[]>,
        claimCrv: () => Promise<number | number[]>,
        claimRewards: () => Promise<number | number[]>,
        depositAndStakeApprove: (amounts: (number | string)[]) => Promise<number | number[]>,
        depositAndStake: (amounts: (number | string)[]) => Promise<number>,
        depositAndStakeWrappedApprove: (amounts: (number | string)[]) => Promise<number | number[]>,
        depositAndStakeWrapped: (amounts: (number | string)[]) => Promise<number | number[]>,
        withdrawApprove: (lpTokenAmount: number | string) => Promise<number | number[]>,
        withdraw: (lpTokenAmount: number | string) => Promise<number | number[]>,
        withdrawWrapped: (lpTokenAmount: number | string) => Promise<number | number[]>,
        withdrawImbalanceApprove: (amounts: (number | string)[]) => Promise<number | number[]>,
        withdrawImbalance: (amounts: (number | string)[]) => Promise<number | number[]>,
        withdrawImbalanceWrapped: (amounts: (number | string)[]) => Promise<number | number[]>,
        withdrawOneCoinApprove: (lpTokenAmount: number | string) => Promise<number | number[]>,
        withdrawOneCoin: (lpTokenAmount: number | string, coin: string | number) => Promise<number | number[]>,
        withdrawOneCoinWrapped: (lpTokenAmount: number | string, coin: string | number) => Promise<number | number[]>,
        swapApprove: (inputCoin: string | number, amount: number | string) => Promise<number | number[]>,
        swap: (inputCoin: string | number, outputCoin: string | number, amount: number | string, slippage: number) => Promise<number | number[]>,
        swapWrappedApprove: (inputCoin: string | number, amount: number | string) => Promise<number | number[]>,
        swapWrapped: (inputCoin: string | number, outputCoin: string | number, amount: number | string, slippage: number) => Promise<number | number[]>,
    };
    abi: {
        swap: () => Promise<ISwapMethodInfo>,
        swapWrapped: () => Promise<ISwapMethodInfo>,
    };
    stats: StatsPool;
    wallet: WalletPool;

    constructor(id: string, curve: Curve, poolData = curve.getPoolsData()[id]) {
        super(id, poolData, curve);

        this.stats = new StatsPool(this);
        this.wallet = new WalletPool(this);
        this.isGaugeKilled = this.getIsGaugeKilled.bind(this);
        this.gaugeStatus = this.getGaugeStatus.bind(this);
        this.estimateGas = {
            depositApprove: this.depositApproveEstimateGas.bind(this),
            deposit: this.depositEstimateGas.bind(this),
            depositWrappedApprove: this.depositWrappedApproveEstimateGas.bind(this),
            depositWrapped: this.depositWrappedEstimateGas.bind(this),
            stakeApprove: this.stakeApproveEstimateGas.bind(this),
            stake: this.stakeEstimateGas.bind(this),
            unstake: this.unstakeEstimateGas.bind(this),
            claimCrv: this.claimCrvEstimateGas.bind(this),
            claimRewards: this.claimRewardsEstimateGas.bind(this),
            depositAndStakeApprove: this.depositAndStakeApproveEstimateGas.bind(this),
            depositAndStake: this.depositAndStakeEstimateGas.bind(this),
            depositAndStakeWrappedApprove: this.depositAndStakeWrappedApproveEstimateGas.bind(this),
            depositAndStakeWrapped: this.depositAndStakeWrappedEstimateGas.bind(this),
            withdrawApprove: this.withdrawApproveEstimateGas.bind(this),
            withdraw: this.withdrawEstimateGas.bind(this),
            withdrawWrapped: this.withdrawWrappedEstimateGas.bind(this),
            withdrawImbalanceApprove: this.withdrawImbalanceApproveEstimateGas.bind(this),
            withdrawImbalance: this.withdrawImbalanceEstimateGas.bind(this),
            withdrawImbalanceWrapped: this.withdrawImbalanceWrappedEstimateGas.bind(this),
            withdrawOneCoinApprove: this.withdrawOneCoinApproveEstimateGas.bind(this),
            withdrawOneCoin: this.withdrawOneCoinEstimateGas.bind(this),
            withdrawOneCoinWrapped: this.withdrawOneCoinWrappedEstimateGas.bind(this),
            swapApprove: this.swapApproveEstimateGas.bind(this),
            swap: this.swapEstimateGas.bind(this),
            swapWrappedApprove: this.swapWrappedApproveEstimateGas.bind(this),
            swapWrapped: this.swapWrappedEstimateGas.bind(this),
        };
        this.abi = {
            swap: this.getSwapInfo.bind(this),
            swapWrapped: this.getSwapWrappedInfo.bind(this),
        };
    }

    public hasVyperVulnerability(): boolean {
        return checkVyperVulnerability(
            this.curve.chainId,
            this.id,
            this.implementation
        );
    }

    public rewardsOnly(): boolean {
        if (this.curve.chainId === 2222 || this.curve.chainId === 324) return true;  // TODO remove this for Kava and ZkSync
        if (this.gauge.address === this.curve.constants.ZERO_ADDRESS) throw Error(`${this.name} doesn't have gauge`);
        return !findAbiFunction(this.curve.contracts[this.gauge.address].abi, 'inflation_rate')
            .find((func) => ['', 'uint256'].includes(func.inputs.map((a) => `${a.type}`).join(',')))
    }

    public _calcTokenApy = async (futureWorkingSupplyBN: BigNumber | null = null): Promise<[baseApy: number, boostedApy: number]> => {
        const totalLiquidityUSD = await this.stats.totalLiquidity();
        if (Number(totalLiquidityUSD) === 0) return [0, 0];

        let inflationRateBN, workingSupplyBN, totalSupplyBN;
        if (this.curve.chainId !== 1) {
            const gaugeContract = this.curve.contracts[this.gauge.address].multicallContract;
            const lpTokenContract = this.curve.contracts[this.lpToken].multicallContract;
            const crvContract = this.curve.contracts[this.curve.constants.ALIASES.crv].contract;

            const currentWeek = Math.floor(Date.now() / 1000 / PERIODS.WEEK);
            [inflationRateBN, workingSupplyBN, totalSupplyBN] = (await this.curve.multicallProvider.all([
                gaugeContract.inflation_rate(currentWeek),
                gaugeContract.working_supply(),
                lpTokenContract.totalSupply(),
            ]) as bigint[]).map((value) => toBN(value));

            if (inflationRateBN.eq(0)) {
                inflationRateBN = toBN(await crvContract.balanceOf(this.gauge.address, this.curve.constantOptions)).div(PERIODS.WEEK);
            }
        } else {
            const gaugeContract = this.curve.contracts[this.gauge.address].multicallContract;
            const lpTokenContract = this.curve.contracts[this.lpToken].multicallContract;
            const gaugeControllerContract = this.curve.contracts[this.curve.constants.ALIASES.gauge_controller].multicallContract;

            let weightBN;
            [inflationRateBN, weightBN, workingSupplyBN, totalSupplyBN] = (await this.curve.multicallProvider.all([
                gaugeContract.inflation_rate(),
                gaugeControllerContract.gauge_relative_weight(this.gauge.address),
                gaugeContract.working_supply(),
                lpTokenContract.totalSupply(),
            ]) as bigint[]).map((value) => toBN(value));

            inflationRateBN = inflationRateBN.times(weightBN);
        }

        if (inflationRateBN.eq(0)) return [0, 0];
        if (futureWorkingSupplyBN !== null) workingSupplyBN = futureWorkingSupplyBN;

        // If you added 1$ value of LP it would be 0.4$ of working LP. So your annual reward per 1$ in USD is:
        // (annual reward per working liquidity in $) * (0.4$ of working LP)
        const rateBN = inflationRateBN.times(31536000).div(workingSupplyBN).times(totalSupplyBN).div(Number(totalLiquidityUSD)).times(0.4);
        const crvPrice = await _getUsdRate.call(this.curve, this.curve.constants.ALIASES.crv);
        const baseApyBN = rateBN.times(crvPrice);
        const boostedApyBN = baseApyBN.times(2.5);

        return [baseApyBN.times(100).toNumber(), boostedApyBN.times(100).toNumber()]
    }

    private async _pureCalcLpTokenAmount(_amounts: bigint[], isDeposit = true, useUnderlying = true): Promise<bigint> {
        const calcContractAddress = this.isMeta && useUnderlying ? this.zap as string : this.address;
        const N_coins = useUnderlying ? this.underlyingCoins.length : this.wrappedCoins.length;
        const contract = this.curve.contracts[calcContractAddress].contract;

        if (this.isMetaFactory && useUnderlying) {
            if (`calc_token_amount(address,uint256[${N_coins}],bool)` in contract) {
                return await contract.calc_token_amount(this.address, _amounts, isDeposit, this.curve.constantOptions);
            }
            return await contract.calc_token_amount(this.address, _amounts, this.curve.constantOptions);
        }

        if (`calc_token_amount(uint256[${N_coins}],bool)` in contract) {
            return await contract.calc_token_amount(_amounts, isDeposit, this.curve.constantOptions);
        }

        return await contract.calc_token_amount(_amounts, this.curve.constantOptions);
    }

    _calcLpTokenAmount = memoize(async (_amounts: bigint[], isDeposit = true, useUnderlying = true): Promise<bigint> => {
        if (this.isCrypto) {
            try {
                return await this._pureCalcLpTokenAmount(_amounts, isDeposit, useUnderlying);
            } catch (e) { // Seeding
                const lpContract = this.curve.contracts[this.lpToken].contract;
                const _lpTotalSupply: bigint = await lpContract.totalSupply(this.curve.constantOptions);
                if (_lpTotalSupply > this.curve.parseUnits("0")) throw e; // Already seeded

                if (this.isMeta && useUnderlying) throw Error("Initial deposit for crypto meta pools must be in wrapped coins");

                const decimals = useUnderlying ? this.underlyingDecimals : this.wrappedDecimals;
                const amounts = _amounts.map((_a, i) => this.curve.formatUnits(_a, decimals[i]));
                const seedAmounts = await this.getSeedAmounts(amounts[0]); // Checks N coins is 2 or 3 and amounts > 0
                amounts.forEach((a, i) => {
                    if (!BN(a).eq(BN(seedAmounts[i]))) throw Error(`Amounts must be = ${seedAmounts}`);
                });

                return parseUnits(Math.pow(amounts.map(Number).reduce((a, b) => a * b), 1 / amounts.length));
            }
        }

        try {
            if (this.isNg) return await this._pureCalcLpTokenAmount(_amounts, isDeposit, useUnderlying);

            if (this.isMeta) {
                const basePool = new PoolTemplate(this.basePool, this.curve);
                return await this.curve.contracts[this.curve.constants.ALIASES.stable_calc].contract.calc_token_amount_meta(
                    this.address,
                    this.lpToken,
                    _amounts.concat(Array(10 - _amounts.length).fill(this.curve.parseUnits("0"))),
                    _amounts.length,
                    basePool.address,
                    basePool.lpToken,
                    isDeposit,
                    useUnderlying
                );
            } else {
                return await this.curve.contracts[this.curve.constants.ALIASES.stable_calc].contract.calc_token_amount(
                    this.address,
                    this.lpToken,
                    _amounts.concat(Array(10 - _amounts.length).fill(this.curve.parseUnits("0"))),
                    _amounts.length,
                    isDeposit,
                    useUnderlying && this.isLending
                );
            }
        } catch (e: any) { // Seeding
            if (!isDeposit) throw e; // Seeding is only for deposit

            const lpContract = this.curve.contracts[this.lpToken].contract;
            const _lpTotalSupply: bigint = await lpContract.totalSupply(this.curve.constantOptions);
            if (_lpTotalSupply > this.curve.parseUnits("0")) throw e; // Already seeded

            const decimals = useUnderlying ? this.underlyingDecimals : this.wrappedDecimals;
            const amounts = _amounts.map((_a, i) => this.curve.formatUnits(_a, decimals[i]));

            const seedAmounts = await this.getSeedAmounts(amounts[0]); // Checks N coins == 2 and amounts > 0
            amounts.forEach((a, i) => {
                if (!BN(a).eq(BN(seedAmounts[i]))) throw Error(`Amounts must be = ${seedAmounts}`);
            });

            const _amounts18Decimals: bigint[] = amounts.map((a) => parseUnits(a));
            return _amounts18Decimals.reduce((_a, _b) => _a + _b);
        }
    },
    {
        primitive: true,
        promise: true,
        maxAge: 30 * 1000, // 30 sec
        length: 3,
    });

    private async calcLpTokenAmount(amounts: (number | string)[], isDeposit = true): Promise<string> {
        if (amounts.length !== this.underlyingCoinAddresses.length) {
            throw Error(`${this.name} pool has ${this.underlyingCoinAddresses.length} coins (amounts provided for ${amounts.length})`);
        }

        const _underlyingAmounts: bigint[] = amounts.map((amount, i) => parseUnits(amount, this.underlyingDecimals[i]));
        const _expected = await this._calcLpTokenAmount(_underlyingAmounts, isDeposit, true);

        return this.curve.formatUnits(_expected);
    }

    private async calcLpTokenAmountWrapped(amounts: (number | string)[], isDeposit = true): Promise<string> {
        if (amounts.length !== this.wrappedCoinAddresses.length) {
            throw Error(`${this.name} pool has ${this.wrappedCoinAddresses.length} coins (amounts provided for ${amounts.length})`);
        }

        if (this.isFake) {
            throw Error(`${this.name} pool doesn't have this method`);
        }

        const _amounts: bigint[] = amounts.map((amount, i) => parseUnits(amount, this.wrappedDecimals[i]));
        const _expected = await this._calcLpTokenAmount(_amounts, isDeposit, false);

        return this.curve.formatUnits(_expected);
    }


    // ---------------- DEPOSIT ----------------

    public async getSeedAmounts(amount1: number | string, useUnderlying = false): Promise<string[]> {
        const amount1BN = BN(amount1);
        if (amount1BN.lte(0)) throw Error("Initial deposit amounts must be > 0");

        if (this.isCrypto) {
            const decimals = this.isMeta ? this.wrappedDecimals : this.underlyingDecimals;

            if (decimals.length === 2) {
                const priceScaleBN = toBN(await this.curve.contracts[this.address].contract.price_scale(this.curve.constantOptions));
                return [_cutZeros(amount1BN.toFixed(decimals[0])), _cutZeros(amount1BN.div(priceScaleBN).toFixed(decimals[1]))];
            } else if (decimals.length === 3) {
                const priceScaleBN = (await this.curve.multicallProvider.all([
                    this.curve.contracts[this.address].multicallContract.price_scale(0),
                    this.curve.contracts[this.address].multicallContract.price_scale(1),
                ]) as bigint[]).map((_p) => toBN(_p));
                return [
                    _cutZeros(amount1BN.toFixed(decimals[0])),
                    _cutZeros(amount1BN.div(priceScaleBN[0]).toFixed(decimals[1])),
                    _cutZeros(amount1BN.div(priceScaleBN[1]).toFixed(decimals[2])),
                ];
            }

            throw Error("getSeedAmounts method doesn't exist for crypto pools with N coins > 3");
        } else {
            const amounts = [_cutZeros(amount1BN.toFixed(this.wrappedDecimals[0]))];

            if (this.isMeta && useUnderlying) {
                const basePool = new PoolTemplate(this.basePool, this.curve);
                const basePoolBalancesBN = (await basePool.stats.underlyingBalances()).map(BN);
                const totalBN = basePoolBalancesBN.reduce((a, b) => a.plus(b));
                for (let i = 1; i < this.underlyingDecimals.length; i++) {
                    amounts.push(amount1BN.times(basePoolBalancesBN[i - 1]).div(totalBN).toFixed(this.underlyingDecimals[i]));
                }

                return amounts.map(_cutZeros)
            }

            const storedRatesBN = await this._storedRatesBN(false);
            for (let i = 1; i < this.wrappedDecimals.length; i++) {
                amounts.push(amount1BN.times(storedRatesBN[0]).div(storedRatesBN[i]).toFixed(this.wrappedDecimals[i]));
            }

            return amounts.map(_cutZeros)
        }
    }

    // OVERRIDE
    public async depositBalancedAmounts(): Promise<string[]> {
        throw Error(`depositBalancedAmounts method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    public async depositExpected(amounts: (number | string)[]): Promise<string> {
        return await this.calcLpTokenAmount(amounts);
    }

    // | balanced[i] / sum(balanced[j]) = balance[i] / sum(balance[j]) |
    // | sum(pj * balanced[j]) = sum(aj * pj)                          |
    //
    // --- Answer ---
    // balanced[i] = sum(aj * pj) / sum(rj * pj / ri)
    //
    // totalValueBN = sum(aj * pj)
    // totalBalanceBN = sum(balance[j])
    // ratiosBN[i] = balancesBN[i] / totalBalanceBN = ri = balance[i] / sum(balance[j])
    // denominatorBN = sum(rj * pj / ri)
    private _balancedAmountsWithSameValue(amountsBN: BigNumber[], pricesBN: BigNumber[], balancesBN: BigNumber[]): string[] {
        const valuesBN = amountsBN.map((aBN, i) => aBN.times(pricesBN[i]));
        const totalValueBN = valuesBN.reduce((v1BN, v2BN) => v1BN.plus(v2BN));
        const totalBalanceBN = balancesBN.reduce((b1BN, b2BN) => b1BN.plus(b2BN));
        const ratiosBN = balancesBN.map((bBN) => bBN.div(totalBalanceBN));
        const balancedAmountsBN: BigNumber[] = [];
        for (let i = 0; i < amountsBN.length; i++) {
            const denominatorBN = ratiosBN.map((rBN, j) => rBN.times(pricesBN[j])
                .div(ratiosBN[i])).reduce((xBN, yBN) => xBN.plus(yBN));
            balancedAmountsBN.push(totalValueBN.div(denominatorBN));
        }

        return balancedAmountsBN.map(String)
    }

    public async depositBonus(amounts: (number | string)[]): Promise<string> {
        const amountsBN = amounts.map(BN);
        let pricesBN: BigNumber[];
        const multicallContract = this.curve.contracts[this.address].multicallContract;
        if(this.isCrypto || this.id === 'wsteth') {
            if(this.curve.isLiteChain) {
                const prices = this.id.includes('twocrypto')
                    ? [
                        1,
                        Number(await this.curve.contracts[this.address].contract.price_oracle()) / (10 ** 18),
                    ]
                    : [
                        1,
                        ...(await this.curve.multicallProvider.all([
                            multicallContract.price_oracle(0),
                            multicallContract.price_oracle(1),
                        ])).map((value) => Number(value) / (10 ** 18)),
                    ]
                pricesBN = prices.map(BN);
            } else {
                pricesBN = (await this._underlyingPrices()).map(BN);
            }
        } else {
            pricesBN = await this._storedRatesBN(true);
        }

        const balancesBN = (await this.stats.underlyingBalances()).map(BN);
        const balancedAmounts = this._balancedAmountsWithSameValue(amountsBN, pricesBN, balancesBN);
        const expectedBN = BN(await this.depositExpected(amounts));
        const balancedExpectedBN = BN(await this.depositExpected(balancedAmounts));

        return expectedBN.minus(balancedExpectedBN).div(balancedExpectedBN).times(100).toString()
    }

    public async depositIsApproved(amounts: (number | string)[]): Promise<boolean> {
        return await hasAllowance.call(this.curve, this.underlyingCoinAddresses, amounts, this.curve.signerAddress, this.zap || this.address);
    }

    private async depositApproveEstimateGas(amounts: (number | string)[]): Promise<number | number[]> {
        return await ensureAllowanceEstimateGas.call(this.curve, this.underlyingCoinAddresses, amounts, this.zap || this.address);
    }

    public async depositApprove(amounts: (number | string)[], isMax = true): Promise<string[]> {
        return await ensureAllowance.call(this.curve, this.underlyingCoinAddresses, amounts, this.zap || this.address, isMax);
    }

    // OVERRIDE
    private async depositEstimateGas(amounts: (number | string)[]): Promise<number | number[]> {
        throw Error(`depositEstimateGas method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    // OVERRIDE
    public async deposit(amounts: (number | string)[], slippage = 0.5): Promise<string> {
        throw Error(`deposit method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    // ---------------- DEPOSIT WRAPPED ----------------

    public async depositWrappedBalancedAmounts(): Promise<string[]> {
        throw Error(`depositWrappedBalancedAmounts method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    public async depositWrappedExpected(amounts: (number | string)[]): Promise<string> {
        if (this.isFake) {
            throw Error(`depositWrappedExpected method doesn't exist for pool ${this.name} (id: ${this.name})`);
        }

        return await this.calcLpTokenAmountWrapped(amounts);
    }

    public async depositWrappedBonus(amounts: (number | string)[]): Promise<string> {
        const amountsBN = amounts.map(BN);
        const pricesBN = (await this._wrappedPrices()).map(BN);
        const balancesBN = (await this.stats.wrappedBalances()).map(BN);
        const balancedAmounts = this._balancedAmountsWithSameValue(amountsBN, pricesBN, balancesBN);

        const expectedBN = BN(await this.depositWrappedExpected(amounts));
        const balancedExpectedBN = BN(await this.depositWrappedExpected(balancedAmounts));

        return String(expectedBN.minus(balancedExpectedBN).div(balancedExpectedBN).times(100))
    }

    public async depositWrappedIsApproved(amounts: (number | string)[]): Promise<boolean> {
        if (this.isFake) {
            throw Error(`depositWrappedIsApproved method doesn't exist for pool ${this.name} (id: ${this.name})`);
        }

        return await hasAllowance.call(this.curve, this.wrappedCoinAddresses, amounts, this.curve.signerAddress, this.address);
    }

    private async depositWrappedApproveEstimateGas(amounts: (number | string)[]): Promise<number | number[]> {
        if (this.isFake) {
            throw Error(`depositWrappedApprove method doesn't exist for pool ${this.name} (id: ${this.name})`);
        }

        return await ensureAllowanceEstimateGas.call(this.curve, this.wrappedCoinAddresses, amounts, this.address);
    }

    public async depositWrappedApprove(amounts: (number | string)[]): Promise<string[]> {
        if (this.isFake) {
            throw Error(`depositWrappedApprove method doesn't exist for pool ${this.name} (id: ${this.name})`);
        }

        return await ensureAllowance.call(this.curve, this.wrappedCoinAddresses, amounts, this.address);
    }

    // OVERRIDE
    private async depositWrappedEstimateGas(amounts: (number | string)[]): Promise<number> {
        throw Error(`depositWrapped method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    // OVERRIDE
    public async depositWrapped(amounts: (number | string)[], slippage = 0.5): Promise<string> {
        throw Error(`depositWrapped method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    // ---------------- STAKING ----------------

    public async stakeIsApproved(lpTokenAmount: number | string): Promise<boolean> {
        if (this.gauge.address === this.curve.constants.ZERO_ADDRESS) {
            throw Error(`stakeIsApproved method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        return await hasAllowance.call(this.curve, [this.lpToken], [lpTokenAmount], this.curve.signerAddress, this.gauge.address);
    }

    private async stakeApproveEstimateGas(lpTokenAmount: number | string): Promise<number | number[]> {
        if (this.gauge.address === this.curve.constants.ZERO_ADDRESS) {
            throw Error(`stakeApproveEstimateGas method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        return await ensureAllowanceEstimateGas.call(this.curve, [this.lpToken], [lpTokenAmount], this.gauge.address);
    }

    public async stakeApprove(lpTokenAmount: number | string): Promise<string[]> {
        if (this.gauge.address === this.curve.constants.ZERO_ADDRESS) {
            throw Error(`stakeApprove method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        return await ensureAllowance.call(this.curve, [this.lpToken], [lpTokenAmount], this.gauge.address);
    }

    private async stakeEstimateGas(lpTokenAmount: number | string): Promise<number | number[]> {
        if (this.gauge.address === this.curve.constants.ZERO_ADDRESS) {
            throw Error(`stakeEstimateGas method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        const _lpTokenAmount = parseUnits(lpTokenAmount);
        return smartNumber(await this.curve.contracts[this.gauge.address].contract.deposit.estimateGas(_lpTokenAmount, this.curve.constantOptions));
    }

    public async stake(lpTokenAmount: number | string): Promise<string> {
        if (this.gauge.address === this.curve.constants.ZERO_ADDRESS) {
            throw Error(`stake method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        const _lpTokenAmount = parseUnits(lpTokenAmount);
        await _ensureAllowance.call(this.curve, [this.lpToken], [_lpTokenAmount], this.gauge.address)

        await this.curve.updateFeeData();
        const gasLimit = mulBy1_3(DIGas(await this.curve.contracts[this.gauge.address].contract.deposit.estimateGas(_lpTokenAmount, this.curve.constantOptions)));
        return (await this.curve.contracts[this.gauge.address].contract.deposit(_lpTokenAmount, { ...this.curve.options, gasLimit })).hash;
    }

    private async unstakeEstimateGas(lpTokenAmount: number | string): Promise<number | number[]> {
        if (this.gauge.address === this.curve.constants.ZERO_ADDRESS) {
            throw Error(`unstakeEstimateGas method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        const _lpTokenAmount = parseUnits(lpTokenAmount);
        return smartNumber(await this.curve.contracts[this.gauge.address].contract.withdraw.estimateGas(_lpTokenAmount, this.curve.constantOptions));
    }

    public async unstake(lpTokenAmount: number | string): Promise<string> {
        if (this.gauge.address === this.curve.constants.ZERO_ADDRESS) {
            throw Error(`unstake method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        const _lpTokenAmount = parseUnits(lpTokenAmount);

        await this.curve.updateFeeData();
        const gasLimit = DIGas((await this.curve.contracts[this.gauge.address].contract.withdraw.estimateGas(_lpTokenAmount, this.curve.constantOptions))) * this.curve.parseUnits("200", 0) / this.curve.parseUnits("100", 0);
        return (await this.curve.contracts[this.gauge.address].contract.withdraw(_lpTokenAmount, { ...this.curve.options, gasLimit })).hash;
    }

    // ---------------- CRV PROFIT, CLAIM, BOOSTING ----------------

    public crvProfit = async (address = ""): Promise<IProfit> => {
        if (this.rewardsOnly()) throw Error(`${this.name} has Rewards-Only Gauge. Use rewardsProfit instead`);

        address = address || this.curve.signerAddress;
        if (!address) throw Error("Need to connect wallet or pass address into args");

        let inflationRateBN, workingSupplyBN, workingBalanceBN;
        if (this.curve.chainId !== 1) {
            const gaugeContract = this.curve.contracts[this.gauge.address].multicallContract;
            const crvContract = this.curve.contracts[this.curve.constants.ALIASES.crv].contract;

            const currentWeek = Math.floor(Date.now() / 1000 / PERIODS.WEEK);
            [inflationRateBN, workingBalanceBN, workingSupplyBN] = (await this.curve.multicallProvider.all([
                gaugeContract.inflation_rate(currentWeek),
                gaugeContract.working_balances(address),
                gaugeContract.working_supply(),
            ]) as bigint[]).map((value) => toBN(value));

            if (inflationRateBN.eq(0)) {
                inflationRateBN = toBN(await crvContract.balanceOf(this.gauge.address, this.curve.constantOptions)).div(PERIODS.WEEK);
            }
        } else {
            const gaugeContract = this.curve.contracts[this.gauge.address].multicallContract;
            const gaugeControllerContract = this.curve.contracts[this.curve.constants.ALIASES.gauge_controller].multicallContract;

            let weightBN;
            [inflationRateBN, weightBN, workingBalanceBN, workingSupplyBN] = (await this.curve.multicallProvider.all([
                gaugeContract.inflation_rate(),
                gaugeControllerContract.gauge_relative_weight(this.gauge.address),
                gaugeContract.working_balances(address),
                gaugeContract.working_supply(),
            ]) as bigint[]).map((value) => toBN(value));

            inflationRateBN = inflationRateBN.times(weightBN);
        }
        const crvPrice = await _getUsdRate.call(this.curve, 'CRV');

        if (workingSupplyBN.eq(0)) return {
            day: "0.0",
            week: "0.0",
            month: "0.0",
            year: "0.0",
            token: this.curve.constants.ALIASES.crv,
            symbol: 'CRV',
            price: crvPrice,
        };

        const dailyIncome = inflationRateBN.times(PERIODS.DAY).times(workingBalanceBN).div(workingSupplyBN);
        const weeklyIncome = inflationRateBN.times(PERIODS.WEEK).times(workingBalanceBN).div(workingSupplyBN);
        const monthlyIncome = inflationRateBN.times(PERIODS.MONTH).times(workingBalanceBN).div(workingSupplyBN);
        const annualIncome = inflationRateBN.times(PERIODS.YEAR).times(workingBalanceBN).div(workingSupplyBN);

        return {
            day: dailyIncome.toString(),
            week: weeklyIncome.toString(),
            month: monthlyIncome.toString(),
            year: annualIncome.toString(),
            token: this.curve.constants.ALIASES.crv,
            symbol: 'CRV',
            price: crvPrice,
        };
    }

    public async claimableCrv (address = ""): Promise<string> {
        if (this.rewardsOnly()) throw Error(`${this.name} has Rewards-Only Gauge. Use claimableRewards instead`);

        address = address || this.curve.signerAddress;
        if (!address) throw Error("Need to connect wallet or pass address into args");

        return this.curve.formatUnits(await this.curve.contracts[this.gauge.address].contract.claimable_tokens(address, this.curve.constantOptions));
    }

    public async claimCrvEstimateGas(): Promise<number | number[]> {
        if (this.rewardsOnly()) throw Error(`${this.name} has Rewards-Only Gauge. Use claimRewards instead`);

        let isOldFactory = false;
        let contract;

        if (this.curve.chainId !== 1) {
            if (this.curve.constants.ALIASES.child_gauge_factory_old && this.curve.constants.ALIASES.child_gauge_factory_old !== this.curve.constants.ZERO_ADDRESS) {
                const oldFactoryContract = this.curve.contracts[this.curve.constants.ALIASES.child_gauge_factory_old].contract;
                const gaugeAddress = await oldFactoryContract.get_gauge_from_lp_token(this.lpToken);

                isOldFactory = gaugeAddress.toLowerCase() === this.gauge.address.toLowerCase();

                if (isOldFactory) {
                    contract = oldFactoryContract;
                }
            }
        }

        if (!isOldFactory) {
            contract = this.curve.chainId === 1 ?
                this.curve.contracts[this.curve.constants.ALIASES.minter].contract :
                this.curve.contracts[this.curve.constants.ALIASES.child_gauge_factory].contract;
        }

        if (!contract) {
            throw new Error("Failed to find the correct contract for estimating gas");
        }

        if (this.curve.chainId === 1) {
            return Number(await contract.mint.estimateGas(this.gauge.address, this.curve.constantOptions));
        } else {
            return smartNumber(await contract.mint.estimateGas(this.gauge.address, this.curve.constantOptions));
        }
    }


    public async claimCrv(): Promise<string> {
        if (this.rewardsOnly()) throw Error(`${this.name} has Rewards-Only Gauge. Use claimRewards instead`);

        let isOldFactory = false;
        let contract;

        if (this.curve.chainId !== 1) {
            if (this.curve.constants.ALIASES.child_gauge_factory_old && this.curve.constants.ALIASES.child_gauge_factory_old !== this.curve.constants.ZERO_ADDRESS) {
                const oldFactoryContract = this.curve.contracts[this.curve.constants.ALIASES.child_gauge_factory_old].contract;
                const gaugeAddress = await oldFactoryContract.get_gauge_from_lp_token(this.lpToken);

                isOldFactory = gaugeAddress.toLowerCase() === this.gauge.address.toLowerCase();

                if (isOldFactory) {
                    contract = oldFactoryContract;
                }
            }
        }

        if (!isOldFactory) {
            contract = this.curve.chainId === 1 ?
                this.curve.contracts[this.curve.constants.ALIASES.minter].contract :
                this.curve.contracts[this.curve.constants.ALIASES.child_gauge_factory].contract;
        }

        if (!contract) {
            throw new Error("Failed to find the correct contract for minting");
        }

        await this.curve.updateFeeData();

        const gasLimit = mulBy1_3(DIGas(await contract.mint.estimateGas(this.gauge.address, this.curve.constantOptions)));
        return (await contract.mint(this.gauge.address, { ...this.curve.options, gasLimit })).hash;
    }


    public userBoost = async (address = ""): Promise<string> => {
        if (this.gauge.address === this.curve.constants.ZERO_ADDRESS) throw Error(`${this.name} doesn't have gauge`);
        if (this.rewardsOnly()) throw Error(`${this.name} has Rewards-Only Gauge. Use stats.rewardsApy instead`);
        address = _getAddress.call(this.curve, address)

        const gaugeContract = this.curve.contracts[this.gauge.address].multicallContract;
        const [workingBalanceBN, balanceBN] = (await this.curve.multicallProvider.all([
            gaugeContract.working_balances(address),
            gaugeContract.balanceOf(address),
        ]) as bigint[]).map((value: bigint) => toBN(value));

        const boostBN = workingBalanceBN.div(0.4).div(balanceBN);
        if (boostBN.lt(1)) return '1.0';
        if (boostBN.gt(2.5)) return '2.5';

        return boostBN.toFixed(4).replace(/([0-9])0+$/, '$1')
    }

    private _userFutureBoostAndWorkingSupply = async (address: string): Promise<[BigNumber, BigNumber]> => {
        // Calc future working balance
        const veContractMulticall = this.curve.contracts[this.curve.constants.ALIASES.voting_escrow].multicallContract;
        const gaugeContractMulticall = this.curve.contracts[this.gauge.address].multicallContract;
        const calls = [
            veContractMulticall.balanceOf(address),
            veContractMulticall.totalSupply(),
            gaugeContractMulticall.balanceOf(address),
            gaugeContractMulticall.totalSupply(),
            gaugeContractMulticall.working_balances(address),
            gaugeContractMulticall.working_supply(),
        ];

        const [_votingBalance, _votingTotal, _gaugeBalance, _gaugeTotal, _workingBalance, _workingSupply]: bigint[] = await this.curve.multicallProvider.all(calls);

        let _futureWorkingBalance = _gaugeBalance * BigInt(40) / BigInt(100);
        if (_votingTotal > BigInt(0)) {
            _futureWorkingBalance += _gaugeTotal * _votingBalance / _votingTotal * BigInt(60) / BigInt(100);
        }

        if (_futureWorkingBalance > _gaugeBalance) _futureWorkingBalance = _gaugeBalance;
        const _futureWorkingSupply = _workingSupply - _workingBalance + _futureWorkingBalance;
        const futureWorkingBalanceBN = toBN(_futureWorkingBalance);
        const balanceBN = toBN(_gaugeBalance);

        const boostBN = futureWorkingBalanceBN.div(0.4).div(balanceBN);

        return [boostBN, toBN(_futureWorkingSupply)]
    }

    public userFutureBoost = async (address = ""): Promise<string> => {
        if (this.rewardsOnly()) throw Error(`${this.name} has Rewards-Only Gauge. Use stats.rewardsApy instead`);
        address = _getAddress.call(this.curve, address)
        const [boostBN] = await this._userFutureBoostAndWorkingSupply(address);
        if (boostBN.lt(1)) return '1.0';
        if (boostBN.gt(2.5)) return '2.5';

        return boostBN.toFixed(4).replace(/([0-9])0+$/, '$1')
    }

    public userCrvApy = async (address = ""): Promise<number> => {
        if (this.rewardsOnly()) throw Error(`${this.name} has Rewards-Only Gauge. Use stats.rewardsApy instead`);
        address = _getAddress.call(this.curve, address)

        const [minApy, maxApy] = await this.stats.tokenApy();
        const boost = await this.userBoost(address);
        if (boost == "2.5") return maxApy;
        if (boost === "NaN") return NaN;

        return BN(minApy).times(BN(boost)).toNumber();
    }

    public userFutureCrvApy = async (address = ""): Promise<number> => {
        if (this.rewardsOnly()) throw Error(`${this.name} has Rewards-Only Gauge. Use stats.rewardsApy instead`);
        address = _getAddress.call(this.curve, address)
        const [boostBN, futureWorkingSupplyBN] = await this._userFutureBoostAndWorkingSupply(address);

        const [minApy, maxApy] = await this._calcTokenApy(futureWorkingSupplyBN);
        if (boostBN.lt(1)) return minApy;
        if (boostBN.gt(2.5)) return maxApy;

        return BN(minApy).times(boostBN).toNumber();
    }

    public maxBoostedStake = async (...addresses: string[]): Promise<IDict<string> | string> => {
        if (this.gauge.address === this.curve.constants.ZERO_ADDRESS) throw Error(`${this.name} doesn't have gauge`);
        if (addresses.length == 1 && Array.isArray(addresses[0])) addresses = addresses[0];
        if (addresses.length === 0 && this.curve.signerAddress !== '') addresses = [this.curve.signerAddress];

        if (addresses.length === 0) throw Error("Need to connect wallet or pass addresses into args");

        const votingEscrowContract = this.curve.contracts[this.curve.constants.ALIASES.voting_escrow].multicallContract;
        const gaugeContract = this.curve.contracts[this.gauge.address].multicallContract;

        const contractCalls = [votingEscrowContract.totalSupply(), gaugeContract.totalSupply()];
        addresses.forEach((account: string) => {
            contractCalls.push(votingEscrowContract.balanceOf(account));
        });

        const _response: bigint[] = await this.curve.multicallProvider.all(contractCalls);
        const responseBN: BigNumber[] = _response.map((value: bigint) => toBN(value));

        const [veTotalSupplyBN, gaugeTotalSupplyBN] = responseBN.splice(0, 2);

        const resultBN: IDict<BigNumber> = {};
        addresses.forEach((acct: string, i: number) => {
            resultBN[acct] = responseBN[i].div(veTotalSupplyBN).times(gaugeTotalSupplyBN);
        });

        const result: IDict<string> = {};
        for (const entry of Object.entries(resultBN)) {
            result[entry[0]] = toStringFromBN(entry[1]);
        }

        return addresses.length === 1 ? result[addresses[0]] : result
    }

    // ---------------- REWARDS PROFIT, CLAIM ----------------

    public rewardTokens = memoize(async (useApi = true): Promise<{token: string, symbol: string, decimals: number}[]> => {
        const curve = this.curve;
        if (this.gauge.address === curve.constants.ZERO_ADDRESS) return []

        if (useApi) {
            const rewards = await _getRewardsFromApi.call(curve);
            if (!rewards[this.gauge.address]) return [];
            // Don't reset ABI if its already set, we might override an LP token ABI
            rewards[this.gauge.address].forEach((r) => !curve.contracts[r.tokenAddress] && _setContracts.call(curve, r.tokenAddress, ERC20Abi));
            return rewards[this.gauge.address].map((r) => ({ token: r.tokenAddress, symbol: r.symbol, decimals: Number(r.decimals) }));
        }

        const gaugeContract = curve.contracts[this.gauge.address].contract;
        const gaugeMulticallContract = curve.contracts[this.gauge.address].multicallContract;
        if ("reward_tokens(uint256)" in gaugeContract) {
            let rewardCount = 8; // gauge_v2, gauge_v3, gauge_rewards_only, gauge_child
            if ("reward_count()" in gaugeContract) { // gauge_v4, gauge_v5, gauge_factory
                rewardCount = Number(curve.formatUnits(await gaugeContract.reward_count(curve.constantOptions), 0));
            }

            const tokenCalls = [];
            for (let i = 0; i < rewardCount; i++) {
                tokenCalls.push(gaugeMulticallContract.reward_tokens(i));
            }
            const tokens = (await curve.multicallProvider.all(tokenCalls) as string[])
                .filter((addr) => addr !== curve.constants.ZERO_ADDRESS)
                .map((addr) => addr.toLowerCase())
                .filter((addr) => curve.chainId === 1 || addr !== curve.constants.COINS.crv);

            const tokenInfoCalls = [];
            for (const token of tokens) {
                // Don't reset ABI if its already set, we might override an LP token ABI
                const { multicallContract } = curve.contracts[token] || _setContracts.call(curve, token, ERC20Abi)
                tokenInfoCalls.push(multicallContract.symbol(), multicallContract.decimals());
            }
            const tokenInfo = await curve.multicallProvider.all(tokenInfoCalls);
            for (let i = 0; i < tokens.length; i++) {
                curve.constants.DECIMALS[tokens[i]] = tokenInfo[(i * 2) + 1] as number;
            }

            return tokens.map((token, i) => ({ token, symbol: tokenInfo[i * 2] as string, decimals: tokenInfo[(i * 2) + 1] as number }));
        } else if ('claimable_reward(address)' in gaugeContract) { // gauge_synthetix
            const rewardContract = curve.contracts[this.sRewardContract as string].contract;
            const method = "snx()" in rewardContract ? "snx" : "rewardsToken" // susd, tbtc : dusd, musd, rsv, sbtc
            const token = (await rewardContract[method](curve.constantOptions) as string).toLowerCase();
            _setContracts.call(curve, token, ERC20Abi);
            const tokenMulticallContract = curve.contracts[token].multicallContract;
            const res = await curve.multicallProvider.all([
                tokenMulticallContract.symbol(),
                tokenMulticallContract.decimals(),
            ]);
            const symbol = res[0] as string;
            const decimals = res[1] as number;

            return [{ token, symbol, decimals }]
        }

        return [] // gauge
    },
    {
        promise: true,
        maxAge: 30 * 60 * 1000, // 30m
    });

    public rewardsProfit = async (address = ""): Promise<IProfit[]> => {
        if (this.gauge.address === this.curve.constants.ZERO_ADDRESS) throw Error(`${this.name} doesn't have gauge`);

        address = address || this.curve.signerAddress;
        if (!address) throw Error("Need to connect wallet or pass address into args");

        const rewardTokens = await this.rewardTokens();
        const gaugeContract = this.curve.contracts[this.gauge.address].multicallContract;

        const result = [];
        if ('reward_data(address)' in this.curve.contracts[this.gauge.address].contract) {
            const calls = [gaugeContract.balanceOf(address), gaugeContract.totalSupply()];
            for (const rewardToken of rewardTokens) {
                calls.push(gaugeContract.reward_data(rewardToken.token));
            }
            const res = await this.curve.multicallProvider.all(calls);

            const balanceBN = toBN(res.shift() as bigint);
            const totalSupplyBN = toBN(res.shift() as bigint);
            for (const rewardToken of rewardTokens) {
                const _rewardData = res.shift() as { period_finish: bigint, rate: bigint };
                const periodFinish = Number(this.curve.formatUnits(_rewardData.period_finish, 0)) * 1000;
                const inflationRateBN = periodFinish > Date.now() ? toBN(_rewardData.rate, rewardToken.decimals) : BN(0);
                const tokenPrice = await _getUsdRate.call(this.curve, rewardToken.token);

                result.push(
                    {
                        day: inflationRateBN.times(PERIODS.DAY).times(balanceBN).div(totalSupplyBN).toString(),
                        week: inflationRateBN.times(PERIODS.WEEK).times(balanceBN).div(totalSupplyBN).toString(),
                        month: inflationRateBN.times(PERIODS.MONTH).times(balanceBN).div(totalSupplyBN).toString(),
                        year: inflationRateBN.times(PERIODS.YEAR).times(balanceBN).div(totalSupplyBN).toString(),
                        token: rewardToken.token,
                        symbol: rewardToken.symbol,
                        price: tokenPrice,
                    }
                )
            }
        } else if (this.sRewardContract && "rewardRate()" in this.curve.contracts[this.sRewardContract].contract && "periodFinish()" && rewardTokens.length === 1) {
            const rewardToken = rewardTokens[0];
            const sRewardContract = this.curve.contracts[this.sRewardContract].multicallContract;
            const [_inflationRate, _periodFinish, _balance, _totalSupply] = await this.curve.multicallProvider.all([
                sRewardContract.rewardRate(),
                sRewardContract.periodFinish(),
                gaugeContract.balanceOf(address),
                gaugeContract.totalSupply(),
            ]) as bigint[];

            const periodFinish = Number(_periodFinish) * 1000;
            const inflationRateBN = periodFinish > Date.now() ? toBN(_inflationRate, rewardToken.decimals) : BN(0);
            const balanceBN = toBN(_balance);
            const totalSupplyBN = toBN(_totalSupply);
            const tokenPrice = await _getUsdRate.call(this.curve, rewardToken.token);

            result.push(
                {
                    day: inflationRateBN.times(PERIODS.DAY).times(balanceBN).div(totalSupplyBN).toString(),
                    week: inflationRateBN.times(PERIODS.WEEK).times(balanceBN).div(totalSupplyBN).toString(),
                    month: inflationRateBN.times(PERIODS.MONTH).times(balanceBN).div(totalSupplyBN).toString(),
                    year: inflationRateBN.times(PERIODS.YEAR).times(balanceBN).div(totalSupplyBN).toString(),
                    token: rewardToken.token,
                    symbol: rewardToken.symbol,
                    price: tokenPrice,
                }
            )
        } else if (['aave', 'saave', 'ankreth'].includes(this.id)) {
            for (const rewardToken of rewardTokens) {
                const tokenPrice = await _getUsdRate.call(this.curve, rewardToken.token);
                result.push(
                    {
                        day: "0",
                        week: "0",
                        month: "0",
                        year: "0",
                        token: rewardToken.token,
                        symbol: rewardToken.symbol,
                        price: tokenPrice,
                    }
                )
            }
        }

        return result;
    }

    // TODO 1. Fix aave and saave error
    public async claimableRewards(address = ""): Promise<{token: string, symbol: string, amount: string}[]> {
        if (this.gauge.address === this.curve.constants.ZERO_ADDRESS) {
            throw Error(`claimableRewards method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        address = address || this.curve.signerAddress;
        if (!address) throw Error("Need to connect wallet or pass address into args");

        const gaugeContract = this.curve.contracts[this.gauge.address].contract;
        const rewardTokens = await this.rewardTokens();
        const rewards = [];
        if ('claimable_reward(address,address)' in gaugeContract) {
            for (const rewardToken of rewardTokens) {
                const _amount = await gaugeContract.claimable_reward(address, rewardToken.token, this.curve.constantOptions);
                rewards.push({
                    token: rewardToken.token,
                    symbol: rewardToken.symbol,
                    amount: this.curve.formatUnits(_amount, rewardToken.decimals),
                });
            }
        } else if ('claimable_reward(address)' in gaugeContract && rewardTokens.length > 0) { // Synthetix Gauge
            const rewardToken = rewardTokens[0];
            const _totalAmount = await gaugeContract.claimable_reward(address, this.curve.constantOptions);
            const _claimedAmount = await gaugeContract.claimed_rewards_for(address, this.curve.constantOptions);
            rewards.push({
                token: rewardToken.token,
                symbol: rewardToken.symbol,
                amount: this.curve.formatUnits(_totalAmount.sub(_claimedAmount), rewardToken.decimals),
            })
        }

        return rewards
    }

    public async claimRewardsEstimateGas(): Promise<number | number[]> {
        if (this.gauge.address === this.curve.constants.ZERO_ADDRESS) {
            throw Error(`claimRewards method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        const gaugeContract = this.curve.contracts[this.gauge.address].contract;
        if (!("claim_rewards()" in gaugeContract)) throw Error (`${this.name} pool doesn't have such method`);

        return smartNumber(await gaugeContract.claim_rewards.estimateGas(this.curve.constantOptions));
    }

    public async claimRewards(): Promise<string> {
        if (this.gauge.address === this.curve.constants.ZERO_ADDRESS) {
            throw Error(`claimRewards method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        const gaugeContract = this.curve.contracts[this.gauge.address].contract;
        if (!("claim_rewards()" in gaugeContract)) throw Error (`${this.name} pool doesn't have such method`);

        await this.curve.updateFeeData();

        const gasLimit = mulBy1_3(DIGas(await gaugeContract.claim_rewards.estimateGas(this.curve.constantOptions)));
        return (await gaugeContract.claim_rewards({ ...this.curve.options, gasLimit })).hash;
    }

    // ---------------- DEPOSIT & STAKE ----------------

    public async depositAndStakeExpected(amounts: (number | string)[]): Promise<string> {
        if (this.gauge.address === this.curve.constants.ZERO_ADDRESS) {
            throw Error(`depositAndStakeExpected method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }

        return await this.depositExpected(amounts);
    }

    public async depositAndStakeBonus(amounts: (number | string)[]): Promise<string> {
        if (this.gauge.address === this.curve.constants.ZERO_ADDRESS) {
            throw Error(`depositAndStakeBonus method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }

        return await this.depositBonus(amounts);
    }

    public async depositAndStakeIsApproved(amounts: (number | string)[]): Promise<boolean> {
        if (this.gauge.address === this.curve.constants.ZERO_ADDRESS) {
            throw Error(`depositAndStakeIsApproved method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        const coinsAllowance: boolean = await hasAllowance.call(this.curve, this.underlyingCoinAddresses, amounts, this.curve.signerAddress, this.curve.constants.ALIASES.deposit_and_stake);

        const gaugeContract = this.curve.contracts[this.gauge.address].contract;
        if ('approved_to_deposit' in gaugeContract) {
            const gaugeAllowance: boolean = await gaugeContract.approved_to_deposit(this.curve.constants.ALIASES.deposit_and_stake, this.curve.signerAddress, this.curve.constantOptions);
            return coinsAllowance && gaugeAllowance
        }

        return coinsAllowance;
    }

    private async depositAndStakeApproveEstimateGas(amounts: (number | string)[]): Promise<number | number[]> {
        if (this.gauge.address === this.curve.constants.ZERO_ADDRESS) {
            throw Error(`depositAndStakeApprove method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        const approveCoinsGas: number | number[] = await ensureAllowanceEstimateGas.call(this.curve, this.underlyingCoinAddresses, amounts, this.curve.constants.ALIASES.deposit_and_stake);

        const gaugeContract = this.curve.contracts[this.gauge.address].contract;
        if ('approved_to_deposit' in gaugeContract) {
            const gaugeAllowance: boolean = await gaugeContract.approved_to_deposit(this.curve.constants.ALIASES.deposit_and_stake, this.curve.signerAddress, this.curve.constantOptions);
            if (!gaugeAllowance) {
                const approveGaugeGas = smartNumber(await gaugeContract.set_approve_deposit.estimateGas(this.curve.constants.ALIASES.deposit_and_stake, true, this.curve.constantOptions));
                if(Array.isArray(approveCoinsGas) && Array.isArray(approveGaugeGas)) {
                    return [approveCoinsGas[0] + approveGaugeGas[0], approveCoinsGas[1] + approveGaugeGas[1]];
                }
                if(!Array.isArray(approveCoinsGas) && !Array.isArray(approveGaugeGas)) {
                    return approveCoinsGas + approveGaugeGas;
                }
            }
        }

        return approveCoinsGas;
    }

    public async depositAndStakeApprove(amounts: (number | string)[]): Promise<string[]> {
        if (this.gauge.address === this.curve.constants.ZERO_ADDRESS) {
            throw Error(`depositAndStakeApprove method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        const approveCoinsTx: string[] = await ensureAllowance.call(this.curve, this.underlyingCoinAddresses, amounts, this.curve.constants.ALIASES.deposit_and_stake);

        const gaugeContract = this.curve.contracts[this.gauge.address].contract;
        if ('approved_to_deposit' in gaugeContract) {
            const gaugeAllowance: boolean = await gaugeContract.approved_to_deposit(this.curve.constants.ALIASES.deposit_and_stake, this.curve.signerAddress, this.curve.constantOptions);
            if (!gaugeAllowance) {
                const gasLimit = mulBy1_3(await gaugeContract.set_approve_deposit.estimateGas(this.curve.constants.ALIASES.deposit_and_stake, true, this.curve.constantOptions));
                const approveGaugeTx: string = (await gaugeContract.set_approve_deposit(this.curve.constants.ALIASES.deposit_and_stake, true, { ...this.curve.options, gasLimit })).hash;
                return [...approveCoinsTx, approveGaugeTx];
            }
        }

        return approveCoinsTx;
    }

    private async depositAndStakeEstimateGas(amounts: (number | string)[]): Promise<number> {
        if (this.gauge.address === this.curve.constants.ZERO_ADDRESS) {
            throw Error(`depositAndStake method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }

        return await this._depositAndStake(amounts, 1, true, true) as number
    }

    public async depositAndStake(amounts: (number | string)[], slippage = 0.1): Promise<string> {
        if (this.gauge.address === this.curve.constants.ZERO_ADDRESS) {
            throw Error(`depositAndStake method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }

        return await this._depositAndStake(amounts, slippage, true, false) as string
    }

    // ---------------- DEPOSIT & STAKE WRAPPED ----------------

    public async depositAndStakeWrappedExpected(amounts: (number | string)[]): Promise<string> {
        if (this.gauge.address === this.curve.constants.ZERO_ADDRESS) {
            throw Error(`depositAndStakeWrappedExpected method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        if (this.isPlain || this.isFake) throw Error(`depositAndStakeWrappedExpected method doesn't exist for pool ${this.name} (id: ${this.name})`);

        return await this.depositWrappedExpected(amounts);
    }

    public async depositAndStakeWrappedBonus(amounts: (number | string)[]): Promise<string> {
        if (this.gauge.address === this.curve.constants.ZERO_ADDRESS) {
            throw Error(`depositAndStakeWrappedBonus method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        if (this.isPlain || this.isFake) throw Error(`depositAndStakeWrappedBonus method doesn't exist for pool ${this.name} (id: ${this.name})`);

        return await this.depositWrappedBonus(amounts);
    }

    public async depositAndStakeWrappedIsApproved(amounts: (number | string)[]): Promise<boolean> {
        if (this.gauge.address === this.curve.constants.ZERO_ADDRESS) {
            throw Error(`depositAndStakeWrappedIsApproved method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        if (this.isPlain || this.isFake) throw Error(`depositAndStakeWrappedIsApproved method doesn't exist for pool ${this.name} (id: ${this.name})`);

        const coinsAllowance: boolean = await hasAllowance.call(this.curve, this.wrappedCoinAddresses, amounts, this.curve.signerAddress, this.curve.constants.ALIASES.deposit_and_stake);

        const gaugeContract = this.curve.contracts[this.gauge.address].contract;
        if ('approved_to_deposit' in gaugeContract) {
            const gaugeAllowance: boolean = await gaugeContract.approved_to_deposit(this.curve.constants.ALIASES.deposit_and_stake, this.curve.signerAddress, this.curve.constantOptions);
            return coinsAllowance && gaugeAllowance;
        }

        return coinsAllowance;
    }

    private async depositAndStakeWrappedApproveEstimateGas(amounts: (number | string)[]): Promise<number | number[]> {
        if (this.gauge.address === this.curve.constants.ZERO_ADDRESS) {
            throw Error(`depositAndStakeWrappedApprove method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        if (this.isPlain || this.isFake) throw Error(`depositAndStakeWrappedApprove method doesn't exist for pool ${this.name} (id: ${this.name})`);

        const approveCoinsGas: number | number[] = await ensureAllowanceEstimateGas.call(this.curve, this.wrappedCoinAddresses, amounts, this.curve.constants.ALIASES.deposit_and_stake);

        const gaugeContract = this.curve.contracts[this.gauge.address].contract;
        if ('approved_to_deposit' in gaugeContract) {
            const gaugeAllowance: boolean = await gaugeContract.approved_to_deposit(this.curve.constants.ALIASES.deposit_and_stake, this.curve.signerAddress, this.curve.constantOptions);
            if (!gaugeAllowance) {
                const approveGaugeGas = Number(await gaugeContract.set_approve_deposit.estimateGas(this.curve.constants.ALIASES.deposit_and_stake, true, this.curve.constantOptions));
                if(Array.isArray(approveCoinsGas) && Array.isArray(approveGaugeGas)) {
                    return [approveCoinsGas[0] + approveGaugeGas[0], approveCoinsGas[1] + approveGaugeGas[1]];
                }
                if(!Array.isArray(approveCoinsGas) && !Array.isArray(approveGaugeGas)) {
                    return approveCoinsGas + approveGaugeGas;
                }
            }
        }

        return approveCoinsGas;
    }

    public async depositAndStakeWrappedApprove(amounts: (number | string)[]): Promise<string[]> {
        if (this.gauge.address === this.curve.constants.ZERO_ADDRESS) {
            throw Error(`depositAndStakeWrappedApprove method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        if (this.isPlain || this.isFake) throw Error(`depositAndStakeWrappedApprove method doesn't exist for pool ${this.name} (id: ${this.name})`);

        const approveCoinsTx: string[] = await ensureAllowance.call(this.curve, this.wrappedCoinAddresses, amounts, this.curve.constants.ALIASES.deposit_and_stake);

        const gaugeContract = this.curve.contracts[this.gauge.address].contract;
        if ('approved_to_deposit' in gaugeContract) {
            const gaugeAllowance: boolean = await gaugeContract.approved_to_deposit(this.curve.constants.ALIASES.deposit_and_stake, this.curve.signerAddress, this.curve.constantOptions);
            if (!gaugeAllowance) {
                const gasLimit = mulBy1_3(await gaugeContract.set_approve_deposit.estimateGas(this.curve.constants.ALIASES.deposit_and_stake, true, this.curve.constantOptions));
                const approveGaugeTx: string = (await gaugeContract.set_approve_deposit(this.curve.constants.ALIASES.deposit_and_stake, true, { ...this.curve.options, gasLimit })).hash;
                return [...approveCoinsTx, approveGaugeTx];
            }
        }

        return approveCoinsTx;
    }

    private async depositAndStakeWrappedEstimateGas(amounts: (number | string)[]): Promise<number> {
        if (this.gauge.address === this.curve.constants.ZERO_ADDRESS) {
            throw Error(`depositAndStakeWrapped method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        if (this.isPlain || this.isFake) throw Error(`depositAndStakeWrapped method doesn't exist for pool ${this.name} (id: ${this.name})`);

        return await this._depositAndStake(amounts, 1, false, true) as number
    }

    public async depositAndStakeWrapped(amounts: (number | string)[], slippage = 0.1): Promise<string> {
        if (this.gauge.address === this.curve.constants.ZERO_ADDRESS) {
            throw Error(`depositAndStakeWrapped method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        if (this.isPlain || this.isFake) throw Error(`depositAndStakeWrapped method doesn't exist for pool ${this.name} (id: ${this.name})`);

        return await this._depositAndStake(amounts, slippage, false, false) as string
    }

    private async _depositAndStake(amounts: (number | string)[], slippage: number, isUnderlying: boolean, estimateGas: boolean): Promise<string | number | number[]> {
        const coinAddresses = isUnderlying ? [...this.underlyingCoinAddresses] : [...this.wrappedCoinAddresses];
        const coins = isUnderlying ? this.underlyingCoins : this.wrappedCoinAddresses;
        const decimals = isUnderlying ? this.underlyingDecimals : this.wrappedDecimals;
        const depositAddress = isUnderlying ? this.zap || this.address : this.address;

        if (amounts.length !== coinAddresses.length) {
            throw Error(`${this.name} pool has ${coinAddresses.length} coins (amounts provided for ${amounts.length})`);
        }

        const balances = isUnderlying ? Object.values(await this.wallet.underlyingCoinBalances()) : Object.values(await this.wallet.wrappedCoinBalances());
        for (let i = 0; i < balances.length; i++) {
            if (Number(balances[i]) < Number(amounts[i])) {
                throw Error(`Not enough ${coins[i]}. Actual: ${balances[i]}, required: ${amounts[i]}`);
            }
        }

        const allowance = isUnderlying ? await this.depositAndStakeIsApproved(amounts) : await this.depositAndStakeWrappedIsApproved(amounts);
        if (estimateGas && !allowance) {
            throw Error("Token allowance is needed to estimate gas")
        }

        if (!estimateGas) {
            if (isUnderlying) {
                await this.depositAndStakeApprove(amounts);
            } else {
                await this.depositAndStakeWrappedApprove(amounts);
            }
        }

        const _amounts: bigint[] = amounts.map((amount, i) => parseUnits(amount, decimals[i]));

        const contract = this.curve.contracts[this.curve.constants.ALIASES.deposit_and_stake].contract;
        const useUnderlying = isUnderlying && (this.isLending || (this.isCrypto && !this.isPlain)) && (!this.zap || this.id == 'avaxcrypto');
        const useDynarray = (!this.isCrypto && this.isNg && this.isPlain) || (isUnderlying && this.isMeta && (new PoolTemplate(this.basePool, this.curve)).isNg);
        const _expectedLpTokenAmount = isUnderlying ?
            this.curve.parseUnits(await this.depositAndStakeExpected(amounts)) :
            this.curve.parseUnits(await this.depositAndStakeWrappedExpected(amounts));
        const minAmountBN = toBN(_expectedLpTokenAmount).times(100 - slippage).div(100);
        const _minMintAmount = fromBN(minAmountBN);
        const ethIndex = this.curve.getEthIndex(coinAddresses);
        const value = _amounts[ethIndex] || this.curve.parseUnits("0");

        const _gas = OLD_CHAINS.includes(this.curve.chainId) ? (await contract.deposit_and_stake.estimateGas(
            depositAddress,
            this.lpToken,
            this.gauge.address,
            coins.length,
            coinAddresses,
            _amounts,
            _minMintAmount,
            useUnderlying,  // <--- DIFFERENCE
            useDynarray,
            this.isMetaFactory && isUnderlying ? this.address : this.curve.constants.ZERO_ADDRESS,
            {...this.curve.constantOptions, value}
        )) : (await contract.deposit_and_stake.estimateGas(
            depositAddress,
            this.lpToken,
            this.gauge.address,
            coins.length,
            coinAddresses,
            _amounts,
            _minMintAmount,
            useDynarray,
            this.isMetaFactory && isUnderlying ? this.address : this.curve.constants.ZERO_ADDRESS,
            {...this.curve.constantOptions, value}
        ));

        if (estimateGas) return smartNumber(_gas)

        await this.curve.updateFeeData();
        const gasLimit = DIGas(_gas) * this.curve.parseUnits("200", 0) / this.curve.parseUnits("100", 0);
        if (OLD_CHAINS.includes(this.curve.chainId)) {
            return (await contract.deposit_and_stake(
                depositAddress,
                this.lpToken,
                this.gauge.address,
                coins.length,
                coinAddresses,
                _amounts,
                _minMintAmount,
                useUnderlying,  // <--- DIFFERENCE
                useDynarray,
                this.isMetaFactory && isUnderlying ? this.address : this.curve.constants.ZERO_ADDRESS,
                {...this.curve.options, gasLimit, value}
            )).hash
        } else {
            return (await contract.deposit_and_stake(
                depositAddress,
                this.lpToken,
                this.gauge.address,
                coins.length,
                coinAddresses,
                _amounts,
                _minMintAmount,
                useDynarray,
                this.isMetaFactory && isUnderlying ? this.address : this.curve.constants.ZERO_ADDRESS,
                {...this.curve.options, gasLimit, value}
            )).hash
        }
    }

    // ---------------- WITHDRAW ----------------

    // OVERRIDE
    public async withdrawExpected(lpTokenAmount: number | string): Promise<string[]> {
        throw Error(`withdrawExpected method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    public async withdrawIsApproved(lpTokenAmount: number | string): Promise<boolean> {
        if (!this.zap) return true
        return await hasAllowance.call(this.curve, [this.lpToken], [lpTokenAmount], this.curve.signerAddress, this.zap as string);
    }

    private async withdrawApproveEstimateGas(lpTokenAmount: number | string): Promise<number | number[]> {
        if (!this.zap) return 0;
        return await ensureAllowanceEstimateGas.call(this.curve, [this.lpToken], [lpTokenAmount], this.zap as string);
    }

    public async withdrawApprove(lpTokenAmount: number | string): Promise<string[]> {
        if (!this.zap) return [];
        return await ensureAllowance.call(this.curve, [this.lpToken], [lpTokenAmount], this.zap as string);
    }

    // OVERRIDE
    private async withdrawEstimateGas(lpTokenAmount: number | string): Promise<number | number[]> {
        throw Error(`withdraw method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    // OVERRIDE
    public async withdraw(lpTokenAmount: number | string, slippage = 0.5): Promise<string> {
        throw Error(`withdraw method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    // ---------------- WITHDRAW WRAPPED ----------------

    // OVERRIDE
    public async withdrawWrappedExpected (lpTokenAmount: number | string): Promise<string[]> {
        throw Error(`withdrawWrappedExpected method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    // OVERRIDE
    private async withdrawWrappedEstimateGas(lpTokenAmount: number | string): Promise<number> {
        throw Error(`withdrawWrapped method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    // OVERRIDE
    public async withdrawWrapped(lpTokenAmount: number | string, slippage = 0.5): Promise<string> {
        throw Error(`withdrawWrapped method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    // ---------------- WITHDRAW IMBALANCE ----------------

    public async withdrawImbalanceExpected(amounts: (number | string)[]): Promise<string> {
        if (this.isCrypto) throw Error(`withdrawImbalanceExpected method doesn't exist for pool ${this.name} (id: ${this.name})`);

        return await this.calcLpTokenAmount(amounts, false);
    }

    public async withdrawImbalanceBonus(amounts: (number | string)[]): Promise<string> {
        let pricesBN: BigNumber[] = [];
        const multicallContract = this.curve.contracts[this.address].multicallContract;
        if(this.isCrypto || this.id === 'wsteth') {
            if(this.curve.isLiteChain) {
                const prices = this.id.includes('twocrypto')
                    ? [
                        1,
                        Number(await this.curve.contracts[this.address].contract.price_oracle()) / (10 ** 18),
                    ]
                    : [
                        1,
                        ...(await this.curve.multicallProvider.all([
                            multicallContract.price_oracle(0),
                            multicallContract.price_oracle(1),
                        ])).map((value) => Number(value) / (10 ** 18)),
                    ]
                pricesBN = prices.map(BN);
            } else {
                pricesBN = (await this._underlyingPrices()).map(BN);
            }
        } else {
            pricesBN = await this._storedRatesBN(true);
        }

        const valueBN = amounts.map(BN).reduce((sBN, aBN, i) => pricesBN[i].times(aBN).plus(sBN), BN(0));
        const lpTokenAmount = await this.withdrawImbalanceExpected(amounts);

        const balancedAmounts = await this.withdrawExpected(lpTokenAmount);
        const balancedValueBN = balancedAmounts.map(BN).reduce((sBN, aBN, i) => pricesBN[i].times(aBN).plus(sBN), BN(0));

        return valueBN.minus(balancedValueBN).div(balancedValueBN).times(100).toString();
    }

    public async withdrawImbalanceIsApproved(amounts: (number | string)[]): Promise<boolean> {
        if (this.isCrypto) throw Error(`withdrawImbalanceIsApproved method doesn't exist for pool ${this.name} (id: ${this.name})`);

        if (this.zap) {
            const _amounts: bigint[] = amounts.map((amount, i) => parseUnits(amount, this.underlyingDecimals[i]));
            const _maxBurnAmount = (await this._calcLpTokenAmount(_amounts, false)) * this.curve.parseUnits("101", 0) / this.curve.parseUnits("100", 0);
            return await hasAllowance.call(this.curve, [this.lpToken], [this.curve.formatUnits(_maxBurnAmount, 18)], this.curve.signerAddress, this.zap as string);
        }

        return true;
    }

    private async withdrawImbalanceApproveEstimateGas(amounts: (number | string)[]): Promise<number | number[]> {
        if (this.isCrypto) throw Error(`withdrawImbalanceApprove method doesn't exist for pool ${this.name} (id: ${this.name})`);

        if (this.zap) {
            const _amounts: bigint[] = amounts.map((amount, i) => parseUnits(amount, this.underlyingDecimals[i]));
            const _maxBurnAmount = (await this._calcLpTokenAmount(_amounts, false)) * this.curve.parseUnits("101", 0) / this.curve.parseUnits("100", 0);
            return await ensureAllowanceEstimateGas.call(this.curve, [this.lpToken], [this.curve.formatUnits(_maxBurnAmount, 18)], this.zap as string);
        }

        return 0;
    }

    public async withdrawImbalanceApprove(amounts: (number | string)[]): Promise<string[]> {
        if (this.isCrypto) throw Error(`withdrawImbalanceApprove method doesn't exist for pool ${this.name} (id: ${this.name})`);

        if (this.zap) {
            const _amounts: bigint[] = amounts.map((amount, i) => parseUnits(amount, this.underlyingDecimals[i]));
            const _maxBurnAmount = (await this._calcLpTokenAmount(_amounts, false)) * this.curve.parseUnits("101", 0) / this.curve.parseUnits("100", 0);
            return await ensureAllowance.call(this.curve, [this.lpToken], [this.curve.formatUnits(_maxBurnAmount, 18)], this.zap as string);
        }

        return [];
    }

    // OVERRIDE
    private async withdrawImbalanceEstimateGas(amounts: (number | string)[]): Promise<number> {
        throw Error(`withdrawImbalance method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    // OVERRIDE
    public async withdrawImbalance(amounts: (number | string)[], slippage = 0.5): Promise<string> {
        throw Error(`withdrawImbalance method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    // ---------------- WITHDRAW IMBALANCE WRAPPED ----------------

    public async withdrawImbalanceWrappedExpected(amounts: (number | string)[]): Promise<string> {
        if (this.isCrypto || this.isPlain || this.isFake) throw Error(`withdrawImbalanceWrappedExpected method doesn't exist for pool ${this.name} (id: ${this.name})`);

        return await this.calcLpTokenAmountWrapped(amounts, false);
    }

    public async withdrawImbalanceWrappedBonus(amounts: (number | string)[]): Promise<string> {
        const prices: number[] = await this._wrappedPrices();

        const value = amounts.map(checkNumber).map(Number).reduce((s, a, i) => s + (a * prices[i]), 0);
        const lpTokenAmount = Number(await this.withdrawImbalanceWrappedExpected(amounts));

        const balancedAmounts = await this.withdrawWrappedExpected(lpTokenAmount);
        const balancedValue = balancedAmounts.map(Number).reduce((s, a, i) => s + (a * prices[i]), 0);

        return String((value - balancedValue) / balancedValue * 100);
    }

    // OVERRIDE
    private async withdrawImbalanceWrappedEstimateGas(amounts: (number | string)[]): Promise<number> {
        throw Error(`withdrawImbalanceWrapped method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    // OVERRIDE
    public async withdrawImbalanceWrapped(amounts: (number | string)[], slippage = 0.5): Promise<string> {
        throw Error(`withdrawImbalanceWrapped method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    // ---------------- WITHDRAW ONE COIN ----------------

    // OVERRIDE
    async _withdrawOneCoinExpected(_lpTokenAmount: bigint, i: number): Promise<bigint> {
        throw Error(`withdrawOneCoinExpected method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    public async withdrawOneCoinExpected(lpTokenAmount: number | string, coin: string | number): Promise<string> {
        const i = this._getCoinIdx(coin);
        const _lpTokenAmount = parseUnits(lpTokenAmount);
        const _expected = await this._withdrawOneCoinExpected(_lpTokenAmount, i);

        return this.curve.formatUnits(_expected, this.underlyingDecimals[i]);
    }

    public async withdrawOneCoinBonus(lpTokenAmount: number | string, coin: string | number): Promise<string> {
        let pricesBN: BigNumber[] = [];

        const multicallContract = this.curve.contracts[this.address].multicallContract;
        if(this.isCrypto || this.id === 'wsteth') {
            if(this.curve.isLiteChain) {
                const prices = this.id.includes('twocrypto')
                    ? [
                        1,
                        Number(await this.curve.contracts[this.address].contract.price_oracle()) / (10 ** 18),
                    ]
                    : [
                        1,
                        ...(await this.curve.multicallProvider.all([
                            multicallContract.price_oracle(0),
                            multicallContract.price_oracle(1),
                        ])).map((value) => Number(value) / (10 ** 18)),
                    ]
                pricesBN = prices.map(BN);
            } else {
                pricesBN = (await this._underlyingPrices()).map(BN);
            }
        } else {
            pricesBN = await this._storedRatesBN(true);
        }

        const coinPriceBN = pricesBN[this._getCoinIdx(coin)];

        const amountBN = BN(await this.withdrawOneCoinExpected(lpTokenAmount, coin));
        const valueBN = amountBN.times(coinPriceBN);

        const balancedAmounts = await this.withdrawExpected(lpTokenAmount);
        const balancedValueBN = balancedAmounts.map(BN).reduce((sBN, aBN, i) => pricesBN[i].times(aBN).plus(sBN), BN(0));

        return valueBN.minus(balancedValueBN).div(balancedValueBN).times(100).toString();
    }

    public async withdrawOneCoinIsApproved(lpTokenAmount: number | string): Promise<boolean> {
        if (!this.zap) return true
        return await hasAllowance.call(this.curve, [this.lpToken], [lpTokenAmount], this.curve.signerAddress, this.zap as string);
    }

    private async withdrawOneCoinApproveEstimateGas(lpTokenAmount: number | string): Promise<number | number[]> {
        if (!this.zap) return 0
        return await ensureAllowanceEstimateGas.call(this.curve, [this.lpToken], [lpTokenAmount], this.zap as string);
    }

    public async withdrawOneCoinApprove(lpTokenAmount: number | string): Promise<string[]> {
        if (!this.zap) return []
        return await ensureAllowance.call(this.curve, [this.lpToken], [lpTokenAmount], this.zap as string);
    }

    // OVERRIDE
    private async withdrawOneCoinEstimateGas(lpTokenAmount: number | string, coin: string | number): Promise<number | number[]> {
        throw Error(`withdrawOneCoin method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    // OVERRIDE
    public async withdrawOneCoin(lpTokenAmount: number | string, coin: string | number, slippage = 0.5): Promise<string> {
        throw Error(`withdrawOneCoin method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    // ---------------- WITHDRAW ONE COIN WRAPPED ----------------

    // OVERRIDE
    async _withdrawOneCoinWrappedExpected(_lpTokenAmount: bigint, i: number): Promise<bigint> {
        throw Error(`withdrawOneCoinWrappedExpected method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    public async withdrawOneCoinWrappedExpected(lpTokenAmount: number | string, coin: string | number): Promise<string> {
        const i = this._getCoinIdx(coin, false);
        const _lpTokenAmount = parseUnits(lpTokenAmount);

        const _expected = await this._withdrawOneCoinWrappedExpected(_lpTokenAmount, i);

        return this.curve.formatUnits(_expected, this.wrappedDecimals[i]);
    }

    public async withdrawOneCoinWrappedBonus(lpTokenAmount: number | string, coin: string | number): Promise<string> {
        const prices: number[] = await this._wrappedPrices();
        const coinPrice = prices[this._getCoinIdx(coin, false)];

        const amount = Number(await this.withdrawOneCoinWrappedExpected(lpTokenAmount, coin));
        const value = amount * coinPrice;

        const balancedAmounts = await this.withdrawWrappedExpected(lpTokenAmount);
        const balancedValue = balancedAmounts.map(Number).reduce((s, a, i) => s + (a * prices[i]), 0);

        return String((value - balancedValue) / balancedValue * 100);
    }

    // OVERRIDE
    private async withdrawOneCoinWrappedEstimateGas(lpTokenAmount: number | string, coin: string | number): Promise<number> {
        throw Error(`withdrawOneCoinWrapped method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    // OVERRIDE
    public async withdrawOneCoinWrapped(lpTokenAmount: number | string, coin: string | number, slippage = 0.5): Promise<string> {
        throw Error(`withdrawOneCoinWrapped method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }


    // ---------------- USER BALANCES, BASE PROFIT AND SHARE ----------------

    private async _userLpTotalBalance(address: string): Promise<BigNumber> {
        const lpBalances = await this.wallet.lpTokenBalances(address);
        let lpTotalBalanceBN = BN(lpBalances.lpToken as string);
        if ('gauge' in lpBalances) lpTotalBalanceBN = lpTotalBalanceBN.plus(BN(lpBalances.gauge as string));

        return lpTotalBalanceBN
    }

    public async userBalances(address = ""): Promise<string[]> {
        address = address || this.curve.signerAddress;
        if (!address) throw Error("Need to connect wallet or pass address into args");

        const lpTotalBalanceBN = await this._userLpTotalBalance(address);
        if (lpTotalBalanceBN.eq(0)) return this.underlyingCoins.map(() => "0");

        return await this.withdrawExpected(lpTotalBalanceBN.toFixed(18));
    }

    public async userWrappedBalances(address = ""): Promise<string[]> {
        address = address || this.curve.signerAddress;
        if (!address) throw Error("Need to connect wallet or pass address into args");

        const lpTotalBalanceBN = await this._userLpTotalBalance(address);
        if (lpTotalBalanceBN.eq(0)) return this.wrappedCoins.map(() => "0");

        return await this.withdrawWrappedExpected(lpTotalBalanceBN.toFixed(18));
    }

    public async userLiquidityUSD(address = ""): Promise<string> {
        const lpBalanceBN = await this._userLpTotalBalance(address);
        const lpPrice = await _getUsdRate.call(this.curve, this.lpToken);

        return lpBalanceBN.times(lpPrice).toFixed(8)
    }

    public async baseProfit(address = ""): Promise<{ day: string, week: string, month: string, year: string }> {
        const apyData = await this.stats.baseApy();
        if (!('week' in apyData)) return { day: "0", week: "0", month: "0", year: "0" };

        const apyBN = BN(apyData.week).div(100);
        const totalLiquidityBN = BN(await this.userLiquidityUSD(address));

        const annualProfitBN = apyBN.times(totalLiquidityBN);
        const monthlyProfitBN = annualProfitBN.div(12);
        const weeklyProfitBN = annualProfitBN.div(52);
        const dailyProfitBN = annualProfitBN.div(365);

        return {
            day: dailyProfitBN.toString(),
            week: weeklyProfitBN.toString(),
            month: monthlyProfitBN.toString(),
            year: annualProfitBN.toString(),
        }
    }

    public async userShare(address = ""):
        Promise<{ lpUser: string, lpTotal: string, lpShare: string, gaugeUser?: string, gaugeTotal?: string, gaugeShare?: string }>
    {
        const withGauge = this.gauge.address !== this.curve.constants.ZERO_ADDRESS;
        address = address || this.curve.signerAddress;
        if (!address) throw Error("Need to connect wallet or pass address into args");

        const userLpBalance = await this.wallet.lpTokenBalances(address) as IDict<string>;
        let userLpTotalBalanceBN = BN(userLpBalance.lpToken);
        if (withGauge) userLpTotalBalanceBN = userLpTotalBalanceBN.plus(BN(userLpBalance.gauge as string));

        let totalLp, gaugeLp;
        if (withGauge) {
            [totalLp, gaugeLp] = (await this.curve.multicallProvider.all([
                this.curve.contracts[this.lpToken].multicallContract.totalSupply(),
                this.curve.contracts[this.gauge.address].multicallContract.totalSupply(),
            ]) as bigint[]).map((_supply) => this.curve.formatUnits(_supply));
        } else {
            totalLp = this.curve.formatUnits(await this.curve.contracts[this.lpToken].contract.totalSupply(this.curve.constantOptions));
        }

        return {
            lpUser: userLpTotalBalanceBN.toString(),
            lpTotal: totalLp,
            lpShare: BN(totalLp).gt(0) ? userLpTotalBalanceBN.div(totalLp).times(100).toString() : '0',
            gaugeUser: userLpBalance.gauge,
            gaugeTotal: gaugeLp,
            gaugeShare: !withGauge ? undefined : BN(gaugeLp as string).gt(0) ? BN(userLpBalance.gauge).div(gaugeLp as string).times(100).toString() : '0',
        }
    }

    // ---------------- SWAP ----------------

    async _swapExpected(i: number, j: number, _amount: bigint): Promise<bigint> {
        const contractAddress = this.isCrypto && this.isMeta ? this.zap as string : this.address;
        const contract = this.curve.contracts[contractAddress].contract;
        if ('get_dy_underlying' in contract) {
            return await contract.get_dy_underlying(i, j, _amount, this.curve.constantOptions)
        } else {
            if ('get_dy(address,uint256,uint256,uint256)' in contract) {  // atricrypto3 based metapools
                return await contract.get_dy(this.address, i, j, _amount, this.curve.constantOptions);
            }
            return await contract.get_dy(i, j, _amount, this.curve.constantOptions);
        }
    }

    public async swapExpected(inputCoin: string | number, outputCoin: string | number, amount: number | string): Promise<string> {
        const i = this._getCoinIdx(inputCoin);
        const j = this._getCoinIdx(outputCoin);
        const _amount = parseUnits(amount, this.underlyingDecimals[i]);
        const _expected = await this._swapExpected(i, j, _amount);

        return this.curve.formatUnits(_expected, this.underlyingDecimals[j])
    }

    public async swapExpectedBigInt(inputCoin: string | number, outputCoin: string | number, amount: bigint): Promise<bigint> {
        const i = this._getCoinIdx(inputCoin);
        const j = this._getCoinIdx(outputCoin);
        const _expected = await this._swapExpected(i, j, amount);

        return _expected;
    }

    async _swapRequired(i: number, j: number, _amount: bigint, isUnderlying: boolean): Promise<any> {
        if(this.isCrypto) {
            if (this.isNg) return await this.curve.contracts[this.address].contract.get_dx(i, j, _amount, this.curve.constantOptions);

            const contract = this.curve.contracts[this.curve.constants.ALIASES.crypto_calc].contract;
            if(this.isMeta && isUnderlying) {
                const basePool = new PoolTemplate(this.basePool, this.curve);
                if(this.wrappedCoins.length === 3) {
                    return await contract.get_dx_tricrypto_meta_underlying(this.address, i, j, _amount, this.wrappedCoins.length, basePool.address, basePool.lpToken, this.curve.constantOptions)
                }
                if(basePool.isFake) {
                    const secondPool = new PoolTemplate(basePool.basePool, this.curve)
                    return await contract.get_dx_double_meta_underlying(this.address, i, j, _amount, basePool.address, basePool.zap, secondPool.address, secondPool.lpToken, this.curve.constantOptions)
                }
                return await contract.get_dx_meta_underlying(this.address, i, j, _amount, this.underlyingCoins.length, basePool.address, basePool.lpToken, this.curve.constantOptions)
            } else {
                return await contract.get_dx(this.address, i, j, _amount, this.wrappedCoins.length, this.curve.constantOptions)
            }
        } else {
            if (this.isNg) {
                const contract = this.curve.contracts[this.address].contract;
                if (this.isMeta) {
                    if (isUnderlying) {
                        return await contract.get_dx_underlying(i, j, _amount, this.curve.constantOptions);
                    } else {
                        return await contract.get_dx(i, j, _amount, this.curve.constantOptions);
                    }
                } else {
                    return await contract.get_dx(i, j, _amount, this.curve.constantOptions)
                }
            }

            const contract = this.curve.contracts[this.curve.constants.ALIASES.stable_calc].contract;
            if(this.isMeta) {
                const basePool = new PoolTemplate(this.basePool, this.curve);
                if(isUnderlying) {
                    return await contract.get_dx_meta_underlying(this.address, i, j, _amount, this.underlyingCoins.length, basePool.address, basePool.lpToken, this.curve.constantOptions)
                } else {
                    return await contract.get_dx_meta(this.address, i, j, _amount, this.wrappedCoins.length, basePool.address, this.curve.constantOptions)
                }
            } else {
                if(isUnderlying && this.isLending) {
                    return await contract.get_dx_underlying(this.address, i, j, _amount, this.underlyingCoins.length, this.curve.constantOptions)
                } else {
                    return await contract.get_dx(this.address, i, j, _amount, this.wrappedCoins.length, this.curve.constantOptions)
                }
            }
        }
    }

    public async swapRequired(inputCoin: string | number, outputCoin: string | number, amount: number | string): Promise<string> {
        const i = this._getCoinIdx(inputCoin);
        const j = this._getCoinIdx(outputCoin);
        const _amount = parseUnits(amount, this.underlyingDecimals[j]);
        const _required = await this._swapRequired(i, j, _amount, true);

        return this.curve.formatUnits(_required, this.underlyingDecimals[i])
    }

    // OVERRIDE
    public async swapWrappedRequired(inputCoin: string | number, outputCoin: string | number, amount: number | string): Promise<string> {
        throw Error(`swapWrappedRequired method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    public async swapPriceImpact(inputCoin: string | number, outputCoin: string | number, amount: number | string): Promise<number> {
        const i = this._getCoinIdx(inputCoin);
        const j = this._getCoinIdx(outputCoin);
        const [inputCoinDecimals, outputCoinDecimals] = [this.underlyingDecimals[i], this.underlyingDecimals[j]];
        const _amount = parseUnits(amount, inputCoinDecimals);
        const _output = await this._swapExpected(i, j, _amount);

        const smallAmountIntBN = _get_small_x(_amount, _output, inputCoinDecimals, outputCoinDecimals);
        const amountIntBN = toBN(_amount, 0);
        if (smallAmountIntBN.gte(amountIntBN)) return 0;

        const _smallAmount = fromBN(smallAmountIntBN.div(10 ** inputCoinDecimals), inputCoinDecimals);
        const _smallOutput = await this._swapExpected(i, j, _smallAmount);
        const priceImpactBN = _get_price_impact(_amount, _output, _smallAmount, _smallOutput, inputCoinDecimals, outputCoinDecimals)

        return Number(_cutZeros(priceImpactBN.toFixed(4)))
    }

    _swapContractAddress(): string {
        return (this.isCrypto && this.isMeta) || (this.isMetaFactory && (new PoolTemplate(this.basePool, this.curve).isLending)) ? this.zap as string : this.address;
    }

    public async swapIsApproved(inputCoin: string | number, amount: number | string): Promise<boolean> {
        const contractAddress = this._swapContractAddress();
        const i = this._getCoinIdx(inputCoin);
        return await hasAllowance.call(this.curve, [this.underlyingCoinAddresses[i]], [amount], this.curve.signerAddress, contractAddress);
    }

    private async swapApproveEstimateGas (inputCoin: string | number, amount: number | string): Promise<number | number[]> {
        const contractAddress = this._swapContractAddress();
        const i = this._getCoinIdx(inputCoin);
        return await ensureAllowanceEstimateGas.call(this.curve, [this.underlyingCoinAddresses[i]], [amount], contractAddress);
    }

    public async swapApprove(inputCoin: string | number, amount: number | string): Promise<string[]> {
        const contractAddress = this._swapContractAddress();
        const i = this._getCoinIdx(inputCoin);
        return await ensureAllowance.call(this.curve, [this.underlyingCoinAddresses[i]], [amount], contractAddress);
    }

    // OVERRIDE
    private async swapEstimateGas(inputCoin: string | number, outputCoin: string | number, amount: number | string): Promise<number> {
        throw Error(`swap method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    // OVERRIDE
    public async swap(inputCoin: string | number, outputCoin: string | number, amount: number | string, slippage = 0.5): Promise<string> {
        throw Error(`swap method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    // OVERRIDE
    public async getSwapInfo(): Promise<ISwapMethodInfo> {
        throw Error(`getSwapInfo method doesn't exist for pool ${this.name} (id: ${this.id})`);
    }

    // ---------------- SWAP WRAPPED ----------------

    async _swapWrappedExpected(i: number, j: number, _amount: bigint): Promise<bigint> {
        return await this.curve.contracts[this.address].contract.get_dy(i, j, _amount, this.curve.constantOptions);
    }

    // OVERRIDE
    public async swapWrappedExpected(inputCoin: string | number, outputCoin: string | number, amount: number | string): Promise<string> {
        throw Error(`swapWrappedExpected method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    // OVERRIDE
    public async swapWrappedExpectedBigInt(inputCoin: string | number, outputCoin: string | number, amount: bigint): Promise<bigint> {
        throw Error(`swapWrappedExpectedBigInt method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    public async swapWrappedPriceImpact(inputCoin: string | number, outputCoin: string | number, amount: number | string): Promise<number> {
        if (this.isPlain || this.isFake) {
            throw Error(`swapWrappedPriceImpact method doesn't exist for pool ${this.name} (id: ${this.name})`);
        }

        const i = this._getCoinIdx(inputCoin, false);
        const j = this._getCoinIdx(outputCoin, false);
        const [inputCoinDecimals, outputCoinDecimals] = [this.wrappedDecimals[i], this.wrappedDecimals[j]];
        const _amount = parseUnits(amount, inputCoinDecimals);
        const _output = await this._swapWrappedExpected(i, j, _amount);

        const smallAmountIntBN = _get_small_x(_amount, _output, inputCoinDecimals, outputCoinDecimals);
        const amountIntBN = toBN(_amount, 0);
        if (smallAmountIntBN.gte(amountIntBN)) return 0;

        const _smallAmount = fromBN(smallAmountIntBN.div(10 ** inputCoinDecimals), inputCoinDecimals);
        const _smallOutput = await this._swapWrappedExpected(i, j, _smallAmount);
        const priceImpactBN = _get_price_impact(_amount, _output, _smallAmount, _smallOutput, inputCoinDecimals, outputCoinDecimals)

        return Number(_cutZeros(priceImpactBN.toFixed(4)))
    }

    // OVERRIDE
    public async swapWrappedIsApproved(inputCoin: string | number, amount: number | string): Promise<boolean> {
        throw Error(`swapWrappedIsApproved method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    // OVERRIDE
    private async swapWrappedApproveEstimateGas(inputCoin: string | number, amount: number | string): Promise<number | number[]> {
        throw Error(`swapWrappedApprove method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    // OVERRIDE
    public async swapWrappedApprove(inputCoin: string | number, amount: number | string): Promise<string[]> {
        throw Error(`swapWrappedApprove method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    // OVERRIDE
    private async swapWrappedEstimateGas(inputCoin: string | number, outputCoin: string | number, amount: number | string): Promise<number | number[]> {
        throw Error(`swapWrapped method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    // OVERRIDE
    public async swapWrapped(inputCoin: string | number, outputCoin: string | number, amount: number | string, slippage = 0.5): Promise<string> {
        throw Error(`swapWrapped method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    // OVERRIDE
    public async getSwapWrappedInfo(): Promise<ISwapMethodInfo> {
        throw Error(`getSwapWrappedInfo method doesn't exist for pool ${this.name} (id: ${this.id})`);
    }

    // ---------------- ... ----------------

    public gaugeOptimalDeposits = async (...accounts: string[]): Promise<IDict<string>> => {
        if (this.gauge.address === this.curve.constants.ZERO_ADDRESS) throw Error(`${this.name} doesn't have gauge`);
        if (accounts.length == 1 && Array.isArray(accounts[0])) accounts = accounts[0];

        const votingEscrowContract = this.curve.contracts[this.curve.constants.ALIASES.voting_escrow].multicallContract;
        const lpTokenContract = this.curve.contracts[this.lpToken].multicallContract;
        const gaugeContract = this.curve.contracts[this.gauge.address].multicallContract;
        const contractCalls = [votingEscrowContract.totalSupply(), gaugeContract.totalSupply()];
        accounts.forEach((account: string) => {
            contractCalls.push(
                votingEscrowContract.balanceOf(account),
                lpTokenContract.balanceOf(account),
                gaugeContract.balanceOf(account)
            )
        });

        const _response: bigint[] = await this.curve.multicallProvider.all(contractCalls);
        const response: BigNumber[] = _response.map((value: bigint) => toBN(value));

        const [veTotalSupply, gaugeTotalSupply] = response.splice(0,2);

        const votingPower: IDict<BigNumber> = {};
        let totalBalance = BN(0);
        for (const acct of accounts) {
            votingPower[acct] = response[0];
            totalBalance = totalBalance.plus(response[1]).plus(response[2]);
            response.splice(0, 3);
        }

        const totalPower = Object.values(votingPower).reduce((sum, item) => sum.plus(item));
        const optimalBN = Object.fromEntries(accounts.map((acc) => [acc, BN(0)])) as IDict<BigNumber>;
        if (totalBalance.lt(gaugeTotalSupply.times(totalPower).div(veTotalSupply))) {
            for (const acct of accounts) {
                // min(voting, lp)
                const amount = gaugeTotalSupply.times(votingPower[acct]).div(veTotalSupply).lt(totalBalance) ?
                    gaugeTotalSupply.times(votingPower[acct]).div(veTotalSupply) : totalBalance;
                optimalBN[acct] = amount;
                totalBalance = totalBalance.minus(amount);
                if (totalBalance.lte(0)) {
                    break;
                }
            }
        } else {
            if (totalPower.lt(0)) {
                for (const acct of accounts) {
                    optimalBN[acct] = totalBalance.times(votingPower[acct]).div(totalPower);
                }
            }
            optimalBN[accounts[0]] = optimalBN[accounts[0]].plus(totalBalance.minus(Object.values(optimalBN).reduce((sum, item) => sum.plus(item))));
        }

        const optimal: IDict<string> = {};
        for (const entry of Object.entries(optimalBN)) {
            optimal[entry[0]] = toStringFromBN(entry[1]);
        }

        return optimal
    }

    _getCoinIdx = (coin: string | number, useUnderlying = true): number => {
        if (typeof coin === 'number') {
            const coins_N = useUnderlying ? this.underlyingCoins.length : this.wrappedCoins.length;
            const idx = coin;
            if (!Number.isInteger(idx)) {
                throw Error('Index must be integer');
            }
            if (idx < 0) {
                throw Error('Index must be >= 0');
            }
            if (idx > coins_N - 1) {
                throw Error(`Index must be < ${coins_N}`)
            }

            return idx
        }

        const [coinAddress] = _getCoinAddresses.call(this.curve, coin);
        const lowerCaseCoinAddresses = useUnderlying ?
            this.underlyingCoinAddresses.map((c) => c.toLowerCase()) :
            this.wrappedCoinAddresses.map((c) => c.toLowerCase());

        const idx = lowerCaseCoinAddresses.indexOf(coinAddress.toLowerCase());
        if (idx === -1) {
            throw Error(`There is no ${coin} among ${this.name} pool ${useUnderlying ? 'underlying' : 'wrapped'} coins`);
        }

        return idx
    }

    // Used by mixins
    _getRates = async(): Promise<bigint[]> => {
        const _rates: bigint[] = [];
        for (let i = 0; i < this.wrappedCoinAddresses.length; i++) {
            const addr = this.wrappedCoinAddresses[i];
            if (this.useLending[i]) {
                if (['compound', 'usdt', 'ib'].includes(this.id)) {
                    _rates.push(await this.curve.contracts[addr].contract.exchangeRateStored());
                } else if (['y', 'busd', 'pax'].includes(this.id)) {
                    _rates.push(await this.curve.contracts[addr].contract.getPricePerFullShare());
                } else {
                    _rates.push(this.curve.parseUnits(String(10**18), 0)); // Aave ratio 1:1
                }
            } else {
                _rates.push(this.curve.parseUnits(String(10**18), 0));
            }
        }

        return _rates
    }

    private _storedRatesBN = async (useUnderlying: boolean): Promise<BigNumber[]> => {
        if (this.isMeta) {
            if (useUnderlying) return this.underlyingCoins.map(() => BN(1));

            const _vp = await this.curve.contracts[this.curve.getPoolsData()[this.basePool].swap_address].contract.get_virtual_price();
            return [BN(1), toBN(_vp)]
        }

        //for crvusd and stable-ng implementations
        if (findAbiFunction(this.curve.contracts[this.address].abi, 'stored_rates').length > 0 && this.isPlain) {
            const _stored_rates: bigint[] = await this.curve.contracts[this.address].contract.stored_rates();
            return _stored_rates.map((_r, i) => toBN(_r, 36 - this.wrappedDecimals[i]));
        }

        return this.wrappedCoins.map(() => BN(1))
    }

    public async getStoredRates(useUnderlying = false): Promise<string[]> {
        try {
            const storedRatesBN = await this._storedRatesBN(useUnderlying);
            return storedRatesBN.map((rate) => rate.toString());
        } catch (error) {
            throw new Error(`Failed to get stored rates for pool ${this.name}`);
        }
    }

    _underlyingPrices = async (): Promise<number[]> => {
        const promises = [];
        for (const addr of this.underlyingCoinAddresses) {
            promises.push(_getUsdRate.call(this.curve, addr))
        }

        return await Promise.all(promises)
    }

    // NOTE! It may crash!
    _wrappedPrices = async (): Promise<number[]> => {
        const promises = [];
        for (const addr of this.wrappedCoinAddresses) {
            promises.push(_getUsdRate.call(this.curve, addr))
        }

        return await Promise.all(promises)
    }

    private async getGaugeStatus(): Promise<any> {
        const gaugeData = await _getAllGaugesFormatted();

        return gaugeData[this.gauge.address] ? gaugeData[this.gauge.address].gaugeStatus : null;
    }


    private async getIsGaugeKilled(): Promise<boolean> {
        const gaugeData = await _getAllGaugesFormatted();

        return gaugeData[this.gauge.address] ? gaugeData[this.gauge.address].is_killed : false;
    }
}