import { assert } from "chai";
import { getPool } from "../src/pools/poolConstructor";
import { PoolTemplate } from "../src/pools/PoolTemplate";
import { curve } from "../src/curve";
import {ethers} from "ethers";


// const PLAIN_POOLS = ['susd', 'ren', 'sbtc', 'hbtc', '3pool', 'seth', 'eurs', 'steth', 'ankreth', 'link', 'reth'];
const PLAIN_POOLS = ['susd', 'ren', 'sbtc', 'hbtc', '3pool', 'seth', 'steth', 'ankreth', 'link', 'reth']; // Without eurs
const LENDING_POOLS = ['compound', 'usdt', 'y', 'busd', 'pax', 'aave', 'saave', 'ib'];
const META_POOLS = ['gusd', 'husd', 'usdk', 'usdn', 'musd', 'rsv', 'tbtc', 'dusd', 'pbtc', 'bbtc', 'obtc', 'ust', 'usdp', 'tusd', 'frax', 'lusd', 'busdv2', 'alusd', 'mim'];
const FACTORY_CRYPTO_META_POOLS = ['factory-crypto-116', 'factory-crypto-97']; // ['DCHF/3CRV', 'cvxCrv/FraxBP'];

const POLYGON_POOLS = ['aave', 'ren', 'atricrypto3', 'eurtusd'];

const AVALANCHE_POOLS = ['aave', 'ren', 'atricrypto3', 'eurtusd'];

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

const MOONBEAM_MAIN_POOLS = ['3pool'];
const MOONBEAM_FACTORY_PLAIN_POOLS = ['factory-v2-6']; // ['DAI Multi Nomad'];
// const MOONBEAM_FACTORY_META_POOLS = ['factory-v2-4']; // ['MAI Stablecoin'];
const MOONBEAM_POOLS = [...MOONBEAM_MAIN_POOLS, ...MOONBEAM_FACTORY_PLAIN_POOLS];


const AURORA_POOLS = ['3pool'];

const KAVA_POOLS = ['factory-v2-0'];

const balancedAmountsTest = (name: string) => {
    describe(`${name} balanced amounts`, function () {
        let pool: PoolTemplate;

        before(async function () {
            pool = getPool(name);
        });

        it('underlying', async function () {
            const balancedAmounts = (await pool.depositBalancedAmounts()).map(Number);
            console.log(balancedAmounts);

            assert.equal(balancedAmounts.length, pool.underlyingCoins.length);
            for (const amount of balancedAmounts) {
                assert.isAbove(amount, 0);
            }
        });

        it('wrapped', async function () {
            if (pool.isPlain || pool.isFake) {
                console.log('Skip');
                return;
            }

            const balancedWrappedAmounts = (await pool.depositWrappedBalancedAmounts()).map(Number);
            console.log(balancedWrappedAmounts);

            assert.equal(balancedWrappedAmounts.length, pool.wrappedCoins.length);
            for (const amount of balancedWrappedAmounts) {
                assert.isAbove(amount, 0);
            }
        });

    });
}

describe('Underlying test', async function () {
    this.timeout(120000);

    before(async function () {
        await curve.init('JsonRpc', {},{ gasPrice: 0 });
        await curve.fetchFactoryPools();
        await curve.fetchCryptoFactoryPools();
    });

    // for (const poolName of PLAIN_POOLS) {
    //     balancedAmountsTest(poolName);
    // }
    //
    // for (const poolName of LENDING_POOLS) {
    //     balancedAmountsTest(poolName);
    // }
    //
    // for (const poolName of META_POOLS) {
    //     balancedAmountsTest(poolName);
    // }

    for (const poolName of FACTORY_CRYPTO_META_POOLS) {
        balancedAmountsTest(poolName);
    }

    // for (const poolName of POLYGON_POOLS) {
    //     balancedAmountsTest(poolName);
    // }
    //
    // for (const poolName of AVALANCHE_POOLS) {
    //     balancedAmountsTest(poolName);
    // }

    // for (const poolName of ARBITRUM_POOLS) {
    //     balancedAmountsTest(poolName);
    // }

    // for (const poolName of OPTIMISM_POOLS) {
    //     balancedAmountsTest(poolName);
    // }

    // for (const poolName of XDAI_POOLS) {
    //     balancedAmountsTest(poolName);
    // }

    // for (const poolName of MOONBEAM_POOLS) {
    //     balancedAmountsTest(poolName);
    // }

    // for (const poolName of AURORA_POOLS) {
    //     balancedAmountsTest(poolName);
    // }

    // for (const poolName of KAVA_POOLS) {
    //     balancedAmountsTest(poolName);
    // }
})
