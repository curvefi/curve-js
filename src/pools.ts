import { ethers, BigNumber } from "ethers";
import { Provider as MulticallProvider, Contract as MulticallContract } from 'ethers-multicall';
import ERC20Abi from './abis/ERC20.json';
import gaugeABI from './abis/gauge.json';
import tripoolSwapABI from './abis/3pool/swap.json';
import { getPoolData, approve, getBalances, ALIASES } from './utils';
import { CoinInterface, PoolDataInterface } from './interfaces';

// TODO move to init function
const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545/');
const multicallProvider = new MulticallProvider(provider);
const signer = provider.getSigner();

const MAX_ALLOWANCE = BigNumber.from(2).pow(BigNumber.from(256)).sub(BigNumber.from(1));

export class Pool {
    name: string;
    swapAddress: string;
    zapAddress: string | null;
    lpTokenAddress: string;
    gaugeAddress: string;
    coins: CoinInterface[];

    constructor(name: string) {
        this.name = name;
        this.swapAddress = "";
        this.zapAddress = null;
        this.lpTokenAddress = "";
        this.gaugeAddress = "";
        this.coins = [];
    }

    async init(callback: () => void): Promise<void> {
        await multicallProvider.init();
        const poolData: PoolDataInterface = await getPoolData(this.name);
        this.swapAddress = poolData['swap_address'] as string;
        this.zapAddress = poolData['zap_address'] || null;
        this.lpTokenAddress = poolData['lp_token_address'];
        this.gaugeAddress = poolData['gauge_addresses'][0];
        this.coins = poolData['coins'];
        callback.bind(this)();
    }

    // TODO: change for lending and meta pools
    liquidityAllowance = async (): Promise<ethers.BigNumber[]> => {
        const address: string = await signer.getAddress();

        const contractCalls = []
        for (const coin of (this.coins as CoinInterface[])) {
            const coinContract = new MulticallContract(coin.underlying_address, ERC20Abi);
            contractCalls.push(coinContract.allowance(address, this.swapAddress));
        }

        return await multicallProvider.all(contractCalls);
    }

    // TODO: change for lending and meta pools
    ensureLiquidityAllowance = async (amounts: BigNumber[]): Promise<void> => {
        const allowance: BigNumber[] = await this.liquidityAllowance();

        for (let i = 0; i < allowance.length; i++) {
            if (allowance[i].lt(amounts[i])) {
                if (allowance[i].gt(BigNumber.from(0))) {
                    await approve(this.coins[i].underlying_address, this.swapAddress, BigNumber.from(0))
                }
                await approve(this.coins[i].underlying_address, this.swapAddress, MAX_ALLOWANCE)
            }
        }
    }

    calcLpTokenAmount = async (amounts: ethers.BigNumber[]): Promise<ethers.BigNumber> => {
        const swapContract = new ethers.Contract(this.swapAddress, tripoolSwapABI, provider);
        return await swapContract.calc_token_amount(amounts, true);
    }

    addLiquidity = async (amounts: BigNumber[], minMintAmount: BigNumber): Promise<any> => {
        const swapContract = new ethers.Contract(this.swapAddress, tripoolSwapABI, signer);
        return await swapContract.add_liquidity(amounts, minMintAmount);
    }

    gaugeAllowance = async (): Promise<ethers.BigNumber> => {
        const address: string = await signer.getAddress();
        const lpTokenContract = new ethers.Contract(this.lpTokenAddress, ERC20Abi, provider);
        return await lpTokenContract.allowance(address, this.gaugeAddress);
    }

    ensureGaugeAllowance = async (amount: BigNumber): Promise<void> => {
        const allowance: BigNumber = await this.gaugeAllowance();

        if (allowance.lt(amount)) {
            if (allowance.gt(BigNumber.from(0))) {
                await approve(this.lpTokenAddress, this.gaugeAddress, BigNumber.from(0))
            }
            await approve(this.lpTokenAddress, this.gaugeAddress, MAX_ALLOWANCE)
        }
    }

    gaugeDeposit = async (amount: BigNumber): Promise<any> => {
        const gaugeContract = new ethers.Contract(this.gaugeAddress, gaugeABI, signer);
        return await gaugeContract.deposit(amount);
    }

    gaugeWithdraw = async (amount: BigNumber): Promise<any> => {
        const gaugeContract = new ethers.Contract(this.gaugeAddress, gaugeABI, signer);
        return await gaugeContract.withdraw(amount);
    }

    calcUnderlyingCoinsAmount = async (amount: BigNumber): Promise<BigNumber[]> => {
        const underlyingCoinAddresses = this.coins.map((c: CoinInterface) => c.underlying_address);
        const underlyingCoinBalances = await getBalances([this.swapAddress], underlyingCoinAddresses);

        const lpTokenContract = new ethers.Contract(this.lpTokenAddress, ERC20Abi, provider);
        const totalSupply: BigNumber = await lpTokenContract.totalSupply();

        const minAmounts: BigNumber[] = [];
        for (const underlyingCoinBalance of underlyingCoinBalances[this.swapAddress]) {
            minAmounts.push(underlyingCoinBalance.mul(amount).div(totalSupply).div(BigNumber.from(100)).mul(BigNumber.from(99)));
        }

        return minAmounts
    }

    removeLiquidity = async (lpTokenAmount: BigNumber, minAmounts: BigNumber[]): Promise<any> => {
        const swapContract = new ethers.Contract(this.swapAddress, tripoolSwapABI, signer);
        return await swapContract.remove_liquidity(lpTokenAmount, minAmounts);
    }

    balances = async (...accounts: string[] | string[][]): Promise<{ [index: string]: ethers.BigNumber[] }> =>  {
        if (accounts.length == 1 && Array.isArray(accounts[0])) accounts = accounts[0];
        accounts = accounts as string[];

        const lpTokenContract = new MulticallContract(this.lpTokenAddress, ERC20Abi);
        const gaugeContract = new MulticallContract(this.gaugeAddress, ERC20Abi);

        const contractCalls = accounts.map((account: string) => lpTokenContract.balanceOf(account))
            .concat(accounts.map((account: string) => gaugeContract.balanceOf(account)));
        const response: ethers.BigNumber[] = await multicallProvider.all(contractCalls);

        const result: { [index: string]: ethers.BigNumber[] }  = {};
        accounts.forEach((account: string, i: number) => {
            result[account] = [response[i], response[accounts.length + i]]
        });

        return result;
    }

    lpTokenBalances = async (...accounts: string[] | string[][]): Promise<{ [index: string]: ethers.BigNumber }> =>  {
        if (accounts.length == 1 && Array.isArray(accounts[0])) accounts = accounts[0];
        accounts = accounts as string[];

        const lpTokenContract = new MulticallContract(this.lpTokenAddress, ERC20Abi);

        const contractCalls = accounts.map((account: string) => lpTokenContract.balanceOf(account));
        const response: ethers.BigNumber[] = await multicallProvider.all(contractCalls);

        const result: { [index: string]: ethers.BigNumber }  = {};
        accounts.forEach((account: string, i: number) => {
            result[account] = response[i]
        });

        return result;
    }

    gaugeBalances = async (...accounts: string[] | string[][]): Promise<{ [index: string]: ethers.BigNumber }> =>  {
        if (accounts.length == 1 && Array.isArray(accounts[0])) accounts = accounts[0];
        accounts = accounts as string[];

        const gaugeContract = new MulticallContract(this.gaugeAddress, ERC20Abi);

        const contractCalls = accounts.map((account: string) => gaugeContract.balanceOf(account));
        const response: ethers.BigNumber[] = await multicallProvider.all(contractCalls);

        const result: { [index: string]: ethers.BigNumber }  = {};
        accounts.forEach((account: string, i: number) => {
            result[account] = response[i]
        });

        return result;
    }

    // TODO: return int((response.pop() / ve_total_supply) * gauge_total_supply)
    gaugeMaxBoostedDeposit = async (...accounts: string[]): Promise<{ [index: string]: ethers.BigNumber[] }> => {
        if (accounts.length == 1 && Array.isArray(accounts[0])) accounts = accounts[0];
        const votingEscrowContract = new MulticallContract(ALIASES.voting_escrow, ERC20Abi);

        const gaugeContract = new MulticallContract(this.gaugeAddress, ERC20Abi);

        const contractCalls = accounts.map((account: string) => votingEscrowContract.balanceOf(account))
        contractCalls.push(votingEscrowContract.totalSupply(), gaugeContract.totalSupply())
        const response: ethers.BigNumber[] = await multicallProvider.all(contractCalls);

        const [votingEscrowTotalSupply, gaugeTotalSupply] = response.splice(-2);

        const result: { [index: string]: ethers.BigNumber[] }  = {};
        accounts.forEach((account: string, i: number) => {
            result[account] = [response[i], votingEscrowTotalSupply, gaugeTotalSupply]
        });

        return result;
    }

    // TODO return optimal
    gaugeOptimalDeposits = async (...accounts: string[]): Promise<{ [index: string]: ethers.BigNumber[] }> => {
        if (accounts.length == 1 && Array.isArray(accounts[0])) accounts = accounts[0];
        const votingEscrowContract = new MulticallContract(ALIASES.voting_escrow, ERC20Abi);

        const lpTokenContract = new MulticallContract(this.lpTokenAddress, ERC20Abi);
        const gaugeContract = new MulticallContract(this.gaugeAddress, ERC20Abi);

        const contractCalls = [votingEscrowContract.totalSupply(), gaugeContract.totalSupply()]
        accounts.forEach((account: string) => {
            contractCalls.push(
                votingEscrowContract.balanceOf(account),
                lpTokenContract.balanceOf(account),
                gaugeContract.balanceOf(account)
            )
        });
        const response: ethers.BigNumber[] = await multicallProvider.all(contractCalls);

        const [votingEscrowTotalSupply, gaugeTotalSupply] = response.splice(0,2);

        const result: { [index: string]: ethers.BigNumber[] }  = {};
        for (let i = 0; i < response.length; i += 3) {
            result[accounts[Math.floor(i / 3)]] = [response[i], response[i + 1], response[i + 2], votingEscrowTotalSupply, gaugeTotalSupply]
        }

        return result
    }
}
