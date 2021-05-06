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

const myPool = new Pool('ren');
myPool.init(async function() {
    console.log(`--- ${myPool.name} ---`);
    const address = await signer.getAddress();

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
    // const minAmounts = await myPool.calcUnderlyingCoinsAmount(depositAmount);
    // await myPool.removeLiquidity(depositAmount, minAmounts);

    // console.log('\nREMOVE LIQUIDITY IMBALANCE (100 100 100)\n');
    // const removeAmounts: BigNumber[] = [];
    // for (const coin of myPool.coins) {
    //     removeAmounts.push(ethers.utils.parseUnits("90", coin.decimals || coin.wrapped_decimals));
    // }
    //
    // let maxBurnAmount = await myPool.calcLpTokenAmount(removeAmounts, false)
    // maxBurnAmount = maxBurnAmount.div(100).mul(101);
    // console.log("Max burn amount: ", ethers.utils.formatUnits(maxBurnAmount, 18));
    // await myPool.removeLiquidityImbalance(removeAmounts, maxBurnAmount);

    console.log('\nREMOVE LIQUIDITY ONE COIN (DAI for 20 LP tokens)\n');
    const lpTokenAmount = ethers.utils.parseUnits("20");
    const i = 1;
    let minAmount = await myPool.calcWithdrawOneCoin(lpTokenAmount, i);
    minAmount = minAmount.div(100).mul(99);
    console.log("Min amount to remove: ", ethers.utils.formatUnits(minAmount, myPool.coins[i].decimals || myPool.coins[i].wrapped_decimals));
    await myPool.removeLiquidityOneCoin(lpTokenAmount, i, minAmount)

    await showBalances(address, myPool);
}).then(null, (e) => console.log(e));
