import { assert } from "chai";
import curve from "../src/";
import { Pool } from "../src/pools";
import {ethers} from "ethers";

const MAIN_POOLS_ETHEREUM = [
    'compound', 'usdt',   'y',          'busd',
    'susd',     'pax',    'ren',        'sbtc',
    'hbtc',     '3pool',  'gusd',       'husd',
    'usdk',     'usdn',   'musd',       'rsv',
    'tbtc',     'dusd',   'pbtc',       'bbtc',
    'obtc',     'seth',   'eurs',       'ust',
    'aave',     'steth',  'saave',      'ankreth',
    'usdp',     'ib',     'link',       'tusd',
    'frax',     'lusd',   'busdv2',     'reth',
    'alusd',    'mim',    'tricrypto2', 'eurt',
    'eurtusd',  'crveth', 'cvxeth',     'xautusd',
    'spelleth', 'teth',
];
const FACTORY_POOLS_ETHEREUM = [
    'ibEUR+sEUR',    'ibKRW+sKRW',    'ibEUR+sEUR-2',  'crvCRVsCRV',
    'jGBP+TGBP',     '2CRV',          'crvCRV',        'ibbtc/sbtcCRV',
    'OUSD3CRV',      'aUSDC+aDAI',    'FEI3CRV3CRV',   'GrapeFUSD3CRV',
    'SifuETH3CRV',   'RC_INV3CRV',    'RC_xRULER3CRV', 'RC_xCOVER3CRV',
    'nUSD3CRV',      'cvxcrv',        'USDM3CRV',      'mEUR',
    'waUSD3CRV',     'waBTC/sbtcCRV', 'DOLA3POOL3CRV', 'ibJPY+sJPY',
    'ibAUD+sAUD',    'ibGBP+sGBP',    'ibCHF+sCHF',    'OPEN MATIC',
    'EURN/EURT',     'sdCRV',         'BTCpx/sbtcCRV', 'PWRD3CRV3CRV',
    'sansUSDT',      'alETH+ETH',     '17PctCypt3CRV', '17PctCypt3CRV-2',
    'tbtc2/sbtcCRV', 'kusd3pool3CRV', 'tusd3pool3CRV', 'PWRD3CRV',
    'fUSD3CRV',      'TPD3CRV',       'DEI3CRV',       'MIM-UST',
    'ETH/vETH2',     'QBITWELLS3CRV', 'QWell13CRV',    'bveCVX-CVX',
    'UST_whv23CRV',  'DSU+3Crv3CRV',  'DSU3CRV',       'aETHb',
    'D3',            'aMATICb',       'pax-usdp3CRV',  'ibbtc/sbtcCRV-2',
    'fxEUR_CRV',     'ORK/sbtcCRV',   'agEUR/sEUR',    'ibZAR+ZARP',
    '3DYDX3CRV',     '3EURpool',      'tWETH+WETH',    'XSTUSD3CRV',
    'XIM3CRV3CRV',   'XIM3CRV',       'RAMP rUSD3CRV', 'bhome3CRV',
    'JPYC+ibJPY',    'UST-FRAX',      'FEIPCV-1',      'bentcvx',
    'USX3CRV3CRV',   'ag+ib-EUR',     'tFRAX+FRAX',    'ELONXSWAP3CRV',
    'BEAN3CRV',      'USDV3CRV',      'PARUSDC3CRV',   'baoUSD-3CRV',
];
const CRYPTO_FACTORY_POOLS_ETHEREUM = [
    'FXSETH-fV2',     'FXSETH-fV2-2',
    'FXSETH-fV2-3',   'FXSETH-fV2-4',
    'BADGERWBTC-fV2', 'INVDOLA-fV2',
    'RAIFRAX-fV2',    'RAIETH-fV2',
    'YFIETH-fV2',     'palStkAAVE-fV2',
    'DYDXETH-fV2',    'SDTETH-fV2',
    'CADCUSDC-fV2',   'RAIAGEUR-fV2',
    'rp-eth-fV2',     'PARUSDC-fV2',
    'DUCKETH-fV2',    'BTRFLYETH-fV2',
];

const MAIN_POOLS_POLYGON = [ 'aave', 'ren', 'atricrypto3', 'eurtusd' ];
const FACTORY_POOLS_POLYGON = [
    '33373430',       'usdtusdt',       'busd3CRV',      'busd23CRV',
    '2BTCWETH',       '3EUR',           'MAI3CRV',       'maave',
    'MAI3pool',       'creth',          'CWM',           'USDN3CRV',
    'FRAX3CRV-f3CRV', 'ibbtc3CRV',      'crvmat200',     'rUSD3CRV',
    'ISusdt',         'jSGD+XSGD',      'crvAUR-JRT',    'ibbtc3CRV-2',
    'ibbtc3CRV-3',    'crv2euro',       'AUSD3CRV',      'jSGD+XSGD-2',
    'jCAD+CADC',      'PK3CRV',         'PK3CRV-2',      '4MT100',
    '4MT100-2',       'illMATIK',       'MEG3CRV',       'TEST_POOL',
    'USDT/FLSH3CRV',  'moUSD3CRV',      'TxPUSTSw',      'StSwTrPo',
    '4eur',           'aavesarco3CRV',  '4eur-2',        'PopBTCETH',
    'CJS',            'wCJS',           'AMISam3CRV',    'AMISamUEM',
    'AMISamUEB',      'ATETRACRYP',     'am3CRVAMIS',    'sMVI3CRV',
    'bMVI3CRV',       '3CRVUAMIS',      'aTri TONI3CRV', 'bBtc TONI3CRV',
    'bBtc MARCO3CRV', 'bTri MARCO3CRV', 'am3CRVItal',    '2JPY',
    '2JPY-2',         'jEUR-4eur',      'jEUR-4eur-2',   'AUSDAM3Crv3CRV',
    'DOGGYUP3CRV',    'DOGGYUP3CRV-2',  'aTest3CRV',     'PYD3CRV',
    'renDAI',         'renETH',         'renUSDC',       'renUSDT',
    'LAMBO-USDT',     'LAMBO-USDT-2',   'PYD3CRV-2',     'OOPSPoS',
    'BRNR-MATIC',     'agEUR+4eur',    'xDRINK',         'LUK3CRV',
    'USDC+UST',       'wTEST',         'fx5eur',         '2chf',
    '2aud',           '2php',          '2php-2',         '2aud-2',
    'fx5eur-2',       '2chf-2',        '2jpy',           'crv3X',
    'DeiUsdc3CRV',    'DeiUsdc3CRV-2', 'NEXP',           'wust3CRV',
    'fxEUR_4eur',     'fxAUD_jAUD',    'izumi',          'MAI3CRV-2',
    'MAI3CRV-3',      'MAI3CRV-4',     'MAI3CRV-5',      'MAI3CRV-6',
    'MAI33CRV',       'fxEUR_jEUR',    'Corinthian3CRV', 'cvxfxs-f',
    'SUSHPOOOL3CRV',  'cOMI',          'cOMI-2',         'MAI3Pool3CRV',
    'MAI+3Pool3CRV',  'cvxcrv',        'MAI33CRV-2',     'Crypl3CRV',
    'deUSDC-3P3CRV',  'ABC3CRV3CRV',   'CRVALRTO',       'SoDeDAI3CRV',
    'SoDeDAI3CRV-2',  'SoDeDAI3CRV-3', 'SoHeCRV',        'CURVERTO3CRV',
    'CURVERTO3CRV-2', 'AlertoCRV3',    'crv3erto3CRV',   'AlertoCrv33CRV',
    'LertoMatic',     'MATIC/ALRT',    'MATIC/ALRT-2',   'MATIC/ALRT-3',
    'Makerto',        'Makerto-2',     'Binagon',        'BNBMATIC',
    'BNBMATIC-2',     'Binagon-2',     'IDEXUSDT3CRV',   'IDEXUSDT3CRV-2',
    '196.967',        '107-86',        'SPARK',          'Lithereum',
    'Lithereum3CRV',  'PSOLM3CRV',     'PSOLM3CRV-2',    'PSOLM',
    'PSOLM3CRV-3',    'PSOLM3CRV-4',
];

const checkNumber = (str: string) => {
    const re = /-?\d+(\.\d+)?/g
    const match = str.match(re);
    return match && str === match[0]
}

const poolStatsTest = (name: string) => {
    describe(`${name} stats test`, function () {
        let pool: Pool;

        before(async function () {
            pool = new Pool(name);
        });


        it('Total liquidity', async function () {
            const totalLiquidity = await pool.stats.getTotalLiquidity();

            assert.isTrue(checkNumber(totalLiquidity));
        });

        it('Volume', async function () {
            const volume = await pool.stats.getVolume();

            assert.isTrue(checkNumber(volume));
        });

        it('Base APY', async function () {
            const apy = await pool.stats.getBaseApy();

            assert.isTrue(checkNumber(apy.day));
            assert.isTrue(checkNumber(apy.week));
            assert.isTrue(checkNumber(apy.month));
            assert.isTrue(checkNumber(apy.total));
        });

        it('Token APY', async function () {
            if (pool.gauge === ethers.constants.AddressZero) {
                console.log("Skip");
                return
            }

            const [apy, boostedApy] = await pool.stats.getTokenApy();

            assert.isTrue(checkNumber(apy));
            assert.isTrue(checkNumber(boostedApy));
        });

        it('Rewards APY', async function () {
            const rewardsApy = await pool.stats.getRewardsApy();

            rewardsApy.forEach((item: { apy: string }) => {
                assert.isTrue(checkNumber(item.apy));
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

    for (const poolName of MAIN_POOLS_ETHEREUM) {
        poolStatsTest(poolName);
    }

    for (const poolName of FACTORY_POOLS_ETHEREUM) {
        poolStatsTest(poolName);
    }

    for (const poolName of CRYPTO_FACTORY_POOLS_ETHEREUM) {
        poolStatsTest(poolName);
    }

    // for (const poolName of MAIN_POOLS_POLYGON) {
    //     poolStatsTest(poolName);
    // }
    //
    // for (const poolName of FACTORY_POOLS_POLYGON) {
    //     poolStatsTest(poolName);
    // }
})
