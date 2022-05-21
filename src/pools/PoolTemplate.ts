import axios from "axios";
import { ethers } from "ethers";
import BigNumber from 'bignumber.js';
import { _getPoolsFromApi } from '../external-api';
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
    _getFactoryStatsUrl,
    _getStats,
    _getFactoryStatsEthereum,
    _getFactoryStatsPolygon,
} from '../utils';
import {
    DictInterface,
    IPoolStats,
    RewardsApyInterface,
} from '../interfaces';
import {
    ALIASES,
    POOLS_DATA,
    curve,
} from "../curve";


export class PoolTemplate {
    id: string;
    name: string;
    fullName: string;
    symbol: string;
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
    isMetaFactory: boolean;
    isPlainFactory: boolean;
    isCryptoFactory: boolean;
    rewardTokens: string[];
    estimateGas: {
        depositApprove: (amounts: string[]) => Promise<number>,
        deposit: (amounts: string[]) => Promise<number>,
        depositWrappedApprove: (amounts: string[]) => Promise<number>,
        depositWrapped: (amounts: string[]) => Promise<number>,
        stakeApprove: (lpTokenAmount: string) => Promise<number>,
        stake: (lpTokenAmount: string) => Promise<number>,
        unstake: (lpTokenAmount: string) => Promise<number>,
        claimCrv: () => Promise<number>,
        claimRewards: () => Promise<number>,
        depositAndStakeApprove: (amounts: string[]) => Promise<number>,
        depositAndStake: (amounts: string[]) => Promise<number>,
        depositAndStakeWrappedApprove: (amounts: string[]) => Promise<number>,
        depositAndStakeWrapped: (amounts: string[]) => Promise<number>,
        withdrawApprove: (lpTokenAmount: string) => Promise<number>,
        withdraw: (lpTokenAmount: string) => Promise<number>,
        withdrawWrapped: (lpTokenAmount: string) => Promise<number>,
        withdrawImbalanceApprove: (amounts: string[]) => Promise<number>,
        withdrawImbalance: (amounts: string[]) => Promise<number>,
        withdrawImbalanceWrapped: (amounts: string[]) => Promise<number>,
        withdrawOneCoinApprove: (lpTokenAmount: string, coin: string | number) => Promise<number>,
        withdrawOneCoin: (lpTokenAmount: string, coin: string | number) => Promise<number>,
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
        getTotalLiquidity: (useApi?: boolean) => Promise<string>,
        getVolume: () => Promise<string>,
        getBaseApy: () => Promise<{day: string, week: string, month: string, total: string}>,
        getTokenApy: () => Promise<[baseApy: string, boostedApy: string]>,
        getRewardsApy: () => Promise<RewardsApyInterface[]>,
    }

    constructor(id: string) {
        const poolData = { ...POOLS_DATA, ...(curve.constants.FACTORY_POOLS_DATA || {}), ...(curve.constants.CRYPTO_FACTORY_POOLS_DATA || {}) }[id];

        this.id = id;
        this.name = poolData.name;
        this.fullName = poolData.full_name;
        this.symbol = poolData.symbol;
        this.referenceAsset = poolData.reference_asset;
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
        this.isMetaFactory = poolData.is_meta_factory || false;
        this.isPlainFactory = poolData.is_plain_factory || false;
        this.isCryptoFactory = poolData.is_crypto_factory || false;
        this.basePool = poolData.base_pool || '';
        this.rewardTokens = poolData.reward_tokens || [];
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
            removeLiquidityOneCoinWrapped: this.removeLiquidityOneCoinWrappedEstimateGas,
            exchangeApprove: this.exchangeApproveEstimateGas,
            exchange: this.exchangeEstimateGas,
            exchangeWrappedApprove: this.exchangeWrappedApproveEstimateGas,
            exchangeWrapped: this.exchangeWrappedEstimateGas,
        }
        this.stats = {
            getParameters: this.getParameters,
            getPoolBalances: this.getPoolBalances.bind(this),
            getPoolWrappedBalances: this.getPoolWrappedBalances.bind(this),
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

        const A_PRECISION = curve.chainId === 1 && ['compound', 'usdt', 'y', 'busd', 'susd', 'pax', 'ren', 'sbtc', 'hbtc', '3pool'].includes(this.id) ? 1 : 100;
        const [_future_A, _initial_A, _future_A_time, _initial_A_time] = await curve.multicallProvider.all(additionalCalls) as ethers.BigNumber[]
        const [future_A, initial_A, future_A_time, initial_A_time] = [
            _future_A ? String(Number(ethers.utils.formatUnits(_future_A, 0)) / A_PRECISION) : undefined,
            _initial_A ? String(Number(ethers.utils.formatUnits(_initial_A, 0)) / A_PRECISION) : undefined,
            _future_A_time ? Number(ethers.utils.formatUnits(_future_A_time, 0)) * 1000 : undefined,
            _initial_A_time ? Number(ethers.utils.formatUnits(_initial_A_time, 0)) * 1000 : undefined,
        ]

        return { virtualPrice, fee, adminFee, A, future_A, initial_A, future_A_time, initial_A_time, gamma };
    }

    private async getPoolWrappedBalances(): Promise<string[]> {
        const swapContract = curve.contracts[this.swap].multicallContract;
        const contractCalls = this.coins.map((_, i) => swapContract.balances(i));

        const _wrappedBalances: ethers.BigNumber[] = await curve.multicallProvider.all(contractCalls);
        return _wrappedBalances.map((_b, i) => ethers.utils.formatUnits(_b, this.decimals[i]));
    }

    // OVERRIDE
    private async getPoolBalances(): Promise<string[]> {
        return await this.getPoolWrappedBalances();
    }

    private getTotalLiquidity = async (useApi = true): Promise<string> => {
        if (useApi) {
            const network = curve.chainId === 137 ? "polygon" : "ethereum";
            const poolType = !this.isFactory && !this.isCrypto ? "main" :
                !this.isFactory ? "crypto" :
                !this.isCryptoFactory ? "factory" :
                "factory-crypto";
            const poolsData = (await _getPoolsFromApi(network, poolType)).poolData;

            try {
                const totalLiquidity = poolsData.filter((data) => data.address.toLowerCase() === this.swap.toLowerCase())[0].usdTotal;
                return String(totalLiquidity);
            } catch (err) {
                console.log((err as Error).message);
            }
        }
        const balances = await this.getPoolBalances();

        const promises = [];
        for (const addr of this.underlyingCoinAddresses) {
            promises.push(_getUsdRate(addr))
        }

        const prices = await Promise.all(promises);


        const totalLiquidity = (balances as string[]).reduce(
            (liquidity: number, b: string, i: number) => liquidity + (Number(b) * (prices[i] as number)), 0);

        return totalLiquidity.toFixed(8)
    }

    private _getPoolStats = async (): Promise<IPoolStats> => {
        const statsUrl = this.isFactory ? _getFactoryStatsUrl() : _getStatsUrl(this.isCrypto);
        const name = (this.id === 'ren' && curve.chainId === 1) ? 'ren2' : this.id === 'sbtc' ? 'rens' : this.id;
        const key = this.isFactory ? this.swap.toLowerCase() : name;

        if (this.isFactory) {
            if (curve.chainId === 137) {
                return (await _getFactoryStatsPolygon(statsUrl))[key];
            } else {
                return (await _getFactoryStatsEthereum(statsUrl))[key];
            }
        }

        return (await _getStats(statsUrl))[key];
    }

    private getVolume = async (): Promise<string> => {
        const volume = (await this._getPoolStats()).volume;
        if (volume === 0) return "0"

        const usdRate = (this.isCrypto || (curve.chainId === 1 && this.isFactory)) ? 1 : await _getUsdRate(this.coinAddresses[0]);

        return String(volume * usdRate)
    }

    private getBaseApy = async (): Promise<{day: string, week: string, month: string, total: string}> => {
        const apy = (await this._getPoolStats()).apy;

        const multiplier = this.isFactory ? 1 : 100;
        const formattedApy = [apy.day, apy.week, apy.month, apy.total].map(
            (x: number) => (x * multiplier).toFixed(4)
        ) as [daily: string, weekly: string, monthly: string, total: string]

        return {
            day: formattedApy[0],
            week: formattedApy[1],
            month: formattedApy[2],
            total: formattedApy[3],
        }
    }

    private getTokenApy = async (): Promise<[baseApy: string, boostedApy: string]> => {
        if (this.gauge === ethers.constants.AddressZero) throw Error(`${this.name} doesn't have gauge`);
        if (curve.chainId === 137) throw Error(`No such method on network with id ${curve.chainId}. Use getRewardsApy instead`);

        const gaugeContract = curve.contracts[this.gauge].multicallContract;
        const lpTokenContract = curve.contracts[this.lpToken].multicallContract;
        const gaugeControllerContract = curve.contracts[ALIASES.gauge_controller].multicallContract;

        const totalLiquidityUSD = await this.getTotalLiquidity();
        if (Number(totalLiquidityUSD) === 0) return ["0", "0"];

        const [inflation, weight, workingSupply, totalSupply] = (await curve.multicallProvider.all([
            gaugeContract.inflation_rate(),
            gaugeControllerContract.gauge_relative_weight(this.gauge),
            gaugeContract.working_supply(),
            lpTokenContract.totalSupply(),
        ]) as ethers.BigNumber[]).map((value: ethers.BigNumber) => toBN(value));
        if (Number(workingSupply) === 0) return ["0", "0"];

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

    private async _calcLpTokenAmount(_amounts: ethers.BigNumber[], isDeposit = true, useUnderlying = true): Promise<ethers.BigNumber> {
        if (!this.isMeta && useUnderlying) {
            // For lending pools. For others rate = 1
            const _rates: ethers.BigNumber[] = await this._getRates();
            _amounts = _amounts.map((_amount: ethers.BigNumber, i: number) =>
                _amount.mul(ethers.BigNumber.from(10).pow(18)).div(_rates[i]));
        }

        const contractAddress = this.isMeta && useUnderlying ? this.zap as string : this.swap;
        const contract = curve.contracts[contractAddress].contract;

        if (this.isMetaFactory && useUnderlying) {
            return await contract.calc_token_amount(this.swap, _amounts, isDeposit, curve.constantOptions);
        }

        if (contract[`calc_token_amount(uint256[${_amounts.length}],bool)`]) {
            return await contract.calc_token_amount(_amounts, isDeposit, curve.constantOptions);
        }

        return await contract.calc_token_amount(_amounts, curve.constantOptions);
    }

    private async calcLpTokenAmount(amounts: string[], isDeposit = true): Promise<string> {
        if (amounts.length !== this.underlyingCoinAddresses.length) {
            throw Error(`${this.name} pool has ${this.underlyingCoinAddresses.length} coins (amounts provided for ${amounts.length})`);
        }

        const _underlyingAmounts: ethers.BigNumber[] = amounts.map((amount: string, i: number) =>
            ethers.utils.parseUnits(amount, this.underlyingDecimals[i]));
        const _expected = await this._calcLpTokenAmount(_underlyingAmounts, isDeposit, true);

        return ethers.utils.formatUnits(_expected);
    }

    private async calcLpTokenAmountWrapped(amounts: string[], isDeposit = true): Promise<string> {
        if (amounts.length !== this.coinAddresses.length) {
            throw Error(`${this.name} pool has ${this.coinAddresses.length} coins (amounts provided for ${amounts.length})`);
        }

        if (this.isFake) {
            throw Error(`${this.name} pool doesn't have this method`);
        }

        const _amounts: ethers.BigNumber[] = amounts.map((amount: string, i: number) =>
            ethers.utils.parseUnits(amount, this.decimals[i]));
        const _expected = await this._calcLpTokenAmount(_amounts, isDeposit, false);

        return ethers.utils.formatUnits(_expected);
    }


    // ---------------- DEPOSIT ----------------

    public async balancedAmounts(): Promise<string[]> {
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

    public async depositExpected(amounts: string[]): Promise<string> {
        // TODO don't convert to Number
        amounts = amounts.map((a, i) => Number(a).toFixed(this.underlyingDecimals[i]));
        return await this.calcLpTokenAmount(amounts);
    }

    // OVERRIDE
    public async depositSlippage(amounts: string[]): Promise<string> {
        throw Error(`depositSlippage method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    public async depositIsApproved(amounts: string[]): Promise<boolean> {
        return await hasAllowance(this.underlyingCoinAddresses, amounts, curve.signerAddress, this.zap || this.swap);
    }

    private async depositApproveEstimateGas(amounts: string[]): Promise<number> {
        return await ensureAllowanceEstimateGas(this.underlyingCoinAddresses, amounts, this.zap || this.swap);
    }

    public async depositApprove(amounts: string[]): Promise<string[]> {
        return await ensureAllowance(this.underlyingCoinAddresses, amounts, this.zap || this.swap);
    }

    // OVERRIDE
    private async depositEstimateGas(amounts: string[]): Promise<number> {
        throw Error(`depositEstimateGas method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    // OVERRIDE
    public async deposit(amounts: string[]): Promise<string> {
        throw Error(`deposit method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    // ---------------- DEPOSIT WRAPPED ----------------

    public async balancedWrappedAmounts(): Promise<string[]> {
        if (this.isFake) {
            throw Error(`balancedWrappedAmounts method doesn't exist for pool ${this.name} (id: ${this.name})`);
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

    public async depositWrappedExpected(amounts: string[]): Promise<string> {
        if (this.isFake) {
            throw Error(`depositWrappedExpected method doesn't exist for pool ${this.name} (id: ${this.name})`);
        }

        // TODO don't convert to Number
        amounts = amounts.map((a, i) => Number(a).toFixed(this.decimals[i]));
        return await this.calcLpTokenAmountWrapped(amounts);
    }

    // OVERRIDE
    public async depositWrappedSlippage(amounts: string[]): Promise<string> {
        throw Error(`depositWrappedSlippage method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    public async depositWrappedIsApproved(amounts: string[]): Promise<boolean> {
        if (this.isFake) {
            throw Error(`depositWrappedIsApproved method doesn't exist for pool ${this.name} (id: ${this.name})`);
        }

        return await hasAllowance(this.coinAddresses, amounts, curve.signerAddress, this.swap);
    }

    private async depositWrappedApproveEstimateGas(amounts: string[]): Promise<number> {
        if (this.isFake) {
            throw Error(`depositWrappedApprove method doesn't exist for pool ${this.name} (id: ${this.name})`);
        }

        return await ensureAllowanceEstimateGas(this.coinAddresses, amounts, this.swap);
    }

    public async depositWrappedApprove(amounts: string[]): Promise<string[]> {
        if (this.isFake) {
            throw Error(`depositWrappedApprove method doesn't exist for pool ${this.name} (id: ${this.name})`);
        }

        return await ensureAllowance(this.coinAddresses, amounts, this.swap);
    }

    // OVERRIDE
    private async depositWrappedEstimateGas(amounts: string[]): Promise<number> {
        throw Error(`depositWrapped method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    // OVERRIDE
    public async depositWrapped(amounts: string[]): Promise<string> {
        throw Error(`depositWrapped method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    // ---------------- STAKING ----------------

    public async stakeIsApproved(lpTokenAmount: string): Promise<boolean> {
        if (this.gauge === ethers.constants.AddressZero) {
            throw Error(`stakeIsApproved method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        return await hasAllowance([this.lpToken], [lpTokenAmount], curve.signerAddress, this.gauge);
    }

    private async stakeApproveEstimateGas(lpTokenAmount: string): Promise<number> {
        if (this.gauge === ethers.constants.AddressZero) {
            throw Error(`stakeApproveEstimateGas method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        return await ensureAllowanceEstimateGas([this.lpToken], [lpTokenAmount], this.gauge);
    }

    public async stakeApprove(lpTokenAmount: string): Promise<string[]> {
        if (this.gauge === ethers.constants.AddressZero) {
            throw Error(`stakeApprove method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        return await ensureAllowance([this.lpToken], [lpTokenAmount], this.gauge);
    }

    private async stakeEstimateGas(lpTokenAmount: string): Promise<number> {
        if (this.gauge === ethers.constants.AddressZero) {
            throw Error(`stakeEstimateGas method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        const _lpTokenAmount = ethers.utils.parseUnits(lpTokenAmount);
        return (await curve.contracts[this.gauge].contract.estimateGas.deposit(_lpTokenAmount, curve.constantOptions)).toNumber();
    }

    public async stake(lpTokenAmount: string): Promise<string> {
        if (this.gauge === ethers.constants.AddressZero) {
            throw Error(`stake method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        const _lpTokenAmount = ethers.utils.parseUnits(lpTokenAmount);
        await _ensureAllowance([this.lpToken], [_lpTokenAmount], this.gauge)

        const gasLimit = (await curve.contracts[this.gauge].contract.estimateGas.deposit(_lpTokenAmount, curve.constantOptions)).mul(150).div(100);
        return (await curve.contracts[this.gauge].contract.deposit(_lpTokenAmount, { ...curve.options, gasLimit })).hash;
    }

    private async unstakeEstimateGas(lpTokenAmount: string): Promise<number> {
        if (this.gauge === ethers.constants.AddressZero) {
            throw Error(`unstakeEstimateGas method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        const _lpTokenAmount = ethers.utils.parseUnits(lpTokenAmount);
        return (await curve.contracts[this.gauge].contract.estimateGas.withdraw(_lpTokenAmount, curve.constantOptions)).toNumber();
    }

    public async unstake(lpTokenAmount: string): Promise<string> {
        if (this.gauge === ethers.constants.AddressZero) {
            throw Error(`unstake method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        const _lpTokenAmount = ethers.utils.parseUnits(lpTokenAmount);

        const gasLimit = (await curve.contracts[this.gauge].contract.estimateGas.withdraw(_lpTokenAmount, curve.constantOptions)).mul(200).div(100);
        return (await curve.contracts[this.gauge].contract.withdraw(_lpTokenAmount, { ...curve.options, gasLimit })).hash;
    }

    public async claimableCrv (address = ""): Promise<string> {
        if (this.gauge === ethers.constants.AddressZero) {
            throw Error(`claimableCrv method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        if (curve.chainId !== 1) throw Error(`No such method on network with id ${curve.chainId}. Use claimableRewards instead`)

        address = address || curve.signerAddress;
        if (!address) throw Error("Need to connect wallet or pass address into args");

        return ethers.utils.formatUnits(await curve.contracts[this.gauge].contract.claimable_tokens(address, curve.constantOptions));
    }

    public async claimCrvEstimateGas(): Promise<number> {
        if (this.gauge === ethers.constants.AddressZero) {
            throw Error(`claimCrv method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        if (curve.chainId !== 1) throw Error(`No such method on network with id ${curve.chainId}. Use claimRewards instead`)

        return (await curve.contracts[ALIASES.minter].contract.estimateGas.mint(this.gauge, curve.constantOptions)).toNumber();
    }

    public async claimCrv(): Promise<string> {
        if (this.gauge === ethers.constants.AddressZero) {
            throw Error(`claimCrv method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        if (curve.chainId !== 1) throw Error(`No such method on network with id ${curve.chainId}. Use claimRewards instead`)

        const gasLimit = (await curve.contracts[ALIASES.minter].contract.estimateGas.mint(this.gauge, curve.constantOptions)).mul(130).div(100);
        return (await curve.contracts[ALIASES.minter].contract.mint(this.gauge, { ...curve.options, gasLimit })).hash;
    }

    // TODO 1. Fix aave and saave error
    // TODO 2. Figure out Synthetix cumulative results
    public async claimableRewards(address = ""): Promise<{token: string, symbol: string, amount: string}[]> {
        if (this.gauge === ethers.constants.AddressZero) {
            throw Error(`claimableRewards method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
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

    public async claimRewardsEstimateGas(): Promise<number> {
        if (this.gauge === ethers.constants.AddressZero) {
            throw Error(`claimRewards method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        const gaugeContract = curve.contracts[this.gauge].contract;
        if (!("claim_rewards()" in gaugeContract)) throw Error (`${this.name} pool doesn't have such method`);

        return (await gaugeContract.estimateGas.claim_rewards(curve.constantOptions)).toNumber();
    }

    public async claimRewards(): Promise<string> {
        if (this.gauge === ethers.constants.AddressZero) {
            throw Error(`claimRewards method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        const gaugeContract = curve.contracts[this.gauge].contract;
        if (!("claim_rewards()" in gaugeContract)) throw Error (`${this.name} pool doesn't have such method`);

        const gasLimit = (await gaugeContract.estimateGas.claim_rewards(curve.constantOptions)).mul(130).div(100);
        return (await gaugeContract.claim_rewards({ ...curve.options, gasLimit })).hash;
    }

    // ---------------- DEPOSIT & STAKE ----------------

    public async depositAndStakeExpected(amounts: string[]): Promise<string> {
        if (this.gauge === ethers.constants.AddressZero) {
            throw Error(`depositAndStakeExpected method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }

        return await this.depositExpected(amounts);
    }

    public async depositAndStakeSlippage(amounts: string[]): Promise<string> {
        if (this.gauge === ethers.constants.AddressZero) {
            throw Error(`depositAndStakeSlippage method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }

        return await this.depositSlippage(amounts);
    }

    public async depositAndStakeIsApproved(amounts: string[]): Promise<boolean> {
        if (this.gauge === ethers.constants.AddressZero) {
            throw Error(`depositAndStakeIsApproved method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        const coinsAllowance: boolean = await hasAllowance(this.underlyingCoinAddresses, amounts, curve.signerAddress, ALIASES.deposit_and_stake);

        const gaugeContract = curve.contracts[this.gauge].contract;
        if (Object.prototype.hasOwnProperty.call(gaugeContract, 'approved_to_deposit')) {
            const gaugeAllowance: boolean = await gaugeContract.approved_to_deposit(curve.signerAddress, ALIASES.deposit_and_stake, curve.constantOptions);
            return coinsAllowance && gaugeAllowance
        }

        return coinsAllowance;
    }

    private async depositAndStakeApproveEstimateGas(amounts: string[]): Promise<number> {
        if (this.gauge === ethers.constants.AddressZero) {
            throw Error(`depositAndStakeApprove method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
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

    public async depositAndStakeApprove(amounts: string[]): Promise<string[]> {
        if (this.gauge === ethers.constants.AddressZero) {
            throw Error(`depositAndStakeApprove method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
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

    private async depositAndStakeEstimateGas(amounts: string[]): Promise<number> {
        if (this.gauge === ethers.constants.AddressZero) {
            throw Error(`depositAndStake method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }

        return await this._depositAndStake(amounts, true, true) as number
    }

    public async depositAndStake(amounts: string[]): Promise<string> {
        if (this.gauge === ethers.constants.AddressZero) {
            throw Error(`depositAndStake method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }

        return await this._depositAndStake(amounts, true, false) as string
    }

    // ---------------- DEPOSIT & STAKE WRAPPED ----------------

    public async depositAndStakeWrappedExpected(amounts: string[]): Promise<string> {
        if (this.gauge === ethers.constants.AddressZero) {
            throw Error(`depositAndStakeWrappedExpected method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        if (this.isFake) throw Error(`depositAndStakeWrappedExpected method doesn't exist for pool ${this.name} (id: ${this.name})`);

        return await this.depositWrappedExpected(amounts);
    }

    public async depositAndStakeWrappedSlippage(amounts: string[]): Promise<string> {
        if (this.gauge === ethers.constants.AddressZero) {
            throw Error(`depositAndStakeWrappedSlippage method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        if (this.isFake) throw Error(`depositAndStakeWrappedSlippage method doesn't exist for pool ${this.name} (id: ${this.name})`);

        return await this.depositWrappedSlippage(amounts);
    }

    public async depositAndStakeWrappedIsApproved(amounts: string[]): Promise<boolean> {
        if (this.gauge === ethers.constants.AddressZero) {
            throw Error(`depositAndStakeWrappedIsApproved method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        if (this.isFake) throw Error(`depositAndStakeWrappedIsApproved method doesn't exist for pool ${this.name} (id: ${this.name})`);

        const coinsAllowance: boolean = await hasAllowance(this.coinAddresses, amounts, curve.signerAddress, ALIASES.deposit_and_stake);

        const gaugeContract = curve.contracts[this.gauge].contract;
        if (Object.prototype.hasOwnProperty.call(gaugeContract, 'approved_to_deposit')) {
            const gaugeAllowance: boolean = await gaugeContract.approved_to_deposit(curve.signerAddress, ALIASES.deposit_and_stake, curve.constantOptions);
            return coinsAllowance && gaugeAllowance;
        }

        return coinsAllowance;
    }

    private async depositAndStakeWrappedApproveEstimateGas(amounts: string[]): Promise<number> {
        if (this.gauge === ethers.constants.AddressZero) {
            throw Error(`depositAndStakeWrappedApprove method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        if (this.isFake) throw Error(`depositAndStakeWrappedApprove method doesn't exist for pool ${this.name} (id: ${this.name})`);

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

    public async depositAndStakeWrappedApprove(amounts: string[]): Promise<string[]> {
        if (this.gauge === ethers.constants.AddressZero) {
            throw Error(`depositAndStakeWrappedApprove method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        if (this.isFake) throw Error(`depositAndStakeWrappedApprove method doesn't exist for pool ${this.name} (id: ${this.name})`);

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

    private async depositAndStakeWrappedEstimateGas(amounts: string[]): Promise<number> {
        if (this.gauge === ethers.constants.AddressZero) {
            throw Error(`depositAndStakeWrapped method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        if (this.isFake) throw Error(`depositAndStakeWrapped method doesn't exist for pool ${this.name} (id: ${this.name})`);

        return await this._depositAndStake(amounts, false, true) as number
    }

    public async depositAndStakeWrapped(amounts: string[]): Promise<string> {
        if (this.gauge === ethers.constants.AddressZero) {
            throw Error(`depositAndStakeWrapped method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        if (this.isFake) throw Error(`depositAndStakeWrapped method doesn't exist for pool ${this.name} (id: ${this.name})`);

        return await this._depositAndStake(amounts, false, false) as string
    }

    private async _depositAndStake(amounts: string[], isUnderlying: boolean, estimateGas: boolean): Promise<string | number> {
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
        const isLending = this.useLending.reduce((a, b) => a || b)
        const useUnderlying = isUnderlying && (isLending || this.isCrypto) && !this.zap;
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
            this.isMetaFactory && isUnderlying ? this.swap : ethers.constants.AddressZero,
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
            this.isMetaFactory && isUnderlying ? this.swap : ethers.constants.AddressZero,
            { ...curve.options, gasLimit, value }
        )).hash
    }

    // ---------------- WITHDRAW ----------------

    // OVERRIDE
    public async withdrawExpected(lpTokenAmount: string): Promise<string[]> {
        throw Error(`withdrawExpected method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    public async withdrawIsApproved(lpTokenAmount: string): Promise<boolean> {
        if (!this.zap) return true
        return await hasAllowance([this.lpToken], [lpTokenAmount], curve.signerAddress, this.zap as string);
    }

    private async withdrawApproveEstimateGas(lpTokenAmount: string): Promise<number> {
        if (!this.zap) return 0;
        return await ensureAllowanceEstimateGas([this.lpToken], [lpTokenAmount], this.zap as string);
    }

    public async withdrawApprove(lpTokenAmount: string): Promise<string[]> {
        if (!this.zap) return [];
        return await ensureAllowance([this.lpToken], [lpTokenAmount], this.zap as string);
    }

    // OVERRIDE
    private async withdrawEstimateGas(lpTokenAmount: string): Promise<number> {
        throw Error(`withdraw method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    // OVERRIDE
    public async withdraw(lpTokenAmount: string, maxSlippage=0.005): Promise<string> {
        throw Error(`withdraw method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    // ---------------- WITHDRAW WRAPPED ----------------

    // OVERRIDE
    public async withdrawWrappedExpected (lpTokenAmount: string): Promise<string[]> {
        throw Error(`withdrawWrappedExpected method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    // OVERRIDE
    private async withdrawWrappedEstimateGas(lpTokenAmount: string): Promise<number> {
        throw Error(`withdrawWrapped method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    // OVERRIDE
    public async withdrawWrapped(lpTokenAmount: string, maxSlippage=0.005): Promise<string> {
        throw Error(`withdrawWrapped method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    // ---------------- WITHDRAW IMBALANCE ----------------

    public async withdrawImbalanceExpected(amounts: string[]): Promise<string> {
        if (this.isCrypto) throw Error(`withdrawImbalanceExpected method doesn't exist for pool ${this.name} (id: ${this.name})`);

        amounts = amounts.map((a, i) => Number(a).toFixed(this.underlyingDecimals[i]));

        return await this.calcLpTokenAmount(amounts, false);
    }

    public async withdrawImbalanceSlippage(amounts: string[]): Promise<string> {
        if (this.isCrypto) throw Error(`withdrawImbalanceSlippage method doesn't exist for pool ${this.name} (id: ${this.name})`);

        const totalAmount = amounts.reduce((s, a) => s + Number(a), 0);
        const expected = Number(await this.withdrawImbalanceExpected(amounts));

        return await this._withdrawSlippage(totalAmount, expected);
    }

    public async withdrawImbalanceIsApproved(amounts: string[]): Promise<boolean> {
        if (this.isCrypto) throw Error(`withdrawImbalanceIsApproved method doesn't exist for pool ${this.name} (id: ${this.name})`);

        if (this.zap) {
            const _amounts: ethers.BigNumber[] = amounts.map((amount: string, i: number) => ethers.utils.parseUnits(amount, this.underlyingDecimals[i]));
            const _maxBurnAmount = (await this._calcLpTokenAmount(_amounts, false)).mul(101).div(100);
            return await hasAllowance([this.lpToken], [ethers.utils.formatUnits(_maxBurnAmount, 18)], curve.signerAddress, this.zap as string);
        }

        return true;
    }

    private async withdrawImbalanceApproveEstimateGas(amounts: string[]): Promise<number> {
        if (this.isCrypto) throw Error(`withdrawImbalanceApprove method doesn't exist for pool ${this.name} (id: ${this.name})`);

        if (this.zap) {
            const _amounts: ethers.BigNumber[] = amounts.map((amount: string, i: number) => ethers.utils.parseUnits(amount, this.underlyingDecimals[i]));
            const _maxBurnAmount = (await this._calcLpTokenAmount(_amounts, false)).mul(101).div(100);
            return await ensureAllowanceEstimateGas([this.lpToken], [ethers.utils.formatUnits(_maxBurnAmount, 18)], this.zap as string);
        }

        return 0;
    }

    public async withdrawImbalanceApprove(amounts: string[]): Promise<string[]> {
        if (this.isCrypto) throw Error(`withdrawImbalanceApprove method doesn't exist for pool ${this.name} (id: ${this.name})`);

        if (this.zap) {
            const _amounts: ethers.BigNumber[] = amounts.map((amount: string, i: number) => ethers.utils.parseUnits(amount, this.underlyingDecimals[i]));
            const _maxBurnAmount = (await this._calcLpTokenAmount(_amounts, false)).mul(101).div(100);
            return await ensureAllowance([this.lpToken], [ethers.utils.formatUnits(_maxBurnAmount, 18)], this.zap as string);
        }

        return [];
    }

    // OVERRIDE
    private async withdrawImbalanceEstimateGas(amounts: string[]): Promise<number> {
        throw Error(`withdrawImbalance method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    // OVERRIDE
    public async withdrawImbalance(amounts: string[], maxSlippage=0.005): Promise<string> {
        throw Error(`withdrawImbalance method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    // ---------------- WITHDRAW IMBALANCE WRAPPED ----------------

    public async withdrawImbalanceWrappedExpected(amounts: string[]): Promise<string> {
        if (this.isCrypto) throw Error(`withdrawImbalanceWrappedExpected method doesn't exist for pool ${this.name} (id: ${this.name})`);

        amounts = amounts.map((a, i) => Number(a).toFixed(this.underlyingDecimals[i]));

        return await this.calcLpTokenAmountWrapped(amounts, false);
    }

    public async withdrawImbalanceWrappedSlippage(amounts: string[]): Promise<string> {
        if (this.isCrypto) throw Error(`withdrawImbalanceWrappedSlippage method doesn't exist for pool ${this.name} (id: ${this.name})`);

        const totalAmount = amounts.reduce((s, a) => s + Number(a), 0);
        const expected = Number(await this.withdrawImbalanceWrappedExpected(amounts));

        return await this._withdrawSlippage(totalAmount, expected, false);
    }

    private async withdrawImbalanceWrappedEstimateGas(amounts: string[]): Promise<number> {
        throw Error(`withdrawImbalanceWrapped method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    public async withdrawImbalanceWrapped(amounts: string[], maxSlippage=0.005): Promise<string> {
        throw Error(`withdrawImbalanceWrapped method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    // ---------------- WITHDRAW ONE COIN ----------------

    private async _withdrawOneCoinExpected(_lpTokenAmount: ethers.BigNumber, i: number): Promise<ethers.BigNumber> {
        throw Error(`_withdrawOneCoinExpected method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    public async withdrawOneCoinExpected(lpTokenAmount: string, coin: string | number): Promise<string> {
        const i = this._getCoinIdx(coin);
        const _lpTokenAmount = ethers.utils.parseUnits(lpTokenAmount);
        const _expected = await this._withdrawOneCoinExpected(_lpTokenAmount, i);

        return ethers.utils.formatUnits(_expected, this.underlyingDecimals[i]);
    }

    public async withdrawOneCoinSlippage(lpTokenAmount: string, coin: string | number): Promise<string> {
        const totalAmount = Number(await this.withdrawOneCoinExpected(lpTokenAmount, coin));

        if (this.isCrypto) {
            const coinPrice = (await this._underlyingPrices())[this._getCoinIdx(coin)];
            return await this._withdrawCryptoSlippage(totalAmount * coinPrice, Number(lpTokenAmount));
        }

        return await this._withdrawSlippage(totalAmount, Number(lpTokenAmount));
    }

    public async withdrawOneCoinIsApproved(lpTokenAmount: string): Promise<boolean> {
        if (!this.zap) return true
        return await hasAllowance([this.lpToken], [lpTokenAmount], curve.signerAddress, this.zap as string);
    }

    private async withdrawOneCoinApproveEstimateGas(lpTokenAmount: string): Promise<number> {
        if (!this.zap) return 0
        return await ensureAllowanceEstimateGas([this.lpToken], [lpTokenAmount], this.zap as string);
    }

    public async withdrawOneCoinApprove(lpTokenAmount: string): Promise<string[]> {
        if (!this.zap) return []
        return await ensureAllowance([this.lpToken], [lpTokenAmount], this.zap as string);
    }

    private async withdrawOneCoinEstimateGas(lpTokenAmount: string, coin: string | number): Promise<number> {
        throw Error(`withdrawOneCoin method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    public async withdrawOneCoin(lpTokenAmount: string, coin: string | number, maxSlippage=0.005): Promise<string> {
        throw Error(`withdrawOneCoin method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    // ---------------- WITHDRAW ONE COIN WRAPPED ----------------

    public removeLiquidityOneCoinWrappedExpected = async (lpTokenAmount: string, coin: string | number): Promise<string> => {
        if (this.isFake) {
            throw Error(`${this.name} pool doesn't have this method`);
        }

        if (['compound', 'usdt', 'y', 'busd', 'pax'].includes(this.id)) {
            throw Error(`${this.name} pool doesn't have remove_liquidity_one_coin method for wrapped tokens`);
        }

        const i = this._getCoinIdx(coin, false);
        const _lpTokenAmount = ethers.utils.parseUnits(lpTokenAmount);

        let _expected: ethers.BigNumber;
        if (this.id === 'ib') {
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
            return await this._withdrawCryptoSlippage(totalAmount * coinPrice, Number(lpTokenAmount));
        }

        return await this._withdrawSlippage(totalAmount, Number(lpTokenAmount), false);
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
        if (['compound', 'usdt', 'y', 'busd', 'pax'].includes(this.id)) {
            throw Error(`${this.name} pool doesn't have remove_liquidity_one_coin method for wrapped tokens`);
        }

        const _lpTokenAmount = ethers.utils.parseUnits(lpTokenAmount);

        // Lending pools without zap
        if (['aave', 'saave', 'ib', 'crveth', "cvxeth", "spelleth", "teth"].includes(this.id) ||
            this.isCryptoFactory ||
            (curve.chainId === 137 && this.id === 'ren')
        ) {
            return await this._removeLiquidityOneCoin(_lpTokenAmount, i,false, true) as number;
        }

        return await this._removeLiquidityOneCoinSwap(_lpTokenAmount, i, true) as number;
    }


    public removeLiquidityOneCoinWrapped = async (lpTokenAmount: string, coin: string | number): Promise<string> => {
        if (this.isFake) {
            throw Error(`${this.name} pool doesn't have this method`);
        }

        const i = this._getCoinIdx(coin, false);
        if (['compound', 'usdt', 'y', 'busd', 'pax'].includes(this.id)) {
            throw Error(`${this.name} pool doesn't have remove_liquidity_one_coin method for wrapped tokens`);
        }

        await curve.updateFeeData();

        const _lpTokenAmount = ethers.utils.parseUnits(lpTokenAmount);

        // Lending pools without zap
        if (['aave', 'saave', 'ib', 'crveth', "cvxeth", "spelleth", "teth"].includes(this.id) ||
            this.isCryptoFactory ||
            (curve.chainId === 137 && this.id === 'ren')
        ) {
            return await this._removeLiquidityOneCoin(_lpTokenAmount, i,false) as string;
        }

        return await this._removeLiquidityOneCoinSwap(_lpTokenAmount, i) as string;
    }

    public balances = async (...addresses: string[] | string[][]): Promise<DictInterface<DictInterface<string>> | DictInterface<string>> =>  {
        if (this.gauge === ethers.constants.AddressZero) {
            return await this._balances(
                ['lpToken', ...this.underlyingCoinAddresses, ...this.coinAddresses],
                [this.lpToken, ...this.underlyingCoinAddresses, ...this.coinAddresses],
                ...addresses
            );
        } else {
            return await this._balances(
                ['lpToken', 'gauge', ...this.underlyingCoinAddresses, ...this.coinAddresses],
                [this.lpToken, this.gauge, ...this.underlyingCoinAddresses, ...this.coinAddresses],
                ...addresses
            );
        }
    }

    public lpTokenBalances = async (...addresses: string[] | string[][]): Promise<DictInterface<DictInterface<string>> | DictInterface<string>> =>  {
        if (this.gauge === ethers.constants.AddressZero) {
            return await this._balances(['lpToken'], [this.lpToken], ...addresses);
        } else {
            return await this._balances(['lpToken', 'gauge'], [this.lpToken, this.gauge], ...addresses);
        }
    }

    public underlyingCoinBalances = async (...addresses: string[] | string[][]): Promise<DictInterface<DictInterface<string>> | DictInterface<string>> =>  {
        return await this._balances(this.underlyingCoinAddresses, this.underlyingCoinAddresses, ...addresses)
    }

    public coinBalances = async (...addresses: string[] | string[][]): Promise<DictInterface<DictInterface<string>> | DictInterface<string>> =>  {
        return await this._balances(this.coinAddresses, this.coinAddresses, ...addresses)
    }

    public allCoinBalances = async (...addresses: string[] | string[][]): Promise<DictInterface<DictInterface<string>> | DictInterface<string>> =>  {
        return await this._balances(
            [...this.underlyingCoinAddresses, ...this.coinAddresses],
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
        const contractAddress = ["eurtusd", "xautusd", "atricrypto3"].includes(this.id) ||
        (curve.chainId === 137 && this.isMetaFactory) ? this.zap as string : this.swap;
        const i = this._getCoinIdx(inputCoin);
        return await hasAllowance([this.underlyingCoinAddresses[i]], [amount], curve.signerAddress, contractAddress);
    }

    private exchangeApproveEstimateGas = async (inputCoin: string | number, amount: string): Promise<number> => {
        const contractAddress = ["eurtusd", "xautusd", "atricrypto3"].includes(this.id) ||
        (curve.chainId === 137 && this.isMetaFactory) ? this.zap as string : this.swap;
        const i = this._getCoinIdx(inputCoin);
        return await ensureAllowanceEstimateGas([this.underlyingCoinAddresses[i]], [amount], contractAddress);
    }

    public exchangeApprove = async (inputCoin: string | number, amount: string): Promise<string[]> => {
        const contractAddress = ["eurtusd", "xautusd", "atricrypto3"].includes(this.id) ||
        (curve.chainId === 137 && this.isMetaFactory) ? this.zap as string : this.swap;
        const i = this._getCoinIdx(inputCoin);
        return await ensureAllowance([this.underlyingCoinAddresses[i]], [amount], contractAddress);
    }

    private exchangeEstimateGas = async (inputCoin: string | number, outputCoin: string | number, amount: string, maxSlippage = 0.01): Promise<number> => {
        const contractAddress = ["eurtusd", "xautusd", "atricrypto3"].includes(this.id) ||
        (curve.chainId === 137 && this.isMetaFactory) ? this.zap as string : this.swap;
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

        if (this.id === "tricrypto2") {
            return (await contract.estimateGas[exchangeMethod](i, j, _amount, _minRecvAmount, true, { ...curve.constantOptions, value })).toNumber();
        } else if (curve.chainId === 137 && this.isMetaFactory) {
            return (await contract.estimateGas[exchangeMethod](this.swap, i, j, _amount, _minRecvAmount, { ...curve.constantOptions, value })).toNumber();
        }

        return (await contract.estimateGas[exchangeMethod](i, j, _amount, _minRecvAmount, { ...curve.constantOptions, value })).toNumber();
    }

    public exchange = async (inputCoin: string | number, outputCoin: string | number, amount: string, maxSlippage = 0.01): Promise<string> => {
        const contractAddress = ["eurtusd", "xautusd", "atricrypto3"].includes(this.id) ||
        (curve.chainId === 137 && this.isMetaFactory) ? this.zap as string : this.swap;
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

        if (this.id === 'tricrypto2') {
            const gasLimit = (await contract.estimateGas[exchangeMethod](i, j, _amount, _minRecvAmount, true, { ...curve.constantOptions, value })).mul(130).div(100);
            return (await contract[exchangeMethod](i, j, _amount, _minRecvAmount, true, { ...curve.options, value, gasLimit })).hash
        } else if (curve.chainId === 137 && this.isMetaFactory) {
            const gasLimit = (await contract.estimateGas[exchangeMethod](this.swap, i, j, _amount, _minRecvAmount, { ...curve.constantOptions, value })).mul(140).div(100);
            return (await contract[exchangeMethod](this.swap, i, j, _amount, _minRecvAmount, { ...curve.options, value, gasLimit })).hash
        }

        const estimatedGas = await contract.estimateGas[exchangeMethod](i, j, _amount, _minRecvAmount, { ...curve.constantOptions, value });
        const gasLimit = curve.chainId === 137 && this.id === 'ren' ?
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

        if (this.id === 'tricrypto2') {
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

        if (this.id === 'tricrypto2') {
            const gasLimit = (await contract.estimateGas.exchange(i, j, _amount, _minRecvAmount, false, { ...curve.constantOptions, value })).mul(130).div(100);
            return (await contract.exchange(i, j, _amount, _minRecvAmount, false, { ...curve.options, value, gasLimit })).hash
        }

        const estimatedGas = await contract.estimateGas.exchange(i, j, _amount, _minRecvAmount, { ...curve.constantOptions, value });
        const gasLimit = curve.chainId === 137 && this.id === 'ren' ?
            estimatedGas.mul(140).div(100) :
            estimatedGas.mul(130).div(100);
        return (await contract.exchange(i, j, _amount, _minRecvAmount, { ...curve.options, value, gasLimit })).hash
    }

    public gaugeMaxBoostedDeposit = async (...addresses: string[]): Promise<DictInterface<string>> => {
        if (this.gauge === ethers.constants.AddressZero) throw Error(`${this.name} doesn't have gauge`);
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
        if (this.gauge === ethers.constants.AddressZero) throw Error(`${this.name} doesn't have gauge`);
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
        if (this.gauge === ethers.constants.AddressZero) throw Error(`${this.name} doesn't have gauge`);
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
                if (['compound', 'usdt', 'ib'].includes(this.id)) {
                    _rates.push(await curve.contracts[addr].contract.exchangeRateStored());
                } else if (['y', 'busd', 'pax'].includes(this.id)) {
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

    private _withdrawCryptoSlippage = async (totalAmountUSD: number, lpTokenAmount: number, useUnderlying = true): Promise<string> => {
        const prices: number[] = useUnderlying ? await this._underlyingPrices() : await this._wrappedPrices();

        const balancedAmounts = useUnderlying ?
            await this.withdrawExpected(String(lpTokenAmount)) :
            await this.withdrawWrappedExpected(String(lpTokenAmount));
        const balancedTotalAmountsUSD = balancedAmounts.reduce((s, b, i) => s + (Number(b) * prices[i]), 0);

        return String((balancedTotalAmountsUSD - totalAmountUSD) / balancedTotalAmountsUSD)
    }

    private _withdrawSlippage = async (totalAmount: number, expected: number, useUnderlying = true): Promise<string> => {
        const poolBalances: number[] = useUnderlying ?
            (await this.getPoolBalances()).map(Number) :
            (await this.getPoolWrappedBalances()).map(Number);
        const poolTotalBalance: number = poolBalances.reduce((a,b) => a + b);
        const poolBalancesRatios: number[] = poolBalances.map((b) => b / poolTotalBalance);

        const balancedAmounts: string[] = poolBalancesRatios.map((r) => String(r * totalAmount));
        const balancedExpected = useUnderlying ?
            Number(await this.withdrawImbalanceExpected(balancedAmounts)) :
            Number(await this.withdrawImbalanceWrappedExpected(balancedAmounts));

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

    private _calcWithdrawOneCoinSwap = async (_lpTokenAmount: ethers.BigNumber, i: number): Promise<ethers.BigNumber> => {
        return await curve.contracts[this.swap].contract.calc_withdraw_one_coin(_lpTokenAmount, i, curve.constantOptions);
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

    private _removeLiquidityOneCoin = async (_lpTokenAmount: ethers.BigNumber, i: number, useUnderlying = true, estimateGas = false): Promise<string | number> => {
        let _minAmount = this.id === 'ib' ?
            await this._calcWithdrawOneCoin(_lpTokenAmount, i, useUnderlying) :
            await this._calcWithdrawOneCoinSwap(_lpTokenAmount, i);
        _minAmount = _minAmount.mul(99).div(100);
        const  contract = curve.contracts[this.swap].contract;

        const gas = await contract.estimateGas.remove_liquidity_one_coin(_lpTokenAmount, i, _minAmount, useUnderlying, curve.constantOptions);
        if (estimateGas) {
            return gas.toNumber()
        }

        const gasLimit = curve.chainId === 137 && this.id === 'ren' ?
            gas.mul(160).div(100) :
            gas.mul(130).div(100);
        return (await contract.remove_liquidity_one_coin(_lpTokenAmount, i, _minAmount, useUnderlying, { ...curve.options, gasLimit })).hash
    }

    private _getExchangeOutput = async (i: number, j: number, _amount: ethers.BigNumber): Promise<ethers.BigNumber> => {
        const contractAddress = ["eurtusd", "xautusd", "atricrypto3"].includes(this.id)  ? this.zap as string : this.swap;
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
