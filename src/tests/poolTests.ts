import {BigNumber, ethers} from "ethers";
import { Pool } from "../pools";
import {CoinInterface, ObjectInterface} from "../interfaces"
import { getBalances } from "../utils";

const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545/');
const signer = provider.getSigner();

const showBalances = async (address: string, pool: Pool): Promise<void> => {
    console.log("Checking balances");
    const coinAddresses = (pool.coins as CoinInterface[]).map((coinObj: CoinInterface) => coinObj.underlying_address);
    const underlyingBalances: ObjectInterface<BigNumber[]> = await getBalances([address], coinAddresses);
    const userUnderlyingBalances: BigNumber[] = underlyingBalances[address];
    for (let i = 0; i < pool.coins.length; i++) {
        console.log(pool.coins[i].name, ": ", ethers.utils.formatUnits(userUnderlyingBalances[i], pool.coins[i].decimals));
    }
    const lpBalances = await pool.balances(address);
    console.log("Pool tokens: ", ethers.utils.formatUnits(lpBalances[address][0], 18)); // TODO get decimals
    console.log("Gauge tokens: ", ethers.utils.formatUnits(lpBalances[address][1], 18)); // TODO get decimals
}

const myPool = new Pool('3pool');
myPool.init(async function() {
    console.log('--- 3pool ---');
    const address = await signer.getAddress();

    await showBalances(address, myPool);

    console.log('\nADD LIQUIDITY (100 100 100)\n');
    const amounts: BigNumber[] = [];
    for (const coin of myPool.coins) {
        amounts.push(ethers.utils.parseUnits("100.0", coin.decimals));
    }
    await myPool.ensureLiquidityAllowance(amounts);
    let minMintAmount = await myPool.calcLpTokenAmount(amounts);
    minMintAmount = minMintAmount.div(100).mul(99);
    console.log("Min mint amount: ", ethers.utils.formatUnits(minMintAmount, 18));
    await myPool.addLiquidity(amounts, minMintAmount);

    await showBalances(address, myPool);

    console.log('\nGAUGE DEPOSIT\n');
    const tokenBalance: ObjectInterface<BigNumber> = await myPool.lpTokenBalances(address);
    const depositAmount: BigNumber = tokenBalance[address];

    await myPool.ensureGaugeAllowance(depositAmount);
    await myPool.gaugeDeposit(depositAmount);

    await showBalances(address, myPool);

    console.log('\nGAUGE WITHDRAW\n');
    await myPool.gaugeWithdraw(depositAmount);

    await showBalances(address, myPool);

    console.log('\nREMOVE LIQUIDITY\n');
    const minAmounts = await myPool.calcUnderlyingCoinsAmount(depositAmount);
    await myPool.removeLiquidity(depositAmount, minAmounts);

    await showBalances(address, myPool);
}).then(null, (e) => console.log(e));
