import { assert } from "chai";
import { Pool } from "../pools";
import { BN, getBalances } from "../utils";
import { curve } from "../curve";

const LENDING_POOLS = ['compound', 'usdt', 'y', 'busd', 'pax', 'aave', 'saave', 'ib'];
const META_POOLS = ['gusd', 'husd', 'usdk', 'usdn', 'musd', 'rsv', 'tbtc', 'dusd', 'pbtc', 'bbtc', 'obtc', 'ust', 'usdp', 'tusd', 'frax', 'lusd', 'busdv2'];

const wrappedTest = (name: string) => {
    describe(`${name} pool`, function () {
        const myPool = new Pool(name);
        const coinAddresses = myPool.coins;
        let address = '';

        before(async function () {
            address = await curve.signer.getAddress();
        });

        it('Adds liquidity', async function () {
            const addAmount = '10';
            const addAmounts = coinAddresses.map(() => addAmount);

            const initialCoinBalances: string[] = (await getBalances([address], coinAddresses))[address];

            await myPool.addLiquidityWrapped(addAmounts);

            const coinBalancesAfterAddingLiquidity: string[] = (await getBalances([address], coinAddresses))[address];
            const lpTokenBalance = (await myPool.lpTokenBalances(address))[address];

            coinBalancesAfterAddingLiquidity.forEach((b: string, i: number) => {
                if (['aave', 'saave'].includes(name)) {
                    // Because of increasing quantity
                    assert.approximately(Number(BN(b)), Number(BN(initialCoinBalances[i]).minus(BN(addAmount).toString())), 1e-4);
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

            await myPool.removeLiquidityWrapped(amountToRemove);

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

            await myPool.removeLiquidityImbalanceWrapped(removeAmounts);

            const lpTokenBalanceAfterRemoval: string = (await myPool.lpTokenBalances(address))[address];
            const coinBalancesAfterRemoval: string[] = (await getBalances([address], coinAddresses))[address];

            // TODO more accurate test
            assert.isBelow(Number(lpTokenBalanceAfterRemoval), Number(initialLpTokenBalance));
            coinBalancesAfterRemoval.forEach((b: string, i: number) => {
                if (['aave', 'saave'].includes(name)) {
                    assert.approximately(Number(initialCoinBalances[i]), Number(BN(b).minus(BN(removeAmount)).toString()), 1e-4);
                } else {
                    assert.deepStrictEqual(BN(initialCoinBalances[i]), BN(b).minus(BN(removeAmount)));
                }
            });
        });

        if (!['compound', 'usdt', 'y', 'busd', 'pax'].includes(name)) {
            it('Removes liquidity one coin', async function () {
                const initialLpTokenBalance: string = (await myPool.lpTokenBalances(address))[address];
                const amountToRemove: string = BN(initialLpTokenBalance).div(10).toFixed(18);
                const initialCoinBalances: string[] = (await getBalances([address], coinAddresses))[address];

                await myPool.removeLiquidityOneCoinWrapped(amountToRemove, 0);

                const lpTokenBalanceAfterRemoval: string = (await myPool.lpTokenBalances(address))[address];
                const coinBalancesAfterRemoval: string[] = (await getBalances([address], coinAddresses))[address];

                // TODO more accurate test
                assert.deepStrictEqual(BN(lpTokenBalanceAfterRemoval), BN(initialLpTokenBalance).minus(BN(amountToRemove)));
                coinBalancesAfterRemoval.forEach((b: string, i: number) => {
                    if (i === 0) {
                        // TODO more accurate test
                        assert.isAbove(Number(b), Number(initialCoinBalances[i]))
                    } else {
                        if (['aave', 'saave'].includes(name)) {
                            // Because of increasing quantity
                            assert.approximately(Number(b), Number(initialCoinBalances[i]), 1e-4);
                        } else {
                            assert.strictEqual(b, initialCoinBalances[i]);
                        }
                    }
                })
            });
        }

        it('Swaps', async function () {
            const swapAmount = '10';
            const initialCoinBalances: string[] = (await getBalances([address], coinAddresses))[address];
            const expected = await myPool.getSwapOutputWrapped(0, 1, swapAmount);

            await myPool.exchangeWrapped(0, 1, swapAmount, 0.02);

            const coinBalancesAfterSwap: string[] = (await getBalances([address], coinAddresses))[address];

            if (['aave', 'saave'].includes(name)) {
                // Because of increasing quantity
                assert.approximately(Number(coinBalancesAfterSwap[0]), Number(BN(initialCoinBalances[0]).minus(BN(swapAmount).toString())), 1e-4);
            } else {
                assert.deepStrictEqual(BN(coinBalancesAfterSwap[0]), BN(initialCoinBalances[0]).minus(BN(swapAmount)));
            }
            assert.isAtLeast(Number(coinBalancesAfterSwap[1]), Number(BN(initialCoinBalances[1]).plus(BN(expected).times(0.98)).toString()));
        });
    });
}

describe('Wrapped tests', async function () {
    this.timeout(120000);

    before(async function () {
        await curve.init({ gasPrice: 0 });
    });

    for (const poolName of LENDING_POOLS) {
        wrappedTest(poolName);
    }

    for (const poolName of META_POOLS) {
        wrappedTest(poolName);
    }
})