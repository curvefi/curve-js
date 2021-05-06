import {BigNumber, ethers} from "ethers";
import { Pool } from "../pools";
import {CoinInterface, DictInterface} from "../interfaces"
import { getBalances } from "../utils";

const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545/');
const signer = provider.getSigner();

const showBalances = async (address: string, pool: Pool): Promise<void> => {
    console.log("Checking balances");
    const coinMulticallContracts = (pool.coins as CoinInterface[]).map((coinObj: CoinInterface) => coinObj.multicall_contract);
    const underlyingBalances: DictInterface<BigNumber[]> = await getBalances([address], coinMulticallContracts);
    const userUnderlyingBalances: BigNumber[] = underlyingBalances[address];
    for (let i = 0; i < pool.coins.length; i++) {
        console.log(pool.coins[i].name, ": ", ethers.utils.formatUnits(userUnderlyingBalances[i], pool.coins[i].decimals || pool.coins[i].wrapped_decimals));
    }
    const lpBalances = await pool.balances(address);
    console.log("Pool tokens: ", ethers.utils.formatUnits(lpBalances[address][0], 18)); // TODO get decimals
    console.log("Gauge tokens: ", ethers.utils.formatUnits(lpBalances[address][1], 18)); // TODO get decimals
}

const myPool = new Pool('3pool');
myPool.init(async function() {
    console.log(`--- ${myPool.name} ---`);
    const address = await signer.getAddress();

    await showBalances(address, myPool);

    console.log('\nSWAP (100 coins[0] --> coins[1])\n');
    const amount = ethers.utils.parseUnits("50000.0", myPool.coins[0].decimals || myPool.coins[0].wrapped_decimals);
    await myPool.exchange(0, 1, amount, 0.02);

    await showBalances(address, myPool);
}).then(null, (e) => console.log(e));
