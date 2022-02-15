import { ethers } from "ethers";
import { assert } from "chai";
import curve from "../src";
import { Pool } from "../src/pools";
import { BN } from "../src/utils";
import { DictInterface } from "../lib/interfaces";

// const PLAIN_POOLS = ['susd', 'ren', 'sbtc', 'hbtc', '3pool', 'seth', 'eurs', 'steth', 'ankreth', 'link', 'reth', 'eurt'];
const PLAIN_POOLS =  ['susd', 'ren', 'sbtc', 'hbtc', '3pool', 'seth', 'steth', 'ankreth', 'link', 'reth', 'eurt']; // Without eurs
const LENDING_POOLS = ['compound', 'usdt', 'y', 'busd', 'pax', 'aave', 'saave', 'ib'];
const META_POOLS = ['gusd', 'husd', 'usdk', 'usdn', 'musd', 'rsv', 'tbtc', 'dusd', 'pbtc', 'bbtc', 'obtc', 'ust', 'usdp', 'tusd', 'frax', 'lusd', 'busdv2', 'alusd', 'mim'];
const CRYPTO_POOLS = ['tricrypto2', 'eurtusd', 'crveth', 'cvxeth', 'xautusd', 'spelleth', 'teth'];
const FACTORY_PLAIN_POOLS = ['ibEUR+sEUR', 'D3', 'crvCRV'];
const FACTORY_META_POOLS = ['baoUSD-3CRV', 'ELONXSWAP3CRV', 'ibbtc/sbtcCRV'];
const FACTORY_CRYPTO_POOLS = ['YFIETH-fV2', 'BADGERWBTC-fV2'];

const POLYGON_MAIN_POOLS = ['aave', 'ren', 'atricrypto3', 'eurtusd'];
const POLYGON_FACTORY_PLAIN_POOLS = ['CRVALRTO', '3EUR', '4eur-2'];
const POLYGON_FACTORY_META_POOLS = ['FRAX3CRV-f3CRV'];

// const ETHEREUM_POOLS = [...PLAIN_POOLS, ...LENDING_POOLS, ...META_POOLS, ...CRYPTO_POOLS];
const ETHEREUM_POOLS = FACTORY_CRYPTO_POOLS;
const POLYGON_POOLS = POLYGON_FACTORY_META_POOLS;

const underlyingLiquidityTest = (name: string) => {
    describe(`${name} add/remove liquidity`, function () {
        let pool: Pool;
        let coinAddresses: string[];

        before(async function () {
            pool = new curve.Pool(name);
            coinAddresses = pool.underlyingCoinAddresses;
        });

        it('Adds liquidity', async function () {
            const amount = '10';
            const amounts = coinAddresses.map(() => amount);
            if (name === "crvCRV") amounts[3] = '0';

            const initialBalances = await pool.balances() as DictInterface<string>;
            const lpTokenExpected = await pool.addLiquidityExpected(amounts);

            await pool.addLiquidity(amounts);

            const balances = await pool.balances() as DictInterface<string>;

            pool.underlyingCoins.forEach((c, i) => {
                if (name === 'steth' || pool.name === 'ibbtc/sbtcCRV') {
                    assert.approximately(Number(BN(balances[c])), Number(BN(initialBalances[c]).minus(BN(amounts[i]).toString())), 1e-18);
                } else {
                    assert.deepStrictEqual(BN(balances[c]), BN(initialBalances[c]).minus(BN(amounts[i])));
                }
            })

            const delta = ['ELONXSWAP3CRV', 'CRVALRTO'].includes(name) ? 2 : 0.01
            assert.approximately(Number(balances.lpToken) - Number(initialBalances.lpToken), Number(lpTokenExpected), delta);
        });

        it('Deposits into gauge', async function () {
            if (pool.gauge === ethers.constants.AddressZero) {
                console.log('Skip');
                return
            }

            const depositAmount: string = (await pool.lpTokenBalances() as DictInterface<string>).lpToken;

            await pool.gaugeDeposit(depositAmount);

            const balances = await pool.lpTokenBalances();

            assert.strictEqual(depositAmount, balances.gauge);
            assert.strictEqual(Number(balances.lpToken), 0);
        });

        it('Withdraws from gauge', async function () {
            if (pool.gauge === ethers.constants.AddressZero) {
                console.log('Skip');
                return
            }

            const withdrawAmount: string = (await pool.lpTokenBalances() as DictInterface<string>).gauge;

            await pool.gaugeWithdraw(withdrawAmount);

            const balances = await pool.lpTokenBalances();

            assert.strictEqual(withdrawAmount, balances.lpToken);
            assert.strictEqual(Number(balances.gauge), 0);
        });

        it('Removes liquidity', async function () {
            const initialBalances = await pool.balances() as DictInterface<string>;
            const lpTokenAmount: string = BN(initialBalances.lpToken).div(10).toFixed(18);
            const coinsExpected = await pool.removeLiquidityExpected(lpTokenAmount);

            await pool.removeLiquidity(lpTokenAmount);

            const balances = await pool.balances() as DictInterface<string>;

            assert.deepStrictEqual(BN(balances.lpToken), BN(initialBalances.lpToken).minus(BN(lpTokenAmount)));
            pool.underlyingCoins.forEach((c: string, i: number) => {
                const delta = ['gusd', '4eur-2'].includes(name) ? 0.011 : 0.01;
                assert.approximately(Number(balances[c]) - Number(initialBalances[c]), Number(coinsExpected[i]), delta);
            })
        });


        it('Removes liquidity imbalance', async function () {
            if (pool.isCrypto) {
                console.log("No such method")
            } else {
                const amount = '1';
                const amounts = coinAddresses.map(() => amount);
                if (name === "crvCRV") amounts[3] = '0.1';
                const initialBalances = await pool.balances() as DictInterface<string>;
                const lpTokenExpected = await pool.removeLiquidityImbalanceExpected(amounts);

                await pool.removeLiquidityImbalance(amounts);

                const balances = await pool.balances() as DictInterface<string>;

                const delta = ['ELONXSWAP3CRV', 'CRVALRTO'].includes(name) ? 2 : 0.01
                assert.approximately(Number(initialBalances.lpToken) - Number(balances.lpToken), Number(lpTokenExpected), delta);
                pool.underlyingCoins.forEach((c, i) => {
                    if (name === 'steth') {
                        assert.approximately(Number(initialBalances[c]), Number(BN(balances[c]).minus(BN(amounts[i])).toString()), 1e-18);
                    } else if (['compound', 'usdt', 'y', 'busd', 'pax', 'ib'].includes(pool.name)) {
                        assert.approximately(Number(initialBalances[c]), Number(BN(balances[c]).minus(BN(amounts[i])).toString()), 3e-6);
                    } else {
                        assert.deepStrictEqual(BN(initialBalances[c]), BN(balances[c]).minus(BN(amounts[i])));
                    }
                });
            }
        });

        it('Removes liquidity one coin', async function () {
            const initialBalances = await pool.balances() as DictInterface<string>;
            const lpTokenAmount: string = BN(initialBalances.lpToken).div(10).toFixed(18);
            const expected = await pool.removeLiquidityOneCoinExpected(lpTokenAmount, 0);

            await pool.removeLiquidityOneCoin(lpTokenAmount, 0);

            const balances = await pool.balances() as DictInterface<string>;

            assert.deepStrictEqual(BN(balances.lpToken), BN(initialBalances.lpToken).minus(BN(lpTokenAmount)));
            pool.underlyingCoins.forEach((c: string, i: number) => {
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
        for (let i = 0; i < 5; i++) {
            for (let j = 0; j < 5; j++) {
                if (i !== j) {
                    it(`${i} --> ${j}`, async function () {
                        const pool = new curve.Pool(name);
                        const coinAddresses = pool.underlyingCoinAddresses;
                        if (i >= coinAddresses.length || j >= coinAddresses.length || (name === "crvCRV" && i === 3)) {
                            console.log('Skip')
                        } else {
                            const swapAmount = '10';
                            const initialCoinBalances = await pool.underlyingCoinBalances() as DictInterface<string>;
                            const expected = await pool.exchangeExpected(i, j, swapAmount);

                            await pool.exchange(i, j, swapAmount, 0.02);

                            const coinBalances = await pool.underlyingCoinBalances() as DictInterface<string>;

                            if (pool.name === 'steth' || pool.name === 'ibbtc/sbtcCRV') {
                                assert.approximately(Number(Object.values(coinBalances)[i]), Number(BN(Object.values(initialCoinBalances)[i]).minus(BN(swapAmount)).toString()), 1e-18);
                            } else {
                                assert.deepStrictEqual(BN(Object.values(coinBalances)[i]), BN(Object.values(initialCoinBalances)[i]).minus(BN(swapAmount)));
                            }
                            assert.isAtLeast(Number(Object.values(coinBalances)[j]), Number(BN(Object.values(initialCoinBalances)[j]).plus(BN(expected).times(0.98)).toString()));
                        }
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
        await curve.fetchFactoryPools();
        await curve.fetchCryptoFactoryPools();
    });

    for (const poolName of ETHEREUM_POOLS) {
        underlyingLiquidityTest(poolName);
        underlyingExchangeTest(poolName);
    }

    // for (const poolName of POLYGON_POOLS) {
    //     underlyingLiquidityTest(poolName);
    //     underlyingExchangeTest(poolName);
    // }
})
