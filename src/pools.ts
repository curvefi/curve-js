import { ethers } from "ethers";
import BigNumber from 'bignumber.js'
import { getPoolData, _getBalances, _getBalancesBN, ensureAllowance, getPoolNameBySwapAddress, toBN, fromBN, toStringFromBN } from './utils';
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
        this.name = name;

        this.swap = null;
        this.zap = null;
        this.lpToken = null;
        this.gauge = null;
        this.coins = [];
    }

    async init(callback: () => void): Promise<void> {
        const poolData: PoolDataInterface = await getPoolData(this.name);

        this.swap = poolData['swap_address'] as string;
        this.zap = poolData['zap_address'] || null;
        this.lpToken = poolData['lp_token_address'] as string;
        this.gauge = poolData['gauge_addresses'][0] as string;
        this.coins = poolData['coins'];

        callback.bind(this)();
    }

    private _calcLpTokenAmount = async (amounts: ethers.BigNumber[], isDeposit = true): Promise<ethers.BigNumber> => {
        return await curve.contracts[this.swap as string].contract.calc_token_amount(amounts, isDeposit);
    }

    private _addLiquidity = async (amounts: ethers.BigNumber[]): Promise<string> => {
        const coinAddresses: string[] = this.coins.map((coin) => coin.underlying_address);
        await ensureAllowance(coinAddresses, amounts, this.swap as string);

        let minMintAmount = await this._calcLpTokenAmount(amounts);
        minMintAmount = minMintAmount.div(100).mul(99);

        return (await curve.contracts[this.swap as string].contract.add_liquidity(amounts, minMintAmount)).hash;
    }

    public addLiquidity = async (amounts: string[]): Promise<string> => {
        if (amounts.length !== this.coins.length) {
            throw Error(`${this.name} pool has ${this.coins.length} coins (amounts provided for ${amounts.length})`)
        }
        const _amounts: ethers.BigNumber[] = amounts.map((amount: string, i: number) =>
            ethers.utils.parseUnits(amount, this.coins[i].decimals || this.coins[i].wrapped_decimals));

        return await this._addLiquidity(_amounts);
    }

    public gaugeDeposit = async (lpTokenAmount: string): Promise<string> => {
        const _lpTokenAmount = ethers.utils.parseUnits(lpTokenAmount);
        await ensureAllowance([this.lpToken as string], [_lpTokenAmount], this.gauge as string)

        return (await curve.contracts[this.gauge as string].contract.deposit(_lpTokenAmount)).hash;
    }

    public gaugeWithdraw = async (lpTokenAmount: string): Promise<string> => {
        const _lpTokenAmount = ethers.utils.parseUnits(lpTokenAmount);
        return (await curve.contracts[this.gauge as string].contract.withdraw(_lpTokenAmount)).hash;
    }

    private _calcUnderlyingCoinAmounts = async (amount: ethers.BigNumber): Promise<ethers.BigNumber[]> => {
        const coinAddresses: string[] = this.coins.map((c: CoinInterface) => c.underlying_address);
        const underlyingCoinBalances: DictInterface<BigNumber[]> = await _getBalancesBN([this.swap as string], coinAddresses);
        const totalSupply: BigNumber = toBN(await curve.contracts[this.lpToken as string].contract.totalSupply());

        const minAmounts: BigNumber[] = [];
        for (const underlyingCoinBalance of underlyingCoinBalances[this.swap as string]) {
            minAmounts.push(underlyingCoinBalance.times(toBN(amount)).div(totalSupply).times(0.99));
        }

        return minAmounts.map((amount: BigNumber, i: number) =>
            fromBN(amount, this.coins[i].decimals || this.coins[i].wrapped_decimals as number))
    }

    public calcUnderlyingCoinAmounts = async (amount: string): Promise<string[]> => {
        const underlyingCoinAmounts: ethers.BigNumber[] = await this._calcUnderlyingCoinAmounts(ethers.utils.parseUnits(amount.toString()));
        return underlyingCoinAmounts.map((amount: ethers.BigNumber, i: number) =>
            ethers.utils.formatUnits(amount, this.coins[i].decimals || this.coins[i].wrapped_decimals as number));
    }

    public removeLiquidity = async (lpTokenAmount: string): Promise<string> => {
        const _lpTokenAmount = ethers.utils.parseUnits(lpTokenAmount);
        const minAmounts = await this._calcUnderlyingCoinAmounts(_lpTokenAmount);

        return (await curve.contracts[this.swap as string].contract.remove_liquidity(_lpTokenAmount, minAmounts)).hash;
    }

    public removeLiquidityImbalance = async (amounts: string[]): Promise<string> => {
        const _amounts: ethers.BigNumber[] = amounts.map((amount: string, i: number) =>
            ethers.utils.parseUnits(amount, this.coins[i].decimals || this.coins[i].wrapped_decimals));
        let maxBurnAmount = await this._calcLpTokenAmount(_amounts, false)
        maxBurnAmount = maxBurnAmount.div(100).mul(101);

        return (await curve.contracts[this.swap as string].contract.remove_liquidity_imbalance(_amounts, maxBurnAmount)).hash;
    }

    private _calcWithdrawOneCoin = async (lpTokenAmount: ethers.BigNumber, i: number): Promise<ethers.BigNumber> => {
        return await curve.contracts[this.swap as string].contract.calc_withdraw_one_coin(lpTokenAmount, i);
    }

    public removeLiquidityOneCoin = async (lpTokenAmount: string, i: number): Promise<string> => {
        const _lpTokenAmount = ethers.utils.parseUnits(lpTokenAmount);
        let minAmount = await this._calcWithdrawOneCoin(_lpTokenAmount, i);
        minAmount = minAmount.div(100).mul(99);

        return (await curve.contracts[this.swap as string].contract.remove_liquidity_one_coin(_lpTokenAmount, i, minAmount)).hash;
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

    public getSwapOutput = async (i: number, j: number, amount: string): Promise<string> => {
        const _amount = ethers.utils.parseUnits(amount, this.coins[i].decimals);
        const expected: ethers.BigNumber = await curve.contracts[this.swap as string].contract.get_dy(i, j, _amount);

        return ethers.utils.formatUnits(expected, this.coins[j].decimals)
    }

    public exchange = async (i: number, j: number, amount: string, maxSlippage = 0.01): Promise<string> => {
        const _amount = ethers.utils.parseUnits(amount, this.coins[i].decimals || this.coins[i].wrapped_decimals);
        const expected: ethers.BigNumber = await curve.contracts[this.swap as string].contract.get_dy(i, j, _amount);
        const minRecvAmount = expected.mul((1 - maxSlippage) * 100).div(100);
        await ensureAllowance([this.coins[i].underlying_address], [_amount], this.swap as string);

        if (Object.prototype.hasOwnProperty.call(curve.contracts[this.swap as string].contract, 'exchange_underlying')) {
            return (await curve.contracts[this.swap as string].contract.exchange_underlying(i, j, _amount, minRecvAmount)).hash
        } else {
            return (await curve.contracts[this.swap as string].contract.exchange(i, j, _amount, minRecvAmount)).hash
        }
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
        const response: ethers.BigNumber[] = await curve.multicallProvider.all(contractCalls);

        const [veTotalSupply, gaugeTotalSupply] = response.splice(0,2);

        const votingPower: DictInterface<ethers.BigNumber> = {};
        let totalBalance = ethers.BigNumber.from(0);
        for (const acct of accounts) {
            votingPower[acct] = response[0];
            totalBalance = totalBalance.add(response[1]).add(response[2]);
            response.splice(0, 3);
        }

        const totalPower = Object.values(votingPower).reduce((sum, item) => sum.add(item));
        const optimalBN: DictInterface<ethers.BigNumber> = Object.fromEntries(accounts.map((acc) => [acc, ethers.BigNumber.from(0)]));
        if (totalBalance.lt(gaugeTotalSupply.mul(totalPower).div(veTotalSupply))) {
            for (const acct of accounts) {
                const amount = gaugeTotalSupply.mul(votingPower[acct]).div(veTotalSupply).lt(totalBalance) ?
                    gaugeTotalSupply.mul(votingPower[acct]).div(veTotalSupply) : totalBalance;
                optimalBN[acct] = amount;
                totalBalance = totalBalance.sub(amount);
                if (totalBalance.lte(0)) {
                    break;
                }
            }
        }
        else {
            if (totalPower.lt(0)) {
                for (const acct of accounts) {
                    optimalBN[acct] = totalBalance.mul(votingPower[acct]).div(totalPower);
                }
            }
            optimalBN[accounts[0]] = optimalBN[accounts[0]].add(totalBalance.sub(Object.values(optimalBN).reduce((sum, item) => sum.add(item))));
        }

        const optimal: DictInterface<string> = {};
        for (const entry of Object.entries(optimalBN)) {
            optimal[entry[0]] = ethers.utils.formatUnits(entry[1], 18);
        }

        return optimal
    }
}


export const _getBestPoolAndOutput = async (inputCoinAddress: string, outputCoinAddress: string, amount: string): Promise<{ poolAddress: string, output: ethers.BigNumber }> => {
    const addressProviderContract = curve.contracts[ALIASES.address_provider].contract
    const registryExchangeAddress = await addressProviderContract.get_address(2);
    const registryExchangeContract = new ethers.Contract(registryExchangeAddress, registryExchangeABI, curve.signer);

    const inputCoinContract = curve.contracts[inputCoinAddress].contract;
    const _amount = ethers.utils.parseUnits(amount.toString(), await inputCoinContract.decimals());
    const [poolAddress, output] = await registryExchangeContract.get_best_rate(inputCoinAddress, outputCoinAddress, _amount);

    return { poolAddress, output }
}

export const getBestPoolAndOutput = async (inputCoinAddress: string, outputCoinAddress: string, amount: string): Promise<{ poolAddress: string, output: string }> => {
    const { poolAddress, output: outputBN } = await _getBestPoolAndOutput(inputCoinAddress, outputCoinAddress, amount);
    const outputCoinContract = curve.contracts[outputCoinAddress].contract;
    const output = ethers.utils.formatUnits(outputBN, await outputCoinContract.decimals());

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
    await pool.init(async function() {
        await pool.exchange(i, j, amount);
    });
}