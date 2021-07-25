import { assert } from "chai";
import { Pool } from "../src/pools";
import { BN } from "../src/utils";
import { curve } from "../src/curve";
import { DictInterface } from "../lib/interfaces";

const LENDING_POOLS = ['compound', 'usdt', 'y', 'busd', 'pax', 'aave', 'saave', 'ib'];
const META_POOLS = ['gusd', 'husd', 'usdk', 'usdn', 'musd', 'rsv', 'tbtc', 'dusd', 'pbtc', 'bbtc', 'obtc', 'ust', 'usdp', 'tusd', 'frax', 'lusd', 'busdv2', 'mim'];


const wrappedLiquidityTest = (name: string) => {
    describe(`${name} add/remove liquidity`, function () {
        const myPool = new Pool(name);
        const coinAddresses = myPool.coinAddresses;

        it('Adds liquidity', async function () {
            const amount = '10';
            const amounts = coinAddresses.map(() => amount);
            const initialBalances = await myPool.balances() as DictInterface<string>;
            const lpTokenExpected = await myPool.addLiquidityWrappedExpected(amounts)

            await myPool.addLiquidityWrapped(amounts);

            const balances = await myPool.balances() as DictInterface<string>;

            myPool.coins.forEach((c: string) => {
                if (['aave', 'saave'].includes(name)) {
                    // Because of increasing quantity
                    assert.approximately(Number(BN(balances[c])), Number(BN(initialBalances[c]).minus(BN(amount).toString())), 1e-4);
                } else {
                    assert.deepStrictEqual(BN(balances[c]), BN(initialBalances[c]).minus(BN(amount)));
                }
            })
            assert.approximately(Number(balances.lpToken) - Number(initialBalances.lpToken), Number(lpTokenExpected), 0.01);
        });

        it('Deposits into gauge', async function () {
            const depositAmount: string = (await myPool.lpTokenBalances() as DictInterface<string>).lpToken;

            await myPool.gaugeDeposit(depositAmount);

            const balances = await myPool.lpTokenBalances();

            assert.strictEqual(depositAmount, balances.gauge);
            assert.strictEqual(Number(balances.lpToken), 0);
        });

        it('Withdraws from gauge', async function () {
            const withdrawAmount: string = (await myPool.lpTokenBalances() as DictInterface<string>).gauge;

            await myPool.gaugeWithdraw(withdrawAmount);

            const balances = await myPool.lpTokenBalances();

            assert.strictEqual(withdrawAmount, balances.lpToken);
            assert.strictEqual(Number(balances.gauge), 0);
        });

        it('Removes liquidity', async function () {
            const initialBalances = await myPool.balances() as DictInterface<string>;
            const lpTokenAmount: string = BN(initialBalances.lpToken).div(10).toFixed(18);
            const coinsExpected = await myPool.removeLiquidityWrappedExpected(lpTokenAmount);

            await myPool.removeLiquidityWrapped(lpTokenAmount);

            const balances = await myPool.balances() as DictInterface<string>;

            assert.deepStrictEqual(BN(balances.lpToken), BN(initialBalances.lpToken).minus(BN(lpTokenAmount)));
            myPool.coins.forEach((c: string, i: number) => {
                const delta = name == 'gusd' ? 0.011 : 0.01
                assert.approximately(Number(balances[c]) - Number(initialBalances[c]), Number(coinsExpected[i]), delta);
            });
        });

        it('Removes liquidity imbalance', async function () {
            const amount = '1';
            const amounts = coinAddresses.map(() => amount);
            const initialBalances = await myPool.balances() as DictInterface<string>;
            const lpTokenExpected = await myPool.removeLiquidityImbalanceWrappedExpected(amounts);

            await myPool.removeLiquidityImbalanceWrapped(amounts);

            const balances = await myPool.balances() as DictInterface<string>;

            assert.approximately(Number(initialBalances.lpToken) - Number(balances.lpToken), Number(lpTokenExpected), 0.01);
            myPool.coins.forEach((c: string) => {
                if (['aave', 'saave'].includes(name)) {
                    assert.approximately(Number(initialBalances[c]), Number(BN(balances[c]).minus(BN(amount)).toString()), 1e-4);
                } else {
                    assert.deepStrictEqual(BN(initialBalances[c]), BN(balances[c]).minus(BN(amount)));
                }
            });
        });

        if (!['compound', 'usdt', 'y', 'busd', 'pax'].includes(name)) {
            it('Removes liquidity one coin', async function () {
                const initialBalances = await myPool.balances() as DictInterface<string>;
                const lpTokenAmount: string = BN(initialBalances.lpToken).div(10).toFixed(18);
                const expected = await myPool.removeLiquidityOneCoinWrappedExpected(lpTokenAmount, 0);

                await myPool.removeLiquidityOneCoinWrapped(lpTokenAmount, 0);

                const balances = await myPool.balances() as DictInterface<string>;

                assert.deepStrictEqual(BN(balances.lpToken), BN(initialBalances.lpToken).minus(BN(lpTokenAmount)));
                myPool.coins.forEach((c: string, i: number) => {
                    if (i === 0) {
                        assert.approximately(Number(balances[c]) - Number(initialBalances[c]), Number(expected), 0.01);
                    } else {
                        if (['aave', 'saave'].includes(name)) {
                            // Because of increasing quantity
                            assert.approximately(Number(balances[c]), Number(initialBalances[c]), 1e-4);
                        } else {
                            assert.strictEqual(balances[c], initialBalances[c]);
                        }
                    }
                })
            });
        }
    });
}

const wrappedExchangeTest = (name: string) => {
    describe(`${name} exchange`, function () {
        const pool = new Pool(name);
        const coinAddresses = pool.coinAddresses;

        for (let i = 0; i < coinAddresses.length; i++) {
            for (let j = 0; j < coinAddresses.length; j++) {
                if (i !== j) {
                    it(`${i} --> ${j}`, async function () {
                        const swapAmount = '10';
                        const initialCoinBalances = await pool.coinBalances() as DictInterface<string>;
                        const expected = await pool.exchangeWrappedExpected(i, j, swapAmount);

                        await pool.exchangeWrapped(i, j, swapAmount, 0.02);

                        const coinBalances = await pool.coinBalances() as DictInterface<string>;

                        if (['aave', 'saave'].includes(pool.name)) {
                            // Because of increasing quantity
                            assert.approximately(Number(Object.values(coinBalances)[i]), Number(BN(Object.values(initialCoinBalances)[i]).minus(BN(swapAmount).toString())), 1e-4);
                        } else {
                            assert.deepStrictEqual(BN(Object.values(coinBalances)[i]), BN(Object.values(initialCoinBalances)[i]).minus(BN(swapAmount)));
                        }
                        assert.isAtLeast(Number(Object.values(coinBalances)[j]), Number(BN(Object.values(initialCoinBalances)[j]).plus(BN(expected).times(0.98)).toString()));
                    });
                }
            }
        }
    });
}

describe('Wrapped test', async function () {
    this.timeout(120000);

    before(async function () {
        await curve.init('JsonRpc', {}, { gasPrice: 0 });
    });

    for (const poolName of LENDING_POOLS) {
        wrappedLiquidityTest(poolName);
        wrappedExchangeTest(poolName);
    }

    for (const poolName of META_POOLS) {
        wrappedLiquidityTest(poolName);
        wrappedExchangeTest(poolName);
    }
})