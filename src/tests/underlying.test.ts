import { assert } from "chai";
import BigNumber from "bignumber.js";
import { getBestPoolAndOutput, Pool, exchange } from "../pools";
import { BN, getBalances, _getBalancesBN, toStringFromBN } from "../utils";
import { curve } from "../curve";

// const PLAIN_POOLS = ['susd', 'ren', 'sbtc', 'hbtc', '3pool', 'seth', 'eurs', 'steth', 'ankreth', 'link'];
const PLAIN_POOLS = ['susd', 'ren', 'sbtc', 'hbtc', '3pool', 'seth', 'steth', 'ankreth', 'link']; // Without eurs
const LENDING_POOLS = ['compound', 'usdt', 'y', 'busd', 'pax', 'aave', 'saave', 'ib'];
const META_POOLS = ['gusd', 'husd', 'usdk', 'usdn', 'musd', 'rsv', 'tbtc', 'dusd', 'pbtc', 'bbtc', 'obtc', 'ust', 'usdp', 'tusd', 'frax', 'lusd', 'busdv2'];

const underlyingTest = (name: string) => {
    describe(`${name} pool`, function () {
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

        it('Swaps', async function () {
            const swapAmount = '10';
            const initialCoinBalances: string[] = (await getBalances([address], coinAddresses))[address];
            const expected = await myPool.getExchangeOutput(0, 1, swapAmount);

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

describe('Underlying tests', async function () {
    this.timeout(120000);

    before(async function () {
        await curve.init({ gasPrice: 0 });
    });

    for (const poolName of PLAIN_POOLS) {
        underlyingTest(poolName);
    }

    for (const poolName of LENDING_POOLS) {
        underlyingTest(poolName);
    }

    for (const poolName of META_POOLS) {
        underlyingTest(poolName);
    }
})

// it('Swaps using all pools', async function () {
//     const swapAmount = '100';
//     const dai = "0x6b175474e89094c44da98b954eedeac495271d0f";
//     const usdc = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
//     const initialBalances = (await getBalances([address], [dai, usdc]))[address];
//
//     const { output } = await getBestPoolAndOutput(dai, usdc, swapAmount);
//     await exchange(dai, usdc, swapAmount);
//
//     const balancesAfterSwap = (await getBalances([address], [dai, usdc]))[address];
//
//     assert.deepStrictEqual(BN(balancesAfterSwap[0]), BN(initialBalances[0]).minus(BN(swapAmount)));
//     assert.isAtLeast(Number(balancesAfterSwap[1]), Number(BN(initialBalances[1]).plus(BN(output).times(0.99)).toString()));
// });
