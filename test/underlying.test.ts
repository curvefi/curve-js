import { assert } from "chai";
import { Pool } from "../src/pools";
import { BN } from "../src/utils";
import { curve } from "../src/curve";
import { DictInterface } from "../lib/interfaces";

// const PLAIN_POOLS = ['susd', 'ren', 'sbtc', 'hbtc', '3pool', 'seth', 'eurs', 'steth', 'ankreth', 'link'];
const PLAIN_POOLS = ['susd', 'ren', 'sbtc', 'hbtc', '3pool', 'seth', 'steth', 'ankreth', 'link', 'reth']; // Without eurs
const LENDING_POOLS = ['compound', 'usdt', 'y', 'busd', 'pax', 'aave', 'saave', 'ib'];
const META_POOLS = ['gusd', 'husd', 'usdk', 'usdn', 'musd', 'rsv', 'tbtc', 'dusd', 'pbtc', 'bbtc', 'obtc', 'ust', 'usdp', 'tusd', 'frax', 'lusd', 'busdv2', 'alusd', 'mim'];

const underlyingLiquidityTest = (name: string) => {
    describe(`${name} add/remove liquidity`, function () {
        const myPool = new Pool(name);
        const coinAddresses = myPool.underlyingCoinAddresses;

        it('Adds liquidity', async function () {
            const amount = '10';
            const amounts = coinAddresses.map(() => amount);

            const initialBalances = await myPool.balances() as DictInterface<string>;
            const lpTokenExpected = await myPool.addLiquidityExpected(amounts)

            await myPool.addLiquidity(amounts);

            const balances = await myPool.balances() as DictInterface<string>;

            myPool.underlyingCoins.forEach((c: string) => {
                if (name === 'steth') {
                    assert.approximately(Number(BN(balances[c])), Number(BN(initialBalances[c]).minus(BN(amount).toString())), 1e-18);
                } else {
                    assert.deepStrictEqual(BN(balances[c]), BN(initialBalances[c]).minus(BN(amount)));
                }
            })
            if (['compound', 'usdt', 'y', 'busd', 'pax'].includes(name)) {
                assert.isAbove(Number(balances.lpToken) - Number(initialBalances.lpToken), Number(lpTokenExpected) * 0.99);
            } else {
                assert.approximately(Number(balances.lpToken) - Number(initialBalances.lpToken), Number(lpTokenExpected), 0.01);
            }
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
            const coinsExpected = await myPool.removeLiquidityExpected(lpTokenAmount);

            await myPool.removeLiquidity(lpTokenAmount);

            const balances = await myPool.balances() as DictInterface<string>;

            assert.deepStrictEqual(BN(balances.lpToken), BN(initialBalances.lpToken).minus(BN(lpTokenAmount)));
            myPool.underlyingCoins.forEach((c: string, i: number) => {
                const delta = name == 'gusd' ? 0.011 : 0.01;
                assert.approximately(Number(balances[c]) - Number(initialBalances[c]), Number(coinsExpected[i]), delta);
            })
        });

        if (myPool.name !== 'tricrypto2') {
            it('Removes liquidity imbalance', async function () {
                const amount = '1';
                const amounts = coinAddresses.map(() => amount);
                const initialBalances = await myPool.balances() as DictInterface<string>;
                const lpTokenExpected = await myPool.removeLiquidityImbalanceExpected(amounts);

                await myPool.removeLiquidityImbalance(amounts);

                const balances = await myPool.balances() as DictInterface<string>;

                assert.approximately(Number(initialBalances.lpToken) - Number(balances.lpToken), Number(lpTokenExpected), 0.01);
                myPool.underlyingCoins.forEach((c: string) => {
                    if (name === 'steth') {
                        assert.approximately(Number(initialBalances[c]), Number(BN(balances[c]).minus(BN(amount)).toString()), 1e-18);
                    } else if (['compound', 'usdt', 'y', 'busd', 'pax', 'ib'].includes(myPool.name)) {
                        assert.approximately(Number(initialBalances[c]), Number(BN(balances[c]).minus(BN(amount)).toString()), 3e-6);
                    } else {
                        assert.deepStrictEqual(BN(initialBalances[c]), BN(balances[c]).minus(BN(amount)));
                    }
                });
            });
        }

        it('Removes liquidity one coin', async function () {
            const initialBalances = await myPool.balances() as DictInterface<string>;
            const lpTokenAmount: string = BN(initialBalances.lpToken).div(10).toFixed(18);
            const expected = await myPool.removeLiquidityOneCoinExpected(lpTokenAmount, 0);

            await myPool.removeLiquidityOneCoin(lpTokenAmount, 0);

            const balances = await myPool.balances() as DictInterface<string>;

            assert.deepStrictEqual(BN(balances.lpToken), BN(initialBalances.lpToken).minus(BN(lpTokenAmount)));
            myPool.underlyingCoins.forEach((c: string, i: number) => {
                if (i === 0) {
                    assert.approximately(Number(balances[c]) - Number(initialBalances[c]), Number(expected), 0.01)
                } else {
                    assert.strictEqual(balances[c], initialBalances[c]);
                }
            })
        });
    });
}

const underlyingExchangeTest = (name: string) => {
    describe(`${name} exchange`, function () {
        const pool = new Pool(name);
        const coinAddresses = pool.underlyingCoinAddresses;

        for (let i = 0; i < coinAddresses.length; i++) {
            for (let j = 0; j < coinAddresses.length; j++) {
                if (i !== j) {
                    it(`${i} --> ${j}`, async function () {
                        const swapAmount = '10';
                        const initialCoinBalances = await pool.underlyingCoinBalances() as DictInterface<string>;
                        const expected = await pool.exchangeExpected(i, j, swapAmount);

                        await pool.exchange(i, j, swapAmount, 0.02);

                        const coinBalances = await pool.underlyingCoinBalances() as DictInterface<string>;

                        if (pool.name === 'steth') {
                            assert.approximately(Number(Object.values(coinBalances)[i]), Number(BN(Object.values(initialCoinBalances)[i]).minus(BN(swapAmount)).toString()), 1e-18);
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

const tricryptoExchangeTest = (useEth: boolean) => {
    describe(`tricrypto2 exchange (useEth=${useEth})`, function () {
        const pool = new Pool('tricrypto2');
        const coinAddresses = pool.underlyingCoinAddresses;

        for (let i = 0; i < coinAddresses.length; i++) {
            for (let j = 0; j < coinAddresses.length; j++) {
                if (i !== j) {
                    it(`${i} --> ${j}`, async function () {
                        const swapAmount = '10';
                        const initialCoinBalances = await pool.underlyingCoinBalances() as DictInterface<string>;
                        const expected = await pool.exchangeExpected(i, j, swapAmount);

                        await pool.exchangeTricrypto(i, j, swapAmount, 0.02, useEth);

                        const coinBalances = await pool.underlyingCoinBalances() as DictInterface<string>;

                        const initialInputCoinBalance = useEth && i === 2 ? initialCoinBalances['ETH'] : Object.values(initialCoinBalances)[i]
                        const inputCoinBalance = useEth && i === 2 ? coinBalances['ETH'] : Object.values(coinBalances)[i]
                        const initialOutputCoinBalance = useEth && j === 2 ? initialCoinBalances['ETH'] : Object.values(initialCoinBalances)[j]
                        const outputCoinBalance = useEth && j === 2 ? coinBalances['ETH'] : Object.values(coinBalances)[j]


                        assert.deepStrictEqual(BN(inputCoinBalance), BN(initialInputCoinBalance).minus(BN(swapAmount)));
                        assert.isAtLeast(Number(outputCoinBalance), Number(BN(initialOutputCoinBalance).plus(BN(expected).times(0.98)).toString()));
                    });
                }
            }
        }
    });
}

describe('Underlying test', async function () {
    this.timeout(120000);

    before(async function () {
        await curve.init('JsonRpc', {},{ gasPrice: 0 });
    });

    for (const poolName of PLAIN_POOLS) {
        underlyingLiquidityTest(poolName);
        if (poolName === 'tricrypto2') {
            tricryptoExchangeTest(false);
            tricryptoExchangeTest(true);
        } else {
            underlyingExchangeTest(poolName);
        }
    }

    for (const poolName of LENDING_POOLS) {
        underlyingLiquidityTest(poolName);
        underlyingExchangeTest(poolName);
    }

    for (const poolName of META_POOLS) {
        underlyingLiquidityTest(poolName);
        underlyingExchangeTest(poolName);
    }
})
