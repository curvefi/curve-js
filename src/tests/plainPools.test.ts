import { assert } from "chai";
import BigNumber from "bignumber.js";
import { getBestPoolAndOutput, Pool, swap } from "../pools";
import { CoinInterface } from "../interfaces"
import { BN, getBalances, _getBalancesBN, toStringFromBN } from "../utils";
import { curve } from "../curve";

const PLAIN_POOLS = ['susdv2', 'ren', 'sbtc', 'hbtc', '3pool', 'seth', 'eurs', 'steth', 'ankreth', 'link'];
const LENDING_POOLS = ['compound', 'usdt', 'iearn', 'busd', 'pax']//, 'idle', 'saave', 'ib'];

const plainPoolTest = (name: string) => {
    describe(`${name} pool`, function () {
        const myPool = new Pool(name);
        let address = '';
        let coinAddresses: string[] = [];

        before(async function () {
            await myPool.init();
            address = await curve.signer.getAddress();
            coinAddresses = (myPool.coins as CoinInterface[]).map((coinObj: CoinInterface) => (coinObj.underlying_address || coinObj.wrapped_address) as string);
        });

        it('Adds liquidity', async function () {
            const addAmount = '10';
            const addAmounts = coinAddresses.map(() => addAmount);

            const initialCoinBalances: string[] = (await getBalances([address], coinAddresses))[address];

            await myPool.addLiquidity(addAmounts);

            const coinBalancesAfterAddingLiquidity: string[] = (await getBalances([address], coinAddresses))[address];
            const lpTokenBalance = (await myPool.lpTokenBalances(address))[address];

            coinBalancesAfterAddingLiquidity.forEach((b: string, i: number) => {
                if (name === 'steth') {
                    assert.approximately(Number(BN(b)), Number(BN(initialCoinBalances[i]).minus(BN(addAmount).toString())), 1e-18);
                } else {
                    assert.deepStrictEqual(BN(b), BN(initialCoinBalances[i]).minus(BN(addAmount)));
                }
            })
            // TODO more accurate test
            assert.isAbove(Number(lpTokenBalance), 0);
        });

        it('Deposits into gauge', async function () {
            const depositAmount: string = (await myPool.lpTokenBalances(address))[address];

            await myPool.gaugeDeposit(depositAmount);

            const [lpTokenBalance, gaugeBalance] = (await myPool.balances(address))[address];

            assert.strictEqual(depositAmount, gaugeBalance);
            assert.strictEqual(Number(lpTokenBalance), 0);
        });

        it('Withdraws from gauge', async function () {
            const withdrawAmount: string = (await myPool.gaugeBalances(address))[address];

            await myPool.gaugeWithdraw(withdrawAmount);

            const [lpTokenBalance, gaugeBalance] = (await myPool.balances(address))[address];

            assert.strictEqual(withdrawAmount, lpTokenBalance);
            assert.strictEqual(Number(gaugeBalance), 0);
        });

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
        });

        it('Removes liquidity imbalance', async function () {
            const removeAmount = '1';
            const removeAmounts = coinAddresses.map(() => removeAmount);

            const initialLpTokenBalance: string = (await myPool.lpTokenBalances(address))[address];
            const initialCoinBalances: string[] = (await getBalances([address], coinAddresses))[address];

            await myPool.removeLiquidityImbalance(removeAmounts);

            const lpTokenBalanceAfterRemoval: string = (await myPool.lpTokenBalances(address))[address];
            const coinBalancesAfterRemoval: string[] = (await getBalances([address], coinAddresses))[address];

            // TODO more accurate test
            assert.isBelow(Number(lpTokenBalanceAfterRemoval), Number(initialLpTokenBalance));
            coinBalancesAfterRemoval.forEach((b: string, i: number) => {
                if (name === 'steth') {
                    assert.approximately(Number(initialCoinBalances[i]), Number(BN(b).minus(BN(removeAmount)).toString()), 1e-18);
                } else if (['compound', 'usdt', 'y', 'busd', 'pax'].includes(myPool.name)) {
                    assert.approximately(Number(initialCoinBalances[i]), Number(BN(b).minus(BN(removeAmount)).toString()), 2e-6);
                } else {
                    assert.deepStrictEqual(BN(initialCoinBalances[i]), BN(b).minus(BN(removeAmount)));
                }
            });
        });

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
        });

        it('Swaps', async function () {
            const swapAmount = '10';
            const initialCoinBalances: string[] = (await getBalances([address], coinAddresses))[address];
            const expected = await myPool.getSwapOutput(0, 1, swapAmount);

            await myPool.exchange(0, 1, swapAmount, 0.02);

            const coinBalancesAfterSwap: string[] = (await getBalances([address], coinAddresses))[address];

            if (name === 'steth') {
                assert.approximately(Number(coinBalancesAfterSwap[0]), Number(BN(initialCoinBalances[0]).minus(BN(swapAmount)).toString()), 1e-18);
            } else {
                assert.deepStrictEqual(BN(coinBalancesAfterSwap[0]), BN(initialCoinBalances[0]).minus(BN(swapAmount)));
            }
            assert.isAtLeast(Number(coinBalancesAfterSwap[1]), Number(BN(initialCoinBalances[1]).plus(BN(expected).times(0.98)).toString()));
        });
    });
}

describe('Pools', async function () {
    this.timeout(120000);

    before(async function () {
        await curve.init({ gasPrice: 0 });
    });

    for (const poolName of PLAIN_POOLS) {
        plainPoolTest(poolName);
    }

    for (const poolName of LENDING_POOLS) {
        plainPoolTest(poolName);
    }
})

// it('Swaps using all pools', async function () {
//     const swapAmount = '100';
//     const dai = "0x6b175474e89094c44da98b954eedeac495271d0f";
//     const usdc = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
//     const initialBalances = (await getBalances([address], [dai, usdc]))[address];
//
//     const { output } = await getBestPoolAndOutput(dai, usdc, swapAmount);
//     await swap(dai, usdc, swapAmount);
//
//     const balancesAfterSwap = (await getBalances([address], [dai, usdc]))[address];
//
//     assert.deepStrictEqual(BN(balancesAfterSwap[0]), BN(initialBalances[0]).minus(BN(swapAmount)));
//     assert.isAtLeast(Number(balancesAfterSwap[1]), Number(BN(initialBalances[1]).plus(BN(output).times(0.99)).toString()));
// });
