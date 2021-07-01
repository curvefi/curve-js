import { assert } from "chai";
import { Pool } from "../pools";
import { BN, getBalances } from "../utils";
import { curve } from "../curve";

// const PLAIN_POOLS = ['susd', 'ren', 'sbtc', 'hbtc', '3pool', 'seth', 'eurs', 'steth', 'ankreth', 'link'];
const PLAIN_POOLS = ['susd', 'ren', 'sbtc', 'hbtc', '3pool', 'seth', 'steth', 'ankreth', 'link']; // Without eurs
const LENDING_POOLS = ['compound', 'usdt', 'y', 'busd', 'pax', 'aave', 'saave', 'ib'];
const META_POOLS = ['gusd', 'husd', 'usdk', 'usdn', 'musd', 'rsv', 'tbtc', 'dusd', 'pbtc', 'bbtc', 'obtc', 'ust', 'usdp', 'tusd', 'frax', 'lusd', 'busdv2'];

const underlyingLiquidityTest = (name: string) => {
    describe(`${name} add/remove liquidity`, function () {
        const myPool = new Pool(name);
        const coinAddresses = myPool.underlyingCoins;
        let address = '';

        before(async function () {
            address = await curve.signer.getAddress();
        });

        it('Adds liquidity', async function () {
            const amount = '10';
            const amounts = coinAddresses.map(() => amount);

            const initialCoinBalances: string[] = (await getBalances([address], coinAddresses))[address];
            const initialLpTokenBalance = (await myPool.lpTokenBalances(address))[address];
            const lpTokenExpected = await myPool.addLiquidityExpected(amounts)

            await myPool.addLiquidity(amounts);

            const coinBalances: string[] = (await getBalances([address], coinAddresses))[address];
            const lpTokenBalance = (await myPool.lpTokenBalances(address))[address];

            coinBalances.forEach((b: string, i: number) => {
                if (name === 'steth') {
                    assert.approximately(Number(BN(b)), Number(BN(initialCoinBalances[i]).minus(BN(amount).toString())), 1e-18);
                } else {
                    assert.deepStrictEqual(BN(b), BN(initialCoinBalances[i]).minus(BN(amount)));
                }
            })
            if (['compound', 'usdt', 'y', 'busd', 'pax'].includes(name)) {
                assert.isAbove(Number(lpTokenBalance) - Number(initialLpTokenBalance), Number(lpTokenExpected) * 0.99);
            } else {
                assert.approximately(Number(lpTokenBalance) - Number(initialLpTokenBalance), Number(lpTokenExpected), 0.01);
            }
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
            const lpTokenAmount: string = BN(initialLpTokenBalance).div(10).toFixed(18);
            const initialCoinBalances: string[] = (await getBalances([address], coinAddresses))[address];
            const coinsExpected = await myPool.removeLiquidityExpected(lpTokenAmount);

            await myPool.removeLiquidity(lpTokenAmount);

            const lpTokenBalance: string = (await myPool.lpTokenBalances(address))[address];
            const coinBalances: string[] = (await getBalances([address], coinAddresses))[address];

            assert.deepStrictEqual(BN(lpTokenBalance), BN(initialLpTokenBalance).minus(BN(lpTokenAmount)));
            coinBalances.forEach((b: string, i: number) => {
                const delta = name == 'gusd' ? 0.011 : 0.01;
                assert.approximately(Number(b) - Number(initialCoinBalances[i]), Number(coinsExpected[i]), delta);
            })
        });

        it('Removes liquidity imbalance', async function () {
            const amount = '1';
            const amounts = coinAddresses.map(() => amount);

            const initialLpTokenBalance: string = (await myPool.lpTokenBalances(address))[address];
            const initialCoinBalances: string[] = (await getBalances([address], coinAddresses))[address];
            const lpTokenExpected = await myPool.removeLiquidityImbalanceExpected(amounts);

            await myPool.removeLiquidityImbalance(amounts);

            const lpTokenBalance: string = (await myPool.lpTokenBalances(address))[address];
            const coinBalances: string[] = (await getBalances([address], coinAddresses))[address];

            assert.approximately(Number(initialLpTokenBalance) - Number(lpTokenBalance), Number(lpTokenExpected), 0.01);
            coinBalances.forEach((b: string, i: number) => {
                if (name === 'steth') {
                    assert.approximately(Number(initialCoinBalances[i]), Number(BN(b).minus(BN(amount)).toString()), 1e-18);
                } else if (['compound', 'usdt', 'y', 'busd', 'pax', 'ib'].includes(myPool.name)) {
                    assert.approximately(Number(initialCoinBalances[i]), Number(BN(b).minus(BN(amount)).toString()), 3e-6);
                } else {
                    assert.deepStrictEqual(BN(initialCoinBalances[i]), BN(b).minus(BN(amount)));
                }
            });
        });

        it('Removes liquidity one coin', async function () {
            const initialLpTokenBalance: string = (await myPool.lpTokenBalances(address))[address];
            const lpTokenAmount: string = BN(initialLpTokenBalance).div(10).toFixed(18);
            const initialCoinBalances: string[] = (await getBalances([address], coinAddresses))[address];
            const expected = await myPool.removeLiquidityOneCoinExpected(lpTokenAmount, 0);

            await myPool.removeLiquidityOneCoin(lpTokenAmount, 0);

            const lpTokenBalance: string = (await myPool.lpTokenBalances(address))[address];
            const coinBalances: string[] = (await getBalances([address], coinAddresses))[address];

            assert.deepStrictEqual(BN(lpTokenBalance), BN(initialLpTokenBalance).minus(BN(lpTokenAmount)));
            coinBalances.forEach((b: string, i: number) => {
                if (i === 0) {
                    assert.approximately(Number(b) - Number(initialCoinBalances[i]), Number(expected), 0.01)
                } else {
                    assert.strictEqual(b, initialCoinBalances[i]);
                }
            })
        });
    });
}

const underlyingExchangeTest = (name: string) => {
    describe(`${name} exchange`, function () {
        const pool = new Pool(name);
        let address = '';

        before(async function () {
            address = await curve.signer.getAddress();
        });

        for (let i = 0; i < pool.underlyingCoins.length; i++) {
            for (let j = 0; j < pool.underlyingCoins.length; j++) {
                if (i !== j) {
                    it(`${i} --> ${j}`, async function () {
                        const swapAmount = '10';
                        const initialCoinBalances: string[] = (await getBalances([address], pool.underlyingCoins))[address];
                        const expected = await pool.getExchangeOutput(i, j, swapAmount);

                        await pool.exchange(i, j, swapAmount, 0.02);

                        const coinBalances: string[] = (await getBalances([address], pool.underlyingCoins))[address];

                        if (pool.name === 'steth') {
                            assert.approximately(Number(coinBalances[i]), Number(BN(initialCoinBalances[i]).minus(BN(swapAmount)).toString()), 1e-18);
                        } else {
                            assert.deepStrictEqual(BN(coinBalances[i]), BN(initialCoinBalances[i]).minus(BN(swapAmount)));
                        }
                        assert.isAtLeast(Number(coinBalances[j]), Number(BN(initialCoinBalances[j]).plus(BN(expected).times(0.98)).toString()));
                    });
                }
            }
        }
    });
}

describe('Underlying tests', async function () {
    this.timeout(120000);

    before(async function () {
        await curve.init({ gasPrice: 0 });
    });

    for (const poolName of PLAIN_POOLS) {
        underlyingLiquidityTest(poolName);
        underlyingExchangeTest(poolName);
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
