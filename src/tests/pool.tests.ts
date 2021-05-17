import { assert } from "chai";
import { getBestPoolAndOutput, Pool, swap } from "../pools";
import { CoinInterface } from "../interfaces"
import { BN, getBalances } from "../utils";
import { curve } from "../curve";


describe('Pool', function() {
    this.timeout(10000);
    const myPool = new Pool('3pool');
    let address = '';
    let coinAddresses: string[] = [];

    before(async function() {
        await curve.init();
        await myPool.init();
        address = await curve.signer.getAddress();
        coinAddresses = (myPool.coins as CoinInterface[]).map((coinObj: CoinInterface) => coinObj.underlying_address);
    });

    it('Adds liquidity', async function () {
        const initialCoinBalances: string[] = (await getBalances([address], coinAddresses))[address];

        await myPool.addLiquidity(['1000', '1000', '1000']);

        const coinBalancesAfterAddingLiquidity: string[] = (await getBalances([address], coinAddresses))[address];
        const lpTokenBalance = (await myPool.lpTokenBalances(address))[address];

        coinBalancesAfterAddingLiquidity.forEach((b: string, i: number) => {
            assert.deepStrictEqual(BN(b), BN(initialCoinBalances[i]).minus(BN(1000)))
        })
        // TODO more accurate test
        assert.isAbove(Number(lpTokenBalance), 0);
    }).timeout(15000);

    it('Deposits into gauge', async function () {
        const depositAmount: string = (await myPool.lpTokenBalances(address))[address];

        await myPool.gaugeDeposit(depositAmount);

        const [lpTokenBalance, gaugeBalance] = (await myPool.balances(address))[address];

        assert.strictEqual(depositAmount, gaugeBalance);
        assert.strictEqual(Number(lpTokenBalance), 0);
    }).timeout(15000);

    it('Withdraws from gauge', async function () {
        const withdrawAmount: string = (await myPool.gaugeBalances(address))[address];

        await myPool.gaugeWithdraw(withdrawAmount);

        const [lpTokenBalance, gaugeBalance] = (await myPool.balances(address))[address];

        assert.strictEqual(withdrawAmount, lpTokenBalance);
        assert.strictEqual(Number(gaugeBalance), 0);
    }).timeout(15000);

    it('Removes liquidity', async function () {
        const initialLpTokenBalance: string = (await myPool.lpTokenBalances(address))[address];
        const amountToRemove: string = BN(initialLpTokenBalance).div(10).toFixed(18);
        const initialCoinBalances: string[] = (await getBalances([address], coinAddresses))[address];

        await myPool.removeLiquidity(amountToRemove);

        const lpTokenBalanceAfterRemoval: string = (await myPool.lpTokenBalances(address))[address];
        const coinBalancesAfterRemoval: string[] = (await getBalances([address], coinAddresses))[address];

        assert.deepStrictEqual(BN(lpTokenBalanceAfterRemoval), BN(initialLpTokenBalance).minus(BN(amountToRemove)));
        coinBalancesAfterRemoval.forEach((b: string, i: number) => {
            // TODO more accurate test
            assert.isAbove(Number(b), Number(initialCoinBalances[i]))
        })
    }).timeout(15000);

    it('Removes liquidity imbalance', async function () {
        const initialLpTokenBalance: string = (await myPool.lpTokenBalances(address))[address];
        const initialCoinBalances: string[] = (await getBalances([address], coinAddresses))[address];

        await myPool.removeLiquidityImbalance(['90', '90', '90']);

        const lpTokenBalanceAfterRemoval: string = (await myPool.lpTokenBalances(address))[address];
        const coinBalancesAfterRemoval: string[] = (await getBalances([address], coinAddresses))[address];

        // TODO more accurate test
        assert.isBelow(Number(lpTokenBalanceAfterRemoval), Number(initialLpTokenBalance));
        coinBalancesAfterRemoval.forEach((b: string, i: number) => {
            assert.deepStrictEqual(BN(initialCoinBalances[i]), BN(b).minus(BN(90)));
        });
    }).timeout(15000);

    it('Removes liquidity one coin', async function () {
        const initialLpTokenBalance: string = (await myPool.lpTokenBalances(address))[address];
        const amountToRemove: string = BN(initialLpTokenBalance).div(10).toFixed(18);
        const initialCoinBalances: string[] = (await getBalances([address], coinAddresses))[address];

        await myPool.removeLiquidityOneCoin(amountToRemove, 0);

        const lpTokenBalanceAfterRemoval: string = (await myPool.lpTokenBalances(address))[address];
        const coinBalancesAfterRemoval: string[] = (await getBalances([address], coinAddresses))[address];

        // TODO more accurate test
        assert.deepStrictEqual(BN(lpTokenBalanceAfterRemoval), BN(initialLpTokenBalance).minus(BN(amountToRemove)));
        coinBalancesAfterRemoval.forEach((b: string, i: number) => {
            if (i === 0) {
                // TODO more accurate test
                assert.isAbove(Number(b), Number(initialCoinBalances[i]))
            } else {
                assert.strictEqual(b, initialCoinBalances[i]);
            }
        })
    }).timeout(15000);

    it('Swaps', async function () {
        const swapAmount = '100';
        const initialCoinBalances: string[] = (await getBalances([address], coinAddresses))[address];
        const expected = await myPool.getSwapOutput(0, 1, swapAmount);

        await myPool.exchange(0, 1, swapAmount, 0.02);

        const coinBalancesAfterSwap: string[] = (await getBalances([address], coinAddresses))[address];

        assert.deepStrictEqual(BN(coinBalancesAfterSwap[0]), BN(initialCoinBalances[0]).minus(BN(swapAmount)));
        assert.isAtLeast(Number(coinBalancesAfterSwap[1]), Number(BN(initialCoinBalances[1]).plus(BN(expected).times(0.98)).toString()));
    }).timeout(15000);

    it('Swaps using all pools', async function () {
        const swapAmount = '100';
        const dai = "0x6b175474e89094c44da98b954eedeac495271d0f";
        const usdc = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
        const initialBalances = (await getBalances([address], [dai, usdc]))[address];

        const { output } = await getBestPoolAndOutput(dai, usdc, swapAmount);
        await swap(dai, usdc, swapAmount);

        const balancesAfterSwap = (await getBalances([address], [dai, usdc]))[address];

        assert.deepStrictEqual(BN(balancesAfterSwap[0]), BN(initialBalances[0]).minus(BN(swapAmount)));
        assert.isAtLeast(Number(balancesAfterSwap[1]), Number(BN(initialBalances[1]).plus(BN(output).times(0.99)).toString()));
    }).timeout(60000);
});
