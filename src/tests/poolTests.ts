import { ethers, BigNumber } from "ethers";
import { Pool } from "../pools";
import { CoinInterface, DictInterface } from "../interfaces"
import { getBalances } from "../utils";
import { curve } from "../curve";


const showBalances = async (address: string, pool: Pool): Promise<void> => {
    console.log("Checking balances");
    const coinAddresses = (pool.coins as CoinInterface[]).map((coinObj: CoinInterface) => coinObj.underlying_address);
    const underlyingBalances: DictInterface<BigNumber[]> = await getBalances([address], coinAddresses);
    const userUnderlyingBalances: BigNumber[] = underlyingBalances[address];
    for (let i = 0; i < pool.coins.length; i++) {
        console.log(pool.coins[i].name, ": ", ethers.utils.formatUnits(userUnderlyingBalances[i], pool.coins[i].decimals || pool.coins[i].wrapped_decimals));
    }
    const lpBalances = await pool.balances(address);
    console.log("Pool tokens: ", ethers.utils.formatUnits(lpBalances[address][0], 18)); // TODO get decimals
    console.log("Gauge tokens: ", ethers.utils.formatUnits(lpBalances[address][1], 18)); // TODO get decimals
}

const myPool = new Pool('ren');
myPool.init(async function() {
    await curve.init();
    console.log(`--- ${myPool.name} ---`);
    const address = await curve.signer.getAddress();

    await showBalances(address, myPool);

    console.log('\nADD LIQUIDITY (100 100 100)\n');
    const amounts: BigNumber[] = [];
    for (const coin of myPool.coins) {
        amounts.push(ethers.utils.parseUnits("100.0", coin.decimals || coin.wrapped_decimals));
    }
    await myPool.addLiquidity(amounts);

    await showBalances(address, myPool);

    console.log('\nGAUGE DEPOSIT\n');
    const depositAmount: BigNumber = (await myPool.lpTokenBalances(address))[address];
    await myPool.gaugeDeposit(depositAmount);

    await showBalances(address, myPool);

    console.log('\nGAUGE WITHDRAW\n');
    await myPool.gaugeWithdraw(depositAmount);

    await showBalances(address, myPool);

    // console.log('\nREMOVE LIQUIDITY\n');
    // const hash = await myPool.removeLiquidity(depositAmount);
    // console.log(hash);

    // console.log('\nREMOVE LIQUIDITY IMBALANCE (90 90 90)\n');
    // const removeAmounts: BigNumber[] = [];
    // for (const coin of myPool.coins) {
    //     removeAmounts.push(ethers.utils.parseUnits("90", coin.decimals || coin.wrapped_decimals));
    // }
    //
    // const hash = await myPool.removeLiquidityImbalance(removeAmounts);
    // console.log(hash);

    console.log('\nREMOVE LIQUIDITY ONE COIN (DAI for 20 LP tokens)\n');
    const lpTokenAmount = ethers.utils.parseUnits("20");
    const hash = await myPool.removeLiquidityOneCoin(lpTokenAmount, 1);
    console.log(hash);

    await showBalances(address, myPool);
}).then(null, (e) => console.log(e));
