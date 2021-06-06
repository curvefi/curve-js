import { ethers } from "ethers";
import BigNumber from 'bignumber.js'
import {
    getPoolData,
    _getDecimals,
    _getBalances,
    _getBalancesBN,
    ensureAllowance,
    getPoolNameBySwapAddress,
    BN,
    toBN,
    fromBN,
    toStringFromBN,
    getCrvRate,
    isEth,
    getEthIndex,
    MAX_ALLOWANCE,
} from './utils';
import { CoinInterface, DictInterface, PoolDataInterface } from './interfaces';
import registryExchangeABI from './constants/abis/json/registry_exchange.json';
import registryABI from './constants/abis/json/registry.json';
import { ALIASES, curve } from "./curve";


export class Pool {
    name: string;
    swap: string | null;
    zap: string | null;
    lpToken: string | null;
    gauge: string | null;

    coins: CoinInterface[];

    constructor(name: string) {
        if (name === "susdv2") {
            this.name = "susd";
        } else if (name === "ankreth") {
            this.name = "aeth";
        } else if (name === "iearn") {
            this.name = "y";
        } else {
            this.name = name;
        }

        this.swap = null;
        this.zap = null;
        this.lpToken = null;
        this.gauge = null;
        this.coins = [];
    }

    async init(): Promise<void> {
        const poolData: PoolDataInterface = await getPoolData(this.name);

        this.swap = (poolData['swap_address'] as string).toLowerCase();
        this.zap = poolData['zap_address']?.toLowerCase() || null;
        this.lpToken = (poolData['lp_token_address'] as string).toLowerCase();
        this.gauge = (poolData['gauge_addresses'][0] as string).toLowerCase();
        this.coins = poolData['coins'];

        this.coins.forEach((coin: CoinInterface) => {
            if (coin.underlying_address) {
                coin.underlying_address = coin.underlying_address.toLowerCase();
            }

            if (coin.wrapped_address) {
                coin.wrapped_address = coin.wrapped_address.toLowerCase();
            }
        });
    }

    private _calcLpTokenAmount = async (amounts: ethers.BigNumber[], isDeposit = true): Promise<ethers.BigNumber> => {
        return await curve.contracts[this.swap as string].contract.calc_token_amount(amounts, isDeposit);
    }

    // TODO implement
    private _calcLpTokenAmountZap = async (amounts: ethers.BigNumber[], isDeposit = true): Promise<ethers.BigNumber> => {
        return isDeposit ? ethers.utils.parseUnits('0') : MAX_ALLOWANCE.div(10);
    }

    private _addLiquidity = async (amounts: ethers.BigNumber[]): Promise<string> => {
        const coinAddresses: string[] = this.coins.map((coin) => (coin.underlying_address || coin.wrapped_address) as string);
        await ensureAllowance(coinAddresses, amounts, this.swap as string);

        let minMintAmount = await this._calcLpTokenAmount(amounts);
        minMintAmount = minMintAmount.div(100).mul(99);

        const ethIndex = getEthIndex(coinAddresses);
        if (ethIndex !== -1) {
            // TODO figure out, how to set gasPrice
            return (await curve.contracts[this.swap as string].contract.add_liquidity(amounts, minMintAmount, { ...curve.options, value: amounts[ethIndex] })).hash;
        }

        return (await curve.contracts[this.swap as string].contract.add_liquidity(amounts, minMintAmount, curve.options)).hash;
    }

    private _addLiquidityZap = async (amounts: ethers.BigNumber[]): Promise<string> => {
        const coinAddresses: string[] = this.coins.map((coin) => (coin.underlying_address) as string);
        await ensureAllowance(coinAddresses, amounts, this.zap as string);

        let minMintAmount = await this._calcLpTokenAmountZap(amounts);
        minMintAmount = minMintAmount.div(100).mul(99);

        const ethIndex = getEthIndex(coinAddresses);
        if (ethIndex !== -1) {
            // TODO figure out, how to set gasPrice
            return (await curve.contracts[this.zap as string].contract.add_liquidity(amounts, minMintAmount, { ...curve.options, value: amounts[ethIndex] })).hash;
        }

        return (await curve.contracts[this.zap as string].contract.add_liquidity(amounts, minMintAmount, curve.options)).hash;
    }

    public addLiquidity = async (amounts: string[]): Promise<string> => {
        if (amounts.length !== this.coins.length) {
            throw Error(`${this.name} pool has ${this.coins.length} coins (amounts provided for ${amounts.length})`);
        }
        const _amounts: ethers.BigNumber[] = amounts.map((amount: string, i: number) =>
            ethers.utils.parseUnits(amount, this.coins[i].decimals || this.coins[i].wrapped_decimals));

        if (['compound', 'usdt', 'y', 'busd', 'pax'].includes(this.name)) {
            return await this._addLiquidityZap(_amounts);
        }

        return await this._addLiquidity(_amounts);
    }

    public gaugeDeposit = async (lpTokenAmount: string): Promise<string> => {
        const _lpTokenAmount = ethers.utils.parseUnits(lpTokenAmount);
        await ensureAllowance([this.lpToken as string], [_lpTokenAmount], this.gauge as string)

        return (await curve.contracts[this.gauge as string].contract.deposit(_lpTokenAmount, curve.options)).hash;
    }

    public gaugeWithdraw = async (lpTokenAmount: string): Promise<string> => {
        const _lpTokenAmount = ethers.utils.parseUnits(lpTokenAmount);
        return (await curve.contracts[this.gauge as string].contract.withdraw(_lpTokenAmount, curve.options)).hash;
    }

    private _calcUnderlyingCoinAmounts = async (amount: ethers.BigNumber): Promise<ethers.BigNumber[]> => {
        const coinAddresses: string[] = this.coins.map((c: CoinInterface) => (c.underlying_address || c.wrapped_address) as string);
        const underlyingCoinBalances: DictInterface<BigNumber[]> = await _getBalancesBN([this.swap as string], coinAddresses);
        const totalSupply: BigNumber = toBN(await curve.contracts[this.lpToken as string].contract.totalSupply());

        const minAmounts: BigNumber[] = [];
        for (const underlyingCoinBalance of underlyingCoinBalances[this.swap as string]) {
            minAmounts.push(underlyingCoinBalance.times(toBN(amount)).div(totalSupply).times(0.99));
        }

        return minAmounts.map((amount: BigNumber, i: number) =>
            fromBN(amount, this.coins[i].decimals || this.coins[i].wrapped_decimals as number));
    }

    // TODO implement
    private _calcUnderlyingCoinAmountsZap = async (amount: ethers.BigNumber): Promise<ethers.BigNumber[]> => {
        return  this.coins.map(() => ethers.BigNumber.from('0'));
    }

    public calcUnderlyingCoinAmounts = async (amount: string): Promise<string[]> => {
        const underlyingCoinAmounts: ethers.BigNumber[] = await this._calcUnderlyingCoinAmounts(ethers.utils.parseUnits(amount.toString()));
        return underlyingCoinAmounts.map((amount: ethers.BigNumber, i: number) =>
            ethers.utils.formatUnits(amount, this.coins[i].decimals || this.coins[i].wrapped_decimals as number));
    }

    private _removeLiquidity = async (_lpTokenAmount: ethers.BigNumber): Promise<string> => {
        const _minAmounts = await this._calcUnderlyingCoinAmounts(_lpTokenAmount);
        return (await curve.contracts[this.swap as string].contract.remove_liquidity(_lpTokenAmount, _minAmounts, curve.options)).hash;
    }

    private _removeLiquidityZap = async (_lpTokenAmount: ethers.BigNumber): Promise<string> => {
        const _minAmounts = await this._calcUnderlyingCoinAmountsZap(_lpTokenAmount);
        await ensureAllowance([this.lpToken as string], [_lpTokenAmount], this.zap as string);

        return (await curve.contracts[this.zap as string].contract.remove_liquidity(_lpTokenAmount, _minAmounts, curve.options)).hash;
    }

    public removeLiquidity = async (lpTokenAmount: string): Promise<string> => {
        const _lpTokenAmount = ethers.utils.parseUnits(lpTokenAmount);

        if (['compound', 'usdt', 'y', 'busd', 'pax'].includes(this.name)) {
            return await this._removeLiquidityZap(_lpTokenAmount);
        }

        return await this._removeLiquidity(_lpTokenAmount);
    }

    private _removeLiquidityImbalance = async (_amounts: ethers.BigNumber[]): Promise<string> => {
        let _maxBurnAmount = await this._calcLpTokenAmount(_amounts, false);
        _maxBurnAmount = _maxBurnAmount.div(100).mul(101);
        const  contract = curve.contracts[this.swap as string].contract;
        const gasLimit = await contract.estimateGas.remove_liquidity_imbalance(_amounts, _maxBurnAmount, curve.options);

        return (await contract.remove_liquidity_imbalance(_amounts, _maxBurnAmount, { ...curve.options, gasLimit })).hash;
    }

    private _removeLiquidityImbalanceZap = async (_amounts: ethers.BigNumber[]): Promise<string> => {
        let _maxBurnAmount = await this._calcLpTokenAmountZap(_amounts, false);
        _maxBurnAmount = _maxBurnAmount.div(100).mul(101);
        await ensureAllowance([this.lpToken as string], [_maxBurnAmount], this.zap as string);
        const  contract = curve.contracts[this.zap as string].contract;
        const gasLimit = await contract.estimateGas.remove_liquidity_imbalance(_amounts, _maxBurnAmount, curve.options);

        return (await contract.remove_liquidity_imbalance(_amounts, _maxBurnAmount, { ...curve.options, gasLimit }));
    }

    public removeLiquidityImbalance = async (amounts: string[]): Promise<string> => {
        const _amounts: ethers.BigNumber[] = amounts.map((amount: string, i: number) =>
            ethers.utils.parseUnits(amount, this.coins[i].decimals || this.coins[i].wrapped_decimals));

        if (['compound', 'usdt', 'y', 'busd', 'pax'].includes(this.name)) {
            return await this._removeLiquidityImbalanceZap(_amounts);
        }

        return await this._removeLiquidityImbalance(_amounts)
    }

    private _calcWithdrawOneCoin = async (_lpTokenAmount: ethers.BigNumber, i: number): Promise<ethers.BigNumber> => {
        return await curve.contracts[this.swap as string].contract.calc_withdraw_one_coin(_lpTokenAmount, i, curve.options);
    }

    private _calcWithdrawOneCoinZap = async (_lpTokenAmount: ethers.BigNumber, i: number): Promise<ethers.BigNumber> => {
        return await curve.contracts[this.zap as string].contract.calc_withdraw_one_coin(_lpTokenAmount, i, curve.options);
    }

    private _removeLiquidityOneCoin = async (_lpTokenAmount: ethers.BigNumber, i: number): Promise<string> => {
        const _minAmount = (await this._calcWithdrawOneCoin(_lpTokenAmount, i)).div(100).mul(99);
        const  contract = curve.contracts[this.swap as string].contract;
        const gasLimit = await contract.estimateGas.remove_liquidity_one_coin(_lpTokenAmount, i, _minAmount, curve.options);

        return (await contract.remove_liquidity_one_coin(_lpTokenAmount, i, _minAmount, { ...curve.options, gasLimit })).hash
    }

    public _removeLiquidityOneCoinZap = async (_lpTokenAmount: ethers.BigNumber, i: number): Promise<string> => {
        const _minAmount = (await this._calcWithdrawOneCoinZap(_lpTokenAmount, i)).div(100).mul(99);
        await ensureAllowance([this.lpToken as string], [_lpTokenAmount], this.zap as string);
        const  contract = curve.contracts[this.zap as string].contract;
        const gasLimit = await contract.estimateGas.remove_liquidity_one_coin(_lpTokenAmount, i, _minAmount, curve.options);

        return (await contract.remove_liquidity_one_coin(_lpTokenAmount, i, _minAmount, { ...curve.options, gasLimit })).hash
    }

    public removeLiquidityOneCoin = async (lpTokenAmount: string, i: number): Promise<string> => {
        const _lpTokenAmount = ethers.utils.parseUnits(lpTokenAmount);

        if (['compound', 'usdt', 'y', 'busd', 'pax'].includes(this.name) || this.name === 'susd') {
            return await this._removeLiquidityOneCoinZap(_lpTokenAmount, i);
        }

        return await this._removeLiquidityOneCoin(_lpTokenAmount, i)
    }

    public balances = async (...addresses: string[] | string[][]): Promise<DictInterface<string[]>> =>  {
        if (addresses.length == 1 && Array.isArray(addresses[0])) addresses = addresses[0];
        addresses = addresses as string[];

        const rawBalances: DictInterface<ethers.BigNumber[]> = await _getBalances(addresses, [this.lpToken as string, this.gauge as string]);
        const balances: DictInterface<string[]> = {};
        for (const address of addresses) {
            balances[address] = rawBalances[address].map((b: ethers.BigNumber) => ethers.utils.formatUnits(b));
        }

        return balances
    }

    public lpTokenBalances = async (...addresses: string[] | string[][]): Promise<DictInterface<string>> =>  {
        if (addresses.length == 1 && Array.isArray(addresses[0])) addresses = addresses[0];
        addresses = addresses as string[];

        const rawBalances: DictInterface<ethers.BigNumber[]> = await _getBalances(addresses, [this.lpToken as string]);
        const balances: DictInterface<string> = {};
        for (const address of addresses) {
            balances[address] = ethers.utils.formatUnits(rawBalances[address][0]);
        }

        return balances;
    }

    public gaugeBalances = async (...addresses: string[] | string[][]): Promise<DictInterface<string>> =>  {
        if (addresses.length == 1 && Array.isArray(addresses[0])) addresses = addresses[0];
        addresses = addresses as string[];

        const rawBalances: DictInterface<ethers.BigNumber[]> = await _getBalances(addresses, [this.gauge as string])
        const balances: DictInterface<string> = {};
        for (const address of addresses) {
            balances[address] = ethers.utils.formatUnits(rawBalances[address][0]);
        }

        return balances
    }

    public _getSwapOutput = async (i: number, j: number, _amount: ethers.BigNumber): Promise<ethers.BigNumber> => {
        const contract = curve.contracts[this.swap as string].contract;
        if (Object.prototype.hasOwnProperty.call(curve.contracts[this.swap as string].contract, 'get_dy_underlying')) {
            return await contract.get_dy_underlying(i, j, _amount, curve.options)
        } else {
            return await contract.get_dy(i, j, _amount, curve.options);
        }
    }

    public getSwapOutput = async (i: number, j: number, amount: string): Promise<string> => {
        const _amount = ethers.utils.parseUnits(amount, this.coins[i].decimals || this.coins[i].wrapped_decimals);
        const _expected = await this._getSwapOutput(i, j, _amount);

        return ethers.utils.formatUnits(_expected, this.coins[j].decimals || this.coins[j].wrapped_decimals)
    }

    public exchange = async (i: number, j: number, amount: string, maxSlippage = 0.01): Promise<string> => {
        const _amount = ethers.utils.parseUnits(amount, this.coins[i].decimals || this.coins[i].wrapped_decimals);
        const _expected: ethers.BigNumber = await this._getSwapOutput(i, j, _amount);
        const _minRecvAmount = _expected.mul((1 - maxSlippage) * 100).div(100);
        await ensureAllowance([(this.coins[i].underlying_address || this.coins[i].wrapped_address) as string], [_amount], this.swap as string);
        const contract = curve.contracts[this.swap as string].contract;

        if (Object.prototype.hasOwnProperty.call(curve.contracts[this.swap as string].contract, 'exchange_underlying')) {
            if (isEth((this.coins[i].underlying_address || this.coins[i].wrapped_address) as string)) {
                const gasLimit = await contract.estimateGas.exchange_underlying(i, j, _amount, _minRecvAmount, { ...curve.options, value: _amount });
                return (await contract.exchange_underlying(i, j, _amount, _minRecvAmount, { ...curve.options, value: _amount, gasLimit })).hash
            }
            const gasLimit = await contract.estimateGas.exchange_underlying(i, j, _amount, _minRecvAmount, curve.options);
            return (await contract.exchange_underlying(i, j, _amount, _minRecvAmount, { ...curve.options, gasLimit })).hash
        }

        if (isEth((this.coins[i].underlying_address || this.coins[i].wrapped_address) as string)) {
            const gasLimit = await contract.estimateGas.exchange(i, j, _amount, _minRecvAmount, { ...curve.options, value: _amount });
            return (await contract.exchange(i, j, _amount, _minRecvAmount, { ...curve.options, value: _amount, gasLimit })).hash
        }
        const gasLimit = await contract.estimateGas.exchange(i, j, _amount, _minRecvAmount, curve.options);
        return (await contract.exchange(i, j, _amount, _minRecvAmount, { ...curve.options, gasLimit })).hash
    }

    public gaugeMaxBoostedDeposit = async (...addresses: string[]): Promise<DictInterface<string>> => {
        if (addresses.length == 1 && Array.isArray(addresses[0])) addresses = addresses[0];

        const votingEscrowContract = curve.contracts[ALIASES.voting_escrow].multicallContract;
        const gaugeContract = curve.contracts[this.gauge as string].multicallContract;

        const contractCalls = [votingEscrowContract.totalSupply(), gaugeContract.totalSupply()];
        addresses.forEach((account: string) => {
            contractCalls.push(votingEscrowContract.balanceOf(account));
        });
        const response: BigNumber[] = (await curve.multicallProvider.all(contractCalls)).map((value: ethers.BigNumber) => toBN(value));

        const [veTotalSupply, gaugeTotalSupply] = response.splice(0, 2);

        const resultBN: DictInterface<BigNumber> = {};
        addresses.forEach((acct: string, i: number) => {
            resultBN[acct] = response[i].div(veTotalSupply).times(gaugeTotalSupply);
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
        const lpTokenContract = curve.contracts[this.lpToken as string].multicallContract;
        const gaugeContract = curve.contracts[this.gauge as string].multicallContract;
        const contractCalls = [votingEscrowContract.totalSupply(), gaugeContract.totalSupply()];
        accounts.forEach((account: string) => {
            contractCalls.push(
                votingEscrowContract.balanceOf(account),
                lpTokenContract.balanceOf(account),
                gaugeContract.balanceOf(account)
            )
        });
        const response: BigNumber[] = (await curve.multicallProvider.all(contractCalls)).map((value: ethers.BigNumber) => toBN(value));

        const [veTotalSupply, gaugeTotalSupply] = response.splice(0,2);

        const votingPower: DictInterface<BigNumber> = {};
        let totalBalance = BN(0);
        for (const acct of accounts) {
            votingPower[acct] = response[0];
            totalBalance = totalBalance.plus(response[1]).plus(response[2]);
            response.splice(0, 3);
        }

        const totalPower = Object.values(votingPower).reduce((sum, item) => sum.plus(item));
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
        const gaugeContract = curve.contracts[this.gauge as string].multicallContract;
        const [workingBalance, balance] = (await curve.multicallProvider.all([
            gaugeContract.working_balances(address),
            gaugeContract.balanceOf(address),
        ])).map((value: ethers.BigNumber) => Number(ethers.utils.formatUnits(value)));

        const boost = workingBalance / (0.4 * balance);

        return boost.toFixed(4).replace(/([0-9])0+$/, '$1')
    }

    public getApy = async (): Promise<string[]> => {
        const swapContract = curve.contracts[this.swap as string].multicallContract;
        const gaugeContract = curve.contracts[this.gauge as string].multicallContract;
        const gaugeControllerContract = curve.contracts[ALIASES.gauge_controller].multicallContract;

        const [inflation, weight, workingSupply, virtualPrice] = (await curve.multicallProvider.all([
            gaugeContract.inflation_rate(),
            gaugeControllerContract.gauge_relative_weight(this.gauge),
            gaugeContract.working_supply(),
            swapContract.get_virtual_price(),
        ])).map((value: ethers.BigNumber) => toBN(value));

        const rate = inflation.times(weight).times( 31536000).div(workingSupply).times( 0.4).div(virtualPrice);
        const crvRate = await getCrvRate();
        const baseApy = rate.times(crvRate);
        const boostedApy = baseApy.times(2.5);

        return [baseApy.toFixed(4), boostedApy.toFixed(4)]
    }
}


export const _getBestPoolAndOutput = async (inputCoinAddress: string, outputCoinAddress: string, amount: string): Promise<{ poolAddress: string, output: ethers.BigNumber }> => {
    const addressProviderContract = curve.contracts[ALIASES.address_provider].contract
    const registryExchangeAddress = await addressProviderContract.get_address(2);
    const registryExchangeContract = new ethers.Contract(registryExchangeAddress, registryExchangeABI, curve.signer);

    const _amount = ethers.utils.parseUnits(amount.toString(), await _getDecimals(inputCoinAddress));
    const [poolAddress, output] = await registryExchangeContract.get_best_rate(inputCoinAddress, outputCoinAddress, _amount);

    return { poolAddress, output }
}

export const getBestPoolAndOutput = async (inputCoinAddress: string, outputCoinAddress: string, amount: string): Promise<{ poolAddress: string, output: string }> => {
    const { poolAddress, output: outputBN } = await _getBestPoolAndOutput(inputCoinAddress, outputCoinAddress, amount);
    const output = ethers.utils.formatUnits(outputBN, await _getDecimals(outputCoinAddress));

    return { poolAddress, output }
}

export const swap = async (inputCoinAddress: string, outputCoinAddress: string, amount: string): Promise<void> => {
    const addressProviderContract = curve.contracts[ALIASES.address_provider].contract;
    const registryAddress = await addressProviderContract.get_registry();
    const registryContract = new ethers.Contract(registryAddress, registryABI, curve.signer);

    const { poolAddress } = await _getBestPoolAndOutput(inputCoinAddress, outputCoinAddress, amount);
    const poolName = getPoolNameBySwapAddress(poolAddress);
    const [i, j, is_underlying] = await registryContract.get_coin_indices(poolAddress, inputCoinAddress, outputCoinAddress);

    const pool = new Pool(poolName);
    await pool.init();

    await pool.exchange(i, j, amount);
}
