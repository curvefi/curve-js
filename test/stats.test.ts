import { assert } from "chai";
import curve from "../src/";
import { getPool, PoolTemplate } from "../src/pools";
import { IReward } from "../src/interfaces";
import { ethers } from "ethers";


const MAIN_POOLS_ETHEREUM = [
    'compound', 'usdt',    'y',          'busd',
    'susd',     'pax',     'ren',        'sbtc',
    'hbtc',     '3pool',   'gusd',       'husd',
    'usdk',     'usdn',    'musd',       'rsv',
    'tbtc',     'dusd',    'pbtc',       'bbtc',
    'obtc',     'seth',    'eurs',       'ust',
    'aave',     'steth',   'saave',      'ankreth',
    'usdp',     'ib',      'link',       'tusd',
    'frax',     'lusd',    'busdv2',     'reth',
    'alusd',    'mim',     'tricrypto2', 'eurt',
    'eurtusd',  'eursusd', 'crveth',     'rai',
    'cvxeth',   'xautusd', 'spelleth',   'teth',
    '2pool',    '4pool',
];
const FACTORY_POOLS_COUNT_ETHEREUM = 127;
const CRYPTO_FACTORY_POOLS_COUNT_ETHEREUM = 132;

const MAIN_POOLS_POLYGON = [ 'aave', 'ren', 'atricrypto3', 'eurtusd' ];
const FACTORY_POOLS_COUNT_POLYGON = 263;

const MAIN_POOLS_AVALANCHE = [ 'aave', 'ren', 'atricrypto'];
const FACTORY_POOLS_COUNT_AVALANCHE = 81;

const MAIN_POOLS_FANTOM = ['2pool', 'fusdt', 'ren', 'tricrypto', 'ib', 'geist'];;
const FACTORY_POOLS_COUNT_FANTOM = 110;
const CRYPTO_FACTORY_POOLS_COUNT_FANTOM = 6;

const MAIN_POOLS_ARBITRUM = ['2pool', 'tricrypto', 'ren', 'eursusd'];
const FACTORY_POOLS_COUNT_ARBITRUM = 40;

const MAIN_POOLS_OPTIMISM = ['3pool'];
const FACTORY_POOLS_COUNT_OPTIMISM = 16;

const MAIN_POOLS_XDAI = ['3pool', 'rai', 'tricrypto'];
const FACTORY_POOLS_COUNT_XDAI = 7;

const MAIN_POOLS_MOONBEAM = ['3pool'];
const FACTORY_POOLS_COUNT_MOONBEAM = 16;

const MAIN_POOLS_AURORA = ['3pool'];

const MAIN_POOLS_KAVA = ['factory-v2-0'];

const MAIN_POOLS_CELO = ['factory-v2-0'];

// ------------------------------------------

const MAIN_POOLS = MAIN_POOLS_CELO;
const FACTORY_POOLS_COUNT = 0;
const CRYPTO_FACTORY_POOLS_COUNT = 0;

const checkNumber = (str: string) => {
    const re = /-?\d+(\.\d+)?(e-\d+)?/g
    const match = str.match(re);
    return match && str === match[0]
}

const poolStatsTest = (name: string) => {
    describe(`${name} stats test`, function () {
        let pool: PoolTemplate;

        before(async function () {
            pool = getPool(name);
        });


        it('Total liquidity', async function () {
            const totalLiquidity = await pool.stats.totalLiquidity();

            assert.isTrue(checkNumber(totalLiquidity));
        });

        it('Volume', async function () {
            const volume = await pool.stats.volume();

            assert.isTrue(checkNumber(volume));
        });

        it('Base APY', async function () {
            const apy = await pool.stats.baseApy();

            assert.isTrue(checkNumber(apy.day));
            assert.isTrue(checkNumber(apy.week));
        });

        it('Token APY', async function () {
            if (pool.gauge === ethers.constants.AddressZero || pool.rewardsOnly()) {
                console.log("Skip");
                return
            }

            const [apy, boostedApy] = await pool.stats.tokenApy();

            assert.isTrue(typeof apy === "number");
            assert.isTrue(typeof boostedApy === "number");
        });

        it('Rewards APY', async function () {
            const rewardsApy = await pool.stats.rewardsApy();

            rewardsApy.forEach((item: IReward) => {
                assert.isTrue(checkNumber(String(item.apy)));
            })
        });
    })
}

describe('Stats test', async function () {
    this.timeout(120000);


    before(async function () {
        await curve.init('JsonRpc', {},{ gasPrice: 0 });
        await curve.fetchFactoryPools();
        await curve.fetchCryptoFactoryPools();
    });

    for (const poolName of MAIN_POOLS) {
        poolStatsTest(poolName);
    }

    for (let i = 0; i < FACTORY_POOLS_COUNT; i++) {
        poolStatsTest("factory-v2-" + i);
    }

    for (let i = 0; i < CRYPTO_FACTORY_POOLS_COUNT; i++) {
        poolStatsTest("factory-crypto-" + i);
    }
})
