import { ethers, BigNumber } from "ethers";
import { Provider as MulticallProvider, Contract as MulticallContract } from 'ethers-multicall';
import ERC20Abi from './abis/ERC20.json';
import gaugeABI from './abis/gauge.json';
import tripoolSwapABI from './abis/3pool/swap.json';
import usdtZapAbi from './abis/usdt/deposit.json';
import { getPoolData, ALIASES } from './utils';
import { CoinInterface, PoolDataInterface, ObjectInterface } from './interfaces';

const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545/');
const multicallProvider = new MulticallProvider(provider);
const signer = provider.getSigner();

const MAX_ALLOWANCE = BigNumber.from(2).pow(BigNumber.from(256)).sub(BigNumber.from(1));

export class Pool {
    name: string;
    swap: ethers.Contract | null;
    zap: ethers.Contract | null;
    token: MulticallContract | null;
    gauge: MulticallContract | null;
    coins: CoinInterface[] | null;

    constructor(name: string) {
        this.name = name;
        this.swap = null;
        this.zap = null;
        this.token = null;
        this.gauge = null;
        this.coins = null;
    }

    async init(callback: () => void) {
        await multicallProvider.init();
        const poolData: PoolDataInterface = await getPoolData(this.name);
        this.swap = new ethers.Contract(poolData['swap_address'] as string, tripoolSwapABI, provider);
        this.zap = Object.prototype.hasOwnProperty.call(poolData, 'zap_address') ?
            new ethers.Contract(poolData['zap_address'] as string, usdtZapAbi, provider) : null;
        this.token = new MulticallContract(poolData['lp_token_address'], ERC20Abi);
        this.gauge = new MulticallContract(poolData['gauge_addresses'][0], ERC20Abi);
        this.coins = poolData['coins'];
        callback.bind(this)();
    }

    decimals = async (addr: string): Promise<any> => {
        const ERC20Contract = new ethers.Contract(addr, ERC20Abi, provider);
        return await ERC20Contract.decimals()
    }

    // TODO: generalize to any pool
    allowance = async (): Promise<ethers.BigNumber[]> => {
        const address: string = await signer.getAddress();

        const contractCalls = []
        const spender_address = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';
        for (const coin of (this.coins as CoinInterface[])) {
            const coinContract = new MulticallContract(coin.underlying_address, ERC20Abi);
            contractCalls.push(coinContract.allowance(address, spender_address));
        }

        return await multicallProvider.all(contractCalls);
    }

    gaugeAllowance = async (): Promise<ethers.BigNumber> => {
        const address: string = await signer.getAddress();
        const gauge_address = '0xbFcF63294aD7105dEa65aA58F8AE5BE2D9d0952A';
        const lpTokenAddress = '0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490';
        const lpTokenContract = new ethers.Contract(lpTokenAddress, ERC20Abi, provider);
        return await lpTokenContract.allowance(address, gauge_address);
    }

    approve = async (coinAddress: string, spenderAddress: string, value: BigNumber): Promise<any> => {
        const coinContract = new ethers.Contract(coinAddress, ERC20Abi, signer);
        return await coinContract.approve(spenderAddress, value);
    }

    ensureAllowance = async (amounts: BigNumber[]): Promise<void> => {
        const allowance: BigNumber[] = await this.allowance();
        const spender_address = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';

        for (let i = 0; i < allowance.length; i++) {
            if (allowance[i].lt(amounts[i])) {
                if (allowance[i].gt(BigNumber.from(0))) {
                    await this.approve(this.coins[i].underlying_address, spender_address, BigNumber.from(0))
                }
                await this.approve(this.coins[i].underlying_address, spender_address, MAX_ALLOWANCE)
            }
        }
    }

    ensureGaugeAllowance = async (amount: BigNumber): Promise<void> => {
        const allowance: BigNumber = await this.gaugeAllowance();
        const gauge_address = '0xbFcF63294aD7105dEa65aA58F8AE5BE2D9d0952A';
        const lpTokenAddress = '0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490';

        if (allowance.lt(amount)) {
            if (allowance.gt(BigNumber.from(0))) {
                await this.approve(lpTokenAddress, gauge_address, BigNumber.from(0))
            }
            await this.approve(lpTokenAddress, gauge_address, MAX_ALLOWANCE)
        }
    }

    calcTokenAmount = async (amounts: ethers.BigNumber[]): Promise<ethers.BigNumber> => {
        return await (this.swap as ethers.Contract).calc_token_amount(amounts, true);
    }

    addLiquidity = async (amounts: BigNumber[], minMintAmount: BigNumber): Promise<any> => {
        const swapWithSigner = (this.swap as ethers.Contract).connect(signer);
        return await swapWithSigner.add_liquidity(amounts, minMintAmount);
    }

    gaugeDeposit = async (amount: BigNumber): Promise<any> => {
        const gauge_address = '0xbFcF63294aD7105dEa65aA58F8AE5BE2D9d0952A';
        const gaugeContract = new ethers.Contract(gauge_address, gaugeABI, signer);
        return await gaugeContract.deposit(amount);
    }

    // TODO: return number
    balances = async (...accounts: string[] | string[][]): Promise<{ [index: string]: ethers.BigNumber[] }> =>  {
        if (accounts.length == 1 && Array.isArray(accounts[0])) accounts = accounts[0];
        accounts = accounts as string[];

        const contractCalls = accounts.map((account: string) => (this.token as MulticallContract).balanceOf(account))
            .concat(accounts.map((account: string) => (this.gauge as MulticallContract).balanceOf(account)));
        const response: ethers.BigNumber[] = await multicallProvider.all(contractCalls);

        const result: { [index: string]: ethers.BigNumber[] }  = {};
        accounts.forEach((account: string, i: number) => {
            result[account] = [response[i], response[accounts.length + i]]
        });

        return result;
    }

    // TODO: return number
    tokenBalances = async (...accounts: string[] | string[][]): Promise<{ [index: string]: ethers.BigNumber }> =>  {
        if (accounts.length == 1 && Array.isArray(accounts[0])) accounts = accounts[0];
        accounts = accounts as string[];

        const contractCalls = accounts.map((account: string) => (this.token as MulticallContract).balanceOf(account));
        const response: ethers.BigNumber[] = await multicallProvider.all(contractCalls);

        const result: { [index: string]: ethers.BigNumber }  = {};
        accounts.forEach((account: string, i: number) => {
            result[account] = response[i]
        });

        return result;
    }

    // TODO: return number
    gaugeBalances = async (...accounts: string[] | string[][]): Promise<{ [index: string]: ethers.BigNumber }> =>  {
        if (accounts.length == 1 && Array.isArray(accounts[0])) accounts = accounts[0];
        accounts = accounts as string[];

        const contractCalls = accounts.map((account: string) => (this.gauge as MulticallContract).balanceOf(account));
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

        const contractCalls = accounts.map((account: string) => votingEscrowContract.balanceOf(account))
        contractCalls.push(votingEscrowContract.totalSupply(), (this.gauge as MulticallContract).totalSupply())
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

        const contractCalls = [votingEscrowContract.totalSupply(), (this.gauge as MulticallContract).totalSupply()]
        accounts.forEach((account: string) => {
            contractCalls.push(
                votingEscrowContract.balanceOf(account),
                (this.token as MulticallContract).balanceOf(account),
                (this.gauge as MulticallContract).balanceOf(account),
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

// GAUGE DEPOSIT
// const myPool = new Pool('3pool');
// myPool.init(async function() {
//     const address = await signer.getAddress();
//     const amounts: { [index: string]: BigNumber } = await myPool.tokenBalances(address);
//     const amount: BigNumber = amounts[address];
//
//     await myPool.ensureGaugeAllowance(amount);
//     const res = await myPool.gaugeDeposit(amount)
//
//     console.log(res);
// }).then(null, (e) => console.log(e));

// const myPool = new Pool('3pool');
// myPool.init(async function() {
//     const amounts: BigNumber[] = [];
//     for (const coin of myPool.coins) {
//         amounts.push(ethers.utils.parseUnits("100.0", coin.decimals));
//     }
//     await myPool.ensureAllowance(amounts);
// });

// const myPool = new Pool('3pool');
// myPool.init(async function() {
//     console.log(await myPool.gaugeAllowance())
// }).then(null, (e) => console.log(e));

// const myPool = new Pool('3pool');
// myPool.init(async function() {
//     const address = await signer.getAddress();
//     const res = await myPool.balances(address);
//
//     console.log(res);
// }).then(null, (e) => console.log(e));


// const daiAmount = ethers.utils.parseUnits("100.0", 18)
// console.log(daiAmount);
// console.log(ethers.utils.formatUnits(daiAmount, 1))