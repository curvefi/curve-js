import { ethers } from "ethers";
import { Pool } from "../pools";
import { CoinInterface } from "../interfaces"
import { getBalances } from "../utils";
import { curve } from "../curve";

const showBalances = async (address: string, pool: Pool): Promise<void> => {
    console.log("Checking balances");
    const coinAddresses = (pool.coins as CoinInterface[]).map((coinObj: CoinInterface) => coinObj.underlying_address);
    const underlyingBalances: string[] = (await getBalances([address], coinAddresses))[address];
    for (let i = 0; i < pool.coins.length; i++) {
        console.log(pool.coins[i].name, ": ", underlyingBalances[i]);
    }
    const lpBalances = (await pool.balances(address))[address];
    console.log("Pool tokens: ", lpBalances[0]); // TODO get decimals
    console.log("Gauge tokens: ", lpBalances[1]); // TODO get decimals
}

const myPool = new Pool('3pool');
myPool.init(async function() {
    await curve.init();

    console.log(`--- ${myPool.name} ---`);
    const address = await curve.signer.getAddress();

    await showBalances(address, myPool);

    console.log('\nSWAP (100 coins[0] --> coins[1])\n');
    const output = await myPool.getSwapOutput(0, 1, "5000.0");
    console.log('Expected: ', output);
    const hash = await myPool.exchange(0, 1, '5000', 0.02);
    console.log(hash);

    await showBalances(address, myPool);
}).then(null, (e) => console.log(e));
