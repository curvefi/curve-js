import { ethers, Contract, BigNumber } from "ethers";
import { Provider as MulticallProvider, Contract as MulticallContract } from 'ethers-multicall';
import ERC20Abi from './abis/ERC20.json';
import cERC20Abi from './abis/cERC20.json';
import gaugeABI from './abis/gauge.json';
import swapABI from './abis/3pool/swap.json';
import zapABI from './abis/usdt/deposit.json';
import { getPoolData, getBalances, ALIASES } from './utils';
import {CoinInterface, ObjectInterface, PoolDataInterface} from './interfaces';

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
    liquidityAllowance = async (): Promise<ethers.BigNumber[]> => {
        const address: string = await signer.getAddress();

        const contractCalls = []
        for (const coin of (this.coins as CoinInterface[])) {
            contractCalls.push(coin.multicall_contract.allowance(address, this.swap?.address));
        }

        return await multicallProvider.all(contractCalls);
    }

    // TODO: change for lending and meta pools
    ensureLiquidityAllowance = async (amounts: BigNumber[]): Promise<void> => {
        const allowance: BigNumber[] = await this.liquidityAllowance();

        for (let i = 0; i < allowance.length; i++) {
            if (allowance[i].lt(amounts[i])) {
                if (allowance[i].gt(BigNumber.from(0))) {
                    await this.coins[i].contract.approve(this.swap?.address as string, BigNumber.from(0))
                }
                await this.coins[i].contract.approve(this.swap?.address as string, MAX_ALLOWANCE)
            }
        }
    }

    calcLpTokenAmount = async (amounts: BigNumber[], isDeposit = true): Promise<BigNumber> => {
        return await this.swap?.calc_token_amount(amounts, isDeposit);
    }

    calcWithdrawOneCoin = async (tokenAmount: BigNumber, i: number): Promise<BigNumber> => {
        return await this.swap?.calc_withdraw_one_coin(tokenAmount, i);
    }

    addLiquidity = async (amounts: BigNumber[], minMintAmount: BigNumber): Promise<any> => {
        return await this.swap?.add_liquidity(amounts, minMintAmount);
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
        console.log('TEST');
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

    balances = async (...addresses: string[] | string[][]): Promise<ObjectInterface<BigNumber[]>> =>  {
        if (addresses.length == 1 && Array.isArray(addresses[0])) addresses = addresses[0];
        addresses = addresses as string[];

        return await getBalances(addresses, [this.lpTokenMulticall as MulticallContract, this.gaugeMulticall as MulticallContract]);
    }

    lpTokenBalances = async (...addresses: string[] | string[][]): Promise<ObjectInterface<BigNumber>> =>  {
        if (addresses.length == 1 && Array.isArray(addresses[0])) addresses = addresses[0];
        addresses = addresses as string[];

        const rawBalances: ObjectInterface<BigNumber[]> = await getBalances(addresses, [this.lpTokenMulticall as MulticallContract]);

        const balances: ObjectInterface<BigNumber> = {};
        Object.keys(rawBalances).forEach((key: string) => {
            balances[key] = rawBalances[key][0]
        })

        return balances;
    }

    gaugeBalances = async (...addresses: string[] | string[][]): Promise<{ [index: string]: ethers.BigNumber }> =>  {
        if (addresses.length == 1 && Array.isArray(addresses[0])) addresses = addresses[0];
        addresses = addresses as string[];

        const rawBalances: ObjectInterface<BigNumber[]> = await getBalances(addresses, [this.gaugeMulticall as MulticallContract])

        const balances: ObjectInterface<BigNumber> = {};
        Object.keys(rawBalances).forEach((key: string) => {
            balances[key] = rawBalances[key][0]
        })

        return balances
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
