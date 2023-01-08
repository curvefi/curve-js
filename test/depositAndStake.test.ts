import { assert } from "chai";
import curve from "../src";
import { PoolTemplate, getPool } from "../src/pools";
import { BN } from "../src/utils";
import { IDict } from "../src/interfaces";
import {ethers} from "ethers";

const PLAIN_POOLS = ['susd', 'ren', 'sbtc', 'hbtc', '3pool', 'seth', 'eurs', 'steth', 'ankreth', 'link', 'reth', 'eurt', '2pool', '4pool', 'fraxusdc', 'frxeth', 'sbtc2'];
const LENDING_POOLS = ['compound', 'usdt', 'y', 'busd', 'pax', 'aave', 'saave', 'ib'];
const META_POOLS = ['gusd', 'husd', 'usdk', 'usdn', 'musd', 'rsv', 'tbtc', 'dusd', 'pbtc', 'bbtc', 'obtc', 'ust', 'usdp', 'tusd', 'frax', 'lusd', 'busdv2', 'alusd', 'mim'];
const CRYPTO_POOLS = ['tricrypto2', 'eurtusd', 'eursusd', 'crveth', 'cvxeth', 'xautusd', 'spelleth', 'teth', 'euroc'];
const FACTORY_PLAIN_POOLS = ['factory-v2-3', 'factory-v2-57', 'factory-v2-7']; // ['ibEUR+sEUR-f(2)', 'D3-f', 'crvCRV-f'];
const FACTORY_META_POOLS = ['factory-v2-84', 'factory-v2-80', 'factory-v2-60', 'factory-v2-136']; // ['baoUSD-3CRV-f', 'ELONXSWAP3CRV-f', 'ibbtc/sbtcCRV-f(2)', 'sUSDFRAXBP'];
const FACTORY_CRYPTO_POOLS = ['factory-crypto-8', 'factory-crypto-4']; // ['YFIETH-fV2', 'BADGERWBTC-fV2'];
const FACTORY_CRYPTO_META_POOLS = ['factory-crypto-116', 'factory-crypto-97']; // ['DCHF/3CRV', 'cvxCrv/FraxBP'];
const ETHEREUM_POOLS = [...PLAIN_POOLS, ...LENDING_POOLS, ...META_POOLS, ...CRYPTO_POOLS];
// const ETHEREUM_POOLS = [...FACTORY_PLAIN_POOLS, ...FACTORY_META_POOLS, ...FACTORY_CRYPTO_POOLS, ...FACTORY_CRYPTO_META_POOLS];
// const ETHEREUM_POOLS = ['susd', '3pool', 'compound', 'aave', 'ib', 'gusd', 'mim', 'tricrypto2', 'crveth'];


const POLYGON_MAIN_POOLS = ['aave', 'ren', 'atricrypto3', 'eurtusd', 'eursusd'];
const POLYGON_FACTORY_PLAIN_POOLS = ['factory-v2-113', 'factory-v2-4', 'factory-v2-37']; // ['CRVALRTO-f', '3EUR-f', '4eur-f(2)'];
const POLYGON_FACTORY_META_POOLS = ['factory-v2-11']; // ['FRAX3CRV-f3CRV-f'];
const POLYGON_FACTORY_CRYPTO_META_POOLS = ['factory-crypto-1', 'factory-crypto-83']; // ['CRV/TRICRYPTO', 'WMATIC/TRICRYPTO'];
const POLYGON_POOLS = [...POLYGON_MAIN_POOLS, ...POLYGON_FACTORY_PLAIN_POOLS, ...POLYGON_FACTORY_META_POOLS, ...POLYGON_FACTORY_CRYPTO_META_POOLS];

const AVALANCHE_MAIN_POOLS = ['aave', 'ren', 'atricrypto'];
const AVALANCHE_FACTORY_PLAIN_POOLS = ['factory-v2-30', 'factory-v2-4']; // ['USD Coin', '3poolV2'];
const AVALANCHE_FACTORY_META_POOLS = ['factory-v2-0']; // ['MIM'];
const AVALANCHE_POOLS = [...AVALANCHE_MAIN_POOLS, ...AVALANCHE_FACTORY_PLAIN_POOLS, ...AVALANCHE_FACTORY_META_POOLS];

const FANTOM_MAIN_POOLS = ['2pool', 'fusdt', 'ren', 'tricrypto', 'ib', 'geist'];
const FANTOM_FACTORY_PLAIN_POOLS = ['factory-v2-85', 'factory-v2-1', 'factory-v2-7']; // ['axlUSDC/USDC', '3poolV2', '4pool'];
const FANTOM_FACTORY_META_POOLS = ['factory-v2-16', 'factory-v2-40']; // ['FRAX2pool', 'Geist Frax'];
const FANTOM_FACTORY_CRYPTO_POOLS = ['factory-crypto-3']; // ['aCRV/CRV'];
const FANTOM_POOLS = [...FANTOM_MAIN_POOLS, ...FANTOM_FACTORY_PLAIN_POOLS, ...FANTOM_FACTORY_META_POOLS, ...FANTOM_FACTORY_CRYPTO_POOLS];

const ARBITRUM_MAIN_POOLS = ['2pool', 'tricrypto', 'ren', 'eursusd', 'wsteth'];
const ARBITRUM_FACTORY_PLAIN_POOLS = ['factory-v2-15', 'factory-v2-29']; // ['deBridge-ETH', 'Aave aDAI+aUSC+aUSDT USDFACTORY'];
const ARBITRUM_FACTORY_META_POOLS = ['factory-v2-0']; // ['MIM'];
const ARBITRUM_POOLS = [...ARBITRUM_MAIN_POOLS, ...ARBITRUM_FACTORY_PLAIN_POOLS, ...ARBITRUM_FACTORY_META_POOLS];

const OPTIMISM_MAIN_POOLS = ['3pool', 'wsteth'];
const OPTIMISM_FACTORY_PLAIN_POOLS = ['factory-v2-10']; // ['sETH/ETH'];
const OPTIMISM_FACTORY_META_POOLS = ['factory-v2-0']; // ['sUSD Synthetix'];
const OPTIMISM_POOLS = [...OPTIMISM_MAIN_POOLS, ...OPTIMISM_FACTORY_PLAIN_POOLS, ...OPTIMISM_FACTORY_META_POOLS];

const XDAI_MAIN_POOLS = ['3pool', 'rai', 'tricrypto', 'eureusd'];
const XDAI_FACTORY_PLAIN_POOLS = ['factory-v2-0']; // ['sGNO/GNO'];
const XDAI_FACTORY_META_POOLS = ['factory-v2-4']; // ['MAI Stablecoin'];
const XDAI_POOLS = [...XDAI_MAIN_POOLS, ...XDAI_FACTORY_PLAIN_POOLS, ...XDAI_FACTORY_META_POOLS];

const MOONBEAM_MAIN_POOLS = ['3pool'];
const MOONBEAM_FACTORY_PLAIN_POOLS = ['factory-v2-6']; // ['DAI Multi Nomad'];
const MOONBEAM_POOLS = [...MOONBEAM_MAIN_POOLS, ...MOONBEAM_FACTORY_PLAIN_POOLS];

const AURORA_POOLS = ['3pool'];

const KAVA_POOLS = ['factory-v2-0'];

const CELO_POOLS = ['factory-v2-0'];

// --------------------------------------

const POOLS_FOR_TESTING = POLYGON_FACTORY_CRYPTO_META_POOLS;

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

            const amount = '1';
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

            const amount = '1';
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

    for (const poolName of POOLS_FOR_TESTING) {
        underlyingDepositAndStakeTest(poolName);
        wrappedDepositAndStakeTest(poolName);
    }
})
