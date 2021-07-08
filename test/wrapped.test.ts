import { assert } from "chai";
import { Pool } from "../src/pools";
import { BN, getBalances } from "../src/utils";
import { curve } from "../src/curve";

const LENDING_POOLS = ['compound', 'usdt', 'y', 'busd', 'pax', 'aave', 'saave', 'ib'];
const META_POOLS = ['gusd', 'husd', 'usdk', 'usdn', 'musd', 'rsv', 'tbtc', 'dusd', 'pbtc', 'bbtc', 'obtc', 'ust', 'usdp', 'tusd', 'frax', 'lusd', 'busdv2'];

const wrappedLiquidityTest = (name: string) => {
    describe(`${name} add/remove liquidity`, function () {
        const myPool = new Pool(name);
        const coinAddresses = myPool.coinAddresses;
        let address = '';

        // It's needed because curve.signer.getAddress() is async
        before( async () => {
            address = curve.signerAddress;
        })

        it('Adds liquidity', async function () {
            const amount = '10';
            const amounts = coinAddresses.map(() => amount);
            const initialCoinBalances: string[] = (await getBalances([address], coinAddresses))[address];
            const initialLpTokenBalance = (await myPool.lpTokenBalances(address))[address];
            const lpTokenExpected = await myPool.addLiquidityWrappedExpected(amounts)

            await myPool.addLiquidityWrapped(amounts);

            const coinBalances: string[] = (await getBalances([address], coinAddresses))[address];
            const lpTokenBalance = (await myPool.lpTokenBalances(address))[address];

            coinBalances.forEach((b: string, i: number) => {
                if (['aave', 'saave'].includes(name)) {
                    // Because of increasing quantity
                    assert.approximately(Number(BN(b)), Number(BN(initialCoinBalances[i]).minus(BN(amount).toString())), 1e-4);
                } else {
                    assert.deepStrictEqual(BN(b), BN(initialCoinBalances[i]).minus(BN(amount)));
                }
            })
            assert.approximately(Number(lpTokenBalance) - Number(initialLpTokenBalance), Number(lpTokenExpected), 0.01);
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
            const coinsExpected = await myPool.removeLiquidityWrappedExpected(lpTokenAmount);

            await myPool.removeLiquidityWrapped(lpTokenAmount);

            const lpTokenBalance: string = (await myPool.lpTokenBalances(address))[address];
            const coinBalances: string[] = (await getBalances([address], coinAddresses))[address];

            assert.deepStrictEqual(BN(lpTokenBalance), BN(initialLpTokenBalance).minus(BN(lpTokenAmount)));
            coinBalances.forEach((b: string, i: number) => {
                const delta = name == 'gusd' ? 0.011 : 0.01
                assert.approximately(Number(b) - Number(initialCoinBalances[i]), Number(coinsExpected[i]), delta);
            });
        });

        it('Removes liquidity imbalance', async function () {
            const amount = '1';
            const amounts = coinAddresses.map(() => amount);

            const initialLpTokenBalance: string = (await myPool.lpTokenBalances(address))[address];
            const initialCoinBalances: string[] = (await getBalances([address], coinAddresses))[address];
            const lpTokenExpected = await myPool.removeLiquidityImbalanceWrappedExpected(amounts);

            await myPool.removeLiquidityImbalanceWrapped(amounts);

            const lpTokenBalance: string = (await myPool.lpTokenBalances(address))[address];
            const coinBalances: string[] = (await getBalances([address], coinAddresses))[address];

            assert.approximately(Number(initialLpTokenBalance) - Number(lpTokenBalance), Number(lpTokenExpected), 0.01);
            coinBalances.forEach((b: string, i: number) => {
                if (['aave', 'saave'].includes(name)) {
                    assert.approximately(Number(initialCoinBalances[i]), Number(BN(b).minus(BN(amount)).toString()), 1e-4);
                } else {
                    assert.deepStrictEqual(BN(initialCoinBalances[i]), BN(b).minus(BN(amount)));
                }
            });
        });

        if (!['compound', 'usdt', 'y', 'busd', 'pax'].includes(name)) {
            it('Removes liquidity one coin', async function () {
                const initialLpTokenBalance: string = (await myPool.lpTokenBalances(address))[address];
                const lpTokenAmount: string = BN(initialLpTokenBalance).div(10).toFixed(18);
                const initialCoinBalances: string[] = (await getBalances([address], coinAddresses))[address];
                const expected = await myPool.removeLiquidityOneCoinWrappedExpected(lpTokenAmount, 0);

                await myPool.removeLiquidityOneCoinWrapped(lpTokenAmount, 0);

                const lpTokenBalance: string = (await myPool.lpTokenBalances(address))[address];
                const coinBalances: string[] = (await getBalances([address], coinAddresses))[address];

                assert.deepStrictEqual(BN(lpTokenBalance), BN(initialLpTokenBalance).minus(BN(lpTokenAmount)));
                coinBalances.forEach((b: string, i: number) => {
                    if (i === 0) {
                        assert.approximately(Number(b) - Number(initialCoinBalances[i]), Number(expected), 0.01);
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
    });
}

const wrappedExchangeTest = (name: string) => {
    describe(`${name} exchange`, function () {
        const pool = new Pool(name);
        const coinAddresses = pool.coinAddresses;
        let address = '';

        // It's needed because curve.signer.getAddress() is async
        before( async () => {
            address = curve.signerAddress;
        })

        for (let i = 0; i < coinAddresses.length; i++) {
            for (let j = 0; j < coinAddresses.length; j++) {
                if (i !== j) {
                    it(`${i} --> ${j}`, async function () {
                        const swapAmount = '10';
                        const initialCoinBalances: string[] = (await getBalances([address], coinAddresses))[address];
                        const expected = await pool.getExchangeOutputWrapped(i, j, swapAmount);

                        await pool.exchangeWrapped(i, j, swapAmount, 0.02);

                        const coinBalancesAfterSwap: string[] = (await getBalances([address], coinAddresses))[address];

                        if (['aave', 'saave'].includes(pool.name)) {
                            // Because of increasing quantity
                            assert.approximately(Number(coinBalancesAfterSwap[i]), Number(BN(initialCoinBalances[i]).minus(BN(swapAmount).toString())), 1e-4);
                        } else {
                            assert.deepStrictEqual(BN(coinBalancesAfterSwap[i]), BN(initialCoinBalances[i]).minus(BN(swapAmount)));
                        }
                        assert.isAtLeast(Number(coinBalancesAfterSwap[j]), Number(BN(initialCoinBalances[j]).plus(BN(expected).times(0.98)).toString()));
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