import {ethers} from "ethers";
import { assert } from "chai";
import curve from "../src";
import { BN } from "../src/utils";
import { DictInterface } from "../lib/interfaces";
import { getPool } from "../src/pools/poolConstructor";
import { PoolTemplate } from "../src/pools/PoolTemplate";

const LENDING_POOLS = ['compound', 'usdt', 'y', 'busd', 'pax', 'aave', 'saave', 'ib'];
const META_POOLS = ['gusd', 'husd', 'usdk', 'usdn', 'musd', 'rsv', 'tbtc', 'dusd', 'pbtc', 'bbtc', 'obtc', 'ust', 'usdp', 'tusd', 'frax', 'lusd', 'busdv2', 'alusd', 'mim'];
const CRYPTO_POOLS = ['tricrypto2', 'eurtusd', 'crveth', 'cvxeth', 'xautusd', 'spelleth', 'teth'];
const FACTORY_META_POOLS = ['factory-v2-84', 'factory-v2-80', 'factory-v2-60']; // ['baoUSD-3CRV-f', 'ELONXSWAP3CRV-f', 'ibbtc/sbtcCRV-f(2)'];
const FACTORY_CRYPTO_POOLS = ['factory-crypto-8']; // ['YFIETH-fV2'];

const POLYGON_MAIN_POOLS = ['aave', 'ren', 'eurtusd'];
const POLYGON_FACTORY_META_POOLS = ['factory-v2-11']; // ['FRAX3CRV-f3CRV-f'];


// const ETHEREUM_POOLS = [...LENDING_POOLS, ...META_POOLS, ...CRYPTO_POOLS];
const ETHEREUM_POOLS = ['compound', 'aave', 'ib', 'gusd', 'mim', 'tricrypto2', 'crveth'];
// const ETHEREUM_POOLS = [...FACTORY_META_POOLS, ...FACTORY_CRYPTO_POOLS];
const POLYGON_POOLS = POLYGON_FACTORY_META_POOLS;

const wrappedLiquidityTest = (id: string) => {
    describe(`${id} deposit-stake-unstake-withdraw`, function () {
        let pool: PoolTemplate;
        let coinAddresses: string[];

        before(async function () {
            pool = getPool(id);
            coinAddresses = pool.coinAddresses;
        });

        it('Deposit', async function () {
            const amount = '10';
            const amounts = coinAddresses.map(() => amount);
            const initialBalances = await pool.wallet.balances() as DictInterface<string>;
            const lpTokenExpected = await pool.depositWrappedExpected(amounts)

            await pool.depositWrapped(amounts);

            const balances = await pool.wallet.balances() as DictInterface<string>;

            coinAddresses.forEach((c: string) => {
                if (['aave', 'saave'].includes(id) || (curve.chainId === 137 && pool.id === 'ren')) {
                    // Because of increasing quantity
                    assert.approximately(Number(BN(balances[c])), Number(BN(initialBalances[c]).minus(BN(amount).toString())), 1e-2);
                } else if (pool.id === 'factory-v2-60') {
                    assert.approximately(Number(BN(balances[c])), Number(BN(initialBalances[c]).minus(BN(amount).toString())), 1e-18);
                } else {
                    assert.deepStrictEqual(BN(balances[c]), BN(initialBalances[c]).minus(BN(amount)));
                }
            })

            const delta = id === 'factory-v2-80' ? 2 : 0.01
            assert.approximately(Number(balances.lpToken) - Number(initialBalances.lpToken), Number(lpTokenExpected), delta);
        });

        it('Stake', async function () {
            if (pool.gauge === ethers.constants.AddressZero) {
                console.log('Skip');
                return
            }

            const depositAmount: string = (await pool.wallet.lpTokenBalances() as DictInterface<string>).lpToken;

            await pool.stake(depositAmount);

            const balances = await pool.wallet.lpTokenBalances();

            assert.strictEqual(depositAmount, balances.gauge);
            assert.strictEqual(Number(balances.lpToken), 0);
        });

        it('Unstake', async function () {
            if (pool.gauge === ethers.constants.AddressZero) {
                console.log('Skip');
                return
            }

            const withdrawAmount: string = (await pool.wallet.lpTokenBalances() as DictInterface<string>).gauge;

            await pool.unstake(withdrawAmount);

            const balances = await pool.wallet.lpTokenBalances();

            assert.strictEqual(withdrawAmount, balances.lpToken);
            assert.strictEqual(Number(balances.gauge), 0);
        });

        it('Withdraw', async function () {
            const initialBalances = await pool.wallet.balances() as DictInterface<string>;
            const lpTokenAmount: string = BN(initialBalances.lpToken).div(10).toFixed(18);
            const coinsExpected = await pool.withdrawWrappedExpected(lpTokenAmount);

            await pool.withdrawWrapped(lpTokenAmount, 0.01);

            const balances = await pool.wallet.balances() as DictInterface<string>;

            assert.deepStrictEqual(BN(balances.lpToken), BN(initialBalances.lpToken).minus(BN(lpTokenAmount)));
            coinAddresses.forEach((c: string, i: number) => {
                const delta = id == 'gusd' ? 0.011 : id === 'factory-v2-80' ? 2 : 0.01
                assert.approximately(Number(balances[c]) - Number(initialBalances[c]), Number(coinsExpected[i]), delta);
            });
        });

        it('Withdraw imbalance', async function () {
            if (pool.isCrypto) {
                console.log("No such method")
            } else {
                const amount = '1';
                const amounts = coinAddresses.map(() => amount);
                const initialBalances = await pool.wallet.balances() as DictInterface<string>;
                const lpTokenExpected = await pool.withdrawImbalanceWrappedExpected(amounts);

                await pool.withdrawImbalanceWrapped(amounts);

                const balances = await pool.wallet.balances() as DictInterface<string>;

                const delta = id === 'factory-v2-80' ? 2 : 0.01
                assert.approximately(Number(initialBalances.lpToken) - Number(balances.lpToken), Number(lpTokenExpected), delta);
                coinAddresses.forEach((c: string) => {
                    if (['aave', 'saave'].includes(id) || (curve.chainId === 137 && pool.id === 'ren')) {
                        assert.approximately(Number(initialBalances[c]), Number(BN(balances[c]).minus(BN(amount)).toString()), 1e-4);
                    } else {
                        assert.deepStrictEqual(BN(initialBalances[c]), BN(balances[c]).minus(BN(amount)));
                    }
                });
            }
        });

        if (!['compound', 'usdt', 'y', 'busd', 'pax'].includes(id)) {
            it('Withdraw one coin', async function () {
                const initialBalances = await pool.wallet.balances() as DictInterface<string>;
                const lpTokenAmount: string = BN(initialBalances.lpToken).div(10).toFixed(18);
                const expected = await pool.withdrawOneCoinWrappedExpected(lpTokenAmount, 0);

                await pool.withdrawOneCoinWrapped(lpTokenAmount, 0);

                const balances = await pool.wallet.balances() as DictInterface<string>;

                assert.deepStrictEqual(BN(balances.lpToken), BN(initialBalances.lpToken).minus(BN(lpTokenAmount)));
                coinAddresses.forEach((c: string, i: number) => {
                    if (i === 0) {
                        assert.approximately(Number(balances[c]) - Number(initialBalances[c]), Number(expected), 0.01);
                    } else {
                        if (['aave', 'saave'].includes(id)  || (curve.chainId === 137 && this.id === 'ren')) {
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

const wrappedSwapTest = (id: string) => {
    describe(`${id} exchange`, function () {
        for (let i = 0; i < 5; i++) {
            for (let j = 0; j < 5; j++) {
                if (i !== j) {
                    it(`${i} --> ${j}`, async function () {
                        const pool = getPool(id);
                        const coinAddresses = pool.coinAddresses;
                        if (i >= coinAddresses.length || j >= coinAddresses.length) {
                            console.log('Skip')
                        } else {
                            const swapAmount = '10';
                            const initialCoinBalances = await pool.wallet.coinBalances() as DictInterface<string>;
                            const expected = await pool.swapWrappedExpected(i, j, swapAmount);

                            await pool.swapWrapped(i, j, swapAmount, 0.02);

                            const coinBalances = await pool.wallet.coinBalances() as DictInterface<string>;

                            if (['aave', 'saave'].includes(pool.id) || (curve.chainId === 137 && pool.id === 'ren')) {
                                // Because of increasing quantity
                                assert.approximately(Number(Object.values(coinBalances)[i]), Number(BN(Object.values(initialCoinBalances)[i]).minus(BN(swapAmount).toString())), 1e-2);
                            } else if (pool.id === 'factory-v2-60') {
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

describe('Wrapped test', async function () {
    this.timeout(120000);

    before(async function () {
        await curve.init('JsonRpc', {}, { gasPrice: 0 });
        await curve.fetchFactoryPools();
        await curve.fetchCryptoFactoryPools();
    });

    for (const poolId of ETHEREUM_POOLS) {
        wrappedLiquidityTest(poolId);
        wrappedSwapTest(poolId);
    }

    // for (const poolId of POLYGON_POOLS) {
    //     wrappedLiquidityTest(poolId);
    //     wrappedSwapTest(poolId);
    // }
})