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

    console.log('\nADD LIQUIDITY\n');
    await myPool.addLiquidity(['0.00000001', '0', '0']);

    // await showBalances(address, myPool);
    //
    // console.log('\nGAUGE DEPOSIT\n');
    // const depositAmount: string = (await myPool.lpTokenBalances(address))[address];
    // console.log(depositAmount);
    // await myPool.gaugeDeposit(depositAmount);
    //
    // await showBalances(address, myPool);
    //
    // console.log('\nGAUGE WITHDRAW\n');
    // await myPool.gaugeWithdraw(depositAmount);
    //
    // await showBalances(address, myPool);
    //
    // // console.log('\nREMOVE LIQUIDITY\n');
    // // const hash = await myPool.removeLiquidity(depositAmount);
    //
    // // console.log('\nREMOVE LIQUIDITY IMBALANCE (90 90 90)\n');
    // // const hash = await myPool.removeLiquidityImbalance(['90', '90']);
    //
    // console.log('\nREMOVE LIQUIDITY ONE COIN (DAI for 20 LP tokens)\n');
    // const hash = await myPool.removeLiquidityOneCoin('20', 1);
    //
    // console.log('TX hash ' + hash + '\n');

    await showBalances(address, myPool);
}).then(null, (e) => console.log(e));
