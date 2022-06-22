import { assert } from "chai";
import curve from "../src";
import { PoolTemplate, getPool } from "../src/pools";
import { BN } from "../src/utils";
import { IDict } from "../src/interfaces";

// const PLAIN_POOLS = ['susd', 'ren', 'sbtc', 'hbtc', '3pool', 'seth', 'eurs', 'steth', 'ankreth', 'link', 'reth', 'eurt'];
const PLAIN_POOLS =  ['susd', 'ren', 'sbtc', 'hbtc', '3pool', 'seth', 'steth', 'ankreth', 'link', 'reth', 'eurt']; // Without eurs
const LENDING_POOLS = ['compound', 'usdt', 'y', 'busd', 'pax', 'aave', 'saave', 'ib'];
const META_POOLS = ['gusd', 'husd', 'usdk', 'usdn', 'musd', 'rsv', 'tbtc', 'dusd', 'pbtc', 'bbtc', 'obtc', 'ust', 'usdp', 'tusd', 'frax', 'lusd', 'busdv2', 'alusd', 'mim'];
const CRYPTO_POOLS = ['tricrypto2', 'eurtusd', 'crveth', 'cvxeth', 'xautusd', 'spelleth', 'teth'];

const ETHEREUM_POOLS = [...PLAIN_POOLS, ...LENDING_POOLS, ...META_POOLS, ...CRYPTO_POOLS];
const POLYGON_POOLS = ['aave', 'ren', 'atricrypto3', 'eurtusd'];
const AVALANCHE_POOLS = ['aave', 'ren', 'atricrypto'];

const underlyingDepositAndStakeTest = (name: string) => {
    describe(`${name} Deposit&Stake underlying`, function () {
        let pool: PoolTemplate;
        let coinAddresses: string[];

        before(async function () {
            pool = getPool(name);
            coinAddresses = pool.underlyingCoinAddresses;
        });

        it('Deposits and stakes', async function () {
            const amount = '10';
            const amounts = coinAddresses.map(() => amount);

            const initialBalances = await pool.wallet.balances() as IDict<string>;
            const lpTokenExpected = await pool.depositAndStakeExpected(amounts);

            await pool.depositAndStake(amounts);

            const balances = await pool.wallet.balances() as IDict<string>;

            coinAddresses.forEach((c: string) => {
                if (name === 'steth') {
                    assert.approximately(Number(BN(balances[c])), Number(BN(initialBalances[c]).minus(BN(amount).toString())), 1e-18);
                } else {
                    assert.deepStrictEqual(BN(balances[c]), BN(initialBalances[c]).minus(BN(amount)));
                }
            })

            assert.approximately(Number(balances.gauge) - Number(initialBalances.gauge), Number(lpTokenExpected), 0.01);
            assert.strictEqual(Number(balances.lpToken) - Number(initialBalances.lpToken), 0);
        });

    });
}

const wrappedDepositAndStakeTest = (name: string) => {
    describe(`${name} Deposit&Stake wrapped`, function () {
        let pool: PoolTemplate;
        let coinAddresses: string[];

        before(async function () {
            pool = getPool(name);
            coinAddresses = pool.wrappedCoinAddresses;
        });

        it('Deposits and stakes', async function () {
            const amount = '10';
            const amounts = coinAddresses.map(() => amount);

            const initialBalances = await pool.wallet.balances() as IDict<string>;
            const lpTokenExpected = await pool.depositAndStakeWrappedExpected(amounts);

            await pool.depositAndStakeWrapped(amounts);

            const balances = await pool.wallet.balances() as IDict<string>;

            coinAddresses.forEach((c: string) => {
                if (['aave', 'saave'].includes(name) || (pool.isLending && pool.id === 'ren')) {
                    assert.approximately(Number(BN(balances[c])), Number(BN(initialBalances[c]).minus(BN(amount).toString())), 1e-2);
                } else {
                    assert.deepStrictEqual(BN(balances[c]), BN(initialBalances[c]).minus(BN(amount)));
                }
            })

            assert.approximately(Number(balances.gauge) - Number(initialBalances.gauge), Number(lpTokenExpected), 0.01);
            assert.strictEqual(Number(balances.lpToken) - Number(initialBalances.lpToken), 0);
        });
    });
}

describe('Deposit&Stake test', async function () {
    this.timeout(120000);

    before(async function () {
        await curve.init('JsonRpc', {},{ gasPrice: 0 });
    });

    // for (const poolName of ETHEREUM_POOLS) {
    //     underlyingDepositAndStakeTest(poolName);
    //     if (!PLAIN_POOLS.includes(poolName)) {
    //         wrappedDepositAndStakeTest(poolName);
    //     }
    // }
    //
    // for (const poolName of POLYGON_POOLS) {
    //     underlyingDepositAndStakeTest(poolName);
    //     if (poolName !== 'atricrypto3') {
    //         wrappedDepositAndStakeTest(poolName);
    //     }
    // }
    //
    for (const poolName of AVALANCHE_POOLS) {
        underlyingDepositAndStakeTest(poolName);
        if (poolName !== 'atricrypto') {
            wrappedDepositAndStakeTest(poolName);
        }
    }
})
