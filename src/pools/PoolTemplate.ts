import { ethers } from "ethers";
import BigNumber from 'bignumber.js';
import memoize from "memoizee";
import { _getPoolsFromApi, _getSubgraphData, _getFactoryAPYsAndVolumes, _getLegacyAPYsAndVolumes } from '../external-api';
import {
    _getCoinAddresses,
    _getBalances,
    _prepareAddresses,
    _ensureAllowance,
    _getUsdRate,
    hasAllowance,
    ensureAllowance,
    ensureAllowanceEstimateGas,
    BN,
    toBN,
    toStringFromBN,
    parseUnits,
    getEthIndex,
    fromBN,
    _cutZeros,
    _setContracts,
    _get_small_x,
    _get_price_impact,
    checkNumber,
    _getCrvApyFromApi,
    _getRewardsFromApi,
} from '../utils';
import {
    IDict,
    IReward,
    IProfit,
} from '../interfaces';
import { curve as _curve, curve } from "../curve";
import ERC20Abi from '../constants/abis/ERC20.json';


const DAY = 86400;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

export class PoolTemplate {
    id: string;
    name: string;
    fullName: string;
    symbol: string;
    referenceAsset: string;
    address: string;
    lpToken: string;
    gauge: string;
    zap: string | null;
    sRewardContract: string | null;
    rewardContract: string | null;
    isPlain: boolean;
    isLending: boolean;
    isMeta: boolean;
    isCrypto: boolean;
    isFake: boolean;
    isFactory: boolean;
    isMetaFactory: boolean;
    basePool: string;
    underlyingCoins: string[];
    wrappedCoins: string[];
    underlyingCoinAddresses: string[];
    wrappedCoinAddresses: string[];
    underlyingDecimals: number[];
    wrappedDecimals: number[];
    useLending: boolean[];
    estimateGas: {
        depositApprove: (amounts: (number | string)[]) => Promise<number>,
        deposit: (amounts: (number | string)[]) => Promise<number>,
        depositWrappedApprove: (amounts: (number | string)[]) => Promise<number>,
        depositWrapped: (amounts: (number | string)[]) => Promise<number>,
        stakeApprove: (lpTokenAmount: number | string) => Promise<number>,
        stake: (lpTokenAmount: number | string) => Promise<number>,
        unstake: (lpTokenAmount: number | string) => Promise<number>,
        claimCrv: () => Promise<number>,
        claimRewards: () => Promise<number>,
        depositAndStakeApprove: (amounts: (number | string)[]) => Promise<number>,
        depositAndStake: (amounts: (number | string)[]) => Promise<number>,
        depositAndStakeWrappedApprove: (amounts: (number | string)[]) => Promise<number>,
        depositAndStakeWrapped: (amounts: (number | string)[]) => Promise<number>,
        withdrawApprove: (lpTokenAmount: number | string) => Promise<number>,
        withdraw: (lpTokenAmount: number | string) => Promise<number>,
        withdrawWrapped: (lpTokenAmount: number | string) => Promise<number>,
        withdrawImbalanceApprove: (amounts: (number | string)[]) => Promise<number>,
        withdrawImbalance: (amounts: (number | string)[]) => Promise<number>,
        withdrawImbalanceWrapped: (amounts: (number | string)[]) => Promise<number>,
        withdrawOneCoinApprove: (lpTokenAmount: number | string) => Promise<number>,
        withdrawOneCoin: (lpTokenAmount: number | string, coin: string | number) => Promise<number>,
        withdrawOneCoinWrapped: (lpTokenAmount: number | string, coin: string | number) => Promise<number>,
        swapApprove: (inputCoin: string | number, amount: number | string) => Promise<number>,
        swap: (inputCoin: string | number, outputCoin: string | number, amount: number | string, slippage: number) => Promise<number>,
        swapWrappedApprove: (inputCoin: string | number, amount: number | string) => Promise<number>,
        swapWrapped: (inputCoin: string | number, outputCoin: string | number, amount: number | string, slippage: number) => Promise<number>,
    };
    stats: {
        parameters: () => Promise<{
            lpTokenSupply: string,
            virtualPrice: string,
            fee: string,
            adminFee: string,
            A: string,
            future_A?: string,
            initial_A?: string,
            future_A_time?: number,
            initial_A_time?: number,
            gamma?: string,
            price_oracle?: string[],
            price_scale?: string[],
        }>,
        underlyingBalances: () => Promise<string[]>,
        wrappedBalances: () => Promise<string[]>,
        totalLiquidity: (useApi?: boolean) => Promise<string>,
        volume: () => Promise<string>,
        baseApy: () => Promise<{ day: string, week: string }>,
        tokenApy: (useApi?: boolean) => Promise<[baseApy: number, boostedApy: number]>,
        rewardsApy: (useApi?: boolean) => Promise<IReward[]>,
    };
    wallet: {
        balances: (...addresses: string[] | string[][]) => Promise<IDict<IDict<string>> | IDict<string>>,
        lpTokenBalances: (...addresses: string[] | string[][]) => Promise<IDict<IDict<string>> | IDict<string>>,
        underlyingCoinBalances: (...addresses: string[] | string[][]) => Promise<IDict<IDict<string>> | IDict<string>>,
        wrappedCoinBalances: (...addresses: string[] | string[][]) => Promise<IDict<IDict<string>> | IDict<string>>,
        allCoinBalances: (...addresses: string[] | string[][]) => Promise<IDict<IDict<string>> | IDict<string>>,
    };

    constructor(id: string) {
        const poolData = { ...curve.constants.POOLS_DATA, ...curve.constants.FACTORY_POOLS_DATA, ...curve.constants.CRYPTO_FACTORY_POOLS_DATA }[id];

        this.id = id;
        this.name = poolData.name;
        this.fullName = poolData.full_name;
        this.symbol = poolData.symbol;
        this.referenceAsset = poolData.reference_asset;
        this.address = poolData.swap_address;
        this.lpToken = poolData.token_address;
        this.gauge = poolData.gauge_address;
        this.zap = poolData.deposit_address || null;
        this.sRewardContract = poolData.sCurveRewards_address || null;
        this.rewardContract = poolData.reward_contract || null;
        this.isPlain = poolData.is_plain || false;
        this.isLending = poolData.is_lending || false;
        this.isMeta = poolData.is_meta || false;
        this.isCrypto = poolData.is_crypto || false;
        this.isFake = poolData.is_fake || false;
        this.isFactory = poolData.is_factory || false;
        this.isMetaFactory = (this.isMeta && this.isFactory) || this.zap === '0xa79828df1850e8a3a3064576f380d90aecdd3359';
        this.basePool = poolData.base_pool || '';
        this.underlyingCoins = poolData.underlying_coins;
        this.wrappedCoins = poolData.wrapped_coins;
        this.underlyingCoinAddresses = poolData.underlying_coin_addresses;
        this.wrappedCoinAddresses = poolData.wrapped_coin_addresses;
        this.underlyingDecimals = poolData.underlying_decimals;
        this.wrappedDecimals = poolData.wrapped_decimals;
        this.useLending = poolData.use_lending || poolData.underlying_coin_addresses.map(() => false);
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
        }
        this.stats = {
            parameters: this.statsParameters.bind(this),
            underlyingBalances: this.statsUnderlyingBalances.bind(this),
            wrappedBalances: this.statsWrappedBalances.bind(this),
            totalLiquidity: this.statsTotalLiquidity.bind(this),
            volume: this.statsVolume.bind(this),
            baseApy: this.statsBaseApy.bind(this),
            tokenApy: this.statsTokenApy.bind(this),
            rewardsApy: this.statsRewardsApy.bind(this),
        }
        this.wallet = {
            balances: this.walletBalances.bind(this),
            lpTokenBalances: this.walletLpTokenBalances.bind(this),
            underlyingCoinBalances: this.walletUnderlyingCoinBalances.bind(this),
            wrappedCoinBalances: this.walletWrappedCoinBalances.bind(this),
            allCoinBalances: this.walletAllCoinBalances.bind(this),
        }
    }

    public rewardsOnly(): boolean {
        if (curve.chainId === 2222 || curve.chainId === 42220) return true;  // TODO remove this for Kava and Celo
        if (this.gauge === ethers.constants.AddressZero) throw Error(`${this.name} doesn't have gauge`);
        const gaugeContract = curve.contracts[this.gauge].contract;

        return !('inflation_rate()' in gaugeContract || 'inflation_rate(uint256)' in gaugeContract);
    }

    private statsParameters = async (): Promise<{
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
    }> => {
        const multicallContract = curve.contracts[this.address].multicallContract;
        const lpMulticallContract = curve.contracts[this.lpToken].multicallContract;

        const calls = [
            multicallContract.get_virtual_price(),
            multicallContract.fee(),
            multicallContract.admin_fee(),
            multicallContract.A(),
            lpMulticallContract.totalSupply(),
        ]
        if (this.isCrypto) {
            calls.push(multicallContract.gamma());

            if (this.wrappedCoins.length === 2) {
                calls.push(multicallContract.price_oracle());
                calls.push(multicallContract.price_scale());
            } else {
                for (let i = 0; i < this.wrappedCoins.length - 1; i++) {
                    calls.push(multicallContract.price_oracle(i));
                    calls.push(multicallContract.price_scale(i));
                }
            }
        }

        const additionalCalls = this.isCrypto ? [] : [multicallContract.future_A()];
        if ('initial_A' in multicallContract) {
            additionalCalls.push(
                multicallContract.initial_A(),
                multicallContract.future_A_time(),
                multicallContract.initial_A_time()
            );
        }

        let _virtualPrice = ethers.BigNumber.from(0);
        let _fee = ethers.BigNumber.from(0);
        let _prices, _adminFee, _A, _lpTokenSupply, _gamma;
        try {
            [_virtualPrice, _fee, _adminFee, _A, _lpTokenSupply, _gamma, ..._prices] = await curve.multicallProvider.all(calls) as ethers.BigNumber[];
        } catch (e) { // Empty pool
            calls.shift();
            if (this.isCrypto) {
                calls.shift();
                [_adminFee, _A, _lpTokenSupply, _gamma, ..._prices] = await curve.multicallProvider.all(calls) as ethers.BigNumber[];
            } else {
                [_fee, _adminFee, _A, _lpTokenSupply, _gamma, ..._prices] = await curve.multicallProvider.all(calls) as ethers.BigNumber[];
            }
        }

        const [virtualPrice, fee, adminFee, A, lpTokenSupply, gamma] = [
            ethers.utils.formatUnits(_virtualPrice),
            ethers.utils.formatUnits(_fee, 8),
            ethers.utils.formatUnits(_adminFee.mul(_fee)),
            ethers.utils.formatUnits(_A, 0),
            ethers.utils.formatUnits(_lpTokenSupply),
            _gamma ? ethers.utils.formatUnits(_gamma) : _gamma,
        ]

        let priceOracle, priceScale;
        if (this.isCrypto) {
            const prices = _prices.map((_p) => ethers.utils.formatUnits(_p));
            priceOracle = [];
            priceScale = [];
            for (let i = 0; i < this.wrappedCoins.length - 1; i++) {
                priceOracle.push(prices.shift() as string);
                priceScale.push(prices.shift() as string);
            }
        }

        const A_PRECISION = curve.chainId === 1 && ['compound', 'usdt', 'y', 'busd', 'susd', 'pax', 'ren', 'sbtc', 'hbtc', '3pool'].includes(this.id) ? 1 : 100;
        const [_future_A, _initial_A, _future_A_time, _initial_A_time] = await curve.multicallProvider.all(additionalCalls) as ethers.BigNumber[]
        const [future_A, initial_A, future_A_time, initial_A_time] = [
            _future_A ? String(Number(ethers.utils.formatUnits(_future_A, 0)) / A_PRECISION) : undefined,
            _initial_A ? String(Number(ethers.utils.formatUnits(_initial_A, 0)) / A_PRECISION) : undefined,
            _future_A_time ? Number(ethers.utils.formatUnits(_future_A_time, 0)) * 1000 : undefined,
            _initial_A_time ? Number(ethers.utils.formatUnits(_initial_A_time, 0)) * 1000 : undefined,
        ]

        return { lpTokenSupply, virtualPrice, fee, adminFee, A, future_A, initial_A, future_A_time, initial_A_time, gamma, priceOracle, priceScale };
    }

    private async statsWrappedBalances(): Promise<string[]> {
        const swapContract = curve.contracts[this.address].multicallContract;
        const contractCalls = this.wrappedCoins.map((_, i) => swapContract.balances(i));
        const _wrappedBalances: ethers.BigNumber[] = await curve.multicallProvider.all(contractCalls);

        return _wrappedBalances.map((_b, i) => ethers.utils.formatUnits(_b, this.wrappedDecimals[i]));
    }

    // OVERRIDE
    private async statsUnderlyingBalances(): Promise<string[]> {
        return await this.statsWrappedBalances();
    }

    private statsTotalLiquidity = async (useApi = true): Promise<string> => {
        if (useApi) {
            const network = curve.constants.NETWORK_NAME;
            const poolType = !this.isFactory && !this.isCrypto ? "main" :
                !this.isFactory ? "crypto" :
                !(this.isCrypto && this.isFactory) ? "factory" :
                "factory-crypto";
            const poolsData = (await _getPoolsFromApi(network, poolType)).poolData;

            try {
                const totalLiquidity = poolsData.filter((data) => data.address.toLowerCase() === this.address.toLowerCase())[0].usdTotal;
                return String(totalLiquidity);
            } catch (err) {
                console.log((err as Error).message);
            }
        }

        const balances = await this.statsUnderlyingBalances();
        const promises = [];
        for (const addr of this.underlyingCoinAddresses) {
            promises.push(_getUsdRate(addr))
        }
        const prices = await Promise.all(promises);
        const totalLiquidity = (balances as string[]).reduce(
            (liquidity: number, b: string, i: number) => liquidity + (Number(b) * (prices[i] as number)), 0);

        return totalLiquidity.toFixed(8)
    }

    private statsVolume = async (): Promise<string> => {
        if ([1284, 2222, 42220, 1313161554].includes(curve.chainId)) {  // Moonbeam || Kava || Celo || Aurora
            const [mainPoolsData, factoryPoolsData] = await Promise.all([
                _getLegacyAPYsAndVolumes(curve.constants.NETWORK_NAME),
                _getFactoryAPYsAndVolumes(curve.constants.NETWORK_NAME),
            ]);
            if (this.id in mainPoolsData) {
                return (mainPoolsData[this.id].volume ?? 0).toString();
            }
            const poolData = factoryPoolsData.find((d) => d.poolAddress.toLowerCase() === this.address);
            if (!poolData) throw Error(`Can't get Volume for ${this.name} (id: ${this.id})`)
            const lpPrice = await _getUsdRate(this.lpToken);

            return (poolData.volume * lpPrice).toString()
        }
        const network = curve.constants.NETWORK_NAME;
        const poolsData = (await _getSubgraphData(network));
        const poolData = poolsData.find((d) => d.address.toLowerCase() === this.address);
        if (!poolData) throw Error(`Can't get Volume for ${this.name} (id: ${this.id})`)

        return poolData.volumeUSD.toString()
    }

    private statsBaseApy = async (): Promise<{ day: string, week: string }> => {
        if ([1284, 2222, 42220, 1313161554].includes(curve.chainId)) {  // Moonbeam || Kava || Celo || Aurora
            const [mainPoolsData, factoryPoolsData] = await Promise.all([
                _getLegacyAPYsAndVolumes(curve.constants.NETWORK_NAME),
                _getFactoryAPYsAndVolumes(curve.constants.NETWORK_NAME),
            ]);
            if (this.id in mainPoolsData) {
                return {
                    day: mainPoolsData[this.id].apy.day.toString(),
                    week: mainPoolsData[this.id].apy.week.toString(),
                }
            }
            const poolData = factoryPoolsData.find((d) => d.poolAddress.toLowerCase() === this.address);
            if (!poolData) throw Error(`Can't get base APY for ${this.name} (id: ${this.id})`)

            return {
                day: poolData.apy.toString(),
                week: poolData.apy.toString(),
            }
        }
        const network = curve.constants.NETWORK_NAME;
        const poolsData = (await _getSubgraphData(network));
        const poolData = poolsData.find((d) => d.address.toLowerCase() === this.address);

        if (!poolData) throw Error(`Can't get base APY for ${this.name} (id: ${this.id})`)

        return {
            day: poolData.latestDailyApy.toString(),
            week: poolData.latestWeeklyApy.toString(),
        }
    }

    private statsTokenApy = async (useApi = true): Promise<[baseApy: number, boostedApy: number]> => {
        if (this.rewardsOnly()) throw Error(`${this.name} has Rewards-Only Gauge. Use stats.rewardsApy instead`);

        const isDisabledChain = [1313161554].includes(curve.chainId); // Disable Aurora
        if (useApi && !isDisabledChain) {
            const crvAPYs = await _getCrvApyFromApi();
            const poolCrvApy = crvAPYs[this.gauge] ?? [0, 0];  // new pools might be missing
            return [poolCrvApy[0], poolCrvApy[1]];
        }

        const totalLiquidityUSD = await this.statsTotalLiquidity();
        if (Number(totalLiquidityUSD) === 0) return [0, 0];

        let inflationRateBN, workingSupplyBN, totalSupplyBN;
        if (curve.chainId !== 1) {
            const gaugeContract = curve.contracts[this.gauge].multicallContract;
            const lpTokenContract = curve.contracts[this.lpToken].multicallContract;
            const crvContract = curve.contracts[curve.constants.ALIASES.crv].contract;

            const currentWeek = Math.floor(Date.now() / 1000 / WEEK);
            [inflationRateBN, workingSupplyBN, totalSupplyBN] = (await curve.multicallProvider.all([
                gaugeContract.inflation_rate(currentWeek),
                gaugeContract.working_supply(),
                lpTokenContract.totalSupply(),
            ]) as ethers.BigNumber[]).map((value) => toBN(value));

            if (inflationRateBN.eq(0)) {
                inflationRateBN = toBN(await crvContract.balanceOf(this.gauge, curve.constantOptions)).div(WEEK);
            }
        } else {
            const gaugeContract = curve.contracts[this.gauge].multicallContract;
            const lpTokenContract = curve.contracts[this.lpToken].multicallContract;
            const gaugeControllerContract = curve.contracts[curve.constants.ALIASES.gauge_controller].multicallContract;

            let weightBN;
            [inflationRateBN, weightBN, workingSupplyBN, totalSupplyBN] = (await curve.multicallProvider.all([
                gaugeContract.inflation_rate(),
                gaugeControllerContract.gauge_relative_weight(this.gauge),
                gaugeContract.working_supply(),
                lpTokenContract.totalSupply(),
            ]) as ethers.BigNumber[]).map((value) => toBN(value));

            inflationRateBN = inflationRateBN.times(weightBN);
        }

        if (inflationRateBN.eq(0)) return [0, 0];

        const rateBN = inflationRateBN.times(31536000).times(0.4).div(workingSupplyBN).times(totalSupplyBN).div(Number(totalLiquidityUSD));
        const crvPrice = await _getUsdRate(curve.constants.ALIASES.crv);
        const baseApyBN = rateBN.times(crvPrice);
        const boostedApyBN = baseApyBN.times(2.5);

        return [baseApyBN.times(100).toNumber(), boostedApyBN.times(100).toNumber()]
    }

    private statsRewardsApy = async (useApi = true): Promise<IReward[]> => {
        if (this.gauge === ethers.constants.AddressZero) return [];

        const isDisabledChain = [1313161554].includes(curve.chainId); // Disable Aurora
        if (curve.chainId === 1 || (useApi && !isDisabledChain)) {
            const rewards = await _getRewardsFromApi();
            if (!rewards[this.gauge]) return [];
            return rewards[this.gauge].map((r) => ({ gaugeAddress: r.gaugeAddress, tokenAddress: r.tokenAddress, symbol: r.symbol, apy: r.apy }));
        }

        const apy: IReward[] = [];
        const rewardTokens = await this.rewardTokens(false);
        for (const rewardToken of rewardTokens) {
            const gaugeContract = curve.contracts[this.gauge].multicallContract;
            const lpTokenContract = curve.contracts[this.lpToken].multicallContract;
            const rewardContract = curve.contracts[this.sRewardContract || this.gauge].multicallContract;

            const totalLiquidityUSD = await this.statsTotalLiquidity();
            const rewardRate = await _getUsdRate(rewardToken.token);

            const [rewardData, _stakedSupply, _totalSupply] = (await curve.multicallProvider.all([
                rewardContract.reward_data(rewardToken.token),
                gaugeContract.totalSupply(),
                lpTokenContract.totalSupply(),
            ]) as any[]);
            const stakedSupplyBN = toBN(_stakedSupply as ethers.BigNumber);
            const totalSupplyBN = toBN(_totalSupply as ethers.BigNumber);
            const inflationBN = toBN(rewardData.rate, rewardToken.decimals);
            const periodFinish = Number(ethers.utils.formatUnits(rewardData.period_finish, 0)) * 1000;
            const baseApy = periodFinish > Date.now() ?
                inflationBN.times(31536000).times(rewardRate).div(stakedSupplyBN).times(totalSupplyBN).div(Number(totalLiquidityUSD)) :
                BN(0);

            apy.push({
                gaugeAddress: this.gauge,
                tokenAddress: rewardToken.token,
                symbol: rewardToken.symbol,
                apy: baseApy.times(100).toNumber(),
            });
        }

        return apy
    }

    private async _pureCalcLpTokenAmount(_amounts: ethers.BigNumber[], isDeposit = true, useUnderlying = true): Promise<ethers.BigNumber> {
        const calcContractAddress = this.isMeta && useUnderlying ? this.zap as string : this.address;
        const N_coins = useUnderlying ? this.underlyingCoins.length : this.wrappedCoins.length;
        const contract = curve.contracts[calcContractAddress].contract;

        if (this.isMetaFactory && useUnderlying) {
            if (contract[`calc_token_amount(address,uint256[${N_coins}],bool)`]) {
                return await contract.calc_token_amount(this.address, _amounts, isDeposit, curve.constantOptions);
            }
            return await contract.calc_token_amount(this.address, _amounts, curve.constantOptions);
        }

        if (contract[`calc_token_amount(uint256[${N_coins}],bool)`]) {
            return await contract.calc_token_amount(_amounts, isDeposit, curve.constantOptions);
        }

        return await contract.calc_token_amount(_amounts, curve.constantOptions);
    }

    private _calcLpTokenAmount = memoize(async (_amounts: ethers.BigNumber[], isDeposit = true, useUnderlying = true): Promise<ethers.BigNumber> => {
        let _rates: ethers.BigNumber[] = [];
        if (!this.isMeta && useUnderlying) {
            // For lending pools. For others rate = 1
            _rates = await this._getRates();
            _amounts = _amounts.map((_amount: ethers.BigNumber, i: number) =>
                _amount.mul(ethers.BigNumber.from(10).pow(18)).div(_rates[i]));
        }

        if (this.isCrypto) {
            try {
                return await this._pureCalcLpTokenAmount(_amounts, isDeposit, useUnderlying);
            } catch (e) {
                const lpContract = curve.contracts[this.lpToken].contract;
                const _lpTotalSupply: ethers.BigNumber = await lpContract.totalSupply(curve.constantOptions);
                if (_lpTotalSupply.gt(0)) throw e; // Already seeded

                if (this.isMeta && useUnderlying) throw Error("Initial deposit for crypto meta pools must be in wrapped coins");

                const decimals = useUnderlying ? this.underlyingDecimals : this.wrappedDecimals;
                const amounts = _amounts.map((_a, i) => ethers.utils.formatUnits(_a, decimals[i]));
                const seedAmounts = await this.cryptoSeedAmounts(amounts[0]); // Checks N coins == 2 and amounts > 0
                amounts.forEach((a, i) => {
                    if (!BN(a).eq(BN(seedAmounts[i]))) throw Error(`Amounts must be = ${seedAmounts}`);
                });

                return parseUnits(Math.sqrt(Number(amounts[0]) * Number(amounts[1])));
            }
        }

        try {
            // --- Getting lpAmount before fees and pool params ---

            const N_coins = this.isMeta && useUnderlying ? this.underlyingCoins.length : this.wrappedCoins.length;
            const decimals = this.isMeta && useUnderlying ? this.underlyingDecimals : this.wrappedDecimals;
            const calcContractAddress = this.isMeta && useUnderlying ? this.zap as string : this.address;
            const calcContract = curve.contracts[calcContractAddress].multicallContract;
            const poolContract = curve.contracts[this.address].multicallContract;
            const lpContract = curve.contracts[this.lpToken].multicallContract;

            // totalSupply and fee
            const calls = [lpContract.totalSupply(), poolContract.fee()];

            // lpAmount before fees
            if (this.isMetaFactory && useUnderlying) {
                calls.push(calcContract.calc_token_amount(this.address, _amounts, isDeposit));
            } else if (calcContract[`calc_token_amount(uint256[${N_coins}],bool)`]) {
                calls.push(calcContract.calc_token_amount(_amounts, isDeposit, curve.constantOptions));
            } else {
                calls.push(calcContract.calc_token_amount(_amounts, curve.constantOptions));
            }

            const res = await Promise.all([
                curve.multicallProvider.all(calls),
                this.isMeta && useUnderlying ? this.stats.underlyingBalances() : this.stats.wrappedBalances(),
            ]);
            const [_totalSupply, _fee, _lpTokenAmount] = res[0] as ethers.BigNumber[];

            const balances = res[1] as string[];
            const [totalSupplyBN, feeBN, lpTokenAmountBN] = [toBN(_totalSupply), toBN(_fee, 10).times(N_coins).div(4 * (N_coins - 1)), toBN(_lpTokenAmount)];
            const balancesBN = balances.map((b) => BN(b));
            const amountsBN = _amounts.map((_a, i) => toBN(_a, decimals[i]));

            // --- Calculating new amounts (old amounts minus fees) ---

            // fees[i] = | expected1/total_supply * balances[i] - amounts[i] | * fee
            const feesBN: BigNumber[] = Array(N_coins).fill(BN(0));
            if (totalSupplyBN.gt(0)) {
                for (let i = 0; i < N_coins; i++) {
                    feesBN[i] = balancesBN[i].times(lpTokenAmountBN).div(totalSupplyBN).minus(amountsBN[i]).times(feeBN);
                    if (feesBN[i].lt(0)) feesBN[i] = feesBN[i].times(-1);
                }
            }
            const _fees = feesBN.map((fBN, i) => fromBN(fBN, decimals[i]));

            // --- Getting final lpAmount ---

            let _lpTokenFee = await this._pureCalcLpTokenAmount(_fees, !isDeposit, this.isMeta && useUnderlying);
            if (isDeposit) _lpTokenFee = _lpTokenFee.mul(-1);

            return _lpTokenAmount.add(_lpTokenFee)
        } catch (e: any) { // Seeding
            if (!isDeposit) throw e; // Seeding is only for deposit

            const lpContract = curve.contracts[this.lpToken].contract;
            const _lpTotalSupply: ethers.BigNumber = await lpContract.totalSupply(curve.constantOptions);
            if (_lpTotalSupply.gt(0)) throw e; // Already seeded

            const decimals = useUnderlying ? this.underlyingDecimals : this.wrappedDecimals;
            const amounts = _amounts.map((_a, i) => ethers.utils.formatUnits(_a, decimals[i]));

            if (this.isMeta && useUnderlying) {
                const seedAmounts = await this.metaUnderlyingSeedAmounts(amounts[0]); // Checks N coins == 2 and amounts > 0
                amounts.forEach((a, i) => {
                    if (!BN(a).eq(BN(seedAmounts[i]))) throw Error(`Amounts must be = ${seedAmounts}`);
                });
            } else {
                if (_amounts[0].lte(0)) throw Error("Initial deposit amounts must be >0");
                amounts.forEach((a) => {
                    if (a !== amounts[0]) throw Error("Initial deposit amounts must be equal");
                });
            }

            const _amounts18Decimals: ethers.BigNumber[] = amounts.map((a) => parseUnits(a));
            return _amounts18Decimals.reduce((_a, _b) => _a.add(_b));
        }
    },
    {
        primitive: true,
        promise: true,
        maxAge: 60 * 1000, // 1m
    });

    private async calcLpTokenAmount(amounts: (number | string)[], isDeposit = true): Promise<string> {
        if (amounts.length !== this.underlyingCoinAddresses.length) {
            throw Error(`${this.name} pool has ${this.underlyingCoinAddresses.length} coins (amounts provided for ${amounts.length})`);
        }

        const _underlyingAmounts: ethers.BigNumber[] = amounts.map((amount, i) => parseUnits(amount, this.underlyingDecimals[i]));
        const _expected = await this._calcLpTokenAmount(_underlyingAmounts, isDeposit, true);

        return ethers.utils.formatUnits(_expected);
    }

    private async calcLpTokenAmountWrapped(amounts: (number | string)[], isDeposit = true): Promise<string> {
        if (amounts.length !== this.wrappedCoinAddresses.length) {
            throw Error(`${this.name} pool has ${this.wrappedCoinAddresses.length} coins (amounts provided for ${amounts.length})`);
        }

        if (this.isFake) {
            throw Error(`${this.name} pool doesn't have this method`);
        }

        const _amounts: ethers.BigNumber[] = amounts.map((amount, i) => parseUnits(amount, this.wrappedDecimals[i]));
        const _expected = await this._calcLpTokenAmount(_amounts, isDeposit, false);

        return ethers.utils.formatUnits(_expected);
    }


    // ---------------- DEPOSIT ----------------

    public metaUnderlyingSeedAmounts(amount1: number | string): string[] {
        if (this.isCrypto) throw Error(`Use cryptoSeedAmounts method for ${this.name} pool`);
        if (!this.isMeta) throw Error("metaUnderlyingSeedAmounts method exists only for meta stable pools");

        const amount1BN = BN(amount1);
        if (amount1BN.lte(0)) throw Error("Initial deposit amounts must be > 0");

        const amounts = [_cutZeros(amount1BN.toFixed(this.underlyingDecimals[0]))];
        for (let i = 1; i < this.underlyingDecimals.length; i++) {
            amounts.push(amount1BN.div(this.underlyingDecimals.length - 1).toFixed(this.underlyingDecimals[i]));
        }

        return amounts
    }

    public async cryptoSeedAmounts(amount1: number | string): Promise<string[]> {
        if (!this.isCrypto) throw Error("cryptoSeedAmounts method doesn't exist for stable pools");

        const decimals = this.isMeta ? this.wrappedDecimals : this.underlyingDecimals;
        if (decimals.length > 2) throw Error("cryptoSeedAmounts method doesn't exist for pools with N coins > 2");

        const amount1BN = BN(amount1);
        if (amount1BN.lte(0)) throw Error("Initial deposit amounts must be > 0");

        const priceScaleBN = toBN(await curve.contracts[this.address].contract.price_scale(curve.constantOptions));

        return [_cutZeros(amount1BN.toFixed(decimals[0])), _cutZeros(amount1BN.div(priceScaleBN).toFixed(decimals[1]))]
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
        const prices = (this.isCrypto || this.id === 'wsteth') ? await this._underlyingPrices() : this.underlyingCoins.map(() => 1);
        const pricesBN = prices.map(BN);
        const balancesBN = (await this.stats.underlyingBalances()).map(BN);
        const balancedAmounts = this._balancedAmountsWithSameValue(amountsBN, pricesBN, balancesBN);

        const expectedBN = BN(await this.depositExpected(amounts));
        const balancedExpectedBN = BN(await this.depositExpected(balancedAmounts));

        return String(expectedBN.minus(balancedExpectedBN).div(balancedExpectedBN).times(100))
    }

    public async depositIsApproved(amounts: (number | string)[]): Promise<boolean> {
        return await hasAllowance(this.underlyingCoinAddresses, amounts, curve.signerAddress, this.zap || this.address);
    }

    private async depositApproveEstimateGas(amounts: (number | string)[]): Promise<number> {
        return await ensureAllowanceEstimateGas(this.underlyingCoinAddresses, amounts, this.zap || this.address);
    }

    public async depositApprove(amounts: (number | string)[]): Promise<string[]> {
        return await ensureAllowance(this.underlyingCoinAddresses, amounts, this.zap || this.address);
    }

    // OVERRIDE
    private async depositEstimateGas(amounts: (number | string)[]): Promise<number> {
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

        return await hasAllowance(this.wrappedCoinAddresses, amounts, curve.signerAddress, this.address);
    }

    private async depositWrappedApproveEstimateGas(amounts: (number | string)[]): Promise<number> {
        if (this.isFake) {
            throw Error(`depositWrappedApprove method doesn't exist for pool ${this.name} (id: ${this.name})`);
        }

        return await ensureAllowanceEstimateGas(this.wrappedCoinAddresses, amounts, this.address);
    }

    public async depositWrappedApprove(amounts: (number | string)[]): Promise<string[]> {
        if (this.isFake) {
            throw Error(`depositWrappedApprove method doesn't exist for pool ${this.name} (id: ${this.name})`);
        }

        return await ensureAllowance(this.wrappedCoinAddresses, amounts, this.address);
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
        if (this.gauge === ethers.constants.AddressZero) {
            throw Error(`stakeIsApproved method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        return await hasAllowance([this.lpToken], [lpTokenAmount], curve.signerAddress, this.gauge);
    }

    private async stakeApproveEstimateGas(lpTokenAmount: number | string): Promise<number> {
        if (this.gauge === ethers.constants.AddressZero) {
            throw Error(`stakeApproveEstimateGas method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        return await ensureAllowanceEstimateGas([this.lpToken], [lpTokenAmount], this.gauge);
    }

    public async stakeApprove(lpTokenAmount: number | string): Promise<string[]> {
        if (this.gauge === ethers.constants.AddressZero) {
            throw Error(`stakeApprove method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        return await ensureAllowance([this.lpToken], [lpTokenAmount], this.gauge);
    }

    private async stakeEstimateGas(lpTokenAmount: number | string): Promise<number> {
        if (this.gauge === ethers.constants.AddressZero) {
            throw Error(`stakeEstimateGas method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        const _lpTokenAmount = parseUnits(lpTokenAmount);
        return (await curve.contracts[this.gauge].contract.estimateGas.deposit(_lpTokenAmount, curve.constantOptions)).toNumber();
    }

    public async stake(lpTokenAmount: number | string): Promise<string> {
        if (this.gauge === ethers.constants.AddressZero) {
            throw Error(`stake method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        const _lpTokenAmount = parseUnits(lpTokenAmount);
        await _ensureAllowance([this.lpToken], [_lpTokenAmount], this.gauge)

        await curve.updateFeeData();
        const gasLimit = (await curve.contracts[this.gauge].contract.estimateGas.deposit(_lpTokenAmount, curve.constantOptions)).mul(150).div(100);
        return (await curve.contracts[this.gauge].contract.deposit(_lpTokenAmount, { ...curve.options, gasLimit })).hash;
    }

    private async unstakeEstimateGas(lpTokenAmount: number | string): Promise<number> {
        if (this.gauge === ethers.constants.AddressZero) {
            throw Error(`unstakeEstimateGas method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        const _lpTokenAmount = parseUnits(lpTokenAmount);
        return (await curve.contracts[this.gauge].contract.estimateGas.withdraw(_lpTokenAmount, curve.constantOptions)).toNumber();
    }

    public async unstake(lpTokenAmount: number | string): Promise<string> {
        if (this.gauge === ethers.constants.AddressZero) {
            throw Error(`unstake method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        const _lpTokenAmount = parseUnits(lpTokenAmount);

        await curve.updateFeeData();
        const gasLimit = (await curve.contracts[this.gauge].contract.estimateGas.withdraw(_lpTokenAmount, curve.constantOptions)).mul(200).div(100);
        return (await curve.contracts[this.gauge].contract.withdraw(_lpTokenAmount, { ...curve.options, gasLimit })).hash;
    }

    // ---------------- CRV PROFIT, CLAIM, BOOSTING ----------------

    public crvProfit = async (address = ""): Promise<IProfit> => {
        if (this.rewardsOnly()) throw Error(`${this.name} has Rewards-Only Gauge. Use rewardsProfit instead`);

        address = address || curve.signerAddress;
        if (!address) throw Error("Need to connect wallet or pass address into args");

        let inflationRateBN, workingSupplyBN, workingBalanceBN;
        if (curve.chainId !== 1) {
            const gaugeContract = curve.contracts[this.gauge].multicallContract;
            const crvContract = curve.contracts[curve.constants.ALIASES.crv].contract;

            const currentWeek = Math.floor(Date.now() / 1000 / WEEK);
            [inflationRateBN, workingBalanceBN, workingSupplyBN] = (await curve.multicallProvider.all([
                gaugeContract.inflation_rate(currentWeek),
                gaugeContract.working_balances(address),
                gaugeContract.working_supply(),
            ]) as ethers.BigNumber[]).map((value) => toBN(value));

            if (inflationRateBN.eq(0)) {
                inflationRateBN = toBN(await crvContract.balanceOf(this.gauge, curve.constantOptions)).div(WEEK);
            }
        } else {
            const gaugeContract = curve.contracts[this.gauge].multicallContract;
            const gaugeControllerContract = curve.contracts[curve.constants.ALIASES.gauge_controller].multicallContract;

            let weightBN;
            [inflationRateBN, weightBN, workingBalanceBN, workingSupplyBN] = (await curve.multicallProvider.all([
                gaugeContract.inflation_rate(),
                gaugeControllerContract.gauge_relative_weight(this.gauge),
                gaugeContract.working_balances(address),
                gaugeContract.working_supply(),
            ]) as ethers.BigNumber[]).map((value) => toBN(value));

            inflationRateBN = inflationRateBN.times(weightBN);
        }
        const crvPrice = await _getUsdRate('CRV');

        if (workingSupplyBN.eq(0)) return {
            day: "0.0",
            week: "0.0",
            month: "0.0",
            year: "0.0",
            token: curve.constants.ALIASES.crv,
            symbol: 'CRV',
            price: crvPrice,
        };

        const dailyIncome = inflationRateBN.times(DAY).times(workingBalanceBN).div(workingSupplyBN);
        const weeklyIncome = inflationRateBN.times(WEEK).times(workingBalanceBN).div(workingSupplyBN);
        const monthlyIncome = inflationRateBN.times(MONTH).times(workingBalanceBN).div(workingSupplyBN);
        const annualIncome = inflationRateBN.times(YEAR).times(workingBalanceBN).div(workingSupplyBN);

        return {
            day: dailyIncome.toString(),
            week: weeklyIncome.toString(),
            month: monthlyIncome.toString(),
            year: annualIncome.toString(),
            token: curve.constants.ALIASES.crv,
            symbol: 'CRV',
            price: crvPrice,
        };
    }

    public async claimableCrv (address = ""): Promise<string> {
        if (this.rewardsOnly()) throw Error(`${this.name} has Rewards-Only Gauge. Use claimableRewards instead`);

        address = address || curve.signerAddress;
        if (!address) throw Error("Need to connect wallet or pass address into args");

        return ethers.utils.formatUnits(await curve.contracts[this.gauge].contract.claimable_tokens(address, curve.constantOptions));
    }

    public async claimCrvEstimateGas(): Promise<number> {
        if (this.rewardsOnly()) throw Error(`${this.name} has Rewards-Only Gauge. Use claimRewards instead`);

        return (await curve.contracts[curve.constants.ALIASES.minter].contract.estimateGas.mint(this.gauge, curve.constantOptions)).toNumber();
    }

    public async claimCrv(): Promise<string> {
        if (this.rewardsOnly()) throw Error(`${this.name} has Rewards-Only Gauge. Use claimRewards instead`);
        const contract = curve.contracts[curve.constants.ALIASES.minter].contract;

        const gasLimit = (await contract.estimateGas.mint(this.gauge, curve.constantOptions)).mul(130).div(100);
        return (await contract.mint(this.gauge, { ...curve.options, gasLimit })).hash;
    }

    public boost = async (address = ""): Promise<string> => {
        if (curve.chainId !== 1) throw Error("Boosting is available only on Ethereum network");
        if (this.gauge === ethers.constants.AddressZero) throw Error(`${this.name} doesn't have gauge`);

        address = address || curve.signerAddress;
        if (!address) throw Error("Need to connect wallet or pass address into args");

        const gaugeContract = curve.contracts[this.gauge].multicallContract;
        const [workingBalanceBN, balanceBN] = (await curve.multicallProvider.all([
            gaugeContract.working_balances(address),
            gaugeContract.balanceOf(address),
        ]) as ethers.BigNumber[]).map((value: ethers.BigNumber) => toBN(value));

        const boostBN = workingBalanceBN.div(0.4).div(balanceBN);

        return boostBN.toFixed(4).replace(/([0-9])0+$/, '$1')
    }

    public currentCrvApy = async (address = ""): Promise<number> => {
        address = address || curve.signerAddress;
        if (!address) throw Error("Need to connect wallet or pass address into args");

        const [baseApy, maxApy] = await this.statsTokenApy();
        if (curve.chainId !== 1) return baseApy;

        const boost = await this.boost(address);
        if (boost == "2.5") return maxApy;
        if (boost === "NaN") return NaN;

        return BN(baseApy).times(BN(boost)).toNumber();
    }

    public maxBoostedStake = async (...addresses: string[]): Promise<IDict<string> | string> => {
        if (curve.chainId !== 1) throw Error("Boosting is available only on Ethereum network");
        if (this.gauge === ethers.constants.AddressZero) throw Error(`${this.name} doesn't have gauge`);
        if (addresses.length == 1 && Array.isArray(addresses[0])) addresses = addresses[0];
        if (addresses.length === 0 && curve.signerAddress !== '') addresses = [curve.signerAddress];

        if (addresses.length === 0) throw Error("Need to connect wallet or pass addresses into args");

        const votingEscrowContract = curve.contracts[curve.constants.ALIASES.voting_escrow].multicallContract;
        const gaugeContract = curve.contracts[this.gauge].multicallContract;

        const contractCalls = [votingEscrowContract.totalSupply(), gaugeContract.totalSupply()];
        addresses.forEach((account: string) => {
            contractCalls.push(votingEscrowContract.balanceOf(account));
        });

        const _response: ethers.BigNumber[] = await curve.multicallProvider.all(contractCalls);
        const responseBN: BigNumber[] = _response.map((value: ethers.BigNumber) => toBN(value));

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
        if (this.gauge === ethers.constants.AddressZero) return []

        if (useApi) {
            const rewards = await _getRewardsFromApi();
            if (!rewards[this.gauge]) return [];
            return rewards[this.gauge].map((r) => ({ token: r.tokenAddress, symbol: r.symbol, decimals: r.decimals }));
        }

        const gaugeContract = curve.contracts[this.gauge].contract;
        const gaugeMulticallContract = curve.contracts[this.gauge].multicallContract;
        if ("reward_tokens(uint256)" in gaugeContract) {
            let rewardCount = 8; // gauge_v2, gauge_v3, gauge_rewards_only, gauge_child
            if ("reward_count()" in gaugeContract) { // gauge_v4, gauge_v5, gauge_factory
                rewardCount = Number(ethers.utils.formatUnits(await gaugeContract.reward_count(curve.constantOptions), 0));
            }

            const tokenCalls = [];
            for (let i = 0; i < rewardCount; i++) {
                tokenCalls.push(gaugeMulticallContract.reward_tokens(i));
            }
            const tokens = (await curve.multicallProvider.all(tokenCalls) as string[])
                .filter((addr) => addr !== ethers.constants.AddressZero)
                .map((addr) => addr.toLowerCase());

            const tokenInfoCalls = [];
            for (const token of tokens) {
                _setContracts(token, ERC20Abi);
                const tokenMulticallContract = curve.contracts[token].multicallContract;
                tokenInfoCalls.push(tokenMulticallContract.symbol(), tokenMulticallContract.decimals());
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
            _setContracts(token, ERC20Abi);
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
        if (this.gauge === ethers.constants.AddressZero) throw Error(`${this.name} doesn't have gauge`);

        address = address || curve.signerAddress;
        if (!address) throw Error("Need to connect wallet or pass address into args");

        const rewardTokens = await this.rewardTokens();
        const gaugeContract = curve.contracts[this.gauge].multicallContract;

        const result = [];
        if ('reward_data(address)' in curve.contracts[this.gauge].contract) {
            const calls = [gaugeContract.balanceOf(address), gaugeContract.totalSupply()];
            for (const rewardToken of rewardTokens) {
                calls.push(gaugeContract.reward_data(rewardToken.token));
            }
            const res = await curve.multicallProvider.all(calls);

            const balanceBN = toBN(res.shift() as ethers.BigNumber);
            const totalSupplyBN = toBN(res.shift() as ethers.BigNumber);
            for (const rewardToken of rewardTokens) {
                const _rewardData = res.shift() as { period_finish: ethers.BigNumber, rate: ethers.BigNumber };
                const periodFinish = Number(ethers.utils.formatUnits(_rewardData.period_finish, 0)) * 1000;
                const inflationRateBN = periodFinish > Date.now() ? toBN(_rewardData.rate, rewardToken.decimals) : BN(0);
                const tokenPrice = await _getUsdRate(rewardToken.token);

                result.push(
                    {
                        day: inflationRateBN.times(DAY).times(balanceBN).div(totalSupplyBN).toString(),
                        week: inflationRateBN.times(WEEK).times(balanceBN).div(totalSupplyBN).toString(),
                        month: inflationRateBN.times(MONTH).times(balanceBN).div(totalSupplyBN).toString(),
                        year: inflationRateBN.times(YEAR).times(balanceBN).div(totalSupplyBN).toString(),
                        token: rewardToken.token,
                        symbol: rewardToken.symbol,
                        price: tokenPrice,
                    }
                )
            }
        } else if (this.sRewardContract && "rewardRate()" in _curve.contracts[this.sRewardContract].contract && "periodFinish()" && rewardTokens.length === 1) {
            const rewardToken = rewardTokens[0];
            const sRewardContract = curve.contracts[this.sRewardContract].multicallContract;
            const [_inflationRate, _periodFinish, _balance, _totalSupply] = await curve.multicallProvider.all([
                sRewardContract.rewardRate(),
                sRewardContract.periodFinish(),
                gaugeContract.balanceOf(address),
                gaugeContract.totalSupply(),
            ]) as ethers.BigNumber[];

            const periodFinish = _periodFinish.toNumber() * 1000;
            const inflationRateBN = periodFinish > Date.now() ? toBN(_inflationRate, rewardToken.decimals) : BN(0);
            const balanceBN = toBN(_balance);
            const totalSupplyBN = toBN(_totalSupply);
            const tokenPrice = await _getUsdRate(rewardToken.token);

            result.push(
                {
                    day: inflationRateBN.times(DAY).times(balanceBN).div(totalSupplyBN).toString(),
                    week: inflationRateBN.times(WEEK).times(balanceBN).div(totalSupplyBN).toString(),
                    month: inflationRateBN.times(MONTH).times(balanceBN).div(totalSupplyBN).toString(),
                    year: inflationRateBN.times(YEAR).times(balanceBN).div(totalSupplyBN).toString(),
                    token: rewardToken.token,
                    symbol: rewardToken.symbol,
                    price: tokenPrice,
                }
            )
        } else if (['aave', 'saave', 'ankreth'].includes(this.id)) {
            for (const rewardToken of rewardTokens) {
                const tokenPrice = await _getUsdRate(rewardToken.token);
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
        if (this.gauge === ethers.constants.AddressZero) {
            throw Error(`claimableRewards method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        address = address || curve.signerAddress;
        if (!address) throw Error("Need to connect wallet or pass address into args");

        const gaugeContract = curve.contracts[this.gauge].contract;
        const rewardTokens = await this.rewardTokens();
        const rewards = [];
        if ('claimable_reward(address,address)' in gaugeContract) {
            for (const rewardToken of rewardTokens) {
                const _amount = await gaugeContract.claimable_reward(address, rewardToken.token, curve.constantOptions);
                rewards.push({
                    token: rewardToken.token,
                    symbol: rewardToken.symbol,
                    amount: ethers.utils.formatUnits(_amount, rewardToken.decimals),
                });
            }
        } else if ('claimable_reward(address)' in gaugeContract && rewardTokens.length > 0) { // Synthetix Gauge
            const rewardToken = rewardTokens[0];
            const _totalAmount = await gaugeContract.claimable_reward(address, curve.constantOptions);
            const _claimedAmount = await gaugeContract.claimed_rewards_for(address, curve.constantOptions);
            rewards.push({
                token: rewardToken.token,
                symbol: rewardToken.symbol,
                amount: ethers.utils.formatUnits(_totalAmount.sub(_claimedAmount), rewardToken.decimals),
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

    public async depositAndStakeExpected(amounts: (number | string)[]): Promise<string> {
        if (this.gauge === ethers.constants.AddressZero) {
            throw Error(`depositAndStakeExpected method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }

        return await this.depositExpected(amounts);
    }

    public async depositAndStakeBonus(amounts: (number | string)[]): Promise<string> {
        if (this.gauge === ethers.constants.AddressZero) {
            throw Error(`depositAndStakeBonus method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }

        return await this.depositBonus(amounts);
    }

    public async depositAndStakeIsApproved(amounts: (number | string)[]): Promise<boolean> {
        if (this.gauge === ethers.constants.AddressZero) {
            throw Error(`depositAndStakeIsApproved method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        const coinsAllowance: boolean = await hasAllowance(this.underlyingCoinAddresses, amounts, curve.signerAddress, curve.constants.ALIASES.deposit_and_stake);

        const gaugeContract = curve.contracts[this.gauge].contract;
        if (Object.prototype.hasOwnProperty.call(gaugeContract, 'approved_to_deposit')) {
            const gaugeAllowance: boolean = await gaugeContract.approved_to_deposit(curve.constants.ALIASES.deposit_and_stake, curve.signerAddress, curve.constantOptions);
            return coinsAllowance && gaugeAllowance
        }

        return coinsAllowance;
    }

    private async depositAndStakeApproveEstimateGas(amounts: (number | string)[]): Promise<number> {
        if (this.gauge === ethers.constants.AddressZero) {
            throw Error(`depositAndStakeApprove method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        const approveCoinsGas: number = await ensureAllowanceEstimateGas(this.underlyingCoinAddresses, amounts, curve.constants.ALIASES.deposit_and_stake);

        const gaugeContract = curve.contracts[this.gauge].contract;
        if (Object.prototype.hasOwnProperty.call(gaugeContract, 'approved_to_deposit')) {
            const gaugeAllowance: boolean = await gaugeContract.approved_to_deposit(curve.constants.ALIASES.deposit_and_stake, curve.signerAddress, curve.constantOptions);
            if (!gaugeAllowance) {
                const approveGaugeGas = (await gaugeContract.estimateGas.set_approve_deposit(curve.constants.ALIASES.deposit_and_stake, true, curve.constantOptions)).toNumber();
                return approveCoinsGas + approveGaugeGas;
            }
        }

        return approveCoinsGas;
    }

    public async depositAndStakeApprove(amounts: (number | string)[]): Promise<string[]> {
        if (this.gauge === ethers.constants.AddressZero) {
            throw Error(`depositAndStakeApprove method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        const approveCoinsTx: string[] = await ensureAllowance(this.underlyingCoinAddresses, amounts, curve.constants.ALIASES.deposit_and_stake);

        const gaugeContract = curve.contracts[this.gauge].contract;
        if (Object.prototype.hasOwnProperty.call(gaugeContract, 'approved_to_deposit')) {
            const gaugeAllowance: boolean = await gaugeContract.approved_to_deposit(curve.constants.ALIASES.deposit_and_stake, curve.signerAddress, curve.constantOptions);
            if (!gaugeAllowance) {
                const gasLimit = (await gaugeContract.estimateGas.set_approve_deposit(curve.constants.ALIASES.deposit_and_stake, true, curve.constantOptions)).mul(130).div(100);
                const approveGaugeTx: string = (await gaugeContract.set_approve_deposit(curve.constants.ALIASES.deposit_and_stake, true, { ...curve.options, gasLimit })).hash;
                return [...approveCoinsTx, approveGaugeTx];
            }
        }

        return approveCoinsTx;
    }

    private async depositAndStakeEstimateGas(amounts: (number | string)[]): Promise<number> {
        if (this.gauge === ethers.constants.AddressZero) {
            throw Error(`depositAndStake method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }

        return await this._depositAndStake(amounts, 1, true, true) as number
    }

    public async depositAndStake(amounts: (number | string)[], slippage = 0.1): Promise<string> {
        if (this.gauge === ethers.constants.AddressZero) {
            throw Error(`depositAndStake method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }

        return await this._depositAndStake(amounts, slippage, true, false) as string
    }

    // ---------------- DEPOSIT & STAKE WRAPPED ----------------

    public async depositAndStakeWrappedExpected(amounts: (number | string)[]): Promise<string> {
        if (this.gauge === ethers.constants.AddressZero) {
            throw Error(`depositAndStakeWrappedExpected method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        if (this.isPlain || this.isFake) throw Error(`depositAndStakeWrappedExpected method doesn't exist for pool ${this.name} (id: ${this.name})`);

        return await this.depositWrappedExpected(amounts);
    }

    public async depositAndStakeWrappedBonus(amounts: (number | string)[]): Promise<string> {
        if (this.gauge === ethers.constants.AddressZero) {
            throw Error(`depositAndStakeWrappedBonus method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        if (this.isPlain || this.isFake) throw Error(`depositAndStakeWrappedBonus method doesn't exist for pool ${this.name} (id: ${this.name})`);

        return await this.depositWrappedBonus(amounts);
    }

    public async depositAndStakeWrappedIsApproved(amounts: (number | string)[]): Promise<boolean> {
        if (this.gauge === ethers.constants.AddressZero) {
            throw Error(`depositAndStakeWrappedIsApproved method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        if (this.isPlain || this.isFake) throw Error(`depositAndStakeWrappedIsApproved method doesn't exist for pool ${this.name} (id: ${this.name})`);

        const coinsAllowance: boolean = await hasAllowance(this.wrappedCoinAddresses, amounts, curve.signerAddress, curve.constants.ALIASES.deposit_and_stake);

        const gaugeContract = curve.contracts[this.gauge].contract;
        if (Object.prototype.hasOwnProperty.call(gaugeContract, 'approved_to_deposit')) {
            const gaugeAllowance: boolean = await gaugeContract.approved_to_deposit(curve.constants.ALIASES.deposit_and_stake, curve.signerAddress, curve.constantOptions);
            return coinsAllowance && gaugeAllowance;
        }

        return coinsAllowance;
    }

    private async depositAndStakeWrappedApproveEstimateGas(amounts: (number | string)[]): Promise<number> {
        if (this.gauge === ethers.constants.AddressZero) {
            throw Error(`depositAndStakeWrappedApprove method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        if (this.isPlain || this.isFake) throw Error(`depositAndStakeWrappedApprove method doesn't exist for pool ${this.name} (id: ${this.name})`);

        const approveCoinsGas: number = await ensureAllowanceEstimateGas(this.wrappedCoinAddresses, amounts, curve.constants.ALIASES.deposit_and_stake);

        const gaugeContract = curve.contracts[this.gauge].contract;
        if (Object.prototype.hasOwnProperty.call(gaugeContract, 'approved_to_deposit')) {
            const gaugeAllowance: boolean = await gaugeContract.approved_to_deposit(curve.constants.ALIASES.deposit_and_stake, curve.signerAddress, curve.constantOptions);
            if (!gaugeAllowance) {
                const approveGaugeGas = (await gaugeContract.estimateGas.set_approve_deposit(curve.constants.ALIASES.deposit_and_stake, true, curve.constantOptions)).toNumber();
                return approveCoinsGas + approveGaugeGas;
            }
        }

        return approveCoinsGas;
    }

    public async depositAndStakeWrappedApprove(amounts: (number | string)[]): Promise<string[]> {
        if (this.gauge === ethers.constants.AddressZero) {
            throw Error(`depositAndStakeWrappedApprove method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        if (this.isPlain || this.isFake) throw Error(`depositAndStakeWrappedApprove method doesn't exist for pool ${this.name} (id: ${this.name})`);

        const approveCoinsTx: string[] = await ensureAllowance(this.wrappedCoinAddresses, amounts, curve.constants.ALIASES.deposit_and_stake);

        const gaugeContract = curve.contracts[this.gauge].contract;
        if (Object.prototype.hasOwnProperty.call(gaugeContract, 'approved_to_deposit')) {
            const gaugeAllowance: boolean = await gaugeContract.approved_to_deposit(curve.constants.ALIASES.deposit_and_stake, curve.signerAddress, curve.constantOptions);
            if (!gaugeAllowance) {
                const gasLimit = (await gaugeContract.estimateGas.set_approve_deposit(curve.constants.ALIASES.deposit_and_stake, true, curve.constantOptions)).mul(130).div(100);
                const approveGaugeTx: string = (await gaugeContract.set_approve_deposit(curve.constants.ALIASES.deposit_and_stake, true, { ...curve.options, gasLimit })).hash;
                return [...approveCoinsTx, approveGaugeTx];
            }
        }

        return approveCoinsTx;
    }

    private async depositAndStakeWrappedEstimateGas(amounts: (number | string)[]): Promise<number> {
        if (this.gauge === ethers.constants.AddressZero) {
            throw Error(`depositAndStakeWrapped method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        if (this.isPlain || this.isFake) throw Error(`depositAndStakeWrapped method doesn't exist for pool ${this.name} (id: ${this.name})`);

        return await this._depositAndStake(amounts, 1, false, true) as number
    }

    public async depositAndStakeWrapped(amounts: (number | string)[], slippage = 0.1): Promise<string> {
        if (this.gauge === ethers.constants.AddressZero) {
            throw Error(`depositAndStakeWrapped method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        if (this.isPlain || this.isFake) throw Error(`depositAndStakeWrapped method doesn't exist for pool ${this.name} (id: ${this.name})`);

        return await this._depositAndStake(amounts, slippage, false, false) as string
    }

    private async _depositAndStake(amounts: (number | string)[], slippage: number, isUnderlying: boolean, estimateGas: boolean): Promise<string | number> {
        const coinAddresses = isUnderlying ? [...this.underlyingCoinAddresses] : [...this.wrappedCoinAddresses];
        const coins = isUnderlying ? this.underlyingCoins : this.wrappedCoinAddresses;
        const decimals = isUnderlying ? this.underlyingDecimals : this.wrappedDecimals;
        const depositAddress = isUnderlying ? this.zap || this.address : this.address;

        if (amounts.length !== coinAddresses.length) {
            throw Error(`${this.name} pool has ${coinAddresses.length} coins (amounts provided for ${amounts.length})`);
        }

        const balances = isUnderlying ? Object.values(await this.walletUnderlyingCoinBalances()) : Object.values(await this.walletWrappedCoinBalances());
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

        const _amounts: ethers.BigNumber[] = amounts.map((amount, i) => parseUnits(amount, decimals[i]));

        const contract = curve.contracts[curve.constants.ALIASES.deposit_and_stake].contract;
        const useUnderlying = isUnderlying && (this.isLending || (this.isCrypto && !this.isPlain)) && !this.zap;
        const _expectedLpTokenAmount = isUnderlying ?
            ethers.utils.parseUnits(await this.depositAndStakeExpected(amounts)) :
            ethers.utils.parseUnits(await this.depositAndStakeWrappedExpected(amounts));
        const minAmountBN = toBN(_expectedLpTokenAmount).times(100 - slippage).div(100);
        const _minMintAmount = fromBN(minAmountBN);
        const ethIndex = getEthIndex(coinAddresses);
        const value = _amounts[ethIndex] || ethers.BigNumber.from(0);

        const maxCoins = curve.chainId === 137 ? 6 : 5;
        for (let i = 0; i < maxCoins; i++) {
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
            this.isMetaFactory && isUnderlying ? this.address : ethers.constants.AddressZero,
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
            this.isMetaFactory && isUnderlying ? this.address : ethers.constants.AddressZero,
            { ...curve.options, gasLimit, value }
        )).hash
    }

    // ---------------- WITHDRAW ----------------

    // OVERRIDE
    public async withdrawExpected(lpTokenAmount: number | string): Promise<string[]> {
        throw Error(`withdrawExpected method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    public async withdrawIsApproved(lpTokenAmount: number | string): Promise<boolean> {
        if (!this.zap) return true
        return await hasAllowance([this.lpToken], [lpTokenAmount], curve.signerAddress, this.zap as string);
    }

    private async withdrawApproveEstimateGas(lpTokenAmount: number | string): Promise<number> {
        if (!this.zap) return 0;
        return await ensureAllowanceEstimateGas([this.lpToken], [lpTokenAmount], this.zap as string);
    }

    public async withdrawApprove(lpTokenAmount: number | string): Promise<string[]> {
        if (!this.zap) return [];
        return await ensureAllowance([this.lpToken], [lpTokenAmount], this.zap as string);
    }

    // OVERRIDE
    private async withdrawEstimateGas(lpTokenAmount: number | string): Promise<number> {
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
        const prices = (this.isCrypto || this.id === 'wsteth') ? await this._underlyingPrices() : this.underlyingCoins.map(() => 1);

        const value = amounts.map(checkNumber).map(Number).reduce((s, a, i) => s + (a * prices[i]), 0);
        const lpTokenAmount = await this.withdrawImbalanceExpected(amounts);

        const balancedAmounts = await this.withdrawExpected(lpTokenAmount);
        const balancedValue = balancedAmounts.map(Number).reduce((s, a, i) => s + (a * prices[i]), 0);

        return String((value - balancedValue) / balancedValue * 100);
    }

    public async withdrawImbalanceIsApproved(amounts: (number | string)[]): Promise<boolean> {
        if (this.isCrypto) throw Error(`withdrawImbalanceIsApproved method doesn't exist for pool ${this.name} (id: ${this.name})`);

        if (this.zap) {
            const _amounts: ethers.BigNumber[] = amounts.map((amount, i) => parseUnits(amount, this.underlyingDecimals[i]));
            const _maxBurnAmount = (await this._calcLpTokenAmount(_amounts, false)).mul(101).div(100);
            return await hasAllowance([this.lpToken], [ethers.utils.formatUnits(_maxBurnAmount, 18)], curve.signerAddress, this.zap as string);
        }

        return true;
    }

    private async withdrawImbalanceApproveEstimateGas(amounts: (number | string)[]): Promise<number> {
        if (this.isCrypto) throw Error(`withdrawImbalanceApprove method doesn't exist for pool ${this.name} (id: ${this.name})`);

        if (this.zap) {
            const _amounts: ethers.BigNumber[] = amounts.map((amount, i) => parseUnits(amount, this.underlyingDecimals[i]));
            const _maxBurnAmount = (await this._calcLpTokenAmount(_amounts, false)).mul(101).div(100);
            return await ensureAllowanceEstimateGas([this.lpToken], [ethers.utils.formatUnits(_maxBurnAmount, 18)], this.zap as string);
        }

        return 0;
    }

    public async withdrawImbalanceApprove(amounts: (number | string)[]): Promise<string[]> {
        if (this.isCrypto) throw Error(`withdrawImbalanceApprove method doesn't exist for pool ${this.name} (id: ${this.name})`);

        if (this.zap) {
            const _amounts: ethers.BigNumber[] = amounts.map((amount, i) => parseUnits(amount, this.underlyingDecimals[i]));
            const _maxBurnAmount = (await this._calcLpTokenAmount(_amounts, false)).mul(101).div(100);
            return await ensureAllowance([this.lpToken], [ethers.utils.formatUnits(_maxBurnAmount, 18)], this.zap as string);
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
    private async _withdrawOneCoinExpected(_lpTokenAmount: ethers.BigNumber, i: number): Promise<ethers.BigNumber> {
        throw Error(`withdrawOneCoinExpected method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    public async withdrawOneCoinExpected(lpTokenAmount: number | string, coin: string | number): Promise<string> {
        const i = this._getCoinIdx(coin);
        const _lpTokenAmount = parseUnits(lpTokenAmount);
        const _expected = await this._withdrawOneCoinExpected(_lpTokenAmount, i);

        return ethers.utils.formatUnits(_expected, this.underlyingDecimals[i]);
    }

    public async withdrawOneCoinBonus(lpTokenAmount: number | string, coin: string | number): Promise<string> {
        const prices = (this.isCrypto || this.id === 'wsteth') ? await this._underlyingPrices() : this.underlyingCoins.map(() => 1);
        const coinPrice = prices[this._getCoinIdx(coin)];

        const amount = Number(await this.withdrawOneCoinExpected(lpTokenAmount, coin));
        const value = amount * coinPrice;

        const balancedAmounts = await this.withdrawExpected(lpTokenAmount);
        const balancedValue = balancedAmounts.map(Number).reduce((s, a, i) => s + (a * prices[i]), 0);

        return String((value - balancedValue) / balancedValue * 100);
    }

    public async withdrawOneCoinIsApproved(lpTokenAmount: number | string): Promise<boolean> {
        if (!this.zap) return true
        return await hasAllowance([this.lpToken], [lpTokenAmount], curve.signerAddress, this.zap as string);
    }

    private async withdrawOneCoinApproveEstimateGas(lpTokenAmount: number | string): Promise<number> {
        if (!this.zap) return 0
        return await ensureAllowanceEstimateGas([this.lpToken], [lpTokenAmount], this.zap as string);
    }

    public async withdrawOneCoinApprove(lpTokenAmount: number | string): Promise<string[]> {
        if (!this.zap) return []
        return await ensureAllowance([this.lpToken], [lpTokenAmount], this.zap as string);
    }

    // OVERRIDE
    private async withdrawOneCoinEstimateGas(lpTokenAmount: number | string, coin: string | number): Promise<number> {
        throw Error(`withdrawOneCoin method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    // OVERRIDE
    public async withdrawOneCoin(lpTokenAmount: number | string, coin: string | number, slippage = 0.5): Promise<string> {
        throw Error(`withdrawOneCoin method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    // ---------------- WITHDRAW ONE COIN WRAPPED ----------------

    // OVERRIDE
    private async _withdrawOneCoinWrappedExpected(_lpTokenAmount: ethers.BigNumber, i: number): Promise<ethers.BigNumber> {
        throw Error(`withdrawOneCoinWrappedExpected method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    public async withdrawOneCoinWrappedExpected(lpTokenAmount: number | string, coin: string | number): Promise<string> {
        const i = this._getCoinIdx(coin, false);
        const _lpTokenAmount = parseUnits(lpTokenAmount);

        const _expected = await this._withdrawOneCoinWrappedExpected(_lpTokenAmount, i);

        return ethers.utils.formatUnits(_expected, this.wrappedDecimals[i]);
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

    // ---------------- WALLET BALANCES ----------------

    private async walletBalances(...addresses: string[] | string[][]): Promise<IDict<IDict<string>> | IDict<string>> {
        if (this.gauge === ethers.constants.AddressZero) {
            return await this._balances(
                ['lpToken', ...this.underlyingCoinAddresses, ...this.wrappedCoinAddresses],
                [this.lpToken, ...this.underlyingCoinAddresses, ...this.wrappedCoinAddresses],
                ...addresses
            );
        } else {
            return await this._balances(
                ['lpToken', 'gauge', ...this.underlyingCoinAddresses, ...this.wrappedCoinAddresses],
                [this.lpToken, this.gauge, ...this.underlyingCoinAddresses, ...this.wrappedCoinAddresses],
                ...addresses
            );
        }
    }

    private async walletLpTokenBalances(...addresses: string[] | string[][]): Promise<IDict<IDict<string>> | IDict<string>> {
        if (this.gauge === ethers.constants.AddressZero) {
            return await this._balances(['lpToken'], [this.lpToken], ...addresses);
        } else {
            return await this._balances(['lpToken', 'gauge'], [this.lpToken, this.gauge], ...addresses);
        }
    }

    private async walletUnderlyingCoinBalances(...addresses: string[] | string[][]): Promise<IDict<IDict<string>> | IDict<string>> {
        return await this._balances(this.underlyingCoinAddresses, this.underlyingCoinAddresses, ...addresses)
    }

    private async walletWrappedCoinBalances(...addresses: string[] | string[][]): Promise<IDict<IDict<string>> | IDict<string>> {
        return await this._balances(this.wrappedCoinAddresses, this.wrappedCoinAddresses, ...addresses)
    }

    private async walletAllCoinBalances(...addresses: string[] | string[][]): Promise<IDict<IDict<string>> | IDict<string>> {
        return await this._balances(
            [...this.underlyingCoinAddresses, ...this.wrappedCoinAddresses],
            [...this.underlyingCoinAddresses, ...this.wrappedCoinAddresses],
            ...addresses
        )
    }

    // ---------------- USER BALANCES, BASE PROFIT AND SHARE ----------------

    private async _userLpTotalBalance(address: string): Promise<BigNumber> {
        const lpBalances = await this.walletLpTokenBalances(address);
        let lpTotalBalanceBN = BN(lpBalances.lpToken as string);
        if ('gauge' in lpBalances) lpTotalBalanceBN = lpTotalBalanceBN.plus(BN(lpBalances.gauge as string));

        return lpTotalBalanceBN
    }

    public async userBalances(address = ""): Promise<string[]> {
        address = address || curve.signerAddress;
        if (!address) throw Error("Need to connect wallet or pass address into args");

        const lpTotalBalanceBN = await this._userLpTotalBalance(address);
        if (lpTotalBalanceBN.eq(0)) return this.underlyingCoins.map(() => "0");

        return await this.withdrawExpected(lpTotalBalanceBN.toFixed(18));
    }

    public async userWrappedBalances(address = ""): Promise<string[]> {
        address = address || curve.signerAddress;
        if (!address) throw Error("Need to connect wallet or pass address into args");

        const lpTotalBalanceBN = await this._userLpTotalBalance(address);
        if (lpTotalBalanceBN.eq(0)) return this.wrappedCoins.map(() => "0");

        return await this.withdrawWrappedExpected(lpTotalBalanceBN.toFixed(18));
    }

    public async userLiquidityUSD(address = ""): Promise<string> {
        const lpBalanceBN = await this._userLpTotalBalance(address);
        const lpPrice = await _getUsdRate(this.lpToken);

        return lpBalanceBN.times(lpPrice).toFixed(8)
    }

    public async baseProfit(address = ""): Promise<{ day: string, week: string, month: string, year: string }> {
        const apyData = await this.statsBaseApy();
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
        const withGauge = this.gauge !== ethers.constants.AddressZero;
        address = address || curve.signerAddress;
        if (!address) throw Error("Need to connect wallet or pass address into args");

        const userLpBalance = await this.walletLpTokenBalances(address) as IDict<string>;
        let userLpTotalBalanceBN = BN(userLpBalance.lpToken);
        if (withGauge) userLpTotalBalanceBN = userLpTotalBalanceBN.plus(BN(userLpBalance.gauge as string));

        let totalLp, gaugeLp;
        if (withGauge) {
            [totalLp, gaugeLp] = (await curve.multicallProvider.all([
                curve.contracts[this.lpToken].multicallContract.totalSupply(),
                curve.contracts[this.gauge].multicallContract.totalSupply(),
            ]) as ethers.BigNumber[]).map((_supply) => ethers.utils.formatUnits(_supply));
        } else {
            totalLp = ethers.utils.formatUnits(await curve.contracts[this.lpToken].contract.totalSupply(curve.constantOptions));
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

    private async _swapExpected(i: number, j: number, _amount: ethers.BigNumber): Promise<ethers.BigNumber> {
        const contractAddress = this.isCrypto && this.isMeta ? this.zap as string : this.address;
        const contract = curve.contracts[contractAddress].contract;
        if (Object.prototype.hasOwnProperty.call(contract, 'get_dy_underlying')) {
            return await contract.get_dy_underlying(i, j, _amount, curve.constantOptions)
        } else {
            if ('get_dy(address,uint256,uint256,uint256)' in contract) {  // atricrypto3 based metapools
                return await contract.get_dy(this.address, i, j, _amount, curve.constantOptions);
            }
            return await contract.get_dy(i, j, _amount, curve.constantOptions);
        }
    }

    public async swapExpected(inputCoin: string | number, outputCoin: string | number, amount: number | string): Promise<string> {
        const i = this._getCoinIdx(inputCoin);
        const j = this._getCoinIdx(outputCoin);
        const _amount = parseUnits(amount, this.underlyingDecimals[i]);
        const _expected = await this._swapExpected(i, j, _amount);

        return ethers.utils.formatUnits(_expected, this.underlyingDecimals[j])
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

    private _swapContractAddress(): string {
        return (this.isCrypto && this.isMeta) || (this.isMetaFactory && (new PoolTemplate(this.basePool).isLending)) ? this.zap as string : this.address;
    }

    public async swapIsApproved(inputCoin: string | number, amount: number | string): Promise<boolean> {
        const contractAddress = this._swapContractAddress();
        const i = this._getCoinIdx(inputCoin);
        return await hasAllowance([this.underlyingCoinAddresses[i]], [amount], curve.signerAddress, contractAddress);
    }

    private async swapApproveEstimateGas (inputCoin: string | number, amount: number | string): Promise<number> {
        const contractAddress = this._swapContractAddress();
        const i = this._getCoinIdx(inputCoin);
        return await ensureAllowanceEstimateGas([this.underlyingCoinAddresses[i]], [amount], contractAddress);
    }

    public async swapApprove(inputCoin: string | number, amount: number | string): Promise<string[]> {
        const contractAddress = this._swapContractAddress();
        const i = this._getCoinIdx(inputCoin);
        return await ensureAllowance([this.underlyingCoinAddresses[i]], [amount], contractAddress);
    }

    // OVERRIDE
    private async swapEstimateGas(inputCoin: string | number, outputCoin: string | number, amount: number | string): Promise<number> {
        throw Error(`swap method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    // OVERRIDE
    public async swap(inputCoin: string | number, outputCoin: string | number, amount: number | string, slippage = 0.5): Promise<string> {
        throw Error(`swap method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    // ---------------- SWAP WRAPPED ----------------

    private async _swapWrappedExpected(i: number, j: number, _amount: ethers.BigNumber): Promise<ethers.BigNumber> {
        return await curve.contracts[this.address].contract.get_dy(i, j, _amount, curve.constantOptions);
    }

    // OVERRIDE
    public async swapWrappedExpected(inputCoin: string | number, outputCoin: string | number, amount: number | string): Promise<string> {
        throw Error(`swapWrappedExpected method doesn't exist for pool ${this.name} (id: ${this.name})`);
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
    private async swapWrappedApproveEstimateGas(inputCoin: string | number, amount: number | string): Promise<number> {
        throw Error(`swapWrappedApprove method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    // OVERRIDE
    public async swapWrappedApprove(inputCoin: string | number, amount: number | string): Promise<string[]> {
        throw Error(`swapWrappedApprove method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    // OVERRIDE
    private async swapWrappedEstimateGas(inputCoin: string | number, outputCoin: string | number, amount: number | string): Promise<number> {
        throw Error(`swapWrapped method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    // OVERRIDE
    public async swapWrapped(inputCoin: string | number, outputCoin: string | number, amount: number | string, slippage = 0.5): Promise<string> {
        throw Error(`swapWrapped method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    // ---------------- ... ----------------

    public gaugeOptimalDeposits = async (...accounts: string[]): Promise<IDict<string>> => {
        if (this.gauge === ethers.constants.AddressZero) throw Error(`${this.name} doesn't have gauge`);
        if (accounts.length == 1 && Array.isArray(accounts[0])) accounts = accounts[0];

        const votingEscrowContract = curve.contracts[curve.constants.ALIASES.voting_escrow].multicallContract;
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

        const votingPower: IDict<BigNumber> = {};
        let totalBalance = BN(0);
        for (const acct of accounts) {
            votingPower[acct] = response[0];
            totalBalance = totalBalance.plus(response[1]).plus(response[2]);
            response.splice(0, 3);
        }

        const totalPower = Object.values(votingPower).reduce((sum, item) => sum.plus(item));
        // @ts-ignore
        const optimalBN: IDict<BigNumber> = Object.fromEntries(accounts.map((acc) => [acc, BN(0)]));
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

    private _getCoinIdx = (coin: string | number, useUnderlying = true): number => {
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

        const [coinAddress] = _getCoinAddresses(coin);
        const lowerCaseCoinAddresses = useUnderlying ?
            this.underlyingCoinAddresses.map((c) => c.toLowerCase()) :
            this.wrappedCoinAddresses.map((c) => c.toLowerCase());

        const idx = lowerCaseCoinAddresses.indexOf(coinAddress.toLowerCase());
        if (idx === -1) {
            throw Error(`There is no ${coin} among ${this.name} pool ${useUnderlying ? 'underlying' : 'wrapped'} coins`);
        }

        return idx
    }

    private _getRates = async(): Promise<ethers.BigNumber[]> => {
        const _rates: ethers.BigNumber[] = [];
        for (let i = 0; i < this.wrappedCoinAddresses.length; i++) {
            const addr = this.wrappedCoinAddresses[i];
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
        Promise<IDict<IDict<string>> | IDict<string>> => {
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
        const rawBalances: IDict<string[]> = await _getBalances(coinAddresses, addresses);

        const balances: IDict<IDict<string>> = {};
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
        for (const addr of this.wrappedCoinAddresses) {
            promises.push(_getUsdRate(addr))
        }

        return await Promise.all(promises)
    }
}