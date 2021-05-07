import {BigNumber, ethers} from "ethers";
import { Pool } from "../pools";
import { Provider as MulticallProvider, Contract as MulticallContract } from 'ethers-multicall';
import ERC20Abi from '../constants/abis/json/ERC20.json';
import { DictInterface } from "../interfaces"
import { getBalances, ALIASES } from "../utils";
import { createLock, getLockedAmountAndUnlockTime } from '../voting';

const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545/');
// const multicallProvider = new MulticallProvider(provider);
const signer = provider.getSigner();

const showBalances = async (address: string): Promise<void> => {
    console.log("Checking balances");
    const crvMulticallContract = new MulticallContract(ALIASES.crv, ERC20Abi);
    const balances: DictInterface<BigNumber[]> = await getBalances(
        [address],
        [crvMulticallContract]
    );
    const { lockedAmount } = await getLockedAmountAndUnlockTime(address);
    console.log("CRV: ", ethers.utils.formatUnits(balances[address][0], 18)); // TODO get decimals
    console.log("Locked CRV: ", lockedAmount); // TODO get decimals
}

const myPool = new Pool('3pool');
myPool.init(async function() {
    console.log(`--- VOTING ESCROW ---`);
    const address = await signer.getAddress();

    await showBalances(address);

    console.log('\nCREATE LOCK (50 000 CRV)\n');
    const hash = await createLock('50000.0', 365);
    console.log('TX hash: ', hash, '\n');

    await showBalances(address);
}).then(null, (e) => console.log(e));
