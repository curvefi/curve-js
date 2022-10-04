import { assert } from "chai";
import curve from "../src";
import { PoolTemplate, getPool } from "../src/pools";
import { BN } from "../src/utils";
import { IDict } from "../src/interfaces";
import {ethers} from "ethers";

// const PLAIN_POOLS = ['susd', 'ren', 'sbtc', 'hbtc', '3pool', 'seth', 'eurs', 'steth', 'ankreth', 'link', 'reth', 'eurt'];
const PLAIN_POOLS =  ['susd', 'ren', 'sbtc', 'hbtc', '3pool', 'seth', 'steth', 'ankreth', 'link', 'reth', 'eurt']; // Without eurs
const LENDING_POOLS = ['compound', 'usdt', 'y', 'busd', 'pax', 'aave', 'saave', 'ib'];
const META_POOLS = ['gusd', 'husd', 'usdk', 'usdn', 'musd', 'rsv', 'tbtc', 'dusd', 'pbtc', 'bbtc', 'obtc', 'ust', 'usdp', 'tusd', 'frax', 'lusd', 'busdv2', 'alusd', 'mim'];
const CRYPTO_POOLS = ['tricrypto2', 'eurtusd', 'crveth', 'cvxeth', 'xautusd', 'spelleth', 'teth'];
const FACTORY_CRYPTO_META_POOLS = ['factory-crypto-116', 'factory-crypto-97']; // ['DCHF/3CRV', 'cvxCrv/FraxBP'];

const ETHEREUM_POOLS = [...PLAIN_POOLS, ...LENDING_POOLS, ...META_POOLS, ...CRYPTO_POOLS];
const POLYGON_POOLS = ['aave', 'ren', 'atricrypto3', 'eurtusd'];
const AVALANCHE_POOLS = ['aave', 'ren', 'atricrypto'];

const FANTOM_MAIN_POOLS = ['2pool', 'fusdt', 'ren', 'tricrypto', 'ib', 'geist'];
const FANTOM_FACTORY_PLAIN_POOLS = ['factory-v2-85', 'factory-v2-1', 'factory-v2-7']; // ['axlUSDC/USDC', '3poolV2', '4pool'];
const FANTOM_FACTORY_META_POOLS = ['factory-v2-16', 'factory-v2-40']; // ['FRAX2pool', 'Geist Frax'];
const FANTOM_FACTORY_CRYPTO_POOLS = ['factory-crypto-3']; // ['aCRV/CRV'];
const FANTOM_POOLS = [...FANTOM_MAIN_POOLS, ...FANTOM_FACTORY_PLAIN_POOLS, ...FANTOM_FACTORY_META_POOLS, ...FANTOM_FACTORY_CRYPTO_POOLS];

const ARBITRUM_MAIN_POOLS = ['2pool', 'tricrypto', 'ren', 'eursusd'];
const ARBITRUM_FACTORY_PLAIN_POOLS = ['factory-v2-15', 'factory-v2-29']; // ['deBridge-ETH', 'Aave aDAI+aUSC+aUSDT USDFACTORY'];
const ARBITRUM_FACTORY_META_POOLS = ['factory-v2-0']; // ['MIM'];
const ARBITRUM_POOLS = [...ARBITRUM_MAIN_POOLS, ...ARBITRUM_FACTORY_PLAIN_POOLS, ...ARBITRUM_FACTORY_META_POOLS];

const OPTIMISM_MAIN_POOLS = ['3pool'];
const OPTIMISM_FACTORY_PLAIN_POOLS = ['factory-v2-10']; // ['sETH/ETH'];
const OPTIMISM_FACTORY_META_POOLS = ['factory-v2-0']; // ['sUSD Synthetix'];
const OPTIMISM_POOLS = [...OPTIMISM_MAIN_POOLS, ...OPTIMISM_FACTORY_PLAIN_POOLS, ...OPTIMISM_FACTORY_META_POOLS];

const XDAI_MAIN_POOLS = ['3pool', 'rai', 'tricrypto'];
const XDAI_FACTORY_PLAIN_POOLS = ['factory-v2-0']; // ['sGNO/GNO'];
const XDAI_FACTORY_META_POOLS = ['factory-v2-4']; // ['MAI Stablecoin'];
const XDAI_POOLS = [...XDAI_MAIN_POOLS, ...XDAI_FACTORY_PLAIN_POOLS, ...XDAI_FACTORY_META_POOLS];

const MAIN_POOLS_AURORA = ['3pool'];

const MAIN_POOLS_KAVA = ['factory-v2-0'];

const underlyingDepositAndStakeTest = (name: string) => {
    describe(`${name} Deposit&Stake underlying`, function () {
        let pool: PoolTemplate;
        let coinAddresses: string[];

        before(async function () {
            pool = getPool(name);
            coinAddresses = pool.underlyingCoinAddresses;
        });

        it('Deposits and stakes', async function () {
            if (pool.gauge === ethers.constants.AddressZero) {
                console.log('Skip');
                return;
            }

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
            if (pool.isPlain || pool.isFake || pool.gauge === ethers.constants.AddressZero) {
                console.log('Skip');
                return;
            }

            const amount = '10';
            const amounts = coinAddresses.map(() => amount);

            const initialBalances = await pool.wallet.balances() as IDict<string>;
            const lpTokenExpected = await pool.depositAndStakeWrappedExpected(amounts);

            await pool.depositAndStakeWrapped(amounts);

            const balances = await pool.wallet.balances() as IDict<string>;

            coinAddresses.forEach((c: string) => {
                if (['aave', 'saave', 'geist'].includes(name) || (pool.isLending && pool.id === 'ren')) {
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
        await curve.fetchFactoryPools();
        await curve.fetchCryptoFactoryPools();
    });

    for (const poolName of FACTORY_CRYPTO_META_POOLS) {
        underlyingDepositAndStakeTest(poolName);
        if (!PLAIN_POOLS.includes(poolName)) {
            wrappedDepositAndStakeTest(poolName);
        }
    }

    // for (const poolName of POLYGON_POOLS) {
    //     underlyingDepositAndStakeTest(poolName);
    //     if (poolName !== 'atricrypto3') {
    //         wrappedDepositAndStakeTest(poolName);
    //     }
    // }
    //
    // for (const poolName of AVALANCHE_POOLS) {
    //     underlyingDepositAndStakeTest(poolName);
    //     if (poolName !== 'atricrypto') {
    //         wrappedDepositAndStakeTest(poolName);
    //     }
    // }
    //
    // for (const poolName of FANTOM_POOLS) {
    //     underlyingDepositAndStakeTest(poolName);
    //     wrappedDepositAndStakeTest(poolName);
    // }

    // for (const poolName of ARBITRUM_POOLS) {
    //     underlyingDepositAndStakeTest(poolName);
    //     wrappedDepositAndStakeTest(poolName);
    // }

    // for (const poolName of OPTIMISM_POOLS) {
    //     underlyingDepositAndStakeTest(poolName);
    //     wrappedDepositAndStakeTest(poolName);
    // }

    // for (const poolName of XDAI_POOLS) {
    //     underlyingDepositAndStakeTest(poolName);
    //     wrappedDepositAndStakeTest(poolName);
    // }

    // for (const poolName of MAIN_POOLS_AURORA) {
    //     underlyingDepositAndStakeTest(poolName);
    //     wrappedDepositAndStakeTest(poolName);
    // }

    // for (const poolName of MAIN_POOLS_KAVA) {
    //     underlyingDepositAndStakeTest(poolName);
    //     wrappedDepositAndStakeTest(poolName);
    // }
})
