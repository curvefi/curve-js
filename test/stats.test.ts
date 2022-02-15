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
    'ibEUR+sEUR-f',    'ibKRW+sKRW-f',      'ibEUR+sEUR-2-f',
    'crvCRVsCRV-f',    'jGBP+TGBP-f',       '2CRV-f',
    'crvCRV-f',        'ibbtc/sbtcCRV-f',   'OUSD3CRV-f',
    'aUSDC+aDAI-f',    'FEI3CRV3CRV-f',     'GrapeFUSD3CRV-f',
    'SifuETH3CRV-f',   'RC_INV3CRV-f',      'RC_xRULER3CRV-f',
    'RC_xCOVER3CRV-f', 'nUSD3CRV-f',        'cvxcrv-f',
    'USDM3CRV-f',      'mEUR-f',            'waUSD3CRV-f',
    'waBTC/sbtcCRV-f', 'DOLA3POOL3CRV-f',   'ibJPY+sJPY-f',
    'ibAUD+sAUD-f',    'ibGBP+sGBP-f',      'ibCHF+sCHF-f',
    'OPEN MATIC-f',    'EURN/EURT-f',       'sdCRV-f',
    'BTCpx/sbtcCRV-f', 'PWRD3CRV3CRV-f',    'sansUSDT-f',
    'alETH+ETH-f',     '17PctCypt3CRV-f',   '17PctCypt3CRV-2-f',
    'tbtc2/sbtcCRV-f', 'kusd3pool3CRV-f',   'tusd3pool3CRV-f',
    'PWRD3CRV-f',      'fUSD3CRV-f',        'TPD3CRV-f',
    'DEI3CRV-f',       'MIM-UST-f',         'ETH/vETH2-f',
    'QBITWELLS3CRV-f', 'QWell13CRV-f',      'bveCVX-CVX-f',
    'UST_whv23CRV-f',  'DSU+3Crv3CRV-f',    'DSU3CRV-f',
    'aETHb-f',         'D3-f',              'aMATICb-f',
    'pax-usdp3CRV-f',  'ibbtc/sbtcCRV-2-f', 'fxEUR_CRV-f',
    'ORK/sbtcCRV-f',   'agEUR/sEUR-f',      'ibZAR+ZARP-f',
    '3DYDX3CRV-f',     '3EURpool-f',        'tWETH+WETH-f',
    'XSTUSD3CRV-f',    'XIM3CRV3CRV-f',     'XIM3CRV-f',
    'RAMP rUSD3CRV-f', 'bhome3CRV-f',       'JPYC+ibJPY-f',
    'UST-FRAX-f',      'FEIPCV-1-f',        'bentcvx-f',
    'USX3CRV3CRV-f',   'ag+ib-EUR-f',       'tFRAX+FRAX-f',
    'ELONXSWAP3CRV-f', 'BEAN3CRV-f',        'USDV3CRV-f',
    'PARUSDC3CRV-f',   'baoUSD-3CRV-f',     'sUSD3CRV-f',
    'AETHV13CRV-f',
];
const CRYPTO_FACTORY_POOLS_ETHEREUM = [
    'FXSETH-fV2',     'FXSETH-2-fV2',
    'FXSETH-3-fV2',   'FXSETH-4-fV2',
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
    'usdtusdt-f',       'busd3CRV-f',      'busd23CRV-f',      '2BTCWETH-f',
    '3EUR-f',           'MAI3CRV-f',       'maave-f',          'MAI3pool-f',
    'creth-f',          'CWM-f',           'USDN3CRV-f',       'FRAX3CRV-f3CRV-f',
    'ibbtc3CRV-f',      'crvmat200-f',     'rUSD3CRV-f',       'ISusdt-f',
    'jSGD+XSGD-f',      'crvAUR-JRT-f',    'ibbtc3CRV-2-f',    'ibbtc3CRV-3-f',
    'crv2euro-f',       'AUSD3CRV-f',      'jSGD+XSGD-2-f',    'jCAD+CADC-f',
    'PK3CRV-f',         'PK3CRV-2-f',      '4MT100-f',         '4MT100-2-f',
    'illMATIK-f',       'MEG3CRV-f',       'TEST_POOL-f',      'USDT/FLSH3CRV-f',
    'moUSD3CRV-f',      'TxPUSTSw-f',      'StSwTrPo-f',       '4eur-f',
    'aavesarco3CRV-f',  '4eur-2-f',        'PopBTCETH-f',      'CJS-f',
    'wCJS-f',           'AMISam3CRV-f',    'AMISamUEM-f',      'AMISamUEB-f',
    'ATETRACRYP-f',     'am3CRVAMIS-f',    'sMVI3CRV-f',       'bMVI3CRV-f',
    '3CRVUAMIS-f',      'aTri TONI3CRV-f', 'bBtc TONI3CRV-f',  'bBtc MARCO3CRV-f',
    'bTri MARCO3CRV-f', 'am3CRVItal-f',    '2JPY-f',           '2JPY-2-f',
    'jEUR-4eur-f',      'jEUR-4eur-2-f',   'AUSDAM3Crv3CRV-f', 'DOGGYUP3CRV-f',
    'DOGGYUP3CRV-2-f',  'aTest3CRV-f',     'PYD3CRV-f',        'renDAI-f',
    'renETH-f',         'renUSDC-f',       'renUSDT-f',        'LAMBO-USDT-f',
    'LAMBO-USDT-2-f',   'PYD3CRV-2-f',     'OOPSPoS-f',        'BRNR-MATIC-f',
    'agEUR+4eur-f',    'xDRINK-f',         'LUK3CRV-f',        'USDC+UST-f',
    'wTEST-f',         'fx5eur-f',         '2chf-f',           '2aud-f',
    '2php-f',          '2php-2-f',         '2aud-2-f',         'fx5eur-2-f',
    '2chf-2-f',        '2jpy-f',           'crv3X-f',          'DeiUsdc3CRV-f',
    'DeiUsdc3CRV-2-f', 'NEXP-f',           'wust3CRV-f',       'fxEUR_4eur-f',
    'fxAUD_jAUD-f',    'izumi-f',          'MAI3CRV-2-f',      'MAI3CRV-3-f',
    'MAI3CRV-4-f',     'MAI3CRV-5-f',      'MAI3CRV-6-f',      'MAI33CRV-f',
    'fxEUR_jEUR-f',    'Corinthian3CRV-f', 'cvxfxs-f-f',       'SUSHPOOOL3CRV-f',
    'cOMI-f',          'cOMI-2-f',         'MAI3Pool3CRV-f',   'MAI+3Pool3CRV-f',
    'cvxcrv-f',        'MAI33CRV-2-f',     'Crypl3CRV-f',      'deUSDC-3P3CRV-f',
    'ABC3CRV3CRV-f',   'CRVALRTO-f',       'SoDeDAI3CRV-f',    'SoDeDAI3CRV-2-f',
    'SoDeDAI3CRV-3-f', 'SoHeCRV-f',        'CURVERTO3CRV-f',   'CURVERTO3CRV-2-f',
    'AlertoCRV3-f',    'crv3erto3CRV-f',   'AlertoCrv33CRV-f', 'LertoMatic-f',
    'MATIC/ALRT-f',    'MATIC/ALRT-2-f',   'MATIC/ALRT-3-f',   'Makerto-f',
    'Makerto-2-f',     'Binagon-f',        'BNBMATIC-f',       'BNBMATIC-2-f',
    'Binagon-2-f',     'IDEXUSDT3CRV-f',   'IDEXUSDT3CRV-2-f', '196.967-f',
    '107-86-f',        '33373430-f',       'SPARK-f',          'Lithereum-f',
    'Lithereum3CRV-f', 'PSOLM3CRV-f',      'PSOLM3CRV-2-f',    'PSOLM-f',
    'PSOLM3CRV-3-f',   'PSOLM3CRV-4-f',
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
