import { ethers, BigNumber } from "ethers";
import { getPoolData, getBalances } from './utils';
import { CoinInterface, DictInterface, PoolDataInterface } from './interfaces';
import { curve } from "./curve";


const MAX_ALLOWANCE = BigNumber.from(2).pow(BigNumber.from(256)).sub(BigNumber.from(1));

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

    // TODO: change for lending and meta pools
    coinsAllowance = async (coinIndexes: number[]): Promise<ethers.BigNumber[]> => {
        const address: string = await curve.signer.getAddress();

        if (coinIndexes.length === 1) {
            const coinAddr = this.coins[coinIndexes[0]].underlying_address;
            return [await curve.contracts[coinAddr].contract.allowance(address, this.swap)]
        }

        const contractCalls = []
        for (const i of coinIndexes) {
            const coinAddr = this.coins[i].underlying_address;
            contractCalls.push(curve.contracts[coinAddr].multicallContract.allowance(address, this.swap));
        }

        return await curve.multicallProvider.all(contractCalls);
    }

    // TODO: change for lending and meta pools
    ensureCoinsAllowance = async (coinIndexes: number[], amounts: BigNumber[]): Promise<void> => {
        const allowance: BigNumber[] = await this.coinsAllowance(coinIndexes);

        for (let i = 0; i < allowance.length; i++) {
            if (allowance[i].lt(amounts[i])) {
                const coinAddr = this.coins[coinIndexes[i]].underlying_address;
                if (allowance[i].gt(BigNumber.from(0))) {
                    await curve.contracts[coinAddr].contract.approve(this.swap, BigNumber.from(0))
                }
                await curve.contracts[coinAddr].contract.approve(this.swap, MAX_ALLOWANCE)
            }
        }
    }

    calcLpTokenAmount = async (amounts: BigNumber[], isDeposit = true): Promise<BigNumber> => {
        return await curve.contracts[this.swap as string].contract.calc_token_amount(amounts, isDeposit);
    }

    calcWithdrawOneCoin = async (tokenAmount: BigNumber, i: number): Promise<BigNumber> => {
        return await curve.contracts[this.swap as string].contract.calc_withdraw_one_coin(tokenAmount, i);
    }

    addLiquidity = async (amounts: BigNumber[]): Promise<string> => {
        const coinIndexes: number[] = this.coins.map((_, i) => i)
        await this.ensureCoinsAllowance(coinIndexes, amounts);

        let minMintAmount = await this.calcLpTokenAmount(amounts);
        minMintAmount = minMintAmount.div(100).mul(99);

        return (await curve.contracts[this.swap as string].contract.add_liquidity(amounts, minMintAmount)).hash;
    }

    gaugeAllowance = async (): Promise<ethers.BigNumber> => {
        const address: string = await curve.signer.getAddress();
        return await curve.contracts[this.lpToken as string].contract.allowance(address, this.gauge);
    }

    ensureGaugeAllowance = async (amount: BigNumber): Promise<void> => {
        const allowance: BigNumber = await this.gaugeAllowance();

        if (allowance.lt(amount)) {
            const lpTokenContract = curve.contracts[this.lpToken as string].contract;
            if (allowance.gt(BigNumber.from(0))) {
                await lpTokenContract.approve(this.gauge, BigNumber.from(0))
            }
            await lpTokenContract.approve(this.gauge, MAX_ALLOWANCE)
        }
    }

    gaugeDeposit = async (amount: BigNumber): Promise<string> => {
        await this.ensureGaugeAllowance(amount);

        return (await curve.contracts[this.gauge as string].contract.deposit(amount)).hash;
    }

    gaugeWithdraw = async (amount: BigNumber): Promise<string> => {
        return (await curve.contracts[this.gauge as string].contract.withdraw(amount)).hash;
    }

    calcUnderlyingCoinsAmount = async (amount: BigNumber): Promise<BigNumber[]> => {
        const coinAddresses = this.coins.map((c: CoinInterface) => c.underlying_address);
        const underlyingCoinBalances = await getBalances([this.swap as string], coinAddresses);

        const totalSupply: BigNumber = await curve.contracts[this.lpToken as string].contract.totalSupply();

        const minAmounts: BigNumber[] = [];
        for (const underlyingCoinBalance of underlyingCoinBalances[this.swap as string]) {
            minAmounts.push(underlyingCoinBalance.mul(amount).div(totalSupply).div(BigNumber.from(100)).mul(BigNumber.from(99)));
        }

        return minAmounts
    }

    removeLiquidity = async (lpTokenAmount: BigNumber): Promise<string> => {
        const minAmounts = await this.calcUnderlyingCoinsAmount(lpTokenAmount);

        return (await curve.contracts[this.swap as string].contract.remove_liquidity(lpTokenAmount, minAmounts)).hash;
    }

    removeLiquidityImbalance = async (amounts: BigNumber[]): Promise<string> => {
        let maxBurnAmount = await this.calcLpTokenAmount(amounts, false)
        maxBurnAmount = maxBurnAmount.div(100).mul(101);

        return (await curve.contracts[this.swap as string].contract.remove_liquidity_imbalance(amounts, maxBurnAmount)).hash;
    }

    removeLiquidityOneCoin = async (lpTokenAmount: BigNumber, i: number): Promise<string> => {
        let minAmount = await this.calcWithdrawOneCoin(lpTokenAmount, i);
        minAmount = minAmount.div(100).mul(99);

        return (await curve.contracts[this.swap as string].contract.remove_liquidity_one_coin(lpTokenAmount, i, minAmount)).hash;
    }

    balances = async (...addresses: string[] | string[][]): Promise<DictInterface<BigNumber[]>> =>  {
        if (addresses.length == 1 && Array.isArray(addresses[0])) addresses = addresses[0];
        addresses = addresses as string[];

        return await getBalances(addresses, [this.lpToken as string, this.gauge as string]);
    }

    lpTokenBalances = async (...addresses: string[] | string[][]): Promise<DictInterface<BigNumber>> =>  {
        if (addresses.length == 1 && Array.isArray(addresses[0])) addresses = addresses[0];
        addresses = addresses as string[];

        const rawBalances: DictInterface<BigNumber[]> = await getBalances(addresses, [this.lpToken as string]);

        const balances: DictInterface<BigNumber> = {};
        Object.keys(rawBalances).forEach((key: string) => {
            balances[key] = rawBalances[key][0]
        })

        return balances;
    }

    gaugeBalances = async (...addresses: string[] | string[][]): Promise<{ [index: string]: ethers.BigNumber }> =>  {
        if (addresses.length == 1 && Array.isArray(addresses[0])) addresses = addresses[0];
        addresses = addresses as string[];

        const rawBalances: DictInterface<BigNumber[]> = await getBalances(addresses, [this.gauge as string])

        const balances: DictInterface<BigNumber> = {};
        Object.keys(rawBalances).forEach((key: string) => {
            balances[key] = rawBalances[key][0]
        })

        return balances
    }

    exchange = async (i: number, j: number, amount: BigNumber, maxSlippage = 0.01): Promise<void> => {
        const expected: BigNumber = await curve.contracts[this.swap as string].contract.get_dy(i, j, amount);
        const minRecvAmount = expected.mul((1 - maxSlippage) * 100).div(100);
        await this.ensureCoinsAllowance([i], [amount]);
        await curve.contracts[this.swap as string].contract.exchange(i, j, amount, minRecvAmount);
    }

    // // TODO: return int((response.pop() / ve_total_supply) * gauge_total_supply)
    // gaugeMaxBoostedDeposit = async (...accounts: string[]): Promise<{ [index: string]: ethers.BigNumber[] }> => {
    //     if (accounts.length == 1 && Array.isArray(accounts[0])) accounts = accounts[0];
    //     const votingEscrowContract = new MulticallContract(ALIASES.voting_escrow, ERC20Abi);
    //
    //     const gaugeContract = new MulticallContract(this.gaugeAddress, ERC20Abi);
    //
    //     const contractCalls = accounts.map((account: string) => votingEscrowContract.balanceOf(account))
    //     contractCalls.push(votingEscrowContract.totalSupply(), gaugeContract.totalSupply())
    //     const response: ethers.BigNumber[] = await curve.multicallProvider.all(contractCalls);
    //
    //     const [votingEscrowTotalSupply, gaugeTotalSupply] = response.splice(-2);
    //
    //     const result: { [index: string]: ethers.BigNumber[] }  = {};
    //     accounts.forEach((account: string, i: number) => {
    //         result[account] = [response[i], votingEscrowTotalSupply, gaugeTotalSupply]
    //     });
    //
    //     return result;
    // }
    //
    // // TODO return optimal
    // gaugeOptimalDeposits = async (...accounts: string[]): Promise<{ [index: string]: ethers.BigNumber[] }> => {
    //     if (accounts.length == 1 && Array.isArray(accounts[0])) accounts = accounts[0];
    //     const votingEscrowContract = new MulticallContract(ALIASES.voting_escrow, ERC20Abi);
    //
    //     const lpTokenContract = new MulticallContract(this.lpTokenAddress, ERC20Abi);
    //     const gaugeContract = new MulticallContract(this.gaugeAddress, ERC20Abi);
    //
    //     const contractCalls = [votingEscrowContract.totalSupply(), gaugeContract.totalSupply()]
    //     accounts.forEach((account: string) => {
    //         contractCalls.push(
    //             votingEscrowContract.balanceOf(account),
    //             lpTokenContract.balanceOf(account),
    //             gaugeContract.balanceOf(account)
    //         )
    //     });
    //     const response: ethers.BigNumber[] = await curve.multicallProvider.all(contractCalls);
    //
    //     const [votingEscrowTotalSupply, gaugeTotalSupply] = response.splice(0,2);
    //
    //     const result: { [index: string]: ethers.BigNumber[] }  = {};
    //     for (let i = 0; i < response.length; i += 3) {
    //         result[accounts[Math.floor(i / 3)]] = [response[i], response[i + 1], response[i + 2], votingEscrowTotalSupply, gaugeTotalSupply]
    //     }
    //
    //     return result
    // }
}
