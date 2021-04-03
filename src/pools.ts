import { ethers } from "ethers";
import { Provider as MulticallProvider, Contract as MulticallContract } from 'ethers-multicall';
import ERC20Abi from './abis/ERC20.json';
import { getPoolData, ALIASES } from './utils';
import { PoolDataInterface, ObjectInterface, BigNumberInterface } from './interfaces';

const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545/');
const multicallProvider = new MulticallProvider(provider);

class Pool {
    name: string;
    swap: string | null;
    token: MulticallContract | null;
    gauge: MulticallContract | null;
    coins: ObjectInterface<unknown>[] | null;

    constructor(name: string) {
        this.name = name;
        this.swap = null;
        this.token = null;
        this.gauge = null;
        this.coins = null;
    }

    async init(callback: () => void) {
        await multicallProvider.init();
        const poolData: PoolDataInterface = await getPoolData(this.name);
        this.swap = poolData['swap_address'] as string;
        this.token = new MulticallContract(poolData['lp_token_address'], ERC20Abi);
        this.gauge = new MulticallContract(poolData['gauge_addresses'][0], ERC20Abi);
        this.coins = poolData['coins'];
        callback.bind(this)();
    }

    // TODO: return number
    balances = async (...accounts: string[] | string[][]): Promise<{ [index: string]: BigNumberInterface[] }> =>  {
        if (accounts.length == 1 && Array.isArray(accounts[0])) accounts = accounts[0];
        accounts = accounts as string[];

        const contractCalls = accounts.map((account: string) => (this.token as MulticallContract).balanceOf(account))
            .concat(accounts.map((account: string) => (this.gauge as MulticallContract).balanceOf(account)));
        const response: BigNumberInterface[] = await multicallProvider.all(contractCalls);

        const result: { [index: string]: BigNumberInterface[] }  = {};
        accounts.forEach((account: string, i: number) => {
            result[account] = [response[i], response[accounts.length + i]]
        });

        return result;
    }

    // TODO: return number
    tokenBalances = async (...accounts: string[] | string[][]): Promise<{ [index: string]: BigNumberInterface }> =>  {
        if (accounts.length == 1 && Array.isArray(accounts[0])) accounts = accounts[0];
        accounts = accounts as string[];

        const contractCalls = accounts.map((account: string) => (this.token as MulticallContract).balanceOf(account));
        const response: BigNumberInterface[] = await multicallProvider.all(contractCalls);

        const result: { [index: string]: BigNumberInterface }  = {};
        accounts.forEach((account: string, i: number) => {
            result[account] = response[i]
        });

        return result;
    }

    // TODO: return number
    gaugeBalances = async (...accounts: string[] | string[][]): Promise<{ [index: string]: BigNumberInterface }> =>  {
        if (accounts.length == 1 && Array.isArray(accounts[0])) accounts = accounts[0];
        accounts = accounts as string[];

        const contractCalls = accounts.map((account: string) => (this.gauge as MulticallContract).balanceOf(account));
        const response: BigNumberInterface[] = await multicallProvider.all(contractCalls);

        const result: { [index: string]: BigNumberInterface }  = {};
        accounts.forEach((account: string, i: number) => {
            result[account] = response[i]
        });

        return result;
    }

    // TODO: return int((response.pop() / ve_total_supply) * gauge_total_supply)
    gaugeMaxBoostedDeposit = async (...accounts: string[]): Promise<{ [index: string]: BigNumberInterface[] }> => {
        if (accounts.length == 1 && Array.isArray(accounts[0])) accounts = accounts[0];
        const votingEscrowContract = new MulticallContract(ALIASES.voting_escrow, ERC20Abi);

        const contractCalls = accounts.map((account: string) => votingEscrowContract.balanceOf(account))
        contractCalls.push(votingEscrowContract.totalSupply(), (this.gauge as MulticallContract).totalSupply())
        const response: BigNumberInterface[] = await multicallProvider.all(contractCalls);

        const [votingEscrowTotalSupply, gaugeTotalSupply] = response.splice(-2);

        const result: { [index: string]: BigNumberInterface[] }  = {};
        accounts.forEach((account: string, i: number) => {
            result[account] = [response[i], votingEscrowTotalSupply, gaugeTotalSupply]
        });

        return result;
    }

    // TODO return optimal
    gaugeOptimalDeposits = async (...accounts: string[]): Promise<{ [index: string]: BigNumberInterface[] }> => {
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
        const response: BigNumberInterface[] = await multicallProvider.all(contractCalls);

        const [votingEscrowTotalSupply, gaugeTotalSupply] = response.splice(0,2);

        const result: { [index: string]: BigNumberInterface[] }  = {};
        for (let i = 0; i < response.length; i += 3) {
            result[accounts[Math.floor(i / 3)]] = [response[i], response[i + 1], response[i + 2], votingEscrowTotalSupply, gaugeTotalSupply]
        }

        return result
    }
}

const myPool = new Pool('usdn');
myPool.init(async function() {
    const res = await myPool.gaugeOptimalDeposits('0xfbf7f16D0352d68C2fCbA06bd86cC9706076992E', '0x66aB6D9362d4F35596279692F0251Db635165871');

    console.log(res);
});
