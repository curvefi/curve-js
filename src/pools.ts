import { ethers, Contract, BigNumber } from "ethers";
import { Provider as MulticallProvider, Contract as MulticallContract } from 'ethers-multicall';
import ERC20Abi from './constants/abis/json/ERC20.json';
import cERC20Abi from './constants/abis/json/cERC20.json';
import gaugeABI from './constants/abis/json/gauge.json';
import { poolsData } from './constants/abis/abis-ethereum';
import { getPoolData, getBalances, ALIASES } from './utils';
import {CoinInterface, DictInterface, PoolDataInterface} from './interfaces';

// TODO move to init function
const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545/');
const multicallProvider = new MulticallProvider(provider);
const signer = provider.getSigner();

const MAX_ALLOWANCE = BigNumber.from(2).pow(BigNumber.from(256)).sub(BigNumber.from(1));

export class Pool {
    name: string;
    swap: Contract | null;
    zap: Contract | null;
    lpToken: Contract | null;
    gauge: Contract | null;
    swapMulticall: MulticallContract | null;
    zapMulticall: MulticallContract | null;
    lpTokenMulticall: MulticallContract | null;
    gaugeMulticall: MulticallContract | null;

    coins: CoinInterface[];

    constructor(name: string) {
        this.name = name;

        this.swap = null;
        this.zap = null;
        this.lpToken = null;
        this.gauge = null;

        this.swapMulticall = null;
        this.zapMulticall = null;
        this.lpTokenMulticall = null;
        this.gaugeMulticall = null;

        this.coins = [];
    }

    async init(callback: () => void): Promise<void> {
        await multicallProvider.init();
        const poolData: PoolDataInterface = await getPoolData(this.name);
        const swapABI = poolsData[this.name].swap_abi;
        const zapABI = poolsData[this.name].deposit_abi;

        this.swap = new Contract(poolData['swap_address'] as string, swapABI, signer);
        this.zap = poolData['zap_address'] ? new Contract(poolData['zap_address'] as string, zapABI, signer) : null;
        this.lpToken = new Contract(poolData['lp_token_address'] as string, ERC20Abi, signer);
        this.gauge = new Contract(poolData['gauge_addresses'][0] as string, gaugeABI, signer);

        this.swapMulticall = new MulticallContract(poolData['swap_address'] as string, swapABI);
        this.zapMulticall = poolData['zap_address'] ? new MulticallContract(poolData['zap_address'] as string, zapABI) : null;
        this.lpTokenMulticall = new MulticallContract(poolData['lp_token_address'] as string, ERC20Abi);
        this.gaugeMulticall = new MulticallContract(poolData['gauge_addresses'][0] as string, gaugeABI);

        poolData['coins'].forEach((coin) => {
            coin["contract"] = new Contract(coin.underlying_address, ERC20Abi, signer);
            coin["multicall_contract"] = new MulticallContract(coin.underlying_address, ERC20Abi);
            if (coin.wrapped_address) {
                coin["wrapped_contract"] = new Contract(coin.wrapped_address, cERC20Abi, signer);
                coin["wrapped_multicall_contract"] = new MulticallContract(coin.wrapped_address, cERC20Abi);
            }
        });
        this.coins = poolData['coins'];

        callback.bind(this)();
    }

    // TODO: change for lending and meta pools
    coinsAllowance = async (coinIndexes: number[]): Promise<ethers.BigNumber[]> => {
        const address: string = await signer.getAddress();

        if (coinIndexes.length === 1) {
            return [await this.coins[coinIndexes[0]].contract.allowance(address, this.swap?.address)]
        }

        const contractCalls = []
        for (const i of coinIndexes) {
            contractCalls.push(this.coins[i].multicall_contract.allowance(address, this.swap?.address));
        }

        return await multicallProvider.all(contractCalls);
    }

    // TODO: change for lending and meta pools
    ensureCoinsAllowance = async (coinIndexes: number[], amounts: BigNumber[]): Promise<void> => {
        const allowance: BigNumber[] = await this.coinsAllowance(coinIndexes);

        for (let i = 0; i < allowance.length; i++) {
            if (allowance[i].lt(amounts[i])) {
                if (allowance[i].gt(BigNumber.from(0))) {
                    await this.coins[coinIndexes[i]].contract.approve(this.swap?.address as string, BigNumber.from(0))
                }
                await this.coins[coinIndexes[i]].contract.approve(this.swap?.address as string, MAX_ALLOWANCE)
            }
        }
    }

    calcLpTokenAmount = async (amounts: BigNumber[], isDeposit = true): Promise<BigNumber> => {
        return await this.swap?.calc_token_amount(amounts, isDeposit);
    }

    calcWithdrawOneCoin = async (tokenAmount: BigNumber, i: number): Promise<BigNumber> => {
        return await this.swap?.calc_withdraw_one_coin(tokenAmount, i);
    }

    addLiquidity = async (amounts: BigNumber[]): Promise<string> => {
        const coinIndexes: number[] = this.coins.map((_, i) => i)
        await this.ensureCoinsAllowance(coinIndexes, amounts);

        let minMintAmount = await this.calcLpTokenAmount(amounts);
        minMintAmount = minMintAmount.div(100).mul(99);

        return (await this.swap?.add_liquidity(amounts, minMintAmount)).hash;
    }

    gaugeAllowance = async (): Promise<ethers.BigNumber> => {
        const address: string = await signer.getAddress();
        return await this.lpToken?.allowance(address, this.gauge?.address);
    }

    ensureGaugeAllowance = async (amount: BigNumber): Promise<void> => {
        const allowance: BigNumber = await this.gaugeAllowance();

        if (allowance.lt(amount)) {
            if (allowance.gt(BigNumber.from(0))) {
                await this.lpToken?.approve(this.gauge?.address, BigNumber.from(0))
            }
            await this.lpToken?.approve(this.gauge?.address, MAX_ALLOWANCE)
        }
    }

    gaugeDeposit = async (amount: BigNumber): Promise<any> => {
        return await this.gauge?.deposit(amount);
    }

    gaugeWithdraw = async (amount: BigNumber): Promise<any> => {
        return await this.gauge?.withdraw(amount);
    }

    calcUnderlyingCoinsAmount = async (amount: BigNumber): Promise<BigNumber[]> => {
        const coinMulticallContracts = this.coins.map((c: CoinInterface) => c.multicall_contract);
        const underlyingCoinBalances = await getBalances([this.swap?.address as string], coinMulticallContracts);

        const totalSupply: BigNumber = await this.lpToken?.totalSupply();

        const minAmounts: BigNumber[] = [];
        for (const underlyingCoinBalance of underlyingCoinBalances[this.swap?.address as string]) {
            minAmounts.push(underlyingCoinBalance.mul(amount).div(totalSupply).div(BigNumber.from(100)).mul(BigNumber.from(99)));
        }

        return minAmounts
    }

    removeLiquidity = async (lpTokenAmount: BigNumber, minAmounts: BigNumber[]): Promise<any> => {
        return await this.swap?.remove_liquidity(lpTokenAmount, minAmounts);
    }

    removeLiquidityImbalance = async (amounts: BigNumber[], maxBurnAmount: BigNumber): Promise<any> => {
        return await this.swap?.remove_liquidity_imbalance(amounts, maxBurnAmount);
    }

    removeLiquidityOneCoin = async (tokenAmount: BigNumber, i: number, minAmount: BigNumber): Promise<any> => {
        return await this.swap?.remove_liquidity_one_coin(tokenAmount, i, minAmount);
    }

    balances = async (...addresses: string[] | string[][]): Promise<DictInterface<BigNumber[]>> =>  {
        if (addresses.length == 1 && Array.isArray(addresses[0])) addresses = addresses[0];
        addresses = addresses as string[];

        return await getBalances(addresses, [this.lpTokenMulticall as MulticallContract, this.gaugeMulticall as MulticallContract]);
    }

    lpTokenBalances = async (...addresses: string[] | string[][]): Promise<DictInterface<BigNumber>> =>  {
        if (addresses.length == 1 && Array.isArray(addresses[0])) addresses = addresses[0];
        addresses = addresses as string[];

        const rawBalances: DictInterface<BigNumber[]> = await getBalances(addresses, [this.lpTokenMulticall as MulticallContract]);

        const balances: DictInterface<BigNumber> = {};
        Object.keys(rawBalances).forEach((key: string) => {
            balances[key] = rawBalances[key][0]
        })

        return balances;
    }

    gaugeBalances = async (...addresses: string[] | string[][]): Promise<{ [index: string]: ethers.BigNumber }> =>  {
        if (addresses.length == 1 && Array.isArray(addresses[0])) addresses = addresses[0];
        addresses = addresses as string[];

        const rawBalances: DictInterface<BigNumber[]> = await getBalances(addresses, [this.gaugeMulticall as MulticallContract])

        const balances: DictInterface<BigNumber> = {};
        Object.keys(rawBalances).forEach((key: string) => {
            balances[key] = rawBalances[key][0]
        })

        return balances
    }

    exchange = async (i: number, j: number, amount: BigNumber, max_slippage = 0.01): Promise<void> => {
        const expected: BigNumber = await this.swap?.get_dy(i, j, amount);
        const minRecvAmount = expected.mul((1 - max_slippage) * 100).div(100);
        await this.ensureCoinsAllowance([i], [amount]);
        await this.swap?.exchange(i, j, amount, minRecvAmount);
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
    //     const response: ethers.BigNumber[] = await multicallProvider.all(contractCalls);
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
    //     const response: ethers.BigNumber[] = await multicallProvider.all(contractCalls);
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
