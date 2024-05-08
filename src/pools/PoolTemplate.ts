import BigNumber from 'bignumber.js';
import memoize from "memoizee";
import {_getAllGauges, _getAllGaugesFormatted, _getPoolsFromApi} from '../external-api.js';
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
    mulBy1_3,
    smartNumber,
    DIGas,
    _getAddress,
    isMethodExist,
    getVolumeApiController,
} from '../utils.js';
import { IDict, IReward, IProfit, IPoolType } from '../interfaces';
import { curve } from "../curve.js";
import ERC20Abi from '../constants/abis/ERC20.json' assert { type: 'json' };


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
    implementation: string | null;
    isPlain: boolean;
    isLending: boolean;
    isMeta: boolean;
    isCrypto: boolean;
    isFake: boolean;
    isFactory: boolean;
    isMetaFactory: boolean;
    isStableNg: boolean;
    isLlamma: boolean;
    basePool: string;
    metaCoinIdx: number;
    underlyingCoins: string[];
    wrappedCoins: string[];
    underlyingCoinAddresses: string[];
    wrappedCoinAddresses: string[];
    underlyingDecimals: number[];
    wrappedDecimals: number[];
    useLending: boolean[];
    inApi: boolean;
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
        const poolData = curve.getPoolsData()[id];

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
        this.implementation = poolData.implementation_address || null;
        this.isPlain = poolData.is_plain || false;
        this.isLending = poolData.is_lending || false;
        this.isMeta = poolData.is_meta || false;
        this.isCrypto = poolData.is_crypto || false;
        this.isFake = poolData.is_fake || false;
        this.isFactory = poolData.is_factory || false;
        this.isMetaFactory = (this.isMeta && this.isFactory) || this.zap === '0xa79828df1850e8a3a3064576f380d90aecdd3359';
        this.isStableNg = poolData.is_stable_ng || false;
        this.isLlamma = poolData.is_llamma || false;
        this.basePool = poolData.base_pool || '';
        this.metaCoinIdx = this.isMeta ? poolData.meta_coin_idx ?? poolData.wrapped_coins.length - 1 : -1;
        this.underlyingCoins = poolData.underlying_coins;
        this.wrappedCoins = poolData.wrapped_coins;
        this.underlyingCoinAddresses = poolData.underlying_coin_addresses;
        this.wrappedCoinAddresses = poolData.wrapped_coin_addresses;
        this.underlyingDecimals = poolData.underlying_decimals;
        this.wrappedDecimals = poolData.wrapped_decimals;
        this.useLending = poolData.use_lending || poolData.underlying_coin_addresses.map(() => false);
        this.inApi = poolData.in_api ?? false;
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

    public hasVyperVulnerability(): boolean {
        if (curve.chainId === 1 && this.id === "crveth") return true;
        if (curve.chainId === 42161 && this.id === "tricrypto") return true;

        // @ts-ignore
        const vulnerable_implementations: string[] = {
            1: [  // ethereum
                "0x6326DEbBAa15bCFE603d831e7D75f4fc10d9B43E",
                "0x8c1aB78601c259E1B43F19816923609dC7d7de9B",
                "0x88855cdF2b0A8413D470B86952E726684de915be",
            ].map((a) => a.toLowerCase()),
            137: [  // polygon
                "0xAe00f57663F4C85FC948B13963cd4627dAF01061",
                "0xA9134FaE98F92217f457918505375Ae91fdc5e3c",
                "0xf31bcdf0B9a5eCD7AB463eB905551fBc32e51856",
            ].map((a) => a.toLowerCase()),
            250: [  // fantom
                "0xE6358f6a45B502477e83CC1CDa759f540E4459ee",
                "0x5d58Eb45e97B43e471AF05cD2b11CeB4106E1b1a",
                "0xb11Dc44A9f981fAF1669dca6DD40c3cc2554A2ce",
            ].map((a) => a.toLowerCase()),
            42161: [  // arbitrum
                "0x7DA64233Fefb352f8F501B357c018158ED8aA455",
                "0xAAe75FAebCae43b9d541Fd875622BE48D9B4f5D0",
                "0x89287c32c2CAC1C76227F6d300B2DBbab6b75C08",
            ].map((a) => a.toLowerCase()),
            43114: [  // avalanche
                "0x64448B78561690B70E17CBE8029a3e5c1bB7136e",
                "0xF1f85a74AD6c64315F85af52d3d46bF715236ADc",
                "0x0eb0F1FaF5F509Ac53fA224477509EAD167cf410",
            ].map((a) => a.toLowerCase()),
        }[curve.chainId] ?? [];

        return vulnerable_implementations.includes(this.implementation ?? "");
    }

    public rewardsOnly(): boolean {
        if (curve.chainId === 2222 || curve.chainId === 324) return true;  // TODO remove this for Kava and ZkSync
        if (this.gauge === curve.constants.ZERO_ADDRESS) throw Error(`${this.name} doesn't have gauge`);
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
            "admin_fee" in multicallContract ? multicallContract.admin_fee() : multicallContract.ADMIN_FEE(),
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

        let _virtualPrice = curve.parseUnits("0");
        let _fee = curve.parseUnits("0");
        let _prices, _adminFee, _A, _lpTokenSupply, _gamma;
        try {
            [_virtualPrice, _fee, _adminFee, _A, _lpTokenSupply, _gamma, ..._prices] = await curve.multicallProvider.all(calls) as bigint[];
        } catch (e) { // Empty pool
            calls.shift();
            if (this.isCrypto) {
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
        if (this.isCrypto) {
            const prices = _prices.map((_p) => curve.formatUnits(_p));
            priceOracle = [];
            priceScale = [];
            for (let i = 0; i < this.wrappedCoins.length - 1; i++) {
                priceOracle.push(prices.shift() as string);
                priceScale.push(prices.shift() as string);
            }
        }

        const A_PRECISION = curve.chainId === 1 && ['compound', 'usdt', 'y', 'busd', 'susd', 'pax', 'ren', 'sbtc', 'hbtc', '3pool'].includes(this.id) ? 1 : 100;
        const [_future_A, _initial_A, _future_A_time, _initial_A_time] = await curve.multicallProvider.all(additionalCalls) as bigint[]
        const [future_A, initial_A, future_A_time, initial_A_time] = [
            _future_A ? String(Number(curve.formatUnits(_future_A, 0)) / A_PRECISION) : undefined,
            _initial_A ? String(Number(curve.formatUnits(_initial_A, 0)) / A_PRECISION) : undefined,
            _future_A_time ? Number(curve.formatUnits(_future_A_time, 0)) * 1000 : undefined,
            _initial_A_time ? Number(curve.formatUnits(_initial_A_time, 0)) * 1000 : undefined,
        ]

        return { lpTokenSupply, virtualPrice, fee, adminFee, A, future_A, initial_A, future_A_time, initial_A_time, gamma, priceOracle, priceScale };
    }

    private async statsWrappedBalances(): Promise<string[]> {
        const contract = curve.contracts[this.address].multicallContract;
        const calls = [];
        for (let i = 0; i < this.wrappedCoins.length; i++) calls.push(contract.balances(i));
        const _wrappedBalances: bigint[] = await curve.multicallProvider.all(calls);

        return _wrappedBalances.map((_b, i) => curve.formatUnits(_b, this.wrappedDecimals[i]));
    }

    // OVERRIDE
    private async statsUnderlyingBalances(): Promise<string[]> {
        return await this.statsWrappedBalances();
    }

    private statsTotalLiquidity = async (useApi = true): Promise<string> => {
        if (curve.chainId === 1 && this.id === "crveth") return "0"

        if (this.isLlamma) {
            const stablecoinContract = curve.contracts[this.underlyingCoinAddresses[0]].multicallContract;
            const collateralContract = curve.contracts[this.underlyingCoinAddresses[1]].multicallContract;
            const ammContract = curve.contracts[this.address].multicallContract;

            const [_balance_x, _fee_x, _balance_y, _fee_y]: bigint[] = await curve.multicallProvider.all([
                stablecoinContract.balanceOf(this.address),
                ammContract.admin_fees_x(),
                collateralContract.balanceOf(this.address),
                ammContract.admin_fees_y(),
            ]);
            const collateralRate = await _getUsdRate(this.underlyingCoinAddresses[1]);

            const stablecoinTvlBN = toBN(_balance_x).minus(toBN(_fee_x));
            const collateralTvlBN = toBN(_balance_y).minus(toBN(_fee_y)).times(collateralRate);

            return stablecoinTvlBN.plus(collateralTvlBN).toString()
        }

        if (useApi) {
            const network = curve.constants.NETWORK_NAME;
            let poolType = this.isCrypto ? "crypto" : "main";
            if (this.id.startsWith("factory")) {
                poolType = this.id.replace(/-\d+$/, '');
                poolType = poolType.replace(/-v2$/, '');
            }
            const poolsData = (await _getPoolsFromApi(network, poolType as IPoolType)).poolData;

            try {
                const totalLiquidity = poolsData.filter((data) => data.address.toLowerCase() === this.address.toLowerCase())[0].usdTotal;
                return String(totalLiquidity);
            } catch (err) {
                console.log(this.id, (err as Error).message);
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
        const network = curve.constants.NETWORK_NAME;
        const {poolsData} = await getVolumeApiController(network);
        const poolData = poolsData.find((d) => d.address.toLowerCase() === this.address);

        if(poolData) {
            return poolData.volumeUSD.toString()
        }

        throw Error(`Can't get Volume for ${this.name} (id: ${this.id})`)
    }

    private statsBaseApy = async (): Promise<{ day: string, week: string }> => {
        const network = curve.constants.NETWORK_NAME;
        const {poolsData} = await getVolumeApiController(network);
        const poolData = poolsData.find((d) => d.address.toLowerCase() === this.address);

        if(poolData) {
            return {
                day: poolData.day.toString(),
                week: poolData.week.toString(),
            }
        }
        throw Error(`Can't get base APY for ${this.name} (id: ${this.id})`)
    }

    private _calcTokenApy = async (futureWorkingSupplyBN: BigNumber | null = null): Promise<[baseApy: number, boostedApy: number]> => {
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
            ]) as bigint[]).map((value) => toBN(value));

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
            ]) as bigint[]).map((value) => toBN(value));

            inflationRateBN = inflationRateBN.times(weightBN);
        }

        if (inflationRateBN.eq(0)) return [0, 0];
        if (futureWorkingSupplyBN !== null) workingSupplyBN = futureWorkingSupplyBN;

        // If you added 1$ value of LP it would be 0.4$ of working LP. So your annual reward per 1$ in USD is:
        // (annual reward per working liquidity in $) * (0.4$ of working LP)
        const rateBN = inflationRateBN.times(31536000).div(workingSupplyBN).times(totalSupplyBN).div(Number(totalLiquidityUSD)).times(0.4);
        const crvPrice = await _getUsdRate(curve.constants.ALIASES.crv);
        const baseApyBN = rateBN.times(crvPrice);
        const boostedApyBN = baseApyBN.times(2.5);

        return [baseApyBN.times(100).toNumber(), boostedApyBN.times(100).toNumber()]
    }

    private statsTokenApy = async (useApi = true): Promise<[baseApy: number, boostedApy: number]> => {
        if (this.rewardsOnly()) throw Error(`${this.name} has Rewards-Only Gauge. Use stats.rewardsApy instead`);

        const isDisabledChain = [1313161554].includes(curve.chainId); // Disable Aurora
        if (useApi && !isDisabledChain) {
            const crvAPYs = await _getCrvApyFromApi();
            const poolCrvApy = crvAPYs[this.gauge] ?? [0, 0];  // new pools might be missing
            return [poolCrvApy[0], poolCrvApy[1]];
        }

        return await this._calcTokenApy();
    }

    private statsRewardsApy = async (useApi = true): Promise<IReward[]> => {
        if (this.gauge === curve.constants.ZERO_ADDRESS) return [];

        const isDisabledChain = [1313161554].includes(curve.chainId); // Disable Aurora
        if (useApi && !isDisabledChain) {
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
            const stakedSupplyBN = toBN(_stakedSupply as bigint);
            const totalSupplyBN = toBN(_totalSupply as bigint);
            const inflationBN = toBN(rewardData.rate, rewardToken.decimals);
            const periodFinish = Number(curve.formatUnits(rewardData.period_finish, 0)) * 1000;
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

    private async _pureCalcLpTokenAmount(_amounts: bigint[], isDeposit = true, useUnderlying = true): Promise<bigint> {
        const calcContractAddress = this.isMeta && useUnderlying ? this.zap as string : this.address;
        const N_coins = useUnderlying ? this.underlyingCoins.length : this.wrappedCoins.length;
        const contract = curve.contracts[calcContractAddress].contract;

        if (this.isMetaFactory && useUnderlying) {
            if (`calc_token_amount(address,uint256[${N_coins}],bool)` in contract) {
                return await contract.calc_token_amount(this.address, _amounts, isDeposit, curve.constantOptions);
            }
            return await contract.calc_token_amount(this.address, _amounts, curve.constantOptions);
        }

        if (`calc_token_amount(uint256[${N_coins}],bool)` in contract) {
            return await contract.calc_token_amount(_amounts, isDeposit, curve.constantOptions);
        }

        return await contract.calc_token_amount(_amounts, curve.constantOptions);
    }

    private _calcLpTokenAmount = memoize(async (_amounts: bigint[], isDeposit = true, useUnderlying = true): Promise<bigint> => {
        if (this.isCrypto) {
            try {
                return await this._pureCalcLpTokenAmount(_amounts, isDeposit, useUnderlying);
            } catch (e) { // Seeding
                const lpContract = curve.contracts[this.lpToken].contract;
                const _lpTotalSupply: bigint = await lpContract.totalSupply(curve.constantOptions);
                if (_lpTotalSupply > curve.parseUnits("0")) throw e; // Already seeded

                if (this.isMeta && useUnderlying) throw Error("Initial deposit for crypto meta pools must be in wrapped coins");

                const decimals = useUnderlying ? this.underlyingDecimals : this.wrappedDecimals;
                const amounts = _amounts.map((_a, i) => curve.formatUnits(_a, decimals[i]));
                const seedAmounts = await this.cryptoSeedAmounts(amounts[0]); // Checks N coins is 2 or 3 and amounts > 0
                amounts.forEach((a, i) => {
                    if (!BN(a).eq(BN(seedAmounts[i]))) throw Error(`Amounts must be = ${seedAmounts}`);
                });

                return parseUnits(Math.pow(amounts.map(Number).reduce((a, b) => a * b), 1 / amounts.length));
            }
        }

        try {
            const contract = curve.contracts[curve.constants.ALIASES.stable_calc].contract;

            if (curve.constants.ALIASES.stable_calc === curve.constants.ZERO_ADDRESS || this.id.startsWith("factory-stable-ng")) {
                return await this._pureCalcLpTokenAmount(_amounts, isDeposit, useUnderlying);
            } else if (this.isMeta) {
                const basePool = new PoolTemplate(this.basePool);
                return await contract.calc_token_amount_meta(
                    this.address,
                    this.lpToken,
                    _amounts.concat(Array(10 - _amounts.length).fill(curve.parseUnits("0"))),
                    _amounts.length,
                    basePool.address,
                    basePool.lpToken,
                    isDeposit,
                    useUnderlying
                );
            } else {
                return await contract.calc_token_amount(
                    this.address,
                    this.lpToken,
                    _amounts.concat(Array(10 - _amounts.length).fill(curve.parseUnits("0"))),
                    _amounts.length,
                    isDeposit,
                    useUnderlying && this.isLending
                );
            }
        } catch (e: any) { // Seeding
            if (!isDeposit) throw e; // Seeding is only for deposit

            const lpContract = curve.contracts[this.lpToken].contract;
            const _lpTotalSupply: bigint = await lpContract.totalSupply(curve.constantOptions);
            if (_lpTotalSupply > curve.parseUnits("0")) throw e; // Already seeded

            const decimals = useUnderlying ? this.underlyingDecimals : this.wrappedDecimals;
            const amounts = _amounts.map((_a, i) => curve.formatUnits(_a, decimals[i]));

            if (this.isMeta && useUnderlying) {
                const seedAmounts = this.metaUnderlyingSeedAmounts(amounts[0]); // Checks N coins == 2 and amounts > 0
                amounts.forEach((a, i) => {
                    if (!BN(a).eq(BN(seedAmounts[i]))) throw Error(`Amounts must be = ${seedAmounts}`);
                });
            } else {
                if (_amounts[0] <= curve.parseUnits("0")) throw Error("Initial deposit amounts must be > 0");
                amounts.forEach((a) => {
                    if (a !== amounts[0]) throw Error("Initial deposit amounts must be equal");
                });
            }

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

        return curve.formatUnits(_expected);
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

        return curve.formatUnits(_expected);
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
        const amount1BN = BN(amount1);
        if (amount1BN.lte(0)) throw Error("Initial deposit amounts must be > 0");

        if (decimals.length === 2) {
            const priceScaleBN = toBN(await curve.contracts[this.address].contract.price_scale(curve.constantOptions));
            return [_cutZeros(amount1BN.toFixed(decimals[0])), _cutZeros(amount1BN.div(priceScaleBN).toFixed(decimals[1]))];
        } else if (decimals.length === 3) {
            const priceScaleBN = (await curve.multicallProvider.all([
                curve.contracts[this.address].multicallContract.price_scale(0),
                curve.contracts[this.address].multicallContract.price_scale(1),
            ]) as bigint[]).map((_p) => toBN(_p));
            return [
                _cutZeros(amount1BN.toFixed(decimals[0])),
                _cutZeros(amount1BN.div(priceScaleBN[0]).toFixed(decimals[1])),
                _cutZeros(amount1BN.div(priceScaleBN[1]).toFixed(decimals[2])),
            ];
        }

        throw Error("cryptoSeedAmounts method doesn't exist for pools with N coins > 3");
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
        let prices: number[] = [];


        //for crvusd and stable-ng implementations
        const isUseStoredRates = isMethodExist(curve.contracts[this.address].contract, 'stored_rates') && this.isPlain;

        if(this.isCrypto || this.id === 'wsteth') {
            prices = await this._underlyingPrices();
        } else if (isUseStoredRates) {
            const result = await this._stored_rates();
            result.forEach((item, index) => {
                prices.push(Number(item)/(10 ** (36 - this.underlyingDecimals[index])))
            })
        } else {
            prices = this.underlyingCoins.map(() => 1);
        }

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

    private async depositApproveEstimateGas(amounts: (number | string)[]): Promise<number | number[]> {
        return await ensureAllowanceEstimateGas(this.underlyingCoinAddresses, amounts, this.zap || this.address);
    }

    public async depositApprove(amounts: (number | string)[]): Promise<string[]> {
        return await ensureAllowance(this.underlyingCoinAddresses, amounts, this.zap || this.address);
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

        return await hasAllowance(this.wrappedCoinAddresses, amounts, curve.signerAddress, this.address);
    }

    private async depositWrappedApproveEstimateGas(amounts: (number | string)[]): Promise<number | number[]> {
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
        if (this.gauge === curve.constants.ZERO_ADDRESS) {
            throw Error(`stakeIsApproved method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        return await hasAllowance([this.lpToken], [lpTokenAmount], curve.signerAddress, this.gauge);
    }

    private async stakeApproveEstimateGas(lpTokenAmount: number | string): Promise<number | number[]> {
        if (this.gauge === curve.constants.ZERO_ADDRESS) {
            throw Error(`stakeApproveEstimateGas method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        return await ensureAllowanceEstimateGas([this.lpToken], [lpTokenAmount], this.gauge);
    }

    public async stakeApprove(lpTokenAmount: number | string): Promise<string[]> {
        if (this.gauge === curve.constants.ZERO_ADDRESS) {
            throw Error(`stakeApprove method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        return await ensureAllowance([this.lpToken], [lpTokenAmount], this.gauge);
    }

    private async stakeEstimateGas(lpTokenAmount: number | string): Promise<number | number[]> {
        if (this.gauge === curve.constants.ZERO_ADDRESS) {
            throw Error(`stakeEstimateGas method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        const _lpTokenAmount = parseUnits(lpTokenAmount);
        return smartNumber(await curve.contracts[this.gauge].contract.deposit.estimateGas(_lpTokenAmount, curve.constantOptions));
    }

    public async stake(lpTokenAmount: number | string): Promise<string> {
        if (this.gauge === curve.constants.ZERO_ADDRESS) {
            throw Error(`stake method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        const _lpTokenAmount = parseUnits(lpTokenAmount);
        await _ensureAllowance([this.lpToken], [_lpTokenAmount], this.gauge)

        await curve.updateFeeData();
        const gasLimit = mulBy1_3(DIGas(await curve.contracts[this.gauge].contract.deposit.estimateGas(_lpTokenAmount, curve.constantOptions)));
        return (await curve.contracts[this.gauge].contract.deposit(_lpTokenAmount, { ...curve.options, gasLimit })).hash;
    }

    private async unstakeEstimateGas(lpTokenAmount: number | string): Promise<number | number[]> {
        if (this.gauge === curve.constants.ZERO_ADDRESS) {
            throw Error(`unstakeEstimateGas method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        const _lpTokenAmount = parseUnits(lpTokenAmount);
        return smartNumber(await curve.contracts[this.gauge].contract.withdraw.estimateGas(_lpTokenAmount, curve.constantOptions));
    }

    public async unstake(lpTokenAmount: number | string): Promise<string> {
        if (this.gauge === curve.constants.ZERO_ADDRESS) {
            throw Error(`unstake method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        const _lpTokenAmount = parseUnits(lpTokenAmount);

        await curve.updateFeeData();
        const gasLimit = DIGas((await curve.contracts[this.gauge].contract.withdraw.estimateGas(_lpTokenAmount, curve.constantOptions))) * curve.parseUnits("200", 0) / curve.parseUnits("100", 0);
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
            ]) as bigint[]).map((value) => toBN(value));

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
            ]) as bigint[]).map((value) => toBN(value));

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

        return curve.formatUnits(await curve.contracts[this.gauge].contract.claimable_tokens(address, curve.constantOptions));
    }

    public async claimCrvEstimateGas(): Promise<number | number[]> {
        if (this.rewardsOnly()) throw Error(`${this.name} has Rewards-Only Gauge. Use claimRewards instead`);
        if(curve.chainId === 1) {
            return Number(await curve.contracts[curve.constants.ALIASES.minter].contract.mint.estimateGas(this.gauge, curve.constantOptions));
        } else {
            return smartNumber(await curve.contracts[curve.constants.ALIASES.gauge_factory].contract.mint.estimateGas(this.gauge, curve.constantOptions));
        }
    }

    public async claimCrv(): Promise<string> {
        if (this.rewardsOnly()) throw Error(`${this.name} has Rewards-Only Gauge. Use claimRewards instead`);
        const contract = curve.chainId === 1 ? curve.contracts[curve.constants.ALIASES.minter].contract : curve.contracts[curve.constants.ALIASES.gauge_factory].contract;

        await curve.updateFeeData();

        const gasLimit = mulBy1_3(DIGas(await contract.mint.estimateGas(this.gauge, curve.constantOptions)));
        return (await contract.mint(this.gauge, { ...curve.options, gasLimit })).hash;
    }

    public userBoost = async (address = ""): Promise<string> => {
        if (this.gauge === curve.constants.ZERO_ADDRESS) throw Error(`${this.name} doesn't have gauge`);
        if (this.rewardsOnly()) throw Error(`${this.name} has Rewards-Only Gauge. Use stats.rewardsApy instead`);
        address = _getAddress(address)

        const gaugeContract = curve.contracts[this.gauge].multicallContract;
        const [workingBalanceBN, balanceBN] = (await curve.multicallProvider.all([
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
        const veContractMulticall = curve.contracts[curve.constants.ALIASES.voting_escrow].multicallContract;
        const gaugeContractMulticall = curve.contracts[this.gauge].multicallContract;
        const calls = [
            veContractMulticall.balanceOf(address),
            veContractMulticall.totalSupply(),
            gaugeContractMulticall.balanceOf(address),
            gaugeContractMulticall.totalSupply(),
            gaugeContractMulticall.working_balances(address),
            gaugeContractMulticall.working_supply(),
        ];

        const [_votingBalance, _votingTotal, _gaugeBalance, _gaugeTotal, _workingBalance, _workingSupply]: bigint[] = await curve.multicallProvider.all(calls);

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
        address = _getAddress(address)
        const [boostBN] = await this._userFutureBoostAndWorkingSupply(address);
        if (boostBN.lt(1)) return '1.0';
        if (boostBN.gt(2.5)) return '2.5';

        return boostBN.toFixed(4).replace(/([0-9])0+$/, '$1')
    }

    public userCrvApy = async (address = ""): Promise<number> => {
        if (this.rewardsOnly()) throw Error(`${this.name} has Rewards-Only Gauge. Use stats.rewardsApy instead`);
        address = _getAddress(address)

        const [minApy, maxApy] = await this.statsTokenApy();
        const boost = await this.userBoost(address);
        if (boost == "2.5") return maxApy;
        if (boost === "NaN") return NaN;

        return BN(minApy).times(BN(boost)).toNumber();
    }

    public userFutureCrvApy = async (address = ""): Promise<number> => {
        if (this.rewardsOnly()) throw Error(`${this.name} has Rewards-Only Gauge. Use stats.rewardsApy instead`);
        address = _getAddress(address)
        const [boostBN, futureWorkingSupplyBN] = await this._userFutureBoostAndWorkingSupply(address);

        const [minApy, maxApy] = await this._calcTokenApy(futureWorkingSupplyBN);
        if (boostBN.lt(1)) return minApy;
        if (boostBN.gt(2.5)) return maxApy;

        return BN(minApy).times(boostBN).toNumber();
    }

    public maxBoostedStake = async (...addresses: string[]): Promise<IDict<string> | string> => {
        if (this.gauge === curve.constants.ZERO_ADDRESS) throw Error(`${this.name} doesn't have gauge`);
        if (addresses.length == 1 && Array.isArray(addresses[0])) addresses = addresses[0];
        if (addresses.length === 0 && curve.signerAddress !== '') addresses = [curve.signerAddress];

        if (addresses.length === 0) throw Error("Need to connect wallet or pass addresses into args");

        const votingEscrowContract = curve.contracts[curve.constants.ALIASES.voting_escrow].multicallContract;
        const gaugeContract = curve.contracts[this.gauge].multicallContract;

        const contractCalls = [votingEscrowContract.totalSupply(), gaugeContract.totalSupply()];
        addresses.forEach((account: string) => {
            contractCalls.push(votingEscrowContract.balanceOf(account));
        });

        const _response: bigint[] = await curve.multicallProvider.all(contractCalls);
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
        if (this.gauge === curve.constants.ZERO_ADDRESS) return []

        if (useApi) {
            const rewards = await _getRewardsFromApi();
            if (!rewards[this.gauge]) return [];
            rewards[this.gauge].forEach((r) => _setContracts(r.tokenAddress, ERC20Abi));
            return rewards[this.gauge].map((r) => ({ token: r.tokenAddress, symbol: r.symbol, decimals: Number(r.decimals) }));
        }

        const gaugeContract = curve.contracts[this.gauge].contract;
        const gaugeMulticallContract = curve.contracts[this.gauge].multicallContract;
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
        if (this.gauge === curve.constants.ZERO_ADDRESS) throw Error(`${this.name} doesn't have gauge`);

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

            const balanceBN = toBN(res.shift() as bigint);
            const totalSupplyBN = toBN(res.shift() as bigint);
            for (const rewardToken of rewardTokens) {
                const _rewardData = res.shift() as { period_finish: bigint, rate: bigint };
                const periodFinish = Number(curve.formatUnits(_rewardData.period_finish, 0)) * 1000;
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
        } else if (this.sRewardContract && "rewardRate()" in curve.contracts[this.sRewardContract].contract && "periodFinish()" && rewardTokens.length === 1) {
            const rewardToken = rewardTokens[0];
            const sRewardContract = curve.contracts[this.sRewardContract].multicallContract;
            const [_inflationRate, _periodFinish, _balance, _totalSupply] = await curve.multicallProvider.all([
                sRewardContract.rewardRate(),
                sRewardContract.periodFinish(),
                gaugeContract.balanceOf(address),
                gaugeContract.totalSupply(),
            ]) as bigint[];

            const periodFinish = Number(_periodFinish) * 1000;
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
        if (this.gauge === curve.constants.ZERO_ADDRESS) {
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
                    amount: curve.formatUnits(_amount, rewardToken.decimals),
                });
            }
        } else if ('claimable_reward(address)' in gaugeContract && rewardTokens.length > 0) { // Synthetix Gauge
            const rewardToken = rewardTokens[0];
            const _totalAmount = await gaugeContract.claimable_reward(address, curve.constantOptions);
            const _claimedAmount = await gaugeContract.claimed_rewards_for(address, curve.constantOptions);
            rewards.push({
                token: rewardToken.token,
                symbol: rewardToken.symbol,
                amount: curve.formatUnits(_totalAmount.sub(_claimedAmount), rewardToken.decimals),
            })
        }

        return rewards
    }

    public async claimRewardsEstimateGas(): Promise<number | number[]> {
        if (this.gauge === curve.constants.ZERO_ADDRESS) {
            throw Error(`claimRewards method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        const gaugeContract = curve.contracts[this.gauge].contract;
        if (!("claim_rewards()" in gaugeContract)) throw Error (`${this.name} pool doesn't have such method`);

        return smartNumber(await gaugeContract.claim_rewards.estimateGas(curve.constantOptions));
    }

    public async claimRewards(): Promise<string> {
        if (this.gauge === curve.constants.ZERO_ADDRESS) {
            throw Error(`claimRewards method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        const gaugeContract = curve.contracts[this.gauge].contract;
        if (!("claim_rewards()" in gaugeContract)) throw Error (`${this.name} pool doesn't have such method`);

        await curve.updateFeeData();

        const gasLimit = mulBy1_3(DIGas(await gaugeContract.claim_rewards.estimateGas(curve.constantOptions)));
        return (await gaugeContract.claim_rewards({ ...curve.options, gasLimit })).hash;
    }

    // ---------------- DEPOSIT & STAKE ----------------

    public async depositAndStakeExpected(amounts: (number | string)[]): Promise<string> {
        if (this.gauge === curve.constants.ZERO_ADDRESS) {
            throw Error(`depositAndStakeExpected method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }

        return await this.depositExpected(amounts);
    }

    public async depositAndStakeBonus(amounts: (number | string)[]): Promise<string> {
        if (this.gauge === curve.constants.ZERO_ADDRESS) {
            throw Error(`depositAndStakeBonus method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }

        return await this.depositBonus(amounts);
    }

    public async depositAndStakeIsApproved(amounts: (number | string)[]): Promise<boolean> {
        if (this.gauge === curve.constants.ZERO_ADDRESS) {
            throw Error(`depositAndStakeIsApproved method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        const coinsAllowance: boolean = await hasAllowance(this.underlyingCoinAddresses, amounts, curve.signerAddress, curve.constants.ALIASES.deposit_and_stake);

        const gaugeContract = curve.contracts[this.gauge].contract;
        if ('approved_to_deposit' in gaugeContract) {
            const gaugeAllowance: boolean = await gaugeContract.approved_to_deposit(curve.constants.ALIASES.deposit_and_stake, curve.signerAddress, curve.constantOptions);
            return coinsAllowance && gaugeAllowance
        }

        return coinsAllowance;
    }

    private async depositAndStakeApproveEstimateGas(amounts: (number | string)[]): Promise<number | number[]> {
        if (this.gauge === curve.constants.ZERO_ADDRESS) {
            throw Error(`depositAndStakeApprove method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        const approveCoinsGas: number | number[] = await ensureAllowanceEstimateGas(this.underlyingCoinAddresses, amounts, curve.constants.ALIASES.deposit_and_stake);

        const gaugeContract = curve.contracts[this.gauge].contract;
        if ('approved_to_deposit' in gaugeContract) {
            const gaugeAllowance: boolean = await gaugeContract.approved_to_deposit(curve.constants.ALIASES.deposit_and_stake, curve.signerAddress, curve.constantOptions);
            if (!gaugeAllowance) {
                const approveGaugeGas = smartNumber(await gaugeContract.set_approve_deposit.estimateGas(curve.constants.ALIASES.deposit_and_stake, true, curve.constantOptions));
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
        if (this.gauge === curve.constants.ZERO_ADDRESS) {
            throw Error(`depositAndStakeApprove method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        const approveCoinsTx: string[] = await ensureAllowance(this.underlyingCoinAddresses, amounts, curve.constants.ALIASES.deposit_and_stake);

        const gaugeContract = curve.contracts[this.gauge].contract;
        if ('approved_to_deposit' in gaugeContract) {
            const gaugeAllowance: boolean = await gaugeContract.approved_to_deposit(curve.constants.ALIASES.deposit_and_stake, curve.signerAddress, curve.constantOptions);
            if (!gaugeAllowance) {
                const gasLimit = mulBy1_3(await gaugeContract.set_approve_deposit.estimateGas(curve.constants.ALIASES.deposit_and_stake, true, curve.constantOptions));
                const approveGaugeTx: string = (await gaugeContract.set_approve_deposit(curve.constants.ALIASES.deposit_and_stake, true, { ...curve.options, gasLimit })).hash;
                return [...approveCoinsTx, approveGaugeTx];
            }
        }

        return approveCoinsTx;
    }

    private async depositAndStakeEstimateGas(amounts: (number | string)[]): Promise<number> {
        if (this.gauge === curve.constants.ZERO_ADDRESS) {
            throw Error(`depositAndStake method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }

        return await this._depositAndStake(amounts, 1, true, true) as number
    }

    public async depositAndStake(amounts: (number | string)[], slippage = 0.1): Promise<string> {
        if (this.gauge === curve.constants.ZERO_ADDRESS) {
            throw Error(`depositAndStake method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }

        return await this._depositAndStake(amounts, slippage, true, false) as string
    }

    // ---------------- DEPOSIT & STAKE WRAPPED ----------------

    public async depositAndStakeWrappedExpected(amounts: (number | string)[]): Promise<string> {
        if (this.gauge === curve.constants.ZERO_ADDRESS) {
            throw Error(`depositAndStakeWrappedExpected method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        if (this.isPlain || this.isFake) throw Error(`depositAndStakeWrappedExpected method doesn't exist for pool ${this.name} (id: ${this.name})`);

        return await this.depositWrappedExpected(amounts);
    }

    public async depositAndStakeWrappedBonus(amounts: (number | string)[]): Promise<string> {
        if (this.gauge === curve.constants.ZERO_ADDRESS) {
            throw Error(`depositAndStakeWrappedBonus method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        if (this.isPlain || this.isFake) throw Error(`depositAndStakeWrappedBonus method doesn't exist for pool ${this.name} (id: ${this.name})`);

        return await this.depositWrappedBonus(amounts);
    }

    public async depositAndStakeWrappedIsApproved(amounts: (number | string)[]): Promise<boolean> {
        if (this.gauge === curve.constants.ZERO_ADDRESS) {
            throw Error(`depositAndStakeWrappedIsApproved method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        if (this.isPlain || this.isFake) throw Error(`depositAndStakeWrappedIsApproved method doesn't exist for pool ${this.name} (id: ${this.name})`);

        const coinsAllowance: boolean = await hasAllowance(this.wrappedCoinAddresses, amounts, curve.signerAddress, curve.constants.ALIASES.deposit_and_stake);

        const gaugeContract = curve.contracts[this.gauge].contract;
        if ('approved_to_deposit' in gaugeContract) {
            const gaugeAllowance: boolean = await gaugeContract.approved_to_deposit(curve.constants.ALIASES.deposit_and_stake, curve.signerAddress, curve.constantOptions);
            return coinsAllowance && gaugeAllowance;
        }

        return coinsAllowance;
    }

    private async depositAndStakeWrappedApproveEstimateGas(amounts: (number | string)[]): Promise<number | number[]> {
        if (this.gauge === curve.constants.ZERO_ADDRESS) {
            throw Error(`depositAndStakeWrappedApprove method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        if (this.isPlain || this.isFake) throw Error(`depositAndStakeWrappedApprove method doesn't exist for pool ${this.name} (id: ${this.name})`);

        const approveCoinsGas: number | number[] = await ensureAllowanceEstimateGas(this.wrappedCoinAddresses, amounts, curve.constants.ALIASES.deposit_and_stake);

        const gaugeContract = curve.contracts[this.gauge].contract;
        if ('approved_to_deposit' in gaugeContract) {
            const gaugeAllowance: boolean = await gaugeContract.approved_to_deposit(curve.constants.ALIASES.deposit_and_stake, curve.signerAddress, curve.constantOptions);
            if (!gaugeAllowance) {
                const approveGaugeGas = Number(await gaugeContract.set_approve_deposit.estimateGas(curve.constants.ALIASES.deposit_and_stake, true, curve.constantOptions));
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
        if (this.gauge === curve.constants.ZERO_ADDRESS) {
            throw Error(`depositAndStakeWrappedApprove method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        if (this.isPlain || this.isFake) throw Error(`depositAndStakeWrappedApprove method doesn't exist for pool ${this.name} (id: ${this.name})`);

        const approveCoinsTx: string[] = await ensureAllowance(this.wrappedCoinAddresses, amounts, curve.constants.ALIASES.deposit_and_stake);

        const gaugeContract = curve.contracts[this.gauge].contract;
        if ('approved_to_deposit' in gaugeContract) {
            const gaugeAllowance: boolean = await gaugeContract.approved_to_deposit(curve.constants.ALIASES.deposit_and_stake, curve.signerAddress, curve.constantOptions);
            if (!gaugeAllowance) {
                const gasLimit = mulBy1_3(await gaugeContract.set_approve_deposit.estimateGas(curve.constants.ALIASES.deposit_and_stake, true, curve.constantOptions));
                const approveGaugeTx: string = (await gaugeContract.set_approve_deposit(curve.constants.ALIASES.deposit_and_stake, true, { ...curve.options, gasLimit })).hash;
                return [...approveCoinsTx, approveGaugeTx];
            }
        }

        return approveCoinsTx;
    }

    private async depositAndStakeWrappedEstimateGas(amounts: (number | string)[]): Promise<number> {
        if (this.gauge === curve.constants.ZERO_ADDRESS) {
            throw Error(`depositAndStakeWrapped method doesn't exist for pool ${this.name} (id: ${this.name}). There is no gauge`);
        }
        if (this.isPlain || this.isFake) throw Error(`depositAndStakeWrapped method doesn't exist for pool ${this.name} (id: ${this.name})`);

        return await this._depositAndStake(amounts, 1, false, true) as number
    }

    public async depositAndStakeWrapped(amounts: (number | string)[], slippage = 0.1): Promise<string> {
        if (this.gauge === curve.constants.ZERO_ADDRESS) {
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

        const _amounts: bigint[] = amounts.map((amount, i) => parseUnits(amount, decimals[i]));

        const contract = curve.contracts[curve.constants.ALIASES.deposit_and_stake].contract;
        const useUnderlying = isUnderlying && (this.isLending || (this.isCrypto && !this.isPlain)) && (!this.zap || this.id == 'avaxcrypto');
        const _expectedLpTokenAmount = isUnderlying ?
            curve.parseUnits(await this.depositAndStakeExpected(amounts)) :
            curve.parseUnits(await this.depositAndStakeWrappedExpected(amounts));
        const minAmountBN = toBN(_expectedLpTokenAmount).times(100 - slippage).div(100);
        const _minMintAmount = fromBN(minAmountBN);
        const ethIndex = getEthIndex(coinAddresses);
        const value = _amounts[ethIndex] || curve.parseUnits("0");

        const _gas = (await contract.deposit_and_stake.estimateGas(
            depositAddress,
            this.lpToken,
            this.gauge,
            coins.length,
            coinAddresses,
            _amounts,
            _minMintAmount,
            useUnderlying,
            (this.isStableNg && this.isPlain) || (isUnderlying && this.isMeta && (new PoolTemplate(this.basePool)).isStableNg),
            this.isMetaFactory && isUnderlying ? this.address : curve.constants.ZERO_ADDRESS,
            { ...curve.constantOptions, value }
        ))

        if (estimateGas) return smartNumber(_gas)

        await curve.updateFeeData();
        const gasLimit = DIGas(_gas) * curve.parseUnits("200", 0) / curve.parseUnits("100", 0);
        return (await contract.deposit_and_stake(
            depositAddress,
            this.lpToken,
            this.gauge,
            coins.length,
            coinAddresses,
            _amounts,
            _minMintAmount,
            useUnderlying,
            (this.isStableNg && this.isPlain) || (isUnderlying && this.isMeta && (new PoolTemplate(this.basePool)).isStableNg),
            this.isMetaFactory && isUnderlying ? this.address : curve.constants.ZERO_ADDRESS,
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

    private async withdrawApproveEstimateGas(lpTokenAmount: number | string): Promise<number | number[]> {
        if (!this.zap) return 0;
        return await ensureAllowanceEstimateGas([this.lpToken], [lpTokenAmount], this.zap as string);
    }

    public async withdrawApprove(lpTokenAmount: number | string): Promise<string[]> {
        if (!this.zap) return [];
        return await ensureAllowance([this.lpToken], [lpTokenAmount], this.zap as string);
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
        let prices: number[] = [];

        //for crvusd and stable-ng implementations
        const isUseStoredRates = isMethodExist(curve.contracts[this.address].contract, 'stored_rates') && this.isPlain;

        if(this.isCrypto || this.id === 'wsteth') {
            prices = await this._underlyingPrices();
        } else if (isUseStoredRates) {
            const result = await this._stored_rates();
            result.forEach((item, index) => {
                prices.push(Number(item)/(10 ** (36 - this.underlyingDecimals[index])))
            })
        } else {
            prices = this.underlyingCoins.map(() => 1);
        }

        const value = amounts.map(checkNumber).map(Number).reduce((s, a, i) => s + (a * prices[i]), 0);
        const lpTokenAmount = await this.withdrawImbalanceExpected(amounts);

        const balancedAmounts = await this.withdrawExpected(lpTokenAmount);
        const balancedValue = balancedAmounts.map(Number).reduce((s, a, i) => s + (a * prices[i]), 0);

        return String((value - balancedValue) / balancedValue * 100);
    }

    public async withdrawImbalanceIsApproved(amounts: (number | string)[]): Promise<boolean> {
        if (this.isCrypto) throw Error(`withdrawImbalanceIsApproved method doesn't exist for pool ${this.name} (id: ${this.name})`);

        if (this.zap) {
            const _amounts: bigint[] = amounts.map((amount, i) => parseUnits(amount, this.underlyingDecimals[i]));
            const _maxBurnAmount = (await this._calcLpTokenAmount(_amounts, false)) * curve.parseUnits("101", 0) / curve.parseUnits("100", 0);
            return await hasAllowance([this.lpToken], [curve.formatUnits(_maxBurnAmount, 18)], curve.signerAddress, this.zap as string);
        }

        return true;
    }

    private async withdrawImbalanceApproveEstimateGas(amounts: (number | string)[]): Promise<number | number[]> {
        if (this.isCrypto) throw Error(`withdrawImbalanceApprove method doesn't exist for pool ${this.name} (id: ${this.name})`);

        if (this.zap) {
            const _amounts: bigint[] = amounts.map((amount, i) => parseUnits(amount, this.underlyingDecimals[i]));
            const _maxBurnAmount = (await this._calcLpTokenAmount(_amounts, false)) * curve.parseUnits("101", 0) / curve.parseUnits("100", 0);
            return await ensureAllowanceEstimateGas([this.lpToken], [curve.formatUnits(_maxBurnAmount, 18)], this.zap as string);
        }

        return 0;
    }

    public async withdrawImbalanceApprove(amounts: (number | string)[]): Promise<string[]> {
        if (this.isCrypto) throw Error(`withdrawImbalanceApprove method doesn't exist for pool ${this.name} (id: ${this.name})`);

        if (this.zap) {
            const _amounts: bigint[] = amounts.map((amount, i) => parseUnits(amount, this.underlyingDecimals[i]));
            const _maxBurnAmount = (await this._calcLpTokenAmount(_amounts, false)) * curve.parseUnits("101", 0) / curve.parseUnits("100", 0);
            return await ensureAllowance([this.lpToken], [curve.formatUnits(_maxBurnAmount, 18)], this.zap as string);
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
    private async _withdrawOneCoinExpected(_lpTokenAmount: bigint, i: number): Promise<bigint> {
        throw Error(`withdrawOneCoinExpected method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    public async withdrawOneCoinExpected(lpTokenAmount: number | string, coin: string | number): Promise<string> {
        const i = this._getCoinIdx(coin);
        const _lpTokenAmount = parseUnits(lpTokenAmount);
        const _expected = await this._withdrawOneCoinExpected(_lpTokenAmount, i);

        return curve.formatUnits(_expected, this.underlyingDecimals[i]);
    }

    public async withdrawOneCoinBonus(lpTokenAmount: number | string, coin: string | number): Promise<string> {
        let prices: number[] = [];

        //for crvusd and stable-ng implementations
        const isUseStoredRates = isMethodExist(curve.contracts[this.address].contract, 'stored_rates') && this.isPlain;

        if(this.isCrypto || this.id === 'wsteth') {
            prices = await this._underlyingPrices();
        } else if (isUseStoredRates) {
            const result = await this._stored_rates();
            result.forEach((item, index) => {
                prices.push(Number(item)/(10 ** (36 - this.underlyingDecimals[index])))
            })
        } else {
            prices = this.underlyingCoins.map(() => 1);
        }
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

    private async withdrawOneCoinApproveEstimateGas(lpTokenAmount: number | string): Promise<number | number[]> {
        if (!this.zap) return 0
        return await ensureAllowanceEstimateGas([this.lpToken], [lpTokenAmount], this.zap as string);
    }

    public async withdrawOneCoinApprove(lpTokenAmount: number | string): Promise<string[]> {
        if (!this.zap) return []
        return await ensureAllowance([this.lpToken], [lpTokenAmount], this.zap as string);
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
    private async _withdrawOneCoinWrappedExpected(_lpTokenAmount: bigint, i: number): Promise<bigint> {
        throw Error(`withdrawOneCoinWrappedExpected method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    public async withdrawOneCoinWrappedExpected(lpTokenAmount: number | string, coin: string | number): Promise<string> {
        const i = this._getCoinIdx(coin, false);
        const _lpTokenAmount = parseUnits(lpTokenAmount);

        const _expected = await this._withdrawOneCoinWrappedExpected(_lpTokenAmount, i);

        return curve.formatUnits(_expected, this.wrappedDecimals[i]);
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
        if (this.gauge === curve.constants.ZERO_ADDRESS) {
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
        if (this.gauge === curve.constants.ZERO_ADDRESS) {
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
        const withGauge = this.gauge !== curve.constants.ZERO_ADDRESS;
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
            ]) as bigint[]).map((_supply) => curve.formatUnits(_supply));
        } else {
            totalLp = curve.formatUnits(await curve.contracts[this.lpToken].contract.totalSupply(curve.constantOptions));
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

    private async _swapExpected(i: number, j: number, _amount: bigint): Promise<bigint> {
        const contractAddress = this.isCrypto && this.isMeta ? this.zap as string : this.address;
        const contract = curve.contracts[contractAddress].contract;
        if ('get_dy_underlying' in contract) {
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

        return curve.formatUnits(_expected, this.underlyingDecimals[j])
    }

    private async _swapRequired(i: number, j: number, _amount: bigint, isUnderlying: boolean): Promise<any> {
        if(this.isCrypto) {
            const contract = curve.contracts[curve.constants.ALIASES.crypto_calc].contract;
            if(this.isMeta && isUnderlying) {
                const basePool = new PoolTemplate(this.basePool);
                if(this.wrappedCoins.length === 3) {
                    return await contract.get_dx_tricrypto_meta_underlying(this.address, i, j, _amount, this.wrappedCoins.length, basePool.address, basePool.lpToken, curve.constantOptions)
                }
                if(basePool.isFake) {
                    const secondPool = new PoolTemplate(basePool.basePool)
                    return await contract.get_dx_double_meta_underlying(this.address, i, j, _amount, basePool.address, basePool.zap, secondPool.address, secondPool.lpToken, curve.constantOptions)
                }
                return await contract.get_dx_meta_underlying(this.address, i, j, _amount, this.underlyingCoins.length, basePool.address, basePool.lpToken, curve.constantOptions)
            } else {
                return await contract.get_dx(this.address, i, j, _amount, this.wrappedCoins.length, curve.constantOptions)
            }
        } else {
            if (this.id.startsWith("factory-stable-ng")) {
                const contract = curve.contracts[this.address].contract;
                if (this.isMeta) {
                    if (isUnderlying) {
                        return await contract.get_dx_underlying(i, j, _amount, curve.constantOptions);
                    } else {
                        return await contract.get_dx(i, j, _amount, curve.constantOptions);
                    }
                } else {
                    return await contract.get_dx(i, j, _amount)
                }
            }

            const contract = curve.contracts[curve.constants.ALIASES.stable_calc].contract;
            if(this.isMeta) {
                const basePool = new PoolTemplate(this.basePool);
                if(isUnderlying) {
                    return await contract.get_dx_meta_underlying(this.address, i, j, _amount, this.underlyingCoins.length, basePool.address, basePool.lpToken, curve.constantOptions)
                } else {
                    return await contract. get_dx_meta(this.address, i, j, _amount, this.wrappedCoins.length, basePool.address, curve.constantOptions)
                }
            } else {
                if(isUnderlying && this.isLending) {
                    return await contract.get_dx_underlying(this.address, i, j, _amount, this.underlyingCoins.length, curve.constantOptions)
                } else {
                    return await contract.get_dx(this.address, i, j, _amount, this.wrappedCoins.length, curve.constantOptions)
                }
            }
        }
    }

    public async swapRequired(inputCoin: string | number, outputCoin: string | number, amount: number | string): Promise<string> {
        const i = this._getCoinIdx(inputCoin);
        const j = this._getCoinIdx(outputCoin);
        const _amount = parseUnits(amount, this.underlyingDecimals[j]);
        const _required = await this._swapRequired(i, j, _amount, true);

        return curve.formatUnits(_required, this.underlyingDecimals[i])
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

    private _swapContractAddress(): string {
        return (this.isCrypto && this.isMeta) || (this.isMetaFactory && (new PoolTemplate(this.basePool).isLending)) ? this.zap as string : this.address;
    }

    public async swapIsApproved(inputCoin: string | number, amount: number | string): Promise<boolean> {
        const contractAddress = this._swapContractAddress();
        const i = this._getCoinIdx(inputCoin);
        return await hasAllowance([this.underlyingCoinAddresses[i]], [amount], curve.signerAddress, contractAddress);
    }

    private async swapApproveEstimateGas (inputCoin: string | number, amount: number | string): Promise<number | number[]> {
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

    private async _swapWrappedExpected(i: number, j: number, _amount: bigint): Promise<bigint> {
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

    // ---------------- ... ----------------

    public gaugeOptimalDeposits = async (...accounts: string[]): Promise<IDict<string>> => {
        if (this.gauge === curve.constants.ZERO_ADDRESS) throw Error(`${this.name} doesn't have gauge`);
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

        const _response: bigint[] = await curve.multicallProvider.all(contractCalls);
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

    // Used by mixins
    private _getRates = async(): Promise<bigint[]> => {
        const _rates: bigint[] = [];
        for (let i = 0; i < this.wrappedCoinAddresses.length; i++) {
            const addr = this.wrappedCoinAddresses[i];
            if (this.useLending[i]) {
                if (['compound', 'usdt', 'ib'].includes(this.id)) {
                    _rates.push(await curve.contracts[addr].contract.exchangeRateStored());
                } else if (['y', 'busd', 'pax'].includes(this.id)) {
                    _rates.push(await curve.contracts[addr].contract.getPricePerFullShare());
                } else {
                    _rates.push(curve.parseUnits(String(10**18), 0)); // Aave ratio 1:1
                }
            } else {
                _rates.push(curve.parseUnits(String(10**18), 0));
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

    private _stored_rates = async (): Promise<number[]> => {
        return await curve.contracts[this.address].contract.stored_rates();
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

    private async getGaugeStatus(): Promise<any> {
        const gaugeData = await _getAllGaugesFormatted();

        return gaugeData[this.gauge] ? gaugeData[this.gauge].gaugeStatus : null;
    }

    private async getIsGaugeKilled(): Promise<boolean> {
        const gaugeData = await _getAllGaugesFormatted();

        return gaugeData[this.gauge] ? gaugeData[this.gauge].is_killed : false;
    }
}