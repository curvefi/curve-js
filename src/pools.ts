import { ethers } from "ethers";
import BigNumber from 'bignumber.js'
import {
    _getCoinAddresses,
    _getCoinDecimals,
    _getBalances,
    _prepareAddresses,
    _ensureAllowance,
    _getUsdRate,
    hasAllowance,
    ensureAllowance,
    ensureAllowanceEstimateGas,
    BN,
    toBN,
    fromBN,
    toStringFromBN,
    isEth,
    getEthIndex,
    _getStatsUrl,
} from './utils';
import { DictInterface, RewardsApyInterface } from './interfaces';
import {
    ALIASES,
    POOLS_DATA,
    curve,
    BTC_COINS_LOWER_CASE,
    ETH_COINS_LOWER_CASE,
    LINK_COINS_LOWER_CASE,
    COINS,
} from "./curve";
import axios from "axios";


export class Pool {
    name: string;
    referenceAsset: string;
    swap: string;
    zap: string | null;
    lpToken: string;
    gauge: string;
    rewardContract: string | null;
    underlyingCoins: string[];
    coins: string[];
    underlyingCoinAddresses: string[];
    coinAddresses: string[];
    underlyingDecimals: number[];
    decimals: number[];
    useLending: boolean[];
    isMeta: boolean;
    isFake: boolean;
    isCrypto: boolean;
    basePool: string;
    isFactory: boolean;
    rewardTokens: string[];
    estimateGas: {
        addLiquidityApprove: (amounts: string[]) => Promise<number>,
        addLiquidity: (amounts: string[]) => Promise<number>,
        depositAndStakeApprove: (amounts: string[]) => Promise<number>,
        depositAndStake: (amounts: string[]) => Promise<number>,
        addLiquidityWrappedApprove: (amounts: string[]) => Promise<number>,
        addLiquidityWrapped: (amounts: string[]) => Promise<number>,
        depositAndStakeWrappedApprove: (amounts: string[]) => Promise<number>,
        depositAndStakeWrapped: (amounts: string[]) => Promise<number>,
        gaugeDepositApprove: (lpTokenAmount: string) => Promise<number>,
        gaugeDeposit: (lpTokenAmount: string) => Promise<number>,
        gaugeWithdraw: (lpTokenAmount: string) => Promise<number>,
        removeLiquidityApprove: (lpTokenAmount: string) => Promise<number>,
        removeLiquidity: (lpTokenAmount: string) => Promise<number>,
        removeLiquidityWrapped: (lpTokenAmount: string) => Promise<number>,
        removeLiquidityImbalanceApprove: (amounts: string[]) => Promise<number>,
        removeLiquidityImbalance: (amounts: string[]) => Promise<number>,
        removeLiquidityImbalanceWrapped: (amounts: string[]) => Promise<number>,
        removeLiquidityOneCoinApprove: (lpTokenAmount: string, coin: string | number) => Promise<number>,
        removeLiquidityOneCoin: (lpTokenAmount: string, coin: string | number) => Promise<number>,
        removeLiquidityOneCoinWrapped: (lpTokenAmount: string, coin: string | number) => Promise<number>,
        exchangeApprove: (inputCoin: string | number, amount: string) => Promise<number>,
        exchange: (inputCoin: string | number, outputCoin: string | number, amount: string, maxSlippage: number) => Promise<number>,
        exchangeWrappedApprove: (inputCoin: string | number, amount: string) => Promise<number>,
        exchangeWrapped: (inputCoin: string | number, outputCoin: string | number, amount: string, maxSlippage: number) => Promise<number>,
    };
    stats: {
        getParameters: () => Promise<{ virtualPrice: string, fee: string, adminFee: string, A: string, gamma?: string }>,
        getPoolBalances: () => Promise<string[]>,
        getPoolWrappedBalances: () => Promise<string[]>,
        getTotalLiquidity: () => Promise<string>,
        getVolume: () => Promise<string>,
        getBaseApy: () => Promise<{day: string, week: string, month: string, total: string}>,
        getTokenApy: () => Promise<[baseApy: string, boostedApy: string]>,
        getRewardsApy: () => Promise<RewardsApyInterface[]>,
    }

    constructor(name: string) {
        const poolData = POOLS_DATA[name];
        
        this.name = name;
        this.referenceAsset = poolData.reference_asset
        this.swap = poolData.swap_address;
        this.zap = poolData.deposit_address || null;
        this.lpToken = poolData.token_address;
        this.gauge = poolData.gauge_address;
        this.rewardContract = poolData.reward_contract || null;
        this.underlyingCoins = poolData.underlying_coins;
        this.coins = poolData.coins;
        this.underlyingCoinAddresses = poolData.underlying_coin_addresses;
        this.coinAddresses = poolData.coin_addresses;
        this.underlyingDecimals = poolData.underlying_decimals;
        this.decimals = poolData.decimals;
        this.useLending = poolData.use_lending;
        this.isMeta = poolData.is_meta || false;
        this.isFake = poolData.is_fake || false;
        this.isCrypto = poolData.is_crypto || false;
        this.isFactory = poolData.is_factory || false;
        this.basePool = poolData.base_pool || '';
        this.rewardTokens = poolData.reward_tokens || [];
        this.estimateGas = {
            addLiquidityApprove: this.addLiquidityApproveEstimateGas,
            addLiquidity: this.addLiquidityEstimateGas,
            depositAndStakeApprove: this.depositAndStakeApproveEstimateGas,
            depositAndStake: this.depositAndStakeEstimateGas,
            addLiquidityWrappedApprove: this.addLiquidityWrappedApproveEstimateGas,
            addLiquidityWrapped: this.addLiquidityWrappedEstimateGas,
            depositAndStakeWrappedApprove: this.depositAndStakeWrappedApproveEstimateGas,
            depositAndStakeWrapped: this.depositAndStakeWrappedEstimateGas,
            gaugeDepositApprove: this.gaugeDepositApproveEstimateGas,
            gaugeDeposit: this.gaugeDepositEstimateGas,
            gaugeWithdraw: this.gaugeWithdrawEstimateGas,
            removeLiquidityApprove: this.removeLiquidityApproveEstimateGas,
            removeLiquidity: this.removeLiquidityEstimateGas,
            removeLiquidityWrapped: this.removeLiquidityWrappedEstimateGas,
            removeLiquidityImbalanceApprove: this.removeLiquidityImbalanceApproveEstimateGas,
            removeLiquidityImbalance: this.removeLiquidityImbalanceEstimateGas,
            removeLiquidityImbalanceWrapped: this.removeLiquidityImbalanceWrappedEstimateGas,
            removeLiquidityOneCoinApprove: this.removeLiquidityOneCoinApproveEstimateGas,
            removeLiquidityOneCoin: this.removeLiquidityOneCoinEstimateGas,
            removeLiquidityOneCoinWrapped: this.removeLiquidityOneCoinWrappedEstimateGas,
            exchangeApprove: this.exchangeApproveEstimateGas,
            exchange: this.exchangeEstimateGas,
            exchangeWrappedApprove: this.exchangeWrappedApproveEstimateGas,
            exchangeWrapped: this.exchangeWrappedEstimateGas,
        }
        this.stats = {
            getParameters: this.getParameters,
            getPoolBalances: this.getPoolBalances,
            getPoolWrappedBalances: this.getPoolWrappedBalances,
            getTotalLiquidity: this.getTotalLiquidity,
            getVolume: this.getVolume,
            getBaseApy: this.getBaseApy,
            getTokenApy: this.getTokenApy,
            getRewardsApy: this.getRewardsApy,
        }

        if (this.isMeta && !this.isFake) {
            const metaCoins = poolData.meta_coin_addresses as string[];
            const metaCoinDecimals = poolData.meta_coin_decimals as number[];
            this.underlyingCoinAddresses = [this.underlyingCoinAddresses[0], ...metaCoins];
            this.underlyingDecimals = metaCoinDecimals;
        }
    }

    public calcLpTokenAmount = async (amounts: string[], isDeposit = true): Promise<string> => {
        if (amounts.length !== this.underlyingCoinAddresses.length) {
            throw Error(`${this.name} pool has ${this.underlyingCoinAddresses.length} coins (amounts provided for ${amounts.length})`);
        }

        const _amounts: ethers.BigNumber[] = amounts.map((amount: string, i: number) =>
            ethers.utils.parseUnits(amount, this.underlyingDecimals[i]));
        let _expected: ethers.BigNumber;
        if (['compound', 'usdt', 'y', 'busd', 'pax', 'aave', 'saave', 'ib', 'crveth', "cvxeth", "spelleth", "teth"].includes(this.name) || (curve.chainId === 137 && this.name === 'ren')) {
            _expected = await this._calcLpTokenAmountWithUnderlying(_amounts, isDeposit); // Lending pools
        } else if (this.isMeta) {
            _expected = await this._calcLpTokenAmountZap(_amounts, isDeposit); // Metapools
        } else {
            _expected = await this._calcLpTokenAmount(_amounts, isDeposit); // Plain pools
        }

        return ethers.utils.formatUnits(_expected);
    }

    public calcLpTokenAmountWrapped = async (amounts: string[], isDeposit = true): Promise<string> => {
        if (this.isFake) {
            throw Error(`${this.name} pool doesn't have this method`);
        }

        if (amounts.length !== this.coinAddresses.length) {
            throw Error(`${this.name} pool has ${this.coinAddresses.length} coins (amounts provided for ${amounts.length})`);
        }

        const _amounts: ethers.BigNumber[] = amounts.map((amount: string, i: number) =>
            ethers.utils.parseUnits(amount, this.decimals[i]));
        const _expected = await this._calcLpTokenAmount(_amounts, isDeposit);

        return ethers.utils.formatUnits(_expected);
    }

    private getParameters = async (): Promise<{
        virtualPrice: string,
        fee: string,
        adminFee: string,
        A: string,
        future_A?: string,
        initial_A?: string,
        future_A_time?: number,
        initial_A_time?: number,
        gamma?: string,
    }> => {
        const multicallContract = curve.contracts[this.swap].multicallContract;

        const calls = [
            multicallContract.get_virtual_price(),
            multicallContract.fee(),
            multicallContract.admin_fee(),
            multicallContract.A(),
        ]
        if (this.isCrypto) calls.push(multicallContract.gamma())

        const additionalCalls = this.isCrypto ? [] : [multicallContract.future_A()];
        if ('initial_A' in multicallContract) {
            additionalCalls.push(
                multicallContract.initial_A(),
                multicallContract.future_A_time(),
                multicallContract.initial_A_time()
            );
        }

        const [_virtualPrice, _fee, _adminFee, _A, _gamma] = await curve.multicallProvider.all(calls) as ethers.BigNumber[];
        const [virtualPrice, fee, adminFee, A, gamma] = [
            ethers.utils.formatUnits(_virtualPrice),
            ethers.utils.formatUnits(_fee, 8),
            ethers.utils.formatUnits(_adminFee.mul(_fee)),
            ethers.utils.formatUnits(_A, 0),
            _gamma ? ethers.utils.formatUnits(_gamma) : _gamma,

        ]

        const A_PRECISION = curve.chainId === 1 && ['compound', 'usdt', 'y', 'busd', 'susd', 'pax', 'ren', 'sbtc', 'hbtc', '3pool'].includes(this.name) ? 1 : 100;
        const [_future_A, _initial_A, _future_A_time, _initial_A_time] = await curve.multicallProvider.all(additionalCalls) as ethers.BigNumber[]
        const [future_A, initial_A, future_A_time, initial_A_time] = [
            _future_A ? String(Number(ethers.utils.formatUnits(_future_A, 0)) / A_PRECISION) : undefined,
            _initial_A ? String(Number(ethers.utils.formatUnits(_initial_A, 0)) / A_PRECISION) : undefined,
            _future_A_time ? Number(ethers.utils.formatUnits(_future_A_time, 0)) * 1000 : undefined,
            _initial_A_time ? Number(ethers.utils.formatUnits(_initial_A_time, 0)) * 1000 : undefined,
        ]

        return { virtualPrice, fee, adminFee, A, future_A, initial_A, future_A_time, initial_A_time, gamma };
    }

    private getPoolBalances = async (): Promise<string[]> => {
        const swapContract = curve.contracts[this.swap].multicallContract;
        const contractCalls = this.coins.map((_, i) => swapContract.balances(i));
        const _poolWrappedBalances: ethers.BigNumber[] = await curve.multicallProvider.all(contractCalls);
        let _poolUnderlyingBalances: ethers.BigNumber[] = [];

        if (this.isMeta) {
            if (this.name !== 'atricrypto3') {
                _poolWrappedBalances.unshift(_poolWrappedBalances.pop() as ethers.BigNumber);
            }
            const [_poolMetaCoinBalance, ..._poolUnderlyingBalance] = _poolWrappedBalances;

            const basePool = new Pool(this.basePool);
            const _basePoolExpectedAmounts = await basePool._calcExpectedAmounts(_poolMetaCoinBalance);
            _poolUnderlyingBalances = this.name !== 'atricrypto3' ?
                [..._poolUnderlyingBalance, ..._basePoolExpectedAmounts] :
                [..._basePoolExpectedAmounts, ..._poolUnderlyingBalance];
        } else if (['compound', 'usdt', 'y', 'busd', 'pax', 'aave', 'saave', 'ib', 'crveth', "cvxeth", "spelleth", "teth"].includes(this.name) || (curve.chainId === 137 && this.name === 'ren')) {
            const _rates: ethers.BigNumber[] = await this._getRates();
            _poolUnderlyingBalances = _poolWrappedBalances.map(
                (_b: ethers.BigNumber, i: number) => _b.mul(_rates[i]).div(ethers.BigNumber.from(10).pow(18)));
        } else {
            _poolUnderlyingBalances = _poolWrappedBalances;
        }

        return  _poolUnderlyingBalances.map((_b: ethers.BigNumber, i: number) => ethers.utils.formatUnits(_b, this.underlyingDecimals[i]))
    }

    private getPoolWrappedBalances = async (): Promise<string[]> => {
        const swapContract = curve.contracts[this.swap].multicallContract;
        const contractCalls = this.coins.map((_, i) => swapContract.balances(i));

        const _wrappedBalances: ethers.BigNumber[] = await curve.multicallProvider.all(contractCalls);
        return _wrappedBalances.map((_b, i) => ethers.utils.formatUnits(_b, this.decimals[i]));
    }

    private getTotalLiquidity = async (): Promise<string> => {
        const balances = await this.getPoolBalances();

        const promises = [];
        for (const addr of this.underlyingCoinAddresses) {
            promises.push(_getUsdRate(addr))
        }

        const prices = await Promise.all(promises);

        const totalLiquidity = (balances as string[]).reduce(
            (liquidity: number, b: string, i: number) => liquidity + (Number(b) * (prices[i] as number)), 0);

        return String(totalLiquidity)
    }

    private getVolume = async (): Promise<string> => {
        const name = (this.name === 'ren' && curve.chainId === 1) ? 'ren2' : this.name === 'sbtc' ? 'rens' : this.name;
        const statsUrl = _getStatsUrl(this.isCrypto);
        const volume = (await axios.get(statsUrl)).data.volume[name] || 0;
        const usdRate = this.isCrypto ? 1 : await _getUsdRate(this.referenceAsset);

        return String(volume * usdRate)
    }

    private getBaseApy = async (): Promise<{day: string, week: string, month: string, total: string}> => {
        const name = (this.name === 'ren' && curve.chainId === 1) ? 'ren2' : this.name === 'sbtc' ? 'rens' : this.name;
        const statsUrl = _getStatsUrl(this.isCrypto);
        const apy = (await axios.get(statsUrl)).data.apy;

        const formattedApy = [apy.day[name], apy.week[name], apy.month[name], apy.total[name]].map(
            (x: number) => (x * 100).toFixed(4)
        ) as [daily: string, weekly: string, monthly: string, total: string]

        return {
            day: formattedApy[0],
            week: formattedApy[1],
            month: formattedApy[2],
            total: formattedApy[3],
        }
    }

    private getTokenApy = async (): Promise<[baseApy: string, boostedApy: string]> => {
        if (curve.chainId === 137) throw Error(`No such method on network with id ${curve.chainId}. Use getRewardsApy instead`)

        const gaugeContract = curve.contracts[this.gauge].multicallContract;
        const lpTokenContract = curve.contracts[this.lpToken].multicallContract;
        const gaugeControllerContract = curve.contracts[ALIASES.gauge_controller].multicallContract;

        const totalLiquidityUSD = await this.getTotalLiquidity();

        const [inflation, weight, workingSupply, totalSupply] = (await curve.multicallProvider.all([
            gaugeContract.inflation_rate(),
            gaugeControllerContract.gauge_relative_weight(this.gauge),
            gaugeContract.working_supply(),
            lpTokenContract.totalSupply(),
        ]) as ethers.BigNumber[]).map((value: ethers.BigNumber) => toBN(value));

        const rate = inflation.times(weight).times(31536000).times(0.4).div(workingSupply).times(totalSupply).div(Number(totalLiquidityUSD));
        const crvRate = await _getUsdRate(ALIASES.crv);
        const baseApy = rate.times(crvRate);
        const boostedApy = baseApy.times(2.5);

        return [baseApy.times(100).toFixed(4), boostedApy.times(100).toFixed(4)]
    }

    private getRewardsApy = async (): Promise<RewardsApyInterface[]> => {
        if (curve.chainId === 137) {
            const apy: RewardsApyInterface[] = [];
            for (const rewardToken of this.rewardTokens) {
                const rewardContract = curve.contracts[this.rewardContract as string].contract;

                const totalLiquidityUSD = await this.getTotalLiquidity();
                const crvRate = await _getUsdRate(rewardToken);

                const inflation = toBN((await rewardContract.reward_data(ALIASES.crv, curve.constantOptions)).rate);
                const baseApy = inflation.times(31536000).times(crvRate).div(Number(totalLiquidityUSD))

                const rewardTokenContract = curve.contracts[rewardToken].contract;
                const symbol = await rewardTokenContract.symbol();

                apy.push({
                    token: rewardToken,
                    symbol,
                    apy: baseApy.times(100).toFixed(4),
                })
            }

            return apy
        }

        const mainPoolsGaugeRewards = (await axios.get("https://api.curve.fi/api/getMainPoolsGaugeRewards")).data.data.mainPoolsGaugeRewards;
        // @ts-ignore
        const mainPoolsGaugeRewardsLowerCase = Object.fromEntries(Object.entries(mainPoolsGaugeRewards).map((entry) => [entry[0].toLowerCase(), entry[1]]));
        const apyData = mainPoolsGaugeRewardsLowerCase[this.gauge.toLowerCase()] || [];
        const apy: RewardsApyInterface[] = [];
        for (const data of apyData) {
            apy.push({
                token: data.tokenAddress,
                symbol: data.symbol,
                apy: String(data.apy),
            })
        }

        return apy
    }

    public addLiquidityExpected = async (amounts: string[]): Promise<string> => {
        amounts = amounts.map((a, i) => Number(a).toFixed(this.underlyingDecimals[i]));
        return await this.calcLpTokenAmount(amounts);
    }

    public addLiquiditySlippage = async (amounts: string[]): Promise<string> => {
        if (this.isCrypto) {
            const prices = await this._underlyingPrices();
            const totalAmountUSD = amounts.reduce((s, a, i) => s + (Number(a) * prices[i]), 0);
            const expected = Number(await this.addLiquidityExpected(amounts));

            return await this._addLiquidityCryptoSlippage(totalAmountUSD, expected);
        }

        const totalAmount = amounts.reduce((s, a) => s + Number(a), 0);
        const expected = Number(await this.addLiquidityExpected(amounts));

        return await this._addLiquiditySlippage(totalAmount, expected);
    }

    public addLiquidityIsApproved = async (amounts: string[]): Promise<boolean> => {
        return await hasAllowance(this.underlyingCoinAddresses, amounts, curve.signerAddress, this.zap || this.swap);
    }

    private addLiquidityApproveEstimateGas = async (amounts: string[]): Promise<number> => {
        return await ensureAllowanceEstimateGas(this.underlyingCoinAddresses, amounts, this.zap || this.swap);
    }

    public addLiquidityApprove = async (amounts: string[]): Promise<string[]> => {
        return await ensureAllowance(this.underlyingCoinAddresses, amounts, this.zap || this.swap);
    }

    private addLiquidityEstimateGas = async (amounts: string[]): Promise<number> => {
        if (amounts.length !== this.underlyingCoinAddresses.length) {
            throw Error(`${this.name} pool has ${this.underlyingCoinAddresses.length} coins (amounts provided for ${amounts.length})`);
        }

        const balances = Object.values(await this.underlyingCoinBalances());
        for (let i = 0; i < balances.length; i++) {
            if (Number(balances[i]) < Number(amounts[i])) {
                throw Error(`Not enough ${this.underlyingCoins[i]}. Actual: ${balances[i]}, required: ${amounts[i]}`);
            }
        }

        if (!(await hasAllowance(this.underlyingCoinAddresses, amounts, curve.signerAddress, this.zap || this.swap))) {
            throw Error("Token allowance is needed to estimate gas")
        }

        const _amounts: ethers.BigNumber[] = amounts.map((amount: string, i: number) =>
            ethers.utils.parseUnits(amount, this.underlyingDecimals[i]));


        // Lending pools with zap
        if (['compound', 'usdt', 'y', 'busd', 'pax'].includes(this.name)) {
            return await this._addLiquidityZap(_amounts, true) as number;
        }

        // Lending pools without zap
        if (['aave', 'saave', 'ib', 'crveth', "cvxeth", "spelleth", "teth"].includes(this.name) || (curve.chainId === 137 && this.name === 'ren')) {
            return await this._addLiquidity(_amounts, true, true) as number;
        }

        // Metapools
        if (this.isMeta) {
            return await this._addLiquidityMetaZap(_amounts, true) as number;
        }

        // Plain pools
        return await this._addLiquiditySwap(_amounts, true) as number;
    }

    public balancedAmounts = async (): Promise<string[]> => {
        const poolBalances = (await this.getPoolBalances()).map(Number);
        const walletBalances = Object.values(await this.underlyingCoinBalances()).map(Number);

        if (this.isCrypto) {
            const prices = await this._underlyingPrices();
            const poolBalancesUSD = poolBalances.map((b, i) => b * prices[i]);
            const walletBalancesUSD = walletBalances.map((b, i) => b * prices[i]);
            const balancedAmountsUSD = this._balancedAmounts(poolBalancesUSD, walletBalancesUSD, this.underlyingDecimals);

            return balancedAmountsUSD.map((b, i) => String(Math.min(Number(b) / prices[i], poolBalances[i])));
        }

        return this._balancedAmounts(poolBalances, walletBalances, this.underlyingDecimals)
    }

    public addLiquidity = async (amounts: string[]): Promise<string> => {
        if (amounts.length !== this.underlyingCoinAddresses.length) {
            throw Error(`${this.name} pool has ${this.underlyingCoinAddresses.length} coins (amounts provided for ${amounts.length})`);
        }
        const _amounts: ethers.BigNumber[] = amounts.map((amount: string, i: number) =>
            ethers.utils.parseUnits(amount, this.underlyingDecimals[i]));

        await curve.updateFeeData();

        // Lending pools with zap
        if (['compound', 'usdt', 'y', 'busd', 'pax', 'tricrypto2'].includes(this.name)) {
            return await this._addLiquidityZap(_amounts) as string;
        }

        // Lending pools without zap
        if (['aave', 'saave', 'ib', 'crveth', "cvxeth", "spelleth", "teth"].includes(this.name) || (curve.chainId === 137 && this.name === 'ren')) {
            return await this._addLiquidity(_amounts, true) as string;
        }

        // Metapools
        if (this.isMeta) {
            return await this._addLiquidityMetaZap(_amounts) as string;
        }

        // Plain pools
        return await this._addLiquiditySwap(_amounts)  as string;
    }

    public depositAndStakeExpected = async (amounts: string[]): Promise<string> => {
        return await this.addLiquidityExpected(amounts);
    }

    public depositAndStakeSlippage = async (amounts: string[]): Promise<string> => {
        return await this.addLiquiditySlippage(amounts);
    }

    public depositAndStakeIsApproved = async (amounts: string[]): Promise<boolean> => {
        const coinsAllowance: boolean = await hasAllowance(this.underlyingCoinAddresses, amounts, curve.signerAddress, ALIASES.deposit_and_stake);

        const gaugeContract = curve.contracts[this.gauge].contract;
        if (Object.prototype.hasOwnProperty.call(gaugeContract, 'approved_to_deposit')) {
            const gaugeAllowance: boolean = await gaugeContract.approved_to_deposit(curve.signerAddress, ALIASES.deposit_and_stake, curve.constantOptions);
            return coinsAllowance && gaugeAllowance
        }

        return coinsAllowance;
    }

    private depositAndStakeApproveEstimateGas = async (amounts: string[]): Promise<number> => {
        const approveCoinsGas: number = await ensureAllowanceEstimateGas(this.underlyingCoinAddresses, amounts, ALIASES.deposit_and_stake);

        const gaugeContract = curve.contracts[this.gauge].contract;
        if (Object.prototype.hasOwnProperty.call(gaugeContract, 'approved_to_deposit')) {
            const gaugeAllowance: boolean = await gaugeContract.approved_to_deposit(curve.signerAddress, ALIASES.deposit_and_stake, curve.constantOptions);
            if (!gaugeAllowance) {
                const approveGaugeGas = (await gaugeContract.estimateGas.set_approve_deposit(ALIASES.deposit_and_stake, true, curve.constantOptions)).toNumber();
                return approveCoinsGas + approveGaugeGas;
            }
        }

        return approveCoinsGas;
    }

    public depositAndStakeApprove = async (amounts: string[]): Promise<string[]> => {
        const approveCoinsTx: string[] = await ensureAllowance(this.underlyingCoinAddresses, amounts, ALIASES.deposit_and_stake);

        const gaugeContract = curve.contracts[this.gauge].contract;
        if (Object.prototype.hasOwnProperty.call(gaugeContract, 'approved_to_deposit')) {
            const gaugeAllowance: boolean = await gaugeContract.approved_to_deposit(curve.signerAddress, ALIASES.deposit_and_stake, curve.constantOptions);
            if (!gaugeAllowance) {
                const gasLimit = (await gaugeContract.estimateGas.set_approve_deposit(ALIASES.deposit_and_stake, true, curve.constantOptions)).mul(130).div(100);
                const approveGaugeTx: string = (await gaugeContract.set_approve_deposit(ALIASES.deposit_and_stake, true, { ...curve.options, gasLimit })).hash;
                return [...approveCoinsTx, approveGaugeTx];
            }
        }

        return approveCoinsTx;
    }

    private depositAndStakeEstimateGas = async (amounts: string[]): Promise<number> => {
        return await this._depositAndStake(amounts, true, true) as number
    }

    public depositAndStake = async (amounts: string[]): Promise<string> => {
        return await this._depositAndStake(amounts, true, false) as string
    }

    private _depositAndStake = async (amounts: string[], isUnderlying: boolean, estimateGas: boolean): Promise<string | number> => {
        const coinAddresses = isUnderlying ? [...this.underlyingCoinAddresses] : [...this.coinAddresses];
        const coins = isUnderlying ? this.underlyingCoins : this.coinAddresses;
        const decimals = isUnderlying ? this.underlyingDecimals : this.decimals;
        const depositAddress = isUnderlying ? this.zap || this.swap : this.swap;

        if (amounts.length !== coinAddresses.length) {
            throw Error(`${this.name} pool has ${coinAddresses.length} coins (amounts provided for ${amounts.length})`);
        }

        const balances = isUnderlying ? Object.values(await this.underlyingCoinBalances()) : Object.values(await this.coinBalances());
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

        const _amounts: ethers.BigNumber[] = amounts.map((amount: string, i: number) =>
            ethers.utils.parseUnits(amount, decimals[i]));

        const contract = curve.contracts[ALIASES.deposit_and_stake].contract;
        const useUnderlying = isUnderlying && (
            ['aave', 'saave', 'ib', 'crveth', "cvxeth", "spelleth", "teth"].includes(this.name) || (curve.chainId === 137 && this.name === 'ren'));
        const _minMintAmount = isUnderlying ?
            ethers.utils.parseUnits(await this.depositAndStakeExpected(amounts)).mul(99).div(100) :
            ethers.utils.parseUnits(await this.depositAndStakeWrappedExpected(amounts)).mul(99).div(100);
        const ethIndex = getEthIndex(coinAddresses);
        const value = _amounts[ethIndex] || ethers.BigNumber.from(0);

        for (let i = 0; i < 5; i++) {
            coinAddresses[i] = coinAddresses[i] || ethers.constants.AddressZero;
            _amounts[i] = _amounts[i] || ethers.BigNumber.from(0);
        }

        const _gas = (await contract.estimateGas.deposit_and_stake(
            depositAddress,
            this.lpToken,
            this.gauge,
            coins.length,
            coinAddresses,
            _amounts,
            _minMintAmount,
            useUnderlying,
            this.isFactory && isUnderlying ? this.swap : ethers.constants.AddressZero,
            { ...curve.constantOptions, value }
        ))

        if (estimateGas) return _gas.toNumber()

        await curve.updateFeeData();
        const gasLimit = _gas.mul(200).div(100);
        return (await contract.deposit_and_stake(
            depositAddress,
            this.lpToken,
            this.gauge,
            coins.length,
            coinAddresses,
            _amounts,
            _minMintAmount,
            useUnderlying,
            this.isFactory && isUnderlying ? this.swap : ethers.constants.AddressZero,
            { ...curve.options, gasLimit, value }
        )).hash
    }

    public balancedWrappedAmounts = async (): Promise<string[]> => {
        if (this.isFake) {
            throw Error(`${this.name} pool doesn't have this method`);
        }

        const poolBalances = (await this.getPoolWrappedBalances()).map(Number);
        const walletBalances = Object.values(await this.coinBalances()).map(Number);

        if (this.isCrypto) {
            const prices = await this._wrappedPrices();
            const poolBalancesUSD = poolBalances.map((b, i) => b * prices[i]);
            const walletBalancesUSD = walletBalances.map((b, i) => b * prices[i]);
            const balancedAmountsUSD = this._balancedAmounts(poolBalancesUSD, walletBalancesUSD, this.decimals);

            return balancedAmountsUSD.map((b, i) => String(Math.min(Number(b) / prices[i], poolBalances[i])));
        }

        return this._balancedAmounts(poolBalances, walletBalances, this.decimals)
    }

    public addLiquidityWrappedExpected = async (amounts: string[]): Promise<string> => {
        if (this.isFake) {
            throw Error(`${this.name} pool doesn't have this method`);
        }

        amounts = amounts.map((a, i) => Number(a).toFixed(this.decimals[i]));
        return await this.calcLpTokenAmountWrapped(amounts);
    }

    public addLiquidityWrappedSlippage = async (amounts: string[]): Promise<string> => {
        if (this.isFake) {
            throw Error(`${this.name} pool doesn't have this method`);
        }

        if (this.isCrypto) {
            const prices = await this._wrappedPrices();
            const totalAmountUSD = amounts.reduce((s, a, i) => s + (Number(a) * prices[i]), 0);
            const expected = Number(await this.addLiquidityWrappedExpected(amounts));

            return await this._addLiquidityCryptoSlippage(totalAmountUSD, expected, false);
        }

        const totalAmount = amounts.reduce((s, a) => s + Number(a), 0);
        const expected = Number(await this.addLiquidityWrappedExpected(amounts));

        return await this._addLiquiditySlippage(totalAmount, expected, false);
    }

    public addLiquidityWrappedIsApproved = async (amounts: string[]): Promise<boolean> => {
        if (this.isFake) {
            throw Error(`${this.name} pool doesn't have this method`);
        }

        return await hasAllowance(this.coinAddresses, amounts, curve.signerAddress, this.swap);
    }

    private addLiquidityWrappedApproveEstimateGas = async (amounts: string[]): Promise<number> => {
        if (this.isFake) {
            throw Error(`${this.name} pool doesn't have this method`);
        }

        return await ensureAllowanceEstimateGas(this.coinAddresses, amounts, this.swap);
    }

    public addLiquidityWrappedApprove = async (amounts: string[]): Promise<string[]> => {
        if (this.isFake) {
            throw Error(`${this.name} pool doesn't have this method`);
        }

        return await ensureAllowance(this.coinAddresses, amounts, this.swap);
    }

    private addLiquidityWrappedEstimateGas = async (amounts: string[]): Promise<number> => {
        if (this.isFake) {
            throw Error(`${this.name} pool doesn't have this method`);
        }

        if (amounts.length !== this.coinAddresses.length) {
            throw Error(`${this.name} pool has ${this.coinAddresses.length} coins (amounts provided for ${amounts.length})`);
        }

        const balances = Object.values(await this.coinBalances());
        for (let i = 0; i < balances.length; i++) {
            if (Number(balances[i]) < Number(amounts[i])) {
                throw Error(`Not enough ${this.coins[i]}. Actual: ${balances[i]}, required: ${amounts[i]}`);
            }
        }

        if (!(await hasAllowance(this.coinAddresses, amounts, curve.signerAddress, this.swap))) {
            throw Error("Token allowance is needed to estimate gas")
        }

        const _amounts: ethers.BigNumber[] = amounts.map((amount: string, i: number) =>
            ethers.utils.parseUnits(amount, this.decimals[i]));

        // Lending pools without zap
        if (['aave', 'saave', 'ib', 'crveth', "cvxeth", "spelleth", "teth"].includes(this.name) || (curve.chainId === 137 && this.name === 'ren')) {
            return await this._addLiquidity(_amounts, false, true) as number;
        }

        // Lending pools with zap and metapools
        return await this._addLiquiditySwap(_amounts, true) as number;
    }

    public addLiquidityWrapped = async (amounts: string[]): Promise<string> => {
        if (this.isFake) {
            throw Error(`${this.name} pool doesn't have this method`);
        }

        if (amounts.length !== this.coinAddresses.length) {
            throw Error(`${this.name} pool has ${this.coinAddresses.length} coins (amounts provided for ${amounts.length})`);
        }
        const _amounts: ethers.BigNumber[] = amounts.map((amount: string, i: number) =>
            ethers.utils.parseUnits(amount, this.decimals[i]));

        await curve.updateFeeData();

        // Lending pools without zap
        if (['aave', 'saave', 'ib', 'crveth', "cvxeth", "spelleth", "teth"].includes(this.name) || (curve.chainId === 137 && this.name === 'ren')) {
            return await this._addLiquidity(_amounts, false) as string;
        }

        // Lending pools with zap and metapools
        return await this._addLiquiditySwap(_amounts) as string;
    }

    public depositAndStakeWrappedExpected = async (amounts: string[]): Promise<string> => {
        if (this.isFake) {
            throw Error(`${this.name} pool doesn't have this method`);
        }

        return await this.addLiquidityWrappedExpected(amounts);
    }

    public depositAndStakeWrappedSlippage = async (amounts: string[]): Promise<string> => {
        if (this.isFake) {
            throw Error(`${this.name} pool doesn't have this method`);
        }

        return await this.addLiquidityWrappedSlippage(amounts);
    }

    public depositAndStakeWrappedIsApproved = async (amounts: string[]): Promise<boolean> => {
        if (this.isFake) {
            throw Error(`${this.name} pool doesn't have this method`);
        }

        const coinsAllowance: boolean = await hasAllowance(this.coinAddresses, amounts, curve.signerAddress, ALIASES.deposit_and_stake);

        const gaugeContract = curve.contracts[this.gauge].contract;
        if (Object.prototype.hasOwnProperty.call(gaugeContract, 'approved_to_deposit')) {
            const gaugeAllowance: boolean = await gaugeContract.approved_to_deposit(curve.signerAddress, ALIASES.deposit_and_stake, curve.constantOptions);
            return coinsAllowance && gaugeAllowance
        }

        return coinsAllowance;
    }

    private depositAndStakeWrappedApproveEstimateGas = async (amounts: string[]): Promise<number> => {
        if (this.isFake) {
            throw Error(`${this.name} pool doesn't have this method`);
        }

        const approveCoinsGas: number = await ensureAllowanceEstimateGas(this.coinAddresses, amounts, ALIASES.deposit_and_stake);

        const gaugeContract = curve.contracts[this.gauge].contract;
        if (Object.prototype.hasOwnProperty.call(gaugeContract, 'approved_to_deposit')) {
            const gaugeAllowance: boolean = await gaugeContract.approved_to_deposit(curve.signerAddress, ALIASES.deposit_and_stake, curve.constantOptions);
            if (!gaugeAllowance) {
                const approveGaugeGas = (await gaugeContract.estimateGas.set_approve_deposit(ALIASES.deposit_and_stake, true, curve.constantOptions)).toNumber();
                return approveCoinsGas + approveGaugeGas;
            }
        }

        return approveCoinsGas;
    }

    public depositAndStakeWrappedApprove = async (amounts: string[]): Promise<string[]> => {
        if (this.isFake) {
            throw Error(`${this.name} pool doesn't have this method`);
        }

        const approveCoinsTx: string[] = await ensureAllowance(this.coinAddresses, amounts, ALIASES.deposit_and_stake);

        const gaugeContract = curve.contracts[this.gauge].contract;
        if (Object.prototype.hasOwnProperty.call(gaugeContract, 'approved_to_deposit')) {
            const gaugeAllowance: boolean = await gaugeContract.approved_to_deposit(curve.signerAddress, ALIASES.deposit_and_stake, curve.constantOptions);
            if (!gaugeAllowance) {
                const gasLimit = (await gaugeContract.estimateGas.set_approve_deposit(ALIASES.deposit_and_stake, true, curve.constantOptions)).mul(130).div(100);
                const approveGaugeTx: string = (await gaugeContract.set_approve_deposit(ALIASES.deposit_and_stake, true, { ...curve.options, gasLimit })).hash;
                return [...approveCoinsTx, approveGaugeTx];
            }
        }

        return approveCoinsTx;
    }

    private depositAndStakeWrappedEstimateGas = async (amounts: string[]): Promise<number> => {
        if (this.isFake) {
            throw Error(`${this.name} pool doesn't have this method`);
        }

        return await this._depositAndStake(amounts, false, true) as number
    }

    public depositAndStakeWrapped = async (amounts: string[]): Promise<string> => {
        if (this.isFake) {
            throw Error(`${this.name} pool doesn't have this method`);
        }

        return await this._depositAndStake(amounts, false, false) as string
    }

    public removeLiquidityExpected = async (lpTokenAmount: string): Promise<string[]> => {
        const _lpTokenAmount = ethers.utils.parseUnits(lpTokenAmount);

        let _expected: ethers.BigNumber[];
        if (['compound', 'usdt', 'y', 'busd', 'pax', 'aave', 'saave', 'ib', 'crveth', "cvxeth", "spelleth", "teth"].includes(this.name) || (curve.chainId === 137 && this.name === 'ren')) {
            _expected = await this._calcExpectedUnderlyingAmounts(_lpTokenAmount); // Lending pools
        } else if (this.isMeta) {
            _expected = await this._calcExpectedUnderlyingAmountsMeta(_lpTokenAmount); // Metapools
        } else {
            _expected = await this._calcExpectedAmounts(_lpTokenAmount); // Plain pools
        }

        return _expected.map((amount: ethers.BigNumber, i: number) => ethers.utils.formatUnits(amount, this.underlyingDecimals[i]));
    }

    public removeLiquidityIsApproved = async (lpTokenAmount: string): Promise<boolean> => {
        if (!['compound', 'usdt', 'y', 'busd', 'pax', 'tricrypto2'].includes(this.name) && !this.isMeta) return true
        return await hasAllowance([this.lpToken], [lpTokenAmount], curve.signerAddress, this.zap as string);
    }

    private removeLiquidityApproveEstimateGas = async (lpTokenAmount: string): Promise<number> => {
        if (!['compound', 'usdt', 'y', 'busd', 'pax', 'tricrypto2'].includes(this.name) && !this.isMeta) return 0;
        return await ensureAllowanceEstimateGas([this.lpToken], [lpTokenAmount], this.zap as string);
    }

    public removeLiquidityApprove = async (lpTokenAmount: string): Promise<string[]> => {
        if (!['compound', 'usdt', 'y', 'busd', 'pax', 'tricrypto2'].includes(this.name) && !this.isMeta) return [];
        return await ensureAllowance([this.lpToken], [lpTokenAmount], this.zap as string);
    }

    private removeLiquidityEstimateGas = async (lpTokenAmount: string): Promise<number> => {
        const lpTokenBalance = (await this.lpTokenBalances())['lpToken'];
        if (Number(lpTokenBalance) < Number(lpTokenAmount)) {
            throw Error(`Not enough LP tokens. Actual: ${lpTokenBalance}, required: ${lpTokenAmount}`);
        }

        if (this.zap && !(await hasAllowance([this.lpToken], [lpTokenAmount], curve.signerAddress, this.zap))) {
            throw Error("Token allowance is needed to estimate gas")
        }

        const _lpTokenAmount = ethers.utils.parseUnits(lpTokenAmount);

        if (['compound', 'usdt', 'y', 'busd', 'pax', 'tricrypto2'].includes(this.name)) {
            return await this._removeLiquidityZap(_lpTokenAmount, true) as number;
        }

        if (['aave', 'saave', 'ib', 'crveth', "cvxeth", "spelleth", "teth"].includes(this.name) || (curve.chainId === 137 && this.name === 'ren')) {
            return await this._removeLiquidity(_lpTokenAmount, true, true) as number;
        }

        if (this.isMeta) {
            return await this._removeLiquidityMetaZap(_lpTokenAmount, true) as number;
        }

        return await this._removeLiquiditySwap(_lpTokenAmount, true) as number;
    }

    public removeLiquidity = async (lpTokenAmount: string): Promise<string> => {
        const _lpTokenAmount = ethers.utils.parseUnits(lpTokenAmount);

        await curve.updateFeeData();

        if (['compound', 'usdt', 'y', 'busd', 'pax', 'tricrypto2'].includes(this.name)) {
            return await this._removeLiquidityZap(_lpTokenAmount) as string;
        }

        if (['aave', 'saave', 'ib', 'crveth', "cvxeth", "spelleth", "teth"].includes(this.name) || (curve.chainId === 137 && this.name === 'ren')) {
            return await this._removeLiquidity(_lpTokenAmount, true) as string;
        }

        if (this.isMeta) {
            return await this._removeLiquidityMetaZap(_lpTokenAmount) as string;
        }

        return await this._removeLiquiditySwap(_lpTokenAmount) as string;
    }

    public removeLiquidityWrappedExpected = async (lpTokenAmount: string): Promise<string[]> => {
        if (this.isFake) {
            throw Error(`${this.name} pool doesn't have this method`);
        }

        const _lpTokenAmount = ethers.utils.parseUnits(lpTokenAmount);
        const _expected = await this._calcExpectedAmounts(_lpTokenAmount)

        return _expected.map((amount: ethers.BigNumber, i: number) => ethers.utils.formatUnits(amount, this.decimals[i]));
    }

    private removeLiquidityWrappedEstimateGas = async (lpTokenAmount: string): Promise<number> => {
        if (this.isFake) {
            throw Error(`${this.name} pool doesn't have this method`);
        }

        const _lpTokenAmount = ethers.utils.parseUnits(lpTokenAmount);

        const lpTokenBalance = (await this.lpTokenBalances())['lpToken'];
        if (Number(lpTokenBalance) < Number(lpTokenAmount)) {
            throw Error(`Not enough LP tokens. Actual: ${lpTokenBalance}, required: ${lpTokenAmount}`);
        }

        if (['aave', 'saave', 'ib', 'crveth', "cvxeth", "spelleth", "teth"].includes(this.name) || (curve.chainId === 137 && this.name === 'ren')) {
            return await this._removeLiquidity(_lpTokenAmount, false, true) as number;
        }

        return await this._removeLiquiditySwap(_lpTokenAmount, true) as number;
    }

    public removeLiquidityWrapped = async (lpTokenAmount: string): Promise<string> => {
        if (this.isFake) {
            throw Error(`${this.name} pool doesn't have this method`);
        }

        const _lpTokenAmount = ethers.utils.parseUnits(lpTokenAmount);

        await curve.updateFeeData();

        if (['aave', 'saave', 'ib', 'crveth', "cvxeth", "spelleth", "teth"].includes(this.name) || (curve.chainId === 137 && this.name === 'ren')) {
            return await this._removeLiquidity(_lpTokenAmount, false) as string;
        }

        return await this._removeLiquiditySwap(_lpTokenAmount) as string;
    }

    public removeLiquidityImbalanceExpected = async (amounts: string[]): Promise<string> => {
        if (this.isCrypto) {
            throw Error(`${this.name} pool doesn't have remove_liquidity_imbalance method`);
        }

        amounts = amounts.map((a, i) => Number(a).toFixed(this.underlyingDecimals[i]));
        return await this.calcLpTokenAmount(amounts, false);
    }

    public removeLiquidityImbalanceSlippage = async (amounts: string[]): Promise<string> => {
        if (this.isCrypto) {
            throw Error(`${this.name} pool doesn't have remove_liquidity_imbalance method`);
        }

        const totalAmount = amounts.reduce((s, a) => s + Number(a), 0);
        const expected = Number(await this.removeLiquidityImbalanceExpected(amounts));

        return await this._removeLiquiditySlippage(totalAmount, expected);
    }

    public removeLiquidityImbalanceIsApproved = async (amounts: string[]): Promise<boolean> => {
        if (this.isCrypto) {
            throw Error(`${this.name} pool doesn't have remove_liquidity_imbalance method`);
        }

        const _amounts: ethers.BigNumber[] = amounts.map((amount: string, i: number) => ethers.utils.parseUnits(amount, this.underlyingDecimals[i]));

        if (['compound', 'usdt', 'y', 'busd', 'pax'].includes(this.name)) {
            const _maxBurnAmount = (await this._calcLpTokenAmountWithUnderlying(_amounts, false)).mul(101).div(100);
            return await hasAllowance([this.lpToken], [ethers.utils.formatUnits(_maxBurnAmount, 18)], curve.signerAddress, this.zap as string);
        } else if (this.isMeta) {
            const _maxBurnAmount = (await this._calcLpTokenAmountZap(_amounts, false)).mul(101).div(100);
            return await hasAllowance([this.lpToken], [ethers.utils.formatUnits(_maxBurnAmount, 18)], curve.signerAddress, this.zap as string);
        } else {
            return true;
        }
    }

    private removeLiquidityImbalanceApproveEstimateGas = async (amounts: string[]): Promise<number> => {
        if (this.isCrypto) {
            throw Error(`${this.name} pool doesn't have remove_liquidity_imbalance method`);
        }

        const _amounts: ethers.BigNumber[] = amounts.map((amount: string, i: number) => ethers.utils.parseUnits(amount, this.underlyingDecimals[i]));

        if (['compound', 'usdt', 'y', 'busd', 'pax'].includes(this.name)) {
            const _maxBurnAmount = (await this._calcLpTokenAmountWithUnderlying(_amounts, false)).mul(101).div(100);
            return await ensureAllowanceEstimateGas([this.lpToken], [ethers.utils.formatUnits(_maxBurnAmount, 18)], this.zap as string);
        } else if (this.isMeta) {
            const _maxBurnAmount = (await this._calcLpTokenAmountZap(_amounts, false)).mul(101).div(100);
            return await ensureAllowanceEstimateGas([this.lpToken], [ethers.utils.formatUnits(_maxBurnAmount, 18)], this.zap as string);
        } else {
            return 0;
        }
    }

    public removeLiquidityImbalanceApprove = async (amounts: string[]): Promise<string[]> => {
        if (this.isCrypto) {
            throw Error(`${this.name} pool doesn't have remove_liquidity_imbalance method`);
        }

        const _amounts: ethers.BigNumber[] = amounts.map((amount: string, i: number) => ethers.utils.parseUnits(amount, this.underlyingDecimals[i]));

        if (['compound', 'usdt', 'y', 'busd', 'pax'].includes(this.name)) {
            const _maxBurnAmount = (await this._calcLpTokenAmountWithUnderlying(_amounts, false)).mul(101).div(100);
            return await ensureAllowance([this.lpToken], [ethers.utils.formatUnits(_maxBurnAmount, 18)], this.zap as string);
        } else if (this.isMeta) {
            const _maxBurnAmount = (await this._calcLpTokenAmountZap(_amounts, false)).mul(101).div(100);
            return await ensureAllowance([this.lpToken], [ethers.utils.formatUnits(_maxBurnAmount, 18)], this.zap as string);
        } else {
            return [];
        }
    }

    private removeLiquidityImbalanceEstimateGas = async (amounts: string[]): Promise<number> => {
        if (this.isCrypto) {
            throw Error(`${this.name} pool doesn't have remove_liquidity_imbalance method`);
        }

        const lpTokenAmount = await this.removeLiquidityImbalanceExpected(amounts);
        const lpTokenBalance = (await this.lpTokenBalances())['lpToken'];
        if (Number(lpTokenBalance) < Number(lpTokenAmount)) {
            throw Error(`Not enough LP tokens. Actual: ${lpTokenBalance}, required: ${lpTokenAmount}`);
        }

        if (this.zap && !(await hasAllowance([this.lpToken], [lpTokenAmount], curve.signerAddress, this.zap))) {
            throw Error("Token allowance is needed to estimate gas")
        }

        const _amounts: ethers.BigNumber[] = amounts.map((amount: string, i: number) => ethers.utils.parseUnits(amount, this.underlyingDecimals[i]));

        // Lending pools with zap
        if (['compound', 'usdt', 'y', 'busd', 'pax'].includes(this.name)) {
            return await this._removeLiquidityImbalanceZap(_amounts, true) as number;
        }

        // Lending pools without zap
        if (['aave', 'saave', 'ib'].includes(this.name) || (curve.chainId === 137 && this.name === 'ren')) {
            return await this._removeLiquidityImbalance(_amounts, true, true) as number;
        }

        // Metapools
        if (this.isMeta) {
            return await this._removeLiquidityImbalanceMetaZap(_amounts, true) as number;
        }

        return await this._removeLiquidityImbalanceSwap(_amounts, true) as number;
    }

    public removeLiquidityImbalance = async (amounts: string[]): Promise<string> => {
        if (this.isCrypto) {
            throw Error(`${this.name} pool doesn't have remove_liquidity_imbalance method`);
        }

        const _amounts: ethers.BigNumber[] = amounts.map((amount: string, i: number) => ethers.utils.parseUnits(amount, this.underlyingDecimals[i]));

        await curve.updateFeeData();

        // Lending pools with zap
        if (['compound', 'usdt', 'y', 'busd', 'pax'].includes(this.name)) {
            return await this._removeLiquidityImbalanceZap(_amounts) as string;
        }

        // Lending pools without zap
        if (['aave', 'saave', 'ib'].includes(this.name) || (curve.chainId === 137 && this.name === 'ren')) {
            return await this._removeLiquidityImbalance(_amounts, true) as string;
        }

        // Metapools
        if (this.isMeta) {
            return await this._removeLiquidityImbalanceMetaZap(_amounts) as string;
        }

        return await this._removeLiquidityImbalanceSwap(_amounts) as string;
    }

    public removeLiquidityImbalanceWrappedExpected = async (amounts: string[]): Promise<string> => {
        if (this.isCrypto) {
            throw Error(`${this.name} pool doesn't have remove_liquidity_imbalance method`);
        }

        amounts = amounts.map((a, i) => Number(a).toFixed(this.underlyingDecimals[i]));
        return await this.calcLpTokenAmountWrapped(amounts, false);
    }

    public removeLiquidityImbalanceWrappedSlippage = async (amounts: string[]): Promise<string> => {
        if (this.isCrypto) {
            throw Error(`${this.name} pool doesn't have remove_liquidity_imbalance method`);
        }

        const totalAmount = amounts.reduce((s, a) => s + Number(a), 0);
        const expected = Number(await this.removeLiquidityImbalanceWrappedExpected(amounts));

        return await this._removeLiquiditySlippage(totalAmount, expected, false);
    }

    private removeLiquidityImbalanceWrappedEstimateGas = async (amounts: string[]): Promise<number> => {
        if (this.isCrypto) {
            throw Error(`${this.name} pool doesn't have remove_liquidity_imbalance method`);
        }

        const lpTokenAmount = await this.removeLiquidityImbalanceExpected(amounts);
        const lpTokenBalance = (await this.lpTokenBalances())['lpToken'];
        if (Number(lpTokenBalance) < Number(lpTokenAmount)) {
            throw Error(`Not enough LP tokens. Actual: ${lpTokenBalance}, required: ${lpTokenAmount}`);
        }

        const _amounts: ethers.BigNumber[] = amounts.map((amount: string, i: number) => ethers.utils.parseUnits(amount, this.decimals[i]));

        if (['aave', 'saave', 'ib'].includes(this.name) || (curve.chainId === 137 && this.name === 'ren')) {
            return await this._removeLiquidityImbalance(_amounts, false, true) as number;
        }

        return await this._removeLiquidityImbalanceSwap(_amounts, true) as number;
    }

    public removeLiquidityImbalanceWrapped = async (amounts: string[], estimateGas = false): Promise<string | number> => {
        if (this.isCrypto) {
            throw Error(`${this.name} pool doesn't have remove_liquidity_imbalance method`);
        }

        const _amounts: ethers.BigNumber[] = amounts.map((amount: string, i: number) => ethers.utils.parseUnits(amount, this.decimals[i]));

        await curve.updateFeeData();

        if (['aave', 'saave', 'ib'].includes(this.name) || (curve.chainId === 137 && this.name === 'ren')) {
            return await this._removeLiquidityImbalance(_amounts, false, estimateGas);
        }

        return await this._removeLiquidityImbalanceSwap(_amounts, estimateGas);
    }

    public removeLiquidityOneCoinExpected = async (lpTokenAmount: string, coin: string | number): Promise<string> => {
        const i = this._getCoinIdx(coin);
        const _lpTokenAmount = ethers.utils.parseUnits(lpTokenAmount);

        let _expected: ethers.BigNumber;
        if (['compound', 'usdt', 'y', 'busd', 'pax'].includes(this.name) || this.name === 'susd' || this.isMeta) {
            _expected = await this._calcWithdrawOneCoinZap(_lpTokenAmount, i); // Lending pools with zap, susd and metapools
        } else if (this.name === 'ib') {
            _expected = await this._calcWithdrawOneCoin(_lpTokenAmount, i, true); // ib
        } else {
            _expected = await this._calcWithdrawOneCoinSwap(_lpTokenAmount, i); // Aave, saave and plain pools
        }

        return ethers.utils.formatUnits(_expected, this.underlyingDecimals[i]);
    }

    public removeLiquidityOneCoinSlippage = async (lpTokenAmount: string, coin: string | number): Promise<string> => {
        const totalAmount = Number(await this.removeLiquidityOneCoinExpected(lpTokenAmount, coin));

        if (this.isCrypto) {
            const coinPrice = (await this._underlyingPrices())[this._getCoinIdx(coin)];
            return await this._removeLiquidityCryptoSlippage(totalAmount * coinPrice, Number(lpTokenAmount));
        }

        return await this._removeLiquiditySlippage(totalAmount, Number(lpTokenAmount));
    }

    public removeLiquidityOneCoinIsApproved = async (lpTokenAmount: string): Promise<boolean> => {
        if (!['compound', 'usdt', 'y', 'busd', 'pax', 'tricrypto2'].includes(this.name) && !(this.name === 'susd') && !this.isMeta) return true

        return await hasAllowance([this.lpToken], [lpTokenAmount], curve.signerAddress, this.zap as string);
    }

    private removeLiquidityOneCoinApproveEstimateGas = async (lpTokenAmount: string): Promise<number> => {
        if (!['compound', 'usdt', 'y', 'busd', 'pax', 'tricrypto2'].includes(this.name) && !(this.name === 'susd') && !this.isMeta) return 0
        return await ensureAllowanceEstimateGas([this.lpToken], [lpTokenAmount], this.zap as string);
    }

    public removeLiquidityOneCoinApprove = async (lpTokenAmount: string): Promise<string[]> => {
        if (!['compound', 'usdt', 'y', 'busd', 'pax', 'tricrypto2'].includes(this.name) && !(this.name === 'susd') && !this.isMeta) return []
        return await ensureAllowance([this.lpToken], [lpTokenAmount], this.zap as string);
    }

    private removeLiquidityOneCoinEstimateGas = async (lpTokenAmount: string, coin: string | number): Promise<number> => {
        const lpTokenBalance = (await this.lpTokenBalances())['lpToken'];
        if (Number(lpTokenBalance) < Number(lpTokenAmount)) {
            throw Error(`Not enough LP tokens. Actual: ${lpTokenBalance}, required: ${lpTokenAmount}`);
        }

        if (this.zap && !(await hasAllowance([this.lpToken], [lpTokenAmount], curve.signerAddress, this.zap))) {
            throw Error("Token allowance is needed to estimate gas")
        }

        const i = this._getCoinIdx(coin);
        const _lpTokenAmount = ethers.utils.parseUnits(lpTokenAmount);

        // Lending pools with zap, susd and metapools
        if (['compound', 'usdt', 'y', 'busd', 'pax', 'tricrypto2'].includes(this.name) || this.name === 'susd' || this.isMeta) {
            return await this._removeLiquidityOneCoinZap(_lpTokenAmount, i, true) as number;
        }

        // Lending pools without zap
        if (['aave', 'saave', 'ib', 'crveth', "cvxeth", "spelleth", "teth"].includes(this.name) || (curve.chainId === 137 && this.name === 'ren')) {
            return await this._removeLiquidityOneCoin(_lpTokenAmount, i,true, true) as number;
        }

        // Plain pools
        return await this._removeLiquidityOneCoinSwap(_lpTokenAmount, i, true) as number
    }

    public removeLiquidityOneCoin = async (lpTokenAmount: string, coin: string | number): Promise<string> => {
        const i = this._getCoinIdx(coin);
        const _lpTokenAmount = ethers.utils.parseUnits(lpTokenAmount);

        await curve.updateFeeData();

        // Lending pools with zap, susd and metapools
        if (['compound', 'usdt', 'y', 'busd', 'pax', 'tricrypto2'].includes(this.name) || this.name === 'susd' || this.isMeta) {
            return await this._removeLiquidityOneCoinZap(_lpTokenAmount, i) as string;
        }

        // Lending pools without zap
        if (['aave', 'saave', 'ib', 'crveth', "cvxeth", "spelleth", "teth"].includes(this.name) || (curve.chainId === 137 && this.name === 'ren')) {
            return await this._removeLiquidityOneCoin(_lpTokenAmount, i,true) as string;
        }

        // Plain pools
        return await this._removeLiquidityOneCoinSwap(_lpTokenAmount, i) as string
    }

    public removeLiquidityOneCoinWrappedExpected = async (lpTokenAmount: string, coin: string | number): Promise<string> => {
        if (this.isFake) {
            throw Error(`${this.name} pool doesn't have this method`);
        }

        if (['compound', 'usdt', 'y', 'busd', 'pax'].includes(this.name)) {
            throw Error(`${this.name} pool doesn't have remove_liquidity_one_coin method for wrapped tokens`);
        }

        const i = this._getCoinIdx(coin, false);
        const _lpTokenAmount = ethers.utils.parseUnits(lpTokenAmount);

        let _expected: ethers.BigNumber;
        if (this.name === 'ib') {
            _expected = await this._calcWithdrawOneCoin(_lpTokenAmount, i, false); // ib
        } else {
            _expected = await this._calcWithdrawOneCoinSwap(_lpTokenAmount, i); // All other pools
        }

        return ethers.utils.formatUnits(_expected, this.decimals[i]);
    }

    public removeLiquidityOneCoinWrappedSlippage = async (lpTokenAmount: string, coin: string | number): Promise<string> => {
        if (this.isFake) {
            throw Error(`${this.name} pool doesn't have this method`);
        }

        const totalAmount = Number(await this.removeLiquidityOneCoinWrappedExpected(lpTokenAmount, coin));

        if (this.isCrypto) {
            const coinPrice = (await this._underlyingPrices())[this._getCoinIdx(coin, false)];
            return await this._removeLiquidityCryptoSlippage(totalAmount * coinPrice, Number(lpTokenAmount));
        }

        return await this._removeLiquiditySlippage(totalAmount, Number(lpTokenAmount), false);
    }


    private removeLiquidityOneCoinWrappedEstimateGas = async (lpTokenAmount: string, coin: string | number): Promise<number> => {
        if (this.isFake) {
            throw Error(`${this.name} pool doesn't have this method`);
        }

        const lpTokenBalance = (await this.lpTokenBalances())['lpToken'];
        if (Number(lpTokenBalance) < Number(lpTokenAmount)) {
            throw Error(`Not enough LP tokens. Actual: ${lpTokenBalance}, required: ${lpTokenAmount}`);
        }

        const i = this._getCoinIdx(coin, false);
        if (['compound', 'usdt', 'y', 'busd', 'pax'].includes(this.name)) {
            throw Error(`${this.name} pool doesn't have remove_liquidity_one_coin method for wrapped tokens`);
        }

        const _lpTokenAmount = ethers.utils.parseUnits(lpTokenAmount);

        // Lending pools without zap
        if (['aave', 'saave', 'ib', 'crveth', "cvxeth", "spelleth", "teth"].includes(this.name) || (curve.chainId === 137 && this.name === 'ren')) {
            return await this._removeLiquidityOneCoin(_lpTokenAmount, i,false, true) as number;
        }

        return await this._removeLiquidityOneCoinSwap(_lpTokenAmount, i, true) as number;
    }


    public removeLiquidityOneCoinWrapped = async (lpTokenAmount: string, coin: string | number): Promise<string> => {
        if (this.isFake) {
            throw Error(`${this.name} pool doesn't have this method`);
        }

        const i = this._getCoinIdx(coin, false);
        if (['compound', 'usdt', 'y', 'busd', 'pax'].includes(this.name)) {
            throw Error(`${this.name} pool doesn't have remove_liquidity_one_coin method for wrapped tokens`);
        }

        await curve.updateFeeData();

        const _lpTokenAmount = ethers.utils.parseUnits(lpTokenAmount);

        // Lending pools without zap
        if (['aave', 'saave', 'ib', 'crveth', "cvxeth", "spelleth", "teth"].includes(this.name) || (curve.chainId === 137 && this.name === 'ren')) {
            return await this._removeLiquidityOneCoin(_lpTokenAmount, i,false) as string;
        }

        return await this._removeLiquidityOneCoinSwap(_lpTokenAmount, i) as string;
    }

    public gaugeDepositIsApproved = async (lpTokenAmount: string): Promise<boolean> => {
        return await hasAllowance([this.lpToken], [lpTokenAmount], curve.signerAddress, this.gauge);
    }

    private gaugeDepositApproveEstimateGas = async (lpTokenAmount: string): Promise<number> => {
        return await ensureAllowanceEstimateGas([this.lpToken], [lpTokenAmount], this.gauge);
    }

    public gaugeDepositApprove = async (lpTokenAmount: string): Promise<string[]> => {
        return await ensureAllowance([this.lpToken], [lpTokenAmount], this.gauge);
    }

    private gaugeDepositEstimateGas = async (lpTokenAmount: string): Promise<number> => {
        const _lpTokenAmount = ethers.utils.parseUnits(lpTokenAmount);
        return (await curve.contracts[this.gauge].contract.estimateGas.deposit(_lpTokenAmount, curve.constantOptions)).toNumber();
    }

    public gaugeDeposit = async (lpTokenAmount: string): Promise<string> => {
        const _lpTokenAmount = ethers.utils.parseUnits(lpTokenAmount);
        await _ensureAllowance([this.lpToken], [_lpTokenAmount], this.gauge)

        const gasLimit = (await curve.contracts[this.gauge].contract.estimateGas.deposit(_lpTokenAmount, curve.constantOptions)).mul(150).div(100);
        return (await curve.contracts[this.gauge].contract.deposit(_lpTokenAmount, { ...curve.options, gasLimit })).hash;
    }

    private gaugeWithdrawEstimateGas = async (lpTokenAmount: string): Promise<number> => {
        const _lpTokenAmount = ethers.utils.parseUnits(lpTokenAmount);
        return (await curve.contracts[this.gauge].contract.estimateGas.withdraw(_lpTokenAmount, curve.constantOptions)).toNumber();
    }

    public gaugeWithdraw = async (lpTokenAmount: string): Promise<string> => {
        const _lpTokenAmount = ethers.utils.parseUnits(lpTokenAmount);

        const gasLimit = (await curve.contracts[this.gauge].contract.estimateGas.withdraw(_lpTokenAmount, curve.constantOptions)).mul(180).div(100);
        return (await curve.contracts[this.gauge].contract.withdraw(_lpTokenAmount, { ...curve.options, gasLimit })).hash;
    }

    public gaugeClaimableTokens = async (address = ""): Promise<string> => {
        if (curve.chainId !== 1) throw Error(`No such method on network with id ${curve.chainId}. Use gaugeClaimableRewards instead`)

        address = address || curve.signerAddress;
        if (!address) throw Error("Need to connect wallet or pass address into args");

        return ethers.utils.formatUnits(await curve.contracts[this.gauge].contract.claimable_tokens(address, curve.constantOptions));
    }

    public gaugeClaimTokens = async (): Promise<string> => {
        if (curve.chainId !== 1) throw Error(`No such method on network with id ${curve.chainId}. Use gaugeClaimRewards instead`)

        const gasLimit = (await curve.contracts[ALIASES.minter].contract.estimateGas.mint(this.gauge, curve.constantOptions)).mul(130).div(100);
        return (await curve.contracts[ALIASES.minter].contract.mint(this.gauge, { ...curve.options, gasLimit })).hash;
    }

    // TODO 1. Fix aave and saave error
    // TODO 2. Figure out Synthetix cumulative results
    public gaugeClaimableRewards = async (address = ""): Promise<{token: string, symbol: string, amount: string}[]> => {
        address = address || curve.signerAddress;
        if (!address) throw Error("Need to connect wallet or pass address into args");

        const gaugeContract = curve.contracts[this.gauge].contract;
        const rewards = [];
        if ('claimable_reward(address,address)' in gaugeContract) {
            for (const rewardToken of this.rewardTokens) {
                const rewardTokenContract = curve.contracts[rewardToken].contract;
                const symbol = await rewardTokenContract.symbol();
                const decimals = await rewardTokenContract.decimals();

                const method = curve.chainId === 1 ? "claimable_reward" : "claimable_reward_write";
                const amount = ethers.utils.formatUnits(await gaugeContract[method](address, rewardToken, curve.constantOptions), decimals);
                rewards.push({
                    token: rewardToken,
                    symbol: symbol,
                    amount: amount,
                })
            }
        } else if ('claimable_reward(address)' in gaugeContract && this.rewardTokens.length > 0) {
            const rewardToken = this.rewardTokens[0];
            const rewardTokenContract = curve.contracts[rewardToken].contract;
            const symbol = await rewardTokenContract.symbol();
            const decimals = await rewardTokenContract.decimals();
            const amount = ethers.utils.formatUnits(await gaugeContract.claimable_reward(address, curve.constantOptions), decimals);
            rewards.push({
                token: rewardToken,
                symbol: symbol,
                amount: amount,
            })
        }

        return rewards
    }

    public gaugeClaimRewards = async (): Promise<string> => {
        const gaugeContract = curve.contracts[this.gauge].contract;
        if (!("claim_rewards()" in gaugeContract)) throw Error (`${this.name} pool doesn't have such method`);

        const gasLimit = (await gaugeContract.estimateGas.claim_rewards(curve.constantOptions)).mul(130).div(100);
        return (await gaugeContract.claim_rewards({ ...curve.options, gasLimit })).hash;
    }

    public balances = async (...addresses: string[] | string[][]): Promise<DictInterface<DictInterface<string>> | DictInterface<string>> =>  {
        return await this._balances(
            ['lpToken', 'gauge', ...this.underlyingCoins, ...this.coins],
            [this.lpToken, this.gauge, ...this.underlyingCoinAddresses, ...this.coinAddresses],
            ...addresses
        )
    }

    public lpTokenBalances = async (...addresses: string[] | string[][]): Promise<DictInterface<DictInterface<string>> | DictInterface<string>> =>  {
        return await this._balances(['lpToken', 'gauge'], [this.lpToken, this.gauge], ...addresses)
    }

    public underlyingCoinBalances = async (...addresses: string[] | string[][]): Promise<DictInterface<DictInterface<string>> | DictInterface<string>> =>  {
        return await this._balances(this.underlyingCoins, this.underlyingCoinAddresses, ...addresses)
    }

    public coinBalances = async (...addresses: string[] | string[][]): Promise<DictInterface<DictInterface<string>> | DictInterface<string>> =>  {
        return await this._balances(this.coins, this.coinAddresses, ...addresses)
    }

    public allCoinBalances = async (...addresses: string[] | string[][]): Promise<DictInterface<DictInterface<string>> | DictInterface<string>> =>  {
        return await this._balances(
            [...this.underlyingCoins, ...this.coins],
            [...this.underlyingCoinAddresses, ...this.coinAddresses],
            ...addresses
        )
    }

    public exchangeExpected = async (inputCoin: string | number, outputCoin: string | number, amount: string): Promise<string> => {
        const i = this._getCoinIdx(inputCoin);
        const j = this._getCoinIdx(outputCoin);
        const _amount = ethers.utils.parseUnits(amount, this.underlyingDecimals[i]);
        const _expected = await this._getExchangeOutput(i, j, _amount);

        return ethers.utils.formatUnits(_expected, this.underlyingDecimals[j])
    }

    public exchangeIsApproved = async (inputCoin: string | number, amount: string): Promise<boolean> => {
        const contractAddress = ["eurtusd", "xautusd", "atricrypto3"].includes(this.name) ? this.zap as string : this.swap;
        const i = this._getCoinIdx(inputCoin);
        return await hasAllowance([this.underlyingCoinAddresses[i]], [amount], curve.signerAddress, contractAddress);
    }

    private exchangeApproveEstimateGas = async (inputCoin: string | number, amount: string): Promise<number> => {
        const contractAddress = ["eurtusd", "xautusd", "atricrypto3"].includes(this.name) ? this.zap as string : this.swap;
        const i = this._getCoinIdx(inputCoin);
        return await ensureAllowanceEstimateGas([this.underlyingCoinAddresses[i]], [amount], contractAddress);
    }

    public exchangeApprove = async (inputCoin: string | number, amount: string): Promise<string[]> => {
        const contractAddress = ["eurtusd", "xautusd", "atricrypto3"].includes(this.name) ? this.zap as string : this.swap;
        const i = this._getCoinIdx(inputCoin);
        return await ensureAllowance([this.underlyingCoinAddresses[i]], [amount], contractAddress);
    }

    private exchangeEstimateGas = async (inputCoin: string | number, outputCoin: string | number, amount: string, maxSlippage = 0.01): Promise<number> => {
        const contractAddress = ["eurtusd", "xautusd", "atricrypto3"].includes(this.name) ? this.zap as string : this.swap;
        const i = this._getCoinIdx(inputCoin);
        const j = this._getCoinIdx(outputCoin);

        const inputCoinBalance = Object.values(await this.underlyingCoinBalances())[i];
        if (Number(inputCoinBalance) < Number(amount)) {
            throw Error(`Not enough ${this.underlyingCoins[i]}. Actual: ${inputCoinBalance}, required: ${amount}`);
        }

        if (!(await hasAllowance([this.underlyingCoinAddresses[i]], [amount], curve.signerAddress, contractAddress))) {
            throw Error("Token allowance is needed to estimate gas")
        }

        const _amount = ethers.utils.parseUnits(amount, this.underlyingDecimals[i]);
        const _expected: ethers.BigNumber = await this._getExchangeOutput(i, j, _amount);
        const [outputCoinDecimals] = _getCoinDecimals(this.underlyingCoinAddresses[j]);
        const minRecvAmountBN: BigNumber = toBN(_expected, outputCoinDecimals).times(1 - maxSlippage);
        const _minRecvAmount = fromBN(minRecvAmountBN, outputCoinDecimals);

        const contract = curve.contracts[contractAddress].contract;
        const exchangeMethod = Object.prototype.hasOwnProperty.call(contract, 'exchange_underlying') ? 'exchange_underlying' : 'exchange';
        const value = isEth(this.underlyingCoinAddresses[i]) ? _amount : ethers.BigNumber.from(0);

        if (this.name === "tricrypto2") {
            return (await contract.estimateGas[exchangeMethod](i, j, _amount, _minRecvAmount, true, { ...curve.constantOptions, value })).toNumber();
        }

        return (await contract.estimateGas[exchangeMethod](i, j, _amount, _minRecvAmount, { ...curve.constantOptions, value })).toNumber();
    }

    public exchange = async (inputCoin: string | number, outputCoin: string | number, amount: string, maxSlippage = 0.01): Promise<string> => {
        const contractAddress = ["eurtusd", "xautusd", "atricrypto3"].includes(this.name) ? this.zap as string : this.swap;
        const i = this._getCoinIdx(inputCoin);
        const j = this._getCoinIdx(outputCoin);

        const _amount = ethers.utils.parseUnits(amount, this.underlyingDecimals[i]);
        const _expected: ethers.BigNumber = await this._getExchangeOutput(i, j, _amount);
        const [outputCoinDecimals] = _getCoinDecimals(this.underlyingCoinAddresses[j]);
        const minRecvAmountBN: BigNumber = toBN(_expected, outputCoinDecimals).times(1 - maxSlippage);
        const _minRecvAmount = fromBN(minRecvAmountBN, outputCoinDecimals);

        await _ensureAllowance([this.underlyingCoinAddresses[i]], [_amount], contractAddress);
        const contract = curve.contracts[contractAddress].contract;
        const exchangeMethod = Object.prototype.hasOwnProperty.call(contract, 'exchange_underlying') ? 'exchange_underlying' : 'exchange';
        const value = isEth(this.underlyingCoinAddresses[i]) ? _amount : ethers.BigNumber.from(0);

        await curve.updateFeeData();

        if (this.name === 'tricrypto2') {
            const gasLimit = (await contract.estimateGas[exchangeMethod](i, j, _amount, _minRecvAmount, true, { ...curve.constantOptions, value })).mul(130).div(100);
            return (await contract[exchangeMethod](i, j, _amount, _minRecvAmount, true, { ...curve.options, value, gasLimit })).hash
        }

        const estimatedGas = await contract.estimateGas[exchangeMethod](i, j, _amount, _minRecvAmount, { ...curve.constantOptions, value });
        const gasLimit = curve.chainId === 137 && this.name === 'ren' ?
            estimatedGas.mul(160).div(100) :
            estimatedGas.mul(130).div(100);
        return (await contract[exchangeMethod](i, j, _amount, _minRecvAmount, { ...curve.options, value, gasLimit })).hash
    }

    public exchangeWrappedExpected = async (inputCoin: string | number, outputCoin: string | number, amount: string): Promise<string> => {
        if (this.isFake) {
            throw Error(`${this.name} pool doesn't have this method`);
        }

        const i = this._getCoinIdx(inputCoin, false);
        const j = this._getCoinIdx(outputCoin, false);
        const _amount = ethers.utils.parseUnits(amount, this.decimals[i]);
        const _expected = await this._getExchangeOutputWrapped(i, j, _amount);

        return ethers.utils.formatUnits(_expected, this.decimals[j])
    }

    public exchangeWrappedIsApproved = async (inputCoin: string | number, amount: string): Promise<boolean> => {
        if (this.isFake) {
            throw Error(`${this.name} pool doesn't have this method`);
        }

        const i = this._getCoinIdx(inputCoin, false);
        return await hasAllowance([this.coinAddresses[i]], [amount], curve.signerAddress, this.swap);
    }

    private exchangeWrappedApproveEstimateGas = async (inputCoin: string | number, amount: string): Promise<number> => {
        if (this.isFake) {
            throw Error(`${this.name} pool doesn't have this method`);
        }

        const i = this._getCoinIdx(inputCoin, false);
        return await ensureAllowanceEstimateGas([this.coinAddresses[i]], [amount], this.swap);
    }

    public exchangeWrappedApprove = async (inputCoin: string | number, amount: string): Promise<string[]> => {
        if (this.isFake) {
            throw Error(`${this.name} pool doesn't have this method`);
        }

        const i = this._getCoinIdx(inputCoin, false);
        return await ensureAllowance([this.coinAddresses[i]], [amount], this.swap);
    }

    private exchangeWrappedEstimateGas = async (inputCoin: string | number, outputCoin: string | number, amount: string, maxSlippage = 0.01): Promise<number> => {
        if (this.isFake) {
            throw Error(`${this.name} pool doesn't have this method`);
        }

        const i = this._getCoinIdx(inputCoin, false);
        const j = this._getCoinIdx(outputCoin, false);

        const inputCoinBalance = Object.values(await this.coinBalances())[i];
        if (Number(inputCoinBalance) < Number(amount)) {
            throw Error(`Not enough ${this.coins[i]}. Actual: ${inputCoinBalance}, required: ${amount}`);
        }

        if (!(await hasAllowance([this.coinAddresses[i]], [amount], curve.signerAddress, this.swap))) {
            throw Error("Token allowance is needed to estimate gas")
        }

        const _amount = ethers.utils.parseUnits(amount, this.decimals[i]);
        const _expected: ethers.BigNumber = await this._getExchangeOutputWrapped(i, j, _amount);
        const [outputCoinDecimals] = _getCoinDecimals(this.coinAddresses[j]);
        const minRecvAmountBN: BigNumber = toBN(_expected, outputCoinDecimals).times(1 - maxSlippage);
        const _minRecvAmount = fromBN(minRecvAmountBN, outputCoinDecimals);

        const contract = curve.contracts[this.swap].contract;
        const value = isEth(this.coinAddresses[i]) ? _amount : ethers.BigNumber.from(0);

        if (this.name === 'tricrypto2') {
            return (await contract.estimateGas.exchange(i, j, _amount, _minRecvAmount, false, { ...curve.constantOptions, value })).toNumber()
        }

        return (await contract.estimateGas.exchange(i, j, _amount, _minRecvAmount, { ...curve.constantOptions, value })).toNumber()
    }

    public exchangeWrapped = async (inputCoin: string | number, outputCoin: string | number, amount: string, maxSlippage = 0.01): Promise<string> => {
        if (this.isFake) {
            throw Error(`${this.name} pool doesn't have this method`);
        }

        const i = this._getCoinIdx(inputCoin, false);
        const j = this._getCoinIdx(outputCoin, false);

        const _amount = ethers.utils.parseUnits(amount, this.decimals[i]);
        const _expected: ethers.BigNumber = await this._getExchangeOutputWrapped(i, j, _amount);
        const [outputCoinDecimals] = _getCoinDecimals(this.coinAddresses[j]);
        const minRecvAmountBN: BigNumber = toBN(_expected, outputCoinDecimals).times(1 - maxSlippage);
        const _minRecvAmount = fromBN(minRecvAmountBN, outputCoinDecimals);

        await _ensureAllowance([this.coinAddresses[i]], [_amount], this.swap);
        const contract = curve.contracts[this.swap].contract;
        const value = isEth(this.coinAddresses[i]) ? _amount : ethers.BigNumber.from(0);
        await curve.updateFeeData();

        if (this.name === 'tricrypto2') {
            const gasLimit = (await contract.estimateGas.exchange(i, j, _amount, _minRecvAmount, false, { ...curve.constantOptions, value })).mul(130).div(100);
            return (await contract.exchange(i, j, _amount, _minRecvAmount, false, { ...curve.options, value, gasLimit })).hash
        }

        const estimatedGas = await contract.estimateGas.exchange(i, j, _amount, _minRecvAmount, { ...curve.constantOptions, value });
        const gasLimit = curve.chainId === 137 && this.name === 'ren' ?
            estimatedGas.mul(140).div(100) :
            estimatedGas.mul(130).div(100);
        return (await contract.exchange(i, j, _amount, _minRecvAmount, { ...curve.options, value, gasLimit })).hash
    }

    public gaugeMaxBoostedDeposit = async (...addresses: string[]): Promise<DictInterface<string>> => {
        if (addresses.length == 1 && Array.isArray(addresses[0])) addresses = addresses[0];

        const votingEscrowContract = curve.contracts[ALIASES.voting_escrow].multicallContract;
        const gaugeContract = curve.contracts[this.gauge].multicallContract;

        const contractCalls = [votingEscrowContract.totalSupply(), gaugeContract.totalSupply()];
        addresses.forEach((account: string) => {
            contractCalls.push(votingEscrowContract.balanceOf(account));
        });

        const _response: ethers.BigNumber[] = await curve.multicallProvider.all(contractCalls);
        const responseBN: BigNumber[] = _response.map((value: ethers.BigNumber) => toBN(value));

        const [veTotalSupplyBN, gaugeTotalSupplyBN] = responseBN.splice(0, 2);

        const resultBN: DictInterface<BigNumber> = {};
        addresses.forEach((acct: string, i: number) => {
            resultBN[acct] = responseBN[i].div(veTotalSupplyBN).times(gaugeTotalSupplyBN);
        });

        const result: DictInterface<string> = {};
        for (const entry of Object.entries(resultBN)) {
            result[entry[0]] = toStringFromBN(entry[1]);
        }

        return result;
    }

    public gaugeOptimalDeposits = async (...accounts: string[]): Promise<DictInterface<string>> => {
        if (accounts.length == 1 && Array.isArray(accounts[0])) accounts = accounts[0];

        const votingEscrowContract = curve.contracts[ALIASES.voting_escrow].multicallContract;
        const lpTokenContract = curve.contracts[this.lpToken].multicallContract;
        const gaugeContract = curve.contracts[this.gauge].multicallContract;
        const contractCalls = [votingEscrowContract.totalSupply(), gaugeContract.totalSupply()];
        accounts.forEach((account: string) => {
            contractCalls.push(
                votingEscrowContract.balanceOf(account),
                lpTokenContract.balanceOf(account),
                gaugeContract.balanceOf(account)
            )
        });

        const _response: ethers.BigNumber[] = await curve.multicallProvider.all(contractCalls);
        const response: BigNumber[] = _response.map((value: ethers.BigNumber) => toBN(value));

        const [veTotalSupply, gaugeTotalSupply] = response.splice(0,2);

        const votingPower: DictInterface<BigNumber> = {};
        let totalBalance = BN(0);
        for (const acct of accounts) {
            votingPower[acct] = response[0];
            totalBalance = totalBalance.plus(response[1]).plus(response[2]);
            response.splice(0, 3);
        }

        const totalPower = Object.values(votingPower).reduce((sum, item) => sum.plus(item));
        // @ts-ignore
        const optimalBN: DictInterface<BigNumber> = Object.fromEntries(accounts.map((acc) => [acc, BN(0)]));
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

        const optimal: DictInterface<string> = {};
        for (const entry of Object.entries(optimalBN)) {
            optimal[entry[0]] = toStringFromBN(entry[1]);
        }

        return optimal
    }

    public boost = async (address: string): Promise<string> => {
        const gaugeContract = curve.contracts[this.gauge].multicallContract;
        const [workingBalance, balance] = (await curve.multicallProvider.all([
            gaugeContract.working_balances(address),
            gaugeContract.balanceOf(address),
        ]) as ethers.BigNumber[]).map((value: ethers.BigNumber) => Number(ethers.utils.formatUnits(value)));

        const boost = workingBalance / (0.4 * balance);

        return boost.toFixed(4).replace(/([0-9])0+$/, '$1')
    }

    private _getCoinIdx = (coin: string | number, useUnderlying = true): number => {
        if (typeof coin === 'number') {
            const coins_N = useUnderlying ? this.underlyingCoins.length : this.coins.length;
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

        const [coinAddress] = _getCoinAddresses(coin);
        const lowerCaseCoinAddresses = useUnderlying ?
            this.underlyingCoinAddresses.map((c) => c.toLowerCase()) :
            this.coinAddresses.map((c) => c.toLowerCase());

        const idx = lowerCaseCoinAddresses.indexOf(coinAddress.toLowerCase());
        if (idx === -1) {
            throw Error(`There is no ${coin} in ${this.name} pool`);
        }

        return idx
    }

    private _getRates = async(): Promise<ethers.BigNumber[]> => {
        const _rates: ethers.BigNumber[] = [];
        for (let i = 0; i < this.coinAddresses.length; i++) {
            const addr = this.coinAddresses[i];
            if (this.useLending[i]) {
                if (['compound', 'usdt', 'ib'].includes(this.name)) {
                    _rates.push(await curve.contracts[addr].contract.exchangeRateStored());
                } else if (['y', 'busd', 'pax'].includes(this.name)) {
                    _rates.push(await curve.contracts[addr].contract.getPricePerFullShare());
                } else {
                    _rates.push(ethers.BigNumber.from(10).pow(18)); // Aave ratio 1:1
                }
            } else {
                _rates.push(ethers.BigNumber.from(10).pow(18));
            }
        }

        return _rates
    }

    private _balances = async (rawCoinNames: string[], rawCoinAddresses: string[], ...addresses: string[] | string[][]):
        Promise<DictInterface<DictInterface<string>> | DictInterface<string>> =>  {
        const coinNames: string[] = [];
        const coinAddresses: string[] = [];
        // removing duplicates
        for (let i = 0; i < rawCoinAddresses.length; i++) {
            if (!coinAddresses.includes(rawCoinAddresses[i])) {
                coinNames.push(rawCoinNames[i]);
                coinAddresses.push(rawCoinAddresses[i])
            }
        }

        addresses = _prepareAddresses(addresses);
        const rawBalances: DictInterface<string[]> = await _getBalances(coinAddresses, addresses);

        const balances: DictInterface<DictInterface<string>> = {};
        for (const address of addresses) {
            balances[address] = {};
            for (const coinName of coinNames) {
                balances[address][coinName] = rawBalances[address].shift() as string;
            }
        }

        return addresses.length === 1 ? balances[addresses[0]] : balances
    }

    private _underlyingPrices = async (): Promise<number[]> => {
        const promises = [];
        for (const addr of this.underlyingCoinAddresses) {
            promises.push(_getUsdRate(addr))
        }

        return await Promise.all(promises)
    }

    // NOTE! It may crash!
    private _wrappedPrices = async (): Promise<number[]> => {
        const promises = [];
        for (const addr of this.coinAddresses) {
            promises.push(_getUsdRate(addr))
        }

        return await Promise.all(promises)
    }

    private _addLiquidityCryptoSlippage = async (totalAmountUSD: number, expected: number, useUnderlying = true): Promise<string> => {
        const poolBalances: number[] = useUnderlying ?
            (await this.getPoolBalances()).map(Number) :
            (await this.getPoolWrappedBalances()).map(Number);
        const prices: number[] = useUnderlying ? await this._underlyingPrices() : await this._wrappedPrices();

        const poolBalancesUSD = poolBalances.map((b, i) => Number(b) * prices[i]);
        const poolTotalBalance: number = poolBalancesUSD.reduce((a,b) => a + b);
        const poolBalancesRatios: number[] = poolBalancesUSD.map((b) => b / poolTotalBalance);

        const balancedAmountsUSD: number[] = poolBalancesRatios.map((r) => r * totalAmountUSD);
        const balancedAmounts: string[] = balancedAmountsUSD.map((a, i) => String(a / prices[i]));

        const balancedExpected = useUnderlying ?
            Number(await this.addLiquidityExpected(balancedAmounts)) :
            Number(await this.addLiquidityWrappedExpected(balancedAmounts));

        return String((balancedExpected - expected) / balancedExpected)
    }

    private _addLiquiditySlippage = async (totalAmount: number, expected: number, useUnderlying = true): Promise<string> => {
        const poolBalances: number[] = useUnderlying ?
            (await this.getPoolBalances()).map(Number) :
            (await this.getPoolWrappedBalances()).map(Number);
        const poolTotalBalance: number = poolBalances.reduce((a,b) => a + b);
        const poolBalancesRatios: number[] = poolBalances.map((b) => b / poolTotalBalance);

        const balancedAmounts: string[] = poolBalancesRatios.map((r) => String(r * totalAmount));
        const balancedExpected = useUnderlying ?
            Number(await this.addLiquidityExpected(balancedAmounts)) :
            Number(await this.addLiquidityWrappedExpected(balancedAmounts));

        return String((balancedExpected - expected) / balancedExpected)
    }

    private _removeLiquidityCryptoSlippage = async (totalAmountUSD: number, lpTokenAmount: number, useUnderlying = true): Promise<string> => {
        const prices: number[] = useUnderlying ? await this._underlyingPrices() : await this._wrappedPrices();

        const balancedAmounts = useUnderlying ?
            await this.removeLiquidityExpected(String(lpTokenAmount)) :
            await this.removeLiquidityWrappedExpected(String(lpTokenAmount));
        const balancedTotalAmountsUSD = balancedAmounts.reduce((s, b, i) => s + (Number(b) * prices[i]), 0);

        return String((balancedTotalAmountsUSD - totalAmountUSD) / balancedTotalAmountsUSD)
    }

    private _removeLiquiditySlippage = async (totalAmount: number, expected: number, useUnderlying = true): Promise<string> => {
        const poolBalances: number[] = useUnderlying ?
            (await this.getPoolBalances()).map(Number) :
            (await this.getPoolWrappedBalances()).map(Number);
        const poolTotalBalance: number = poolBalances.reduce((a,b) => a + b);
        const poolBalancesRatios: number[] = poolBalances.map((b) => b / poolTotalBalance);

        const balancedAmounts: string[] = poolBalancesRatios.map((r) => String(r * totalAmount));
        const balancedExpected = useUnderlying ?
            Number(await this.removeLiquidityImbalanceExpected(balancedAmounts)) :
            Number(await this.removeLiquidityImbalanceWrappedExpected(balancedAmounts));

        return String((expected - balancedExpected) / expected)
    }

    private _balancedAmounts = (poolBalances: number[], walletBalances: number[], decimals: number[]): string[] => {
        const poolTotalLiquidity = poolBalances.reduce((a,b) => a + b);
        const poolBalancesRatios = poolBalances.map((b) => b / poolTotalLiquidity);
        // Cross factors for each wallet balance used as reference to see the
        // max that can be used according to the lowest relative wallet balance
        const balancedAmountsForEachScenario = walletBalances.map((_, i) => (
            walletBalances.map((_, j) => (
                poolBalancesRatios[j] * walletBalances[i] / poolBalancesRatios[i]
            ))
        ));
        const firstCoinBalanceForEachScenario = balancedAmountsForEachScenario.map(([a]) => a);
        const scenarioWithLowestBalances = firstCoinBalanceForEachScenario.indexOf(Math.min(...firstCoinBalanceForEachScenario));

        return balancedAmountsForEachScenario[scenarioWithLowestBalances].map((a, i) => a.toFixed(decimals[i]))
    }

    private _calcLpTokenAmount = async (_amounts: ethers.BigNumber[], isDeposit = true): Promise<ethers.BigNumber> => {
        const contract = curve.contracts[this.swap].contract;

        if (["eurtusd", "xautusd", "crveth", "cvxeth", "spelleth", "teth"].includes(this.name)) {
            return await contract.calc_token_amount(_amounts, curve.constantOptions);
        }

        return await contract.calc_token_amount(_amounts, isDeposit, curve.constantOptions);
    }

    private _calcLpTokenAmountZap = async (_amounts: ethers.BigNumber[], isDeposit = true): Promise<ethers.BigNumber> => {
        const contract = curve.contracts[this.zap as string].contract;

        if (this.isFactory) {
            return await contract.calc_token_amount(this.swap, _amounts, isDeposit, curve.constantOptions);
        }

        if (["eurtusd", "xautusd"].includes(this.name)) {
            return await contract.calc_token_amount(_amounts, curve.constantOptions);
        }

        return await contract.calc_token_amount(_amounts, isDeposit, curve.constantOptions);
    }

    private _calcLpTokenAmountWithUnderlying = async (_underlying_amounts: ethers.BigNumber[], isDeposit = true): Promise<ethers.BigNumber> => {
        const _rates: ethers.BigNumber[] = await this._getRates();
        const _wrapped_amounts = _underlying_amounts.map((amount: ethers.BigNumber, i: number) =>
            amount.mul(ethers.BigNumber.from(10).pow(18)).div(_rates[i]));

        return await this._calcLpTokenAmount(_wrapped_amounts, isDeposit);
    }

    private _addLiquiditySwap = async (_amounts: ethers.BigNumber[], estimateGas = false): Promise<string | number> => {
        if (!estimateGas) {
            await _ensureAllowance(this.coinAddresses, _amounts, this.swap);
        }

        const _minMintAmount = (await this._calcLpTokenAmount(_amounts)).mul(99).div(100);
        const ethIndex = getEthIndex(this.coinAddresses);
        const value = _amounts[ethIndex] || ethers.BigNumber.from(0);
        const contract = curve.contracts[this.swap].contract;

        const gas: ethers.BigNumber = await contract.estimateGas.add_liquidity(_amounts, _minMintAmount, { ...curve.constantOptions, value });
        if (estimateGas) {
            return gas.toNumber()
        }

        const gasLimit = gas.mul(130).div(100);
        return (await contract.add_liquidity(_amounts, _minMintAmount, { ...curve.options, gasLimit, value })).hash;
    }


    private _addLiquidityZap = async (_amounts: ethers.BigNumber[], estimateGas = false): Promise<string | number> => {
        if (!estimateGas) {
            await _ensureAllowance(this.underlyingCoinAddresses, _amounts, this.zap as string);
        }

        const _minMintAmount = (await this._calcLpTokenAmountWithUnderlying(_amounts)).mul(99).div(100);
        const ethIndex = getEthIndex(this.underlyingCoinAddresses);
        const value = _amounts[ethIndex] || ethers.BigNumber.from(0);
        const contract = curve.contracts[this.zap as string].contract;

        const gas = await contract.estimateGas.add_liquidity(_amounts, _minMintAmount, { ...curve.constantOptions, value });
        if (estimateGas) {
            return gas.toNumber()
        }

        const gasLimit = gas.mul(130).div(100);
        return (await contract.add_liquidity(_amounts, _minMintAmount, { ...curve.options, gasLimit, value })).hash;
    }

    private _addLiquidityMetaZap = async (_amounts: ethers.BigNumber[], estimateGas = false): Promise<string | number> => {
        if (!estimateGas) {
            await _ensureAllowance(this.underlyingCoinAddresses, _amounts, this.zap as string);
        }

        const _minMintAmount = (await this._calcLpTokenAmountZap(_amounts)).mul(99).div(100);
        const ethIndex = getEthIndex(this.underlyingCoinAddresses)
        const value = _amounts[ethIndex] || ethers.BigNumber.from(0);
        const contract = curve.contracts[this.zap as string].contract;

        if (this.isFactory) {
            const gas = await contract.estimateGas.add_liquidity(this.swap, _amounts, _minMintAmount, { ...curve.constantOptions, value });
            if (estimateGas) {
                return gas.toNumber()
            }

            const gasLimit = gas.mul(130).div(100);
            return (await contract.add_liquidity(this.swap, _amounts, _minMintAmount, { ...curve.options, gasLimit, value })).hash;
        }

        const gas = await contract.estimateGas.add_liquidity(_amounts, _minMintAmount, { ...curve.constantOptions, value });
        if (estimateGas) {
            return gas.toNumber()
        }

        const gasLimit = gas.mul(130).div(100);
        return (await contract.add_liquidity(_amounts, _minMintAmount, { ...curve.options, gasLimit, value })).hash;
    }

    private _addLiquidity = async (_amounts: ethers.BigNumber[], useUnderlying= true, estimateGas = false): Promise<string | number> => {
        const coinAddresses = useUnderlying ? this.underlyingCoinAddresses : this.coinAddresses;
        if (!estimateGas) {
            await _ensureAllowance(coinAddresses, _amounts, this.swap);
        }

        let _minMintAmount = useUnderlying ? await this._calcLpTokenAmountWithUnderlying(_amounts) : await this._calcLpTokenAmount(_amounts);
        _minMintAmount = _minMintAmount.mul(99).div(100);
        const contract = curve.contracts[this.swap].contract;

        const ethIndex = getEthIndex(useUnderlying ? this.underlyingCoinAddresses : this.coinAddresses);
        const value = _amounts[ethIndex] || ethers.BigNumber.from(0);

        const gas = await contract.estimateGas.add_liquidity(_amounts, _minMintAmount, useUnderlying, { ...curve.constantOptions, value });
        if (estimateGas) {
            return gas.toNumber()
        }

        const gasLimit = gas.mul(130).div(100);
        return (await contract.add_liquidity(_amounts, _minMintAmount, useUnderlying, { ...curve.options, gasLimit, value })).hash;
    }

    private _calcExpectedAmounts = async (_lpTokenAmount: ethers.BigNumber): Promise<ethers.BigNumber[]> => {
        const coinBalancesBN: BigNumber[] = [];
        for (let i = 0; i < this.coinAddresses.length; i++) {
            const _balance: ethers.BigNumber = await curve.contracts[this.swap].contract.balances(i, curve.constantOptions);
            coinBalancesBN.push(toBN(_balance, this.decimals[i]));
        }
        const totalSupplyBN: BigNumber = toBN(await curve.contracts[this.lpToken].contract.totalSupply(curve.constantOptions));

        const expectedAmountsBN: BigNumber[] = [];
        for (const coinBalance of coinBalancesBN) {
            expectedAmountsBN.push(coinBalance.times(toBN(_lpTokenAmount)).div(totalSupplyBN));
        }

        return expectedAmountsBN.map((amount: BigNumber, i: number) => fromBN(amount, this.decimals[i]));
    }

    private _calcMinAmounts = async (_lpTokenAmount: ethers.BigNumber): Promise<ethers.BigNumber[]> => {
        return (await this._calcExpectedAmounts(_lpTokenAmount)).map((a: ethers.BigNumber) => a.mul(99).div(100))
    }

    private _calcExpectedUnderlyingAmounts = async (_lpTokenAmount: ethers.BigNumber): Promise<ethers.BigNumber[]> => {
        const _expectedAmounts = await this._calcExpectedAmounts(_lpTokenAmount);
        const _rates: ethers.BigNumber[] = await this._getRates();

        return _expectedAmounts.map((_amount: ethers.BigNumber, i: number) => _amount.mul(_rates[i]).div(ethers.BigNumber.from(10).pow(18)))
    }

    private _calcMinUnderlyingAmounts = async (_lpTokenAmount: ethers.BigNumber): Promise<ethers.BigNumber[]> => {
        return (await this._calcExpectedUnderlyingAmounts(_lpTokenAmount)).map((a: ethers.BigNumber) => a.mul(99).div(100))
    }

    private _calcExpectedUnderlyingAmountsMeta = async (_lpTokenAmount: ethers.BigNumber): Promise<ethers.BigNumber[]> => {
        const _expectedWrappedAmounts = await this._calcExpectedAmounts(_lpTokenAmount);
        if (this.name !== 'atricrypto3') {
            _expectedWrappedAmounts.unshift(_expectedWrappedAmounts.pop() as ethers.BigNumber);
        }
        const [_expectedMetaCoinAmount, ..._expectedUnderlyingAmounts] = _expectedWrappedAmounts;

        const basePool = new Pool(this.basePool);
        const _basePoolExpectedAmounts = await basePool._calcExpectedAmounts(_expectedMetaCoinAmount);

        return  this.name !== 'atricrypto3' ?
            [..._expectedUnderlyingAmounts, ..._basePoolExpectedAmounts] :
            [..._basePoolExpectedAmounts, ..._expectedUnderlyingAmounts];
    }

    private _calcMinUnderlyingAmountsMeta= async (_lpTokenAmount: ethers.BigNumber): Promise<ethers.BigNumber[]> => {
        return (await this._calcExpectedUnderlyingAmountsMeta(_lpTokenAmount)).map((a: ethers.BigNumber) => a.mul(99).div(100))
    }

    private _removeLiquiditySwap = async (_lpTokenAmount: ethers.BigNumber, estimateGas = false): Promise<string | number> => {
        const _minAmounts = await this._calcMinAmounts(_lpTokenAmount);
        const contract = curve.contracts[this.swap].contract;

        const gas = await contract.estimateGas.remove_liquidity(_lpTokenAmount, _minAmounts, curve.constantOptions);
        if (estimateGas) {
            return gas.toNumber()
        }
        const gasLimit = gas.mul(130).div(100);
        return (await contract.remove_liquidity(_lpTokenAmount, _minAmounts, { ...curve.options, gasLimit })).hash;
    }

    private _removeLiquidityZap = async (_lpTokenAmount: ethers.BigNumber, estimateGas = false): Promise<string | number> => {
        if (!estimateGas) {
            await _ensureAllowance([this.lpToken], [_lpTokenAmount], this.zap as string);
        }

        const _minAmounts = await this._calcMinUnderlyingAmounts(_lpTokenAmount);
        const contract = curve.contracts[this.zap as string].contract;

        const gas = await contract.estimateGas.remove_liquidity(_lpTokenAmount, _minAmounts, curve.constantOptions);

        if (estimateGas) {
            return gas.toNumber()
        }

        const gasLimit = gas.mul(130).div(100);
        return (await contract.remove_liquidity(_lpTokenAmount, _minAmounts, { ...curve.options, gasLimit })).hash;
    }

    private _removeLiquidityMetaZap = async (_lpTokenAmount: ethers.BigNumber, estimateGas = false): Promise<string | number> => {
        if (!estimateGas) {
            await _ensureAllowance([this.lpToken], [_lpTokenAmount], this.zap as string);
        }

        const _minAmounts = await this._calcMinUnderlyingAmountsMeta(_lpTokenAmount);
        const contract = curve.contracts[this.zap as string].contract;

        if (this.isFactory) {
            const gas = await contract.estimateGas.remove_liquidity(this.swap, _lpTokenAmount, _minAmounts, curve.constantOptions);
            if (estimateGas) {
                return gas.toNumber()
            }
            const gasLimit = gas.mul(130).div(100);
            return (await contract.remove_liquidity(this.swap, _lpTokenAmount, _minAmounts, { ...curve.options, gasLimit })).hash;
        }

        const gas = await contract.estimateGas.remove_liquidity(_lpTokenAmount, _minAmounts, curve.constantOptions);
        if (estimateGas) {
            return gas.toNumber()
        }

        const gasLimit = gas.mul(130).div(100);
        return (await contract.remove_liquidity(_lpTokenAmount, _minAmounts, { ...curve.options, gasLimit })).hash;
    }

    private _removeLiquidity = async (_lpTokenAmount: ethers.BigNumber, useUnderlying = true, estimateGas = false): Promise<string | number> => {
        const _minAmounts = useUnderlying ? await this._calcMinUnderlyingAmounts(_lpTokenAmount) : await this._calcMinAmounts(_lpTokenAmount);
        const contract = curve.contracts[this.swap].contract;

        const gas = await contract.estimateGas.remove_liquidity(_lpTokenAmount, _minAmounts, useUnderlying, curve.constantOptions);
        if (estimateGas) {
            return gas.toNumber()
        }

        const gasLimit = gas.mul(130).div(100);
        return (await contract.remove_liquidity(_lpTokenAmount, _minAmounts, useUnderlying, { ...curve.options, gasLimit })).hash;
    }

    private _removeLiquidityImbalanceSwap = async (_amounts: ethers.BigNumber[], estimateGas = false): Promise<string | number> => {
        const _maxBurnAmount =(await this._calcLpTokenAmount(_amounts, false)).mul(101).div(100);
        const  contract = curve.contracts[this.swap].contract;

        const gas = await contract.estimateGas.remove_liquidity_imbalance(_amounts, _maxBurnAmount, curve.constantOptions);
        if (estimateGas) {
            return gas.toNumber()
        }

        const gasLimit = gas.mul(130).div(100);
        return (await contract.remove_liquidity_imbalance(_amounts, _maxBurnAmount, { ...curve.options, gasLimit })).hash;
    }

    private _removeLiquidityImbalanceZap = async (_amounts: ethers.BigNumber[], estimateGas = false): Promise<string | number> => {
        const _maxBurnAmount = (await this._calcLpTokenAmountWithUnderlying(_amounts, false)).mul(101).div(100);

        if (!estimateGas) {
            await _ensureAllowance([this.lpToken], [_maxBurnAmount], this.zap as string);
        }

        const  contract = curve.contracts[this.zap as string].contract;

        const gas = await contract.estimateGas.remove_liquidity_imbalance(_amounts, _maxBurnAmount, curve.constantOptions);
        if (estimateGas) {
            return gas.toNumber()
        }

        const gasLimit = gas.mul(130).div(100);
        return (await contract.remove_liquidity_imbalance(_amounts, _maxBurnAmount, { ...curve.options, gasLimit }));
    }

    private _removeLiquidityImbalanceMetaZap = async (_amounts: ethers.BigNumber[], estimateGas = false): Promise<string | number> => {
        const _maxBurnAmount = (await this._calcLpTokenAmountZap(_amounts, false)).mul(101).div(100);

        if (!estimateGas) {
            await _ensureAllowance([this.lpToken], [_maxBurnAmount], this.zap as string);
        }

        const contract = curve.contracts[this.zap as string].contract;

        if (this.isFactory) {
            const gas = await contract.estimateGas.remove_liquidity_imbalance(this.swap, _amounts, _maxBurnAmount, curve.constantOptions);
            if (estimateGas) {
                return gas.toNumber()
            }
            const gasLimit = gas.mul(130).div(100);
            return (await contract.remove_liquidity_imbalance(this.swap, _amounts, _maxBurnAmount, { ...curve.options, gasLimit }));
        }

        const gas = await contract.estimateGas.remove_liquidity_imbalance(_amounts, _maxBurnAmount, curve.constantOptions)
        if (estimateGas) {
            return gas.toNumber()
        }
        const gasLimit = gas.mul(130).div(100);
        return (await contract.remove_liquidity_imbalance(_amounts, _maxBurnAmount, { ...curve.options, gasLimit }));
    }

    private _removeLiquidityImbalance = async (_amounts: ethers.BigNumber[], useUnderlying = true, estimateGas = false): Promise<string | number> => {
        let _maxBurnAmount = useUnderlying ?
            await this._calcLpTokenAmountWithUnderlying(_amounts, false) :
            await this._calcLpTokenAmount(_amounts, false);
        _maxBurnAmount = _maxBurnAmount.mul(101).div(100);
        const  contract = curve.contracts[this.swap].contract;

        const gas = await contract.estimateGas.remove_liquidity_imbalance(_amounts, _maxBurnAmount, useUnderlying, curve.constantOptions);
        if (estimateGas) {
            return gas.toNumber()
        }

        const gasLimit = curve.chainId === 137 && this.name === 'ren' ?
            gas.mul(140).div(100) :
            gas.mul(130).div(100);
        return (await contract.remove_liquidity_imbalance(_amounts, _maxBurnAmount, useUnderlying, { ...curve.options, gasLimit })).hash;
    }

    private _calcWithdrawOneCoinSwap = async (_lpTokenAmount: ethers.BigNumber, i: number): Promise<ethers.BigNumber> => {
        return await curve.contracts[this.swap].contract.calc_withdraw_one_coin(_lpTokenAmount, i, curve.constantOptions);
    }

    private _calcWithdrawOneCoinZap = async (_lpTokenAmount: ethers.BigNumber, i: number): Promise<ethers.BigNumber> => {
        const contract = curve.contracts[this.zap as string].contract;

        if (this.isFactory) {
            return (await contract.calc_withdraw_one_coin(this.swap, _lpTokenAmount, i, curve.constantOptions));
        }

        return await contract.calc_withdraw_one_coin(_lpTokenAmount, i, curve.constantOptions);
    }

    private _calcWithdrawOneCoin = async (_lpTokenAmount: ethers.BigNumber, i: number, useUnderlying = true): Promise<ethers.BigNumber> => {
        return await curve.contracts[this.swap].contract.calc_withdraw_one_coin(_lpTokenAmount, i, useUnderlying, curve.constantOptions);
    }

    private _removeLiquidityOneCoinSwap = async (_lpTokenAmount: ethers.BigNumber, i: number, estimateGas = false): Promise<string | number> => {
        const _minAmount = (await this._calcWithdrawOneCoinSwap(_lpTokenAmount, i)).mul(99).div(100);
        const  contract = curve.contracts[this.swap].contract;

        const gas = await contract.estimateGas.remove_liquidity_one_coin(_lpTokenAmount, i, _minAmount, curve.constantOptions);
        if (estimateGas) {
            return gas.toNumber()
        }

        const gasLimit = gas.mul(130).div(100);
        return (await contract.remove_liquidity_one_coin(_lpTokenAmount, i, _minAmount, { ...curve.options, gasLimit })).hash
    }

    private _removeLiquidityOneCoinZap = async (_lpTokenAmount: ethers.BigNumber, i: number, estimateGas = false): Promise<string | number> => {
        if (!estimateGas) {
            await _ensureAllowance([this.lpToken], [_lpTokenAmount], this.zap as string);
        }

        let _minAmount = this.name === 'tricrypto2' ?
            await this._calcWithdrawOneCoinSwap(_lpTokenAmount, i) :
            await this._calcWithdrawOneCoinZap(_lpTokenAmount, i);
        _minAmount = _minAmount.mul(99).div(100);

        const  contract = curve.contracts[this.zap as string].contract;

        if (this.isFactory) {
            const gas = await contract.estimateGas.remove_liquidity_one_coin(this.swap, _lpTokenAmount, i, _minAmount, curve.constantOptions);
            if (estimateGas) {
                return gas.toNumber()
            }
            const gasLimit = gas.mul(130).div(100);
            return (await contract.remove_liquidity_one_coin(this.swap, _lpTokenAmount, i, _minAmount, { ...curve.options, gasLimit })).hash
        }

        const gas = await contract.estimateGas.remove_liquidity_one_coin(_lpTokenAmount, i, _minAmount, curve.constantOptions);
        if (estimateGas) {
            return gas.toNumber()
        }

        const gasLimit = gas.mul(130).div(100);
        return (await contract.remove_liquidity_one_coin(_lpTokenAmount, i, _minAmount, { ...curve.options, gasLimit })).hash
    }

    private _removeLiquidityOneCoin = async (_lpTokenAmount: ethers.BigNumber, i: number, useUnderlying = true, estimateGas = false): Promise<string | number> => {
        let _minAmount = this.name === 'ib' ?
            await this._calcWithdrawOneCoin(_lpTokenAmount, i, useUnderlying) :
            await this._calcWithdrawOneCoinSwap(_lpTokenAmount, i);
        _minAmount = _minAmount.mul(99).div(100);
        const  contract = curve.contracts[this.swap].contract;

        const gas = await contract.estimateGas.remove_liquidity_one_coin(_lpTokenAmount, i, _minAmount, useUnderlying, curve.constantOptions);
        if (estimateGas) {
            return gas.toNumber()
        }

        const gasLimit = curve.chainId === 137 && this.name === 'ren' ?
            gas.mul(160).div(100) :
            gas.mul(130).div(100);
        return (await contract.remove_liquidity_one_coin(_lpTokenAmount, i, _minAmount, useUnderlying, { ...curve.options, gasLimit })).hash
    }

    private _getExchangeOutput = async (i: number, j: number, _amount: ethers.BigNumber): Promise<ethers.BigNumber> => {
        const contractAddress = ["eurtusd", "xautusd", "atricrypto3"].includes(this.name)  ? this.zap as string : this.swap;
        const contract = curve.contracts[contractAddress].contract;
        if (Object.prototype.hasOwnProperty.call(contract, 'get_dy_underlying')) {
            return await contract.get_dy_underlying(i, j, _amount, curve.constantOptions)
        } else {
            return await contract.get_dy(i, j, _amount, curve.constantOptions);
        }
    }

    private _getExchangeOutputWrapped = async (i: number, j: number, _amount: ethers.BigNumber): Promise<ethers.BigNumber> => {
        return await curve.contracts[this.swap].contract.get_dy(i, j, _amount, curve.constantOptions);
    }
}

// --------- Exchange Using All Pools ---------

const _estimatedGasForPoolsCache: DictInterface<{ gas: ethers.BigNumber, time: number }> = {};

const _estimateGasForPools = async (poolAddresses: string[], inputCoinAddress: string, outputCoinAddress: string, _amount: ethers.BigNumber): Promise<number[]> => {
    const registryExchangeContract = curve.contracts[ALIASES.registry_exchange].contract;
    const sortedCoins = [inputCoinAddress, outputCoinAddress].sort();

    const gasPromises: Promise<ethers.BigNumber>[] = [];
    for (const poolAddress of poolAddresses) {
        const key = `${poolAddress}-${sortedCoins[0]}-${sortedCoins[1]}`;
        let gasPromise: Promise<ethers.BigNumber>;

        if ((_estimatedGasForPoolsCache[key]?.time || 0) + 3600000 < Date.now()) {
            gasPromise = registryExchangeContract.estimateGas.exchange(
                poolAddress,
                inputCoinAddress,
                outputCoinAddress,
                _amount,
                0,
                curve.constantOptions
            );
        } else {
            gasPromise = Promise.resolve(_estimatedGasForPoolsCache[key].gas);
        }

        gasPromises.push(gasPromise);
    }

    try {
        const _gasAmounts: ethers.BigNumber[] = await Promise.all(gasPromises);

        poolAddresses.forEach((poolAddress, i: number) => {
            const key = `${poolAddress}-${sortedCoins[0]}-${sortedCoins[1]}`;
            _estimatedGasForPoolsCache[key] = { 'gas': _gasAmounts[i], 'time': Date.now() };
        })

        return _gasAmounts.map((_g) => Number(ethers.utils.formatUnits(_g, 0)));
    } catch (err) {
        return poolAddresses.map(() => 0);
    }
}

const _getBestPoolAndOutput = async (
    inputCoinAddress: string,
    outputCoinAddress: string,
    amount: string
): Promise<{ poolAddress: string, _output: ethers.BigNumber }> => {
    const availablePools: { poolAddress: string, _output: ethers.BigNumber, outputUsd: number, txCostUsd: number }[] = Object.entries(POOLS_DATA).map((pool)=> {
        const coin_addresses = pool[1].coin_addresses.map((a: string) => a.toLowerCase());
        const underlying_coin_addresses = pool[1].underlying_coin_addresses.map((a: string) => a.toLowerCase());
        const meta_coin_addresses = pool[1].meta_coin_addresses?.map((a: string) => a.toLowerCase());

        const inputCoinIndexes = [
            coin_addresses.indexOf(inputCoinAddress.toLowerCase()),
            underlying_coin_addresses.indexOf(inputCoinAddress.toLowerCase()),
            meta_coin_addresses ? meta_coin_addresses.indexOf(inputCoinAddress.toLowerCase()) : -1,
        ]

        const outputCoinIndexes = [
            coin_addresses.indexOf(outputCoinAddress.toLowerCase()),
            underlying_coin_addresses.indexOf(outputCoinAddress.toLowerCase()),
            meta_coin_addresses ? meta_coin_addresses.indexOf(outputCoinAddress.toLowerCase()) : -1,
        ]

        if (pool[0] === 'atricrypto3') {
            return null
        }

        if (inputCoinIndexes[0] >= 0 && outputCoinIndexes[0] >= 0) {
            return { poolAddress: pool[1].swap_address, _output: ethers.BigNumber.from(0), outputUsd: 0, txCostUsd: 0 }
        } else if (inputCoinIndexes[1] >= 0 && outputCoinIndexes[1] >= 0) {
            return { poolAddress: pool[1].swap_address, _output: ethers.BigNumber.from(0), outputUsd: 0, txCostUsd: 0 }
        } else if (inputCoinIndexes[0] === 0 && outputCoinIndexes[2] >= 0 && !['eurtusd', "xautusd"].includes(pool[0])) {
            return { poolAddress: pool[1].swap_address, _output: ethers.BigNumber.from(0), outputUsd: 0, txCostUsd: 0 }
        } else if (inputCoinIndexes[2] >= 0 && outputCoinIndexes[0] === 0 && !['eurtusd', "xautusd"].includes(pool[0])) {
            return { poolAddress: pool[1].swap_address, _output: ethers.BigNumber.from(0), outputUsd: 0, txCostUsd: 0 }
        } else {
            return null
        }
    }).filter((pool) => pool !== null) as { poolAddress: string, _output: ethers.BigNumber, outputUsd: number, txCostUsd: number }[]

    const [inputCoinDecimals, outputCoinDecimals] = _getCoinDecimals(inputCoinAddress, outputCoinAddress);
    const _amount = ethers.utils.parseUnits(amount.toString(), inputCoinDecimals);

    if (availablePools.length === 0) {
        return { poolAddress: "0x0000000000000000000000000000000000000000", _output: ethers.BigNumber.from(0) }
    }

    if (availablePools.length === 1) {
        const poolAddress = availablePools[0].poolAddress;
        const registryExchangeContract = curve.contracts[ALIASES.registry_exchange].contract;
        const _output = await registryExchangeContract.get_exchange_amount(poolAddress, inputCoinAddress, outputCoinAddress, _amount, curve.constantOptions);

        return { poolAddress, _output }
    }

    const registryExchangeMulticall = curve.contracts[ALIASES.registry_exchange].multicallContract;

    const calls = [];
    for (const pool of availablePools) {
        calls.push(registryExchangeMulticall.get_exchange_amount(pool.poolAddress, inputCoinAddress, outputCoinAddress, _amount));
    }

    const [_expectedAmounts, gasAmounts, outputCoinUsdRate, gasData, ethUsdRate] = await Promise.all([
        curve.multicallProvider.all(calls),
        _estimateGasForPools(availablePools.map((pool) => pool.poolAddress), inputCoinAddress, outputCoinAddress, _amount),
        _getUsdRate(outputCoinAddress),
        axios.get("https://api.curve.fi/api/getGas"),
        _getUsdRate(COINS.eth),
    ])
    const gasPrice = gasData.data.data.gas.standard;
    const expectedAmounts = (_expectedAmounts as ethers.BigNumber[]).map(
        (_amount) => Number(ethers.utils.formatUnits(_amount, outputCoinDecimals)));

    const expectedAmountsUsd = expectedAmounts.map((a) => a * outputCoinUsdRate);
    const txCostsUsd = gasAmounts.map((a) => ethUsdRate * a * gasPrice / 1e18);

    availablePools.forEach((pool, i) => {
        pool._output = _expectedAmounts[i] as ethers.BigNumber;
        pool.outputUsd = expectedAmountsUsd[i];
        pool.txCostUsd = txCostsUsd[i]
    });

    const bestPool = availablePools.reduce(
        (pool1, pool2) => (pool1.outputUsd - pool1.txCostUsd) - (pool2.outputUsd - pool2.txCostUsd) >= 0 ? pool1 : pool2
    );

    return { poolAddress: bestPool.poolAddress, _output: bestPool._output }
}

export const getBestPoolAndOutput = async (inputCoin: string, outputCoin: string, amount: string): Promise<{ poolAddress: string, output: string }> => {
    const [inputCoinAddress, outputCoinAddress] = _getCoinAddresses(inputCoin, outputCoin);
    const [outputCoinDecimals] = _getCoinDecimals(outputCoinAddress);

    const { poolAddress, _output } = await _getBestPoolAndOutput(inputCoinAddress, outputCoinAddress, amount);

    return { poolAddress, output: ethers.utils.formatUnits(_output, outputCoinDecimals) }
}

export const exchangeExpected = async (inputCoin: string, outputCoin: string, amount: string): Promise<string> => {
    return (await getBestPoolAndOutput(inputCoin, outputCoin, amount))['output'];
}

export const exchangeIsApproved = async (inputCoin: string, outputCoin: string, amount: string): Promise<boolean> => {
    return await hasAllowance([inputCoin], [amount], curve.signerAddress, ALIASES.registry_exchange);
}

export const exchangeApproveEstimateGas = async (inputCoin: string, outputCoin: string, amount: string): Promise<number> => {
    return await ensureAllowanceEstimateGas([inputCoin], [amount], ALIASES.registry_exchange);
}

export const exchangeApprove = async (inputCoin: string, outputCoin: string, amount: string): Promise<string[]> => {
    return await ensureAllowance([inputCoin], [amount], ALIASES.registry_exchange);
}

export const exchangeEstimateGas = async (inputCoin: string, outputCoin: string, amount: string, maxSlippage = 0.01): Promise<number> => {
    const [inputCoinAddress, outputCoinAddress] = _getCoinAddresses(inputCoin, outputCoin);
    const [inputCoinDecimals, outputCoinDecimals] = _getCoinDecimals(inputCoinAddress, outputCoinAddress);
    const { poolAddress, _output } = await _getBestPoolAndOutput(inputCoinAddress, outputCoinAddress, amount);

    if (poolAddress === "0x0000000000000000000000000000000000000000") {
        throw new Error("This pair can't be exchanged");
    }

    const _amount = ethers.utils.parseUnits(amount, inputCoinDecimals);
    const minRecvAmountBN: BigNumber = toBN(_output, outputCoinDecimals).times(1 - maxSlippage);
    const _minRecvAmount = fromBN(minRecvAmountBN, outputCoinDecimals);

    const contract = curve.contracts[ALIASES.registry_exchange].contract;
    const value = isEth(inputCoinAddress) ? _amount : ethers.BigNumber.from(0);

    await curve.updateFeeData();
    return (await contract.estimateGas.exchange(poolAddress, inputCoinAddress, outputCoinAddress, _amount, _minRecvAmount, { ...curve.constantOptions, value })).toNumber()
}

export const exchange = async (inputCoin: string, outputCoin: string, amount: string, maxSlippage = 0.01): Promise<string> => {
    const [inputCoinAddress, outputCoinAddress] = _getCoinAddresses(inputCoin, outputCoin);
    const [inputCoinDecimals, outputCoinDecimals] = _getCoinDecimals(inputCoinAddress, outputCoinAddress);
    
    await ensureAllowance([inputCoin], [amount], ALIASES.registry_exchange);
    const { poolAddress, _output } = await _getBestPoolAndOutput(inputCoinAddress, outputCoinAddress, amount);

    if (poolAddress === "0x0000000000000000000000000000000000000000") {
        throw new Error("This pair can't be exchanged");
    }

    const _amount = ethers.utils.parseUnits(amount, inputCoinDecimals);
    const minRecvAmountBN: BigNumber = toBN(_output, outputCoinDecimals).times(1 - maxSlippage);
    const _minRecvAmount = fromBN(minRecvAmountBN, outputCoinDecimals);
    
    const contract = curve.contracts[ALIASES.registry_exchange].contract;
    const value = isEth(inputCoinAddress) ? _amount : ethers.BigNumber.from(0);

    await curve.updateFeeData();
    const gasLimit = (await contract.estimateGas.exchange(poolAddress, inputCoinAddress, outputCoinAddress, _amount, _minRecvAmount, { ...curve.constantOptions, value })).mul(130).div(100);
    return (await contract.exchange(poolAddress, inputCoinAddress, outputCoinAddress, _amount, _minRecvAmount, { ...curve.options, value, gasLimit })).hash
}

// --------- Cross-Asset Exchange ---------

export const crossAssetExchangeAvailable = async (inputCoin: string, outputCoin: string): Promise<boolean> => {
    if (curve.chainId !== 1) {
        throw Error(`Cross-asset swaps are not available on this network (id${curve.chainId})`)
    }

    const [inputCoinAddress, outputCoinAddress] = _getCoinAddresses(inputCoin, outputCoin);

    // TODO remove it when fixed
    if (inputCoinAddress.toLowerCase() === COINS.weth.toLowerCase() || outputCoinAddress.toLowerCase() === COINS.weth.toLowerCase()) return false

    const routerContract = await curve.contracts[ALIASES.router].contract;

    return routerContract.can_route(inputCoinAddress, outputCoinAddress, curve.constantOptions);
}

export const _getSmallAmountForCoin = (coinAddress: string): string => {
    let smallAmount = '10'; // $10 or €10
    if (Object.values(BTC_COINS_LOWER_CASE).includes(coinAddress.toLowerCase())) smallAmount = '0.00025'; // =10$ when BTC = $40k
    else if (Object.values(ETH_COINS_LOWER_CASE).includes(coinAddress.toLowerCase())) smallAmount = '0.004'; // =10$ when ETH = $2.5k
    else if (Object.values(LINK_COINS_LOWER_CASE).includes(coinAddress.toLowerCase())) smallAmount = '0.5'; // =10$ when LINK = $20

    return smallAmount
}

export const _crossAssetExchangeInfo = async (
    inputCoinAddress: string,
    outputCoinAddress: string,
    inputCoinDecimals: number,
    outputCoinDecimals: number,
    amount: string
): Promise<{ route: string[], indices: ethers.BigNumber[], _expected: ethers.BigNumber, slippage: number }> => {
    const routerContract = await curve.contracts[ALIASES.router].contract;

    const _amount = ethers.utils.parseUnits(amount, inputCoinDecimals);
    const amountBN = toBN(_amount, inputCoinDecimals);
    const [route, indices, _expected] = await routerContract.get_exchange_routing(inputCoinAddress, outputCoinAddress, _amount, curve.constantOptions);
    const expectedBN = toBN(_expected, outputCoinDecimals);
    const exchangeRateBN = expectedBN.div(amountBN);

    const _smallAmount = ethers.utils.parseUnits(_getSmallAmountForCoin(inputCoinAddress), inputCoinDecimals)
    const smallAmountBN = toBN(_smallAmount, inputCoinDecimals);
    const [, , _expectedSmall] = await routerContract.get_exchange_routing(inputCoinAddress, outputCoinAddress, _smallAmount, curve.constantOptions);
    const expectedSmallBN = toBN(_expectedSmall, outputCoinDecimals);
    const exchangeSmallRateBN = expectedSmallBN.div(smallAmountBN);

    const slippage = 1 - exchangeRateBN.div(exchangeSmallRateBN).toNumber();

    return { route, indices, _expected, slippage }
}

export const crossAssetExchangeOutputAndSlippage = async (inputCoin: string, outputCoin: string, amount: string):
    Promise<{ slippage: number, output: string }> => {
    if (curve.chainId !== 1) {
        throw Error(`Cross-asset swaps are not available on this network (id${curve.chainId})`)
    }

    const [inputCoinAddress, outputCoinAddress] = _getCoinAddresses(inputCoin, outputCoin);
    const [inputCoinDecimals, outputCoinDecimals] = _getCoinDecimals(inputCoinAddress, outputCoinAddress);

    const { _expected, slippage } = await _crossAssetExchangeInfo(inputCoinAddress, outputCoinAddress, inputCoinDecimals, outputCoinDecimals, amount);
    const output = ethers.utils.formatUnits(_expected, outputCoinDecimals);

    return { output, slippage }
}

export const crossAssetExchangeExpected = async (inputCoin: string, outputCoin: string, amount: string): Promise<string> => {
    if (curve.chainId !== 1) {
        throw Error(`Cross-asset swaps are not available on this network (id${curve.chainId})`)
    }

    const [inputCoinAddress, outputCoinAddress] = _getCoinAddresses(inputCoin, outputCoin);
    const [inputCoinDecimals, outputCoinDecimals] = _getCoinDecimals(inputCoinAddress, outputCoinAddress);
    const routerContract = await curve.contracts[ALIASES.router].contract;

    const _amount = ethers.utils.parseUnits(amount, inputCoinDecimals);
    const [, , _expected] = await routerContract.get_exchange_routing(inputCoinAddress, outputCoinAddress, _amount, curve.constantOptions);

    return ethers.utils.formatUnits(_expected, outputCoinDecimals)
}

export const crossAssetExchangeIsApproved = async (inputCoin: string, amount: string): Promise<boolean> => {
    if (curve.chainId !== 1) {
        throw Error(`Cross-asset swaps are not available on this network (id${curve.chainId})`)
    }

    return await hasAllowance([inputCoin], [amount], curve.signerAddress, ALIASES.router);
}

export const crossAssetExchangeApproveEstimateGas = async (inputCoin: string, amount: string): Promise<number> => {
    if (curve.chainId !== 1) {
        throw Error(`Cross-asset swaps are not available on this network (id${curve.chainId})`)
    }

    return await ensureAllowanceEstimateGas([inputCoin], [amount], ALIASES.router);
}

export const crossAssetExchangeApprove = async (inputCoin: string, amount: string): Promise<string[]> => {
    if (curve.chainId !== 1) {
        throw Error(`Cross-asset swaps are not available on this network (id${curve.chainId})`)
    }

    return await ensureAllowance([inputCoin], [amount], ALIASES.router);
}

export const crossAssetExchangeEstimateGas = async (inputCoin: string, outputCoin: string, amount: string, maxSlippage = 0.02): Promise<number> => {
    if (curve.chainId !== 1) {
        throw Error(`Cross-asset swaps are not available on this network (id${curve.chainId})`)
    }

    if (!(await crossAssetExchangeAvailable(inputCoin, outputCoin))) throw Error("Such exchange is not available");

    const [inputCoinAddress, outputCoinAddress] = _getCoinAddresses(inputCoin, outputCoin);

    const inputCoinBalance = (await _getBalances([inputCoinAddress], [curve.signerAddress]))[curve.signerAddress];
    if (Number(inputCoinBalance) < Number(amount)) {
        throw Error(`Not enough ${inputCoin}. Actual: ${inputCoinBalance}, required: ${amount}`);
    }

    if (!(await hasAllowance([inputCoinAddress], [amount], curve.signerAddress, ALIASES.router))) {
        throw Error("Token allowance is needed to estimate gas")
    }

    const [inputCoinDecimals, outputCoinDecimals] = _getCoinDecimals(inputCoinAddress, outputCoinAddress);
    const _amount = ethers.utils.parseUnits(amount, inputCoinDecimals);

    const { route, indices, _expected } = await _crossAssetExchangeInfo(inputCoinAddress, outputCoinAddress, inputCoinDecimals, outputCoinDecimals, amount);
    const minRecvAmountBN: BigNumber = toBN(_expected, outputCoinDecimals).times(1 - maxSlippage);
    const _minRecvAmount = fromBN(minRecvAmountBN, outputCoinDecimals);
    const value = isEth(inputCoinAddress) ? _amount : 0;

    const routerContract = await curve.contracts[ALIASES.router].contract;

    return (await routerContract.estimateGas.exchange(_amount, route, indices, _minRecvAmount, { ...curve.constantOptions, value })).toNumber()
}

export const crossAssetExchange = async (inputCoin: string, outputCoin: string, amount: string, maxSlippage = 0.02): Promise<string> => {
    if (curve.chainId !== 1) {
        throw Error(`Cross-asset swaps are not available on this network (id${curve.chainId})`)
    }

    if (!(await crossAssetExchangeAvailable(inputCoin, outputCoin))) throw Error("Such exchange is not available");

    const [inputCoinAddress, outputCoinAddress] = _getCoinAddresses(inputCoin, outputCoin);
    const [inputCoinDecimals, outputCoinDecimals] = _getCoinDecimals(inputCoinAddress, outputCoinAddress);
    const _amount = ethers.utils.parseUnits(amount, inputCoinDecimals);

    const { route, indices, _expected } = await _crossAssetExchangeInfo(inputCoinAddress, outputCoinAddress, inputCoinDecimals, outputCoinDecimals, amount);
    const minRecvAmountBN: BigNumber = toBN(_expected, outputCoinDecimals).times(1 - maxSlippage);
    const _minRecvAmount = fromBN(minRecvAmountBN, outputCoinDecimals);
    const value = isEth(inputCoinAddress) ? _amount : 0;

    const routerContract = await curve.contracts[ALIASES.router].contract;
    await _ensureAllowance([inputCoinAddress], [_amount], ALIASES.router);

    await curve.updateFeeData();
    const gasLimit = (await routerContract.estimateGas.exchange(_amount, route, indices, _minRecvAmount, { ...curve.constantOptions, value })).mul(130).div(100);
    return (await routerContract.exchange(_amount, route, indices, _minRecvAmount, { ...curve.options, value, gasLimit })).hash;
}
