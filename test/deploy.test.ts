import { ethers } from "ethers";
import { assert } from "chai";
import curve from "../src";
import { curve as _curve } from "../src/curve";


describe('Factory deploy', function() {
    this.timeout(240000);
    // let address = '';

    before(async function() {
        await curve.init('JsonRpc', {}, { gasPrice: 0 });
        // address = curve.signerAddress;
        if (curve.chainId !== 1) {
            console.log('Run this test on Ethereum network');
            return;
        }
    });

    // --- PLAIN (2 COINS) ---

    it('Deploy stable plain pool and gauge (2 coins, implementation 0)', async function () {
        const coins = [_curve.constants.COINS['usdp'], _curve.constants.COINS['mim']];

        // Deploy pool

        const deployPoolTx = await curve.factory.deployPlainPool('Test pool', 'TST', coins, 200, 0.1, 0, 0);
        const poolAddress = await curve.factory.getDeployedPlainPoolAddress(deployPoolTx);
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await curve.factory.deployGauge(poolAddress);
        const gaugeAddress = await curve.factory.getDeployedGaugeAddress(deployGaugeTx);
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));

        // Deposit & Stake

        const poolId = await curve.factory.fetchRecentlyDeployedPool(poolAddress);
        const pool = curve.getPool(poolId);
        assert.equal(poolAddress.toLowerCase(), pool.address);
        assert.equal(gaugeAddress.toLowerCase(), pool.gauge);

        await pool.depositAndStake([10, 10]);
        const balances = await pool.stats.underlyingBalances();
        for (const b of balances) {
            assert.equal(Number(b), 10);
        }
    });

    it('Deploy stable plain pool and gauge (2 coins, implementation 1)', async function () {
        const coins = [_curve.constants.COINS['usdp'], _curve.constants.COINS['mim']];

        // Deploy pool

        const deployPoolTx = await curve.factory.deployPlainPool('Test pool', 'TST', coins, 200, 0.1, 0, 1);
        const poolAddress = await curve.factory.getDeployedPlainPoolAddress(deployPoolTx);
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await curve.factory.deployGauge(poolAddress);
        const gaugeAddress = await curve.factory.getDeployedGaugeAddress(deployGaugeTx);
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));

        // Deposit & Stake

        const poolId = await curve.factory.fetchRecentlyDeployedPool(poolAddress);
        const pool = curve.getPool(poolId);
        assert.equal(poolAddress.toLowerCase(), pool.address);
        assert.equal(gaugeAddress.toLowerCase(), pool.gauge);

        await pool.depositAndStake([10, 10]);
        const balances = await pool.stats.underlyingBalances();
        for (const b of balances) {
            assert.equal(Number(b), 10);
        }
    });

    it('Deploy stable plain pool and gauge (2 coins, implementation 2)', async function () {
        const coins = [_curve.constants.COINS['eth'], _curve.constants.COINS['steth']];

        // Deploy pool

        const deployPoolTx = await curve.factory.deployPlainPool('Test pool', 'TST', coins, 200, 0.1, 0, 2);
        const poolAddress = await curve.factory.getDeployedPlainPoolAddress(deployPoolTx);
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await curve.factory.deployGauge(poolAddress);
        const gaugeAddress = await curve.factory.getDeployedGaugeAddress(deployGaugeTx);
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));

        // Deposit & Stake

        const poolId = await curve.factory.fetchRecentlyDeployedPool(poolAddress);
        const pool = curve.getPool(poolId);
        assert.equal(poolAddress.toLowerCase(), pool.address);
        assert.equal(gaugeAddress.toLowerCase(), pool.gauge);

        await pool.depositAndStake([10, 10]);
        const balances = await pool.stats.underlyingBalances();
        for (const b of balances) {
            assert.equal(Number(b), 10);
        }
    });

    it('Deploy stable plain pool and gauge (2 coins, implementation 3)', async function () {
        const coins = [_curve.constants.COINS['usdp'], _curve.constants.COINS['mim']];

        // Deploy pool

        const deployPoolTx = await curve.factory.deployPlainPool('Test pool', 'TST', coins, 200, 0.1, 0, 3);
        const poolAddress = await curve.factory.getDeployedPlainPoolAddress(deployPoolTx);
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await curve.factory.deployGauge(poolAddress);
        const gaugeAddress = await curve.factory.getDeployedGaugeAddress(deployGaugeTx);
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));

        // Deposit & Stake

        const poolId = await curve.factory.fetchRecentlyDeployedPool(poolAddress);
        const pool = curve.getPool(poolId);
        assert.equal(poolAddress.toLowerCase(), pool.address);
        assert.equal(gaugeAddress.toLowerCase(), pool.gauge);

        await pool.depositAndStake([10, 10]);
        const balances = await pool.stats.underlyingBalances();
        for (const b of balances) {
            assert.equal(Number(b), 10);
        }
    });

    // --- PLAIN (3 COINS) ---

    it('Deploy stable plain pool and gauge (3 coins, implementation 0)', async function () {
        const coins = [_curve.constants.COINS['usdp'], _curve.constants.COINS['mim'], _curve.constants.COINS['lusd']];

        // Deploy pool

        const deployPoolTx = await curve.factory.deployPlainPool('Test pool', 'TST', coins, 200, 0.1, 0, 0);
        const poolAddress = await curve.factory.getDeployedPlainPoolAddress(deployPoolTx);
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await curve.factory.deployGauge(poolAddress);
        const gaugeAddress = await curve.factory.getDeployedGaugeAddress(deployGaugeTx);
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));

        // Deposit & Stake

        const poolId = await curve.factory.fetchRecentlyDeployedPool(poolAddress);
        const pool = curve.getPool(poolId);
        assert.equal(poolAddress.toLowerCase(), pool.address);
        assert.equal(gaugeAddress.toLowerCase(), pool.gauge);

        await pool.depositAndStake([10, 10, 10]);
        const balances = await pool.stats.underlyingBalances();
        for (const b of balances) {
            assert.equal(Number(b), 10);
        }
    });

    it('Deploy stable plain pool and gauge (3 coins, implementation 1)', async function () {
        const coins = [_curve.constants.COINS['usdp'], _curve.constants.COINS['mim'], _curve.constants.COINS['lusd']];

        // Deploy pool

        const deployPoolTx = await curve.factory.deployPlainPool('Test pool', 'TST', coins, 200, 0.1, 0, 1);
        const poolAddress = await curve.factory.getDeployedPlainPoolAddress(deployPoolTx);
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await curve.factory.deployGauge(poolAddress);
        const gaugeAddress = await curve.factory.getDeployedGaugeAddress(deployGaugeTx);
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));

        // Deposit & Stake

        const poolId = await curve.factory.fetchRecentlyDeployedPool(poolAddress);
        const pool = curve.getPool(poolId);
        assert.equal(poolAddress.toLowerCase(), pool.address);
        assert.equal(gaugeAddress.toLowerCase(), pool.gauge);

        await pool.depositAndStake([10, 10, 10]);
        const balances = await pool.stats.underlyingBalances();
        for (const b of balances) {
            assert.equal(Number(b), 10);
        }
    });

    it('Deploy stable plain pool and gauge (3 coins, implementation 2)', async function () {
        const coins = [_curve.constants.COINS['eth'], _curve.constants.COINS['steth'], _curve.constants.COINS['weth']];

        // Deploy pool

        const deployPoolTx = await curve.factory.deployPlainPool('Test pool', 'TST', coins, 200, 0.1, 0, 2);
        const poolAddress = await curve.factory.getDeployedPlainPoolAddress(deployPoolTx);
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await curve.factory.deployGauge(poolAddress);
        const gaugeAddress = await curve.factory.getDeployedGaugeAddress(deployGaugeTx);
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));

        // Deposit & Stake

        const poolId = await curve.factory.fetchRecentlyDeployedPool(poolAddress);
        const pool = curve.getPool(poolId);
        assert.equal(poolAddress.toLowerCase(), pool.address);
        assert.equal(gaugeAddress.toLowerCase(), pool.gauge);

        await pool.depositAndStake([10, 10, 10]);
        const balances = await pool.stats.underlyingBalances();
        for (const b of balances) {
            assert.equal(Number(b), 10);
        }
    });

    it('Deploy stable plain pool and gauge (3 coins, implementation 3)', async function () {
        const coins = [_curve.constants.COINS['usdp'], _curve.constants.COINS['mim'], _curve.constants.COINS['lusd']];

        // Deploy pool

        const deployPoolTx = await curve.factory.deployPlainPool('Test pool', 'TST', coins, 200, 0.1, 0, 3);
        const poolAddress = await curve.factory.getDeployedPlainPoolAddress(deployPoolTx);
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await curve.factory.deployGauge(poolAddress);
        const gaugeAddress = await curve.factory.getDeployedGaugeAddress(deployGaugeTx);
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));

        // Deposit & Stake

        const poolId = await curve.factory.fetchRecentlyDeployedPool(poolAddress);
        const pool = curve.getPool(poolId);
        assert.equal(poolAddress.toLowerCase(), pool.address);
        assert.equal(gaugeAddress.toLowerCase(), pool.gauge);

        await pool.depositAndStake([10, 10, 10]);
        const balances = await pool.stats.underlyingBalances();
        for (const b of balances) {
            assert.equal(Number(b), 10);
        }
    });

    // --- PLAIN (4 COINS) ---

    it('Deploy stable plain pool and gauge (4 coins, implementation 0)', async function () {
        const coins = [_curve.constants.COINS['usdp'], _curve.constants.COINS['mim'], _curve.constants.COINS['lusd'], _curve.constants.COINS['busd']];

        // Deploy pool

        const deployPoolTx = await curve.factory.deployPlainPool('Test pool', 'TST', coins, 200, 0.1, 0, 0);
        const poolAddress = await curve.factory.getDeployedPlainPoolAddress(deployPoolTx);
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await curve.factory.deployGauge(poolAddress);
        const gaugeAddress = await curve.factory.getDeployedGaugeAddress(deployGaugeTx);
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));

        // Deposit & Stake

        const poolId = await curve.factory.fetchRecentlyDeployedPool(poolAddress);
        const pool = curve.getPool(poolId);
        assert.equal(poolAddress.toLowerCase(), pool.address);
        assert.equal(gaugeAddress.toLowerCase(), pool.gauge);

        await pool.depositAndStake([10, 10, 10, 10]);
        const balances = await pool.stats.underlyingBalances();
        for (const b of balances) {
            assert.equal(Number(b), 10);
        }
    });

    it('Deploy stable plain pool and gauge (4 coins, implementation 1)', async function () {
        const coins = [_curve.constants.COINS['usdp'], _curve.constants.COINS['mim'], _curve.constants.COINS['lusd'], _curve.constants.COINS['busd']];

        // Deploy pool

        const deployPoolTx = await curve.factory.deployPlainPool('Test pool', 'TST', coins, 200, 0.1, 0, 1);
        const poolAddress = await curve.factory.getDeployedPlainPoolAddress(deployPoolTx);
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await curve.factory.deployGauge(poolAddress);
        const gaugeAddress = await curve.factory.getDeployedGaugeAddress(deployGaugeTx);
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));

        // Deposit & Stake

        const poolId = await curve.factory.fetchRecentlyDeployedPool(poolAddress);
        const pool = curve.getPool(poolId);
        assert.equal(poolAddress.toLowerCase(), pool.address);
        assert.equal(gaugeAddress.toLowerCase(), pool.gauge);

        await pool.depositAndStake([10, 10, 10, 10]);
        const balances = await pool.stats.underlyingBalances();
        for (const b of balances) {
            assert.equal(Number(b), 10);
        }
    });

    it('Deploy stable plain pool and gauge (4 coins, implementation 2)', async function () {
        const coins = [_curve.constants.COINS['eth'], _curve.constants.COINS['steth'], _curve.constants.COINS['weth'], _curve.constants.COINS['reth']];

        // Deploy pool

        const deployPoolTx = await curve.factory.deployPlainPool('Test pool', 'TST', coins, 200, 0.1, 0, 2);
        const poolAddress = await curve.factory.getDeployedPlainPoolAddress(deployPoolTx);
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await curve.factory.deployGauge(poolAddress);
        const gaugeAddress = await curve.factory.getDeployedGaugeAddress(deployGaugeTx);
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));

        // Deposit & Stake

        const poolId = await curve.factory.fetchRecentlyDeployedPool(poolAddress);
        const pool = curve.getPool(poolId);
        assert.equal(poolAddress.toLowerCase(), pool.address);
        assert.equal(gaugeAddress.toLowerCase(), pool.gauge);

        await pool.depositAndStake([10, 10, 10, 10]);
        const balances = await pool.stats.underlyingBalances();
        for (const b of balances) {
            assert.equal(Number(b), 10);
        }
    });

    it('Deploy stable plain pool and gauge (4 coins, implementation 3)', async function () {
        const coins = [_curve.constants.COINS['usdp'], _curve.constants.COINS['mim'], _curve.constants.COINS['lusd'], _curve.constants.COINS['busd']];

        // Deploy pool

        const deployPoolTx = await curve.factory.deployPlainPool('Test pool', 'TST', coins, 200, 0.1, 0, 3);
        const poolAddress = await curve.factory.getDeployedPlainPoolAddress(deployPoolTx);
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await curve.factory.deployGauge(poolAddress);
        const gaugeAddress = await curve.factory.getDeployedGaugeAddress(deployGaugeTx);
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));

        // Deposit & Stake

        const poolId = await curve.factory.fetchRecentlyDeployedPool(poolAddress);
        const pool = curve.getPool(poolId);
        assert.equal(poolAddress.toLowerCase(), pool.address);
        assert.equal(gaugeAddress.toLowerCase(), pool.gauge);

        await pool.depositAndStake([10, 10, 10, 10]);
        const balances = await pool.stats.underlyingBalances();
        for (const b of balances) {
            assert.equal(Number(b), 10);
        }
    });

    // --- META (3pool) ---

    it('Deploy stable meta pool and gauge (3pool, implementation 0)', async function () {
        const basePool = _curve.constants.POOLS_DATA['3pool'].swap_address;
        const coin = _curve.constants.COINS['mim'];

        // Deploy pool

        const deployPoolTx = await curve.factory.deployMetaPool(basePool, 'Test pool', 'TST', coin, 200, 0.1, 0);
        const poolAddress = await curve.factory.getDeployedMetaPoolAddress(deployPoolTx);
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await curve.factory.deployGauge(poolAddress);
        const gaugeAddress = await curve.factory.getDeployedGaugeAddress(deployGaugeTx);
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));

        // Deposit & Stake Wrapped

        const poolId = await curve.factory.fetchRecentlyDeployedPool(poolAddress);
        const pool = curve.getPool(poolId);
        assert.equal(poolAddress.toLowerCase(), pool.address);
        assert.equal(gaugeAddress.toLowerCase(), pool.gauge);

        await pool.depositAndStakeWrapped([10, 10]);
        const balances = await pool.stats.wrappedBalances();
        for (const b of balances) {
            assert.equal(Number(b), 10);
        }
    });

    it('Deploy stable meta pool and gauge (3pool, implementation 1)', async function () {
        const basePool = _curve.constants.POOLS_DATA['3pool'].swap_address;
        const coin = _curve.constants.COINS['mim'];

        // Deploy pool

        const deployPoolTx = await curve.factory.deployMetaPool(basePool, 'Test pool', 'TST', coin, 200, 0.1, 1);
        const poolAddress = await curve.factory.getDeployedMetaPoolAddress(deployPoolTx);
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await curve.factory.deployGauge(poolAddress);
        const gaugeAddress = await curve.factory.getDeployedGaugeAddress(deployGaugeTx);
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));

        // Deposit & Stake Wrapped

        const poolId = await curve.factory.fetchRecentlyDeployedPool(poolAddress);
        const pool = curve.getPool(poolId);
        assert.equal(poolAddress.toLowerCase(), pool.address);
        assert.equal(gaugeAddress.toLowerCase(), pool.gauge);

        await pool.depositAndStakeWrapped([10, 10]);
        const balances = await pool.stats.wrappedBalances();
        for (const b of balances) {
            assert.equal(Number(b), 10);
        }
    });

    // --- META (fraxusdc) ---

    it('Deploy stable meta pool and gauge (fraxusc, implementation 0)', async function () {
        const basePool = _curve.constants.POOLS_DATA['fraxusdc'].swap_address;
        const coin = _curve.constants.COINS['mim'];

        // Deploy pool

        const deployPoolTx = await curve.factory.deployMetaPool(basePool, 'Test pool', 'TST', coin, 200, 0.1, 0);
        const poolAddress = await curve.factory.getDeployedMetaPoolAddress(deployPoolTx);
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await curve.factory.deployGauge(poolAddress);
        const gaugeAddress = await curve.factory.getDeployedGaugeAddress(deployGaugeTx);
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));

        // Deposit & Stake

        const poolId = await curve.factory.fetchRecentlyDeployedPool(poolAddress);
        const pool = curve.getPool(poolId);
        assert.equal(poolAddress.toLowerCase(), pool.address);
        assert.equal(gaugeAddress.toLowerCase(), pool.gauge);

        await pool.depositAndStake([10, 10, 10]);
        const balances = await pool.stats.underlyingBalances();
        for (const b of balances) {
            assert.isAtLeast(Number(b), 5);
        }
    });

    it('Deploy stable meta pool and gauge (fraxusc, implementation 1)', async function () {
        const basePool = _curve.constants.POOLS_DATA['fraxusdc'].swap_address;
        const coin = _curve.constants.COINS['mim'];

        // Deploy pool

        const deployPoolTx = await curve.factory.deployMetaPool(basePool, 'Test pool', 'TST', coin, 200, 0.1, 1);
        const poolAddress = await curve.factory.getDeployedMetaPoolAddress(deployPoolTx);
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await curve.factory.deployGauge(poolAddress);
        const gaugeAddress = await curve.factory.getDeployedGaugeAddress(deployGaugeTx);
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));

        // Deposit & Stake

        const poolId = await curve.factory.fetchRecentlyDeployedPool(poolAddress);
        const pool = curve.getPool(poolId);
        assert.equal(poolAddress.toLowerCase(), pool.address);
        assert.equal(gaugeAddress.toLowerCase(), pool.gauge);

        await pool.depositAndStake([10, 10, 10]);
        const balances = await pool.stats.underlyingBalances();
        for (const b of balances) {
            assert.isAtLeast(Number(b), 5);
        }
    });

    // --- META (sbtc) ---

    it('Deploy stable meta pool and gauge (sbtc, implementation 0)', async function () {
        const basePool = _curve.constants.POOLS_DATA['sbtc'].swap_address;
        const coin = _curve.constants.COINS['tbtc'];

        // Deploy pool

        const deployPoolTx = await curve.factory.deployMetaPool(basePool, 'Test pool', 'TST', coin, 200, 0.1, 0);
        const poolAddress = await curve.factory.getDeployedMetaPoolAddress(deployPoolTx);
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await curve.factory.deployGauge(poolAddress);
        const gaugeAddress = await curve.factory.getDeployedGaugeAddress(deployGaugeTx);
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));

        // Deposit & Stake Wrapped

        const poolId = await curve.factory.fetchRecentlyDeployedPool(poolAddress);
        const pool = curve.getPool(poolId);
        assert.equal(poolAddress.toLowerCase(), pool.address);
        assert.equal(gaugeAddress.toLowerCase(), pool.gauge);

        await pool.depositAndStakeWrapped([10, 10]);
        const balances = await pool.stats.wrappedBalances();
        for (const b of balances) {
            assert.equal(Number(b), 10);
        }
    });

    it('Deploy stable meta pool and gauge (sbtc, implementation 1)', async function () {
        const basePool = _curve.constants.POOLS_DATA['sbtc'].swap_address;
        const coin = _curve.constants.COINS['tbtc'];

        // Deploy pool

        const deployPoolTx = await curve.factory.deployMetaPool(basePool, 'Test pool', 'TST', coin, 200, 0.1, 1);
        const poolAddress = await curve.factory.getDeployedMetaPoolAddress(deployPoolTx);
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await curve.factory.deployGauge(poolAddress);
        const gaugeAddress = await curve.factory.getDeployedGaugeAddress(deployGaugeTx);
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));

        // Deposit & Stake Wrapped

        const poolId = await curve.factory.fetchRecentlyDeployedPool(poolAddress);
        const pool = curve.getPool(poolId);
        assert.equal(poolAddress.toLowerCase(), pool.address);
        assert.equal(gaugeAddress.toLowerCase(), pool.gauge);

        await pool.depositAndStakeWrapped([10, 10]);
        const balances = await pool.stats.wrappedBalances();
        for (const b of balances) {
            assert.equal(Number(b), 10);
        }
    });

    // --- META (ren) ---

    it('Deploy stable meta pool and gauge (ren, implementation 0)', async function () {
        const basePool = _curve.constants.POOLS_DATA['ren'].swap_address;
        const coin = _curve.constants.COINS['tbtc'];

        // Deploy pool

        const deployPoolTx = await curve.factory.deployMetaPool(basePool, 'Test pool', 'TST', coin, 200, 0.1, 0);
        const poolAddress = await curve.factory.getDeployedMetaPoolAddress(deployPoolTx);
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await curve.factory.deployGauge(poolAddress);
        const gaugeAddress = await curve.factory.getDeployedGaugeAddress(deployGaugeTx);
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));

        // Deposit & Stake

        const poolId = await curve.factory.fetchRecentlyDeployedPool(poolAddress);
        const pool = curve.getPool(poolId);
        assert.equal(poolAddress.toLowerCase(), pool.address);
        assert.equal(gaugeAddress.toLowerCase(), pool.gauge);

        await pool.depositAndStake([10, 10, 10]);
        const balances = await pool.stats.underlyingBalances();
        for (const b of balances) {
            assert.isAtLeast(Number(b), 5);
        }
    });

    it('Deploy stable meta pool and gauge (ren, implementation 1)', async function () {
        const basePool = _curve.constants.POOLS_DATA['ren'].swap_address;
        const coin = _curve.constants.COINS['tbtc'];

        // Deploy pool

        const deployPoolTx = await curve.factory.deployMetaPool(basePool, 'Test pool', 'TST', coin, 200, 0.1, 1);
        const poolAddress = await curve.factory.getDeployedMetaPoolAddress(deployPoolTx);
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await curve.factory.deployGauge(poolAddress);
        const gaugeAddress = await curve.factory.getDeployedGaugeAddress(deployGaugeTx);
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));

        // Deposit & Stake

        const poolId = await curve.factory.fetchRecentlyDeployedPool(poolAddress);
        const pool = curve.getPool(poolId);
        assert.equal(poolAddress.toLowerCase(), pool.address);
        assert.equal(gaugeAddress.toLowerCase(), pool.gauge);

        await pool.depositAndStake([10, 10, 10]);
        const balances = await pool.stats.underlyingBalances();
        for (const b of balances) {
            assert.isAtLeast(Number(b), 5);
        }
    });

    // --- CRYPTO ---

    it('Deploy stable meta pool and gauge (ren, implementation 1)', async function () {
        const coins = [_curve.constants.COINS['eurt'], _curve.constants.COINS['weth']];

        // Deploy pool

        const deployPoolTx = await curve.cryptoFactory.deployPool(
            "Test crypto pool",
            "TCP",
            coins,
            400000,
            0.0000725,
            0.25,
            0.45,
            0.000002,
            0.00023,
            0.000146,
            600,
            1500
        );
        const poolAddress = await curve.cryptoFactory.getDeployedPoolAddress(deployPoolTx);

        // Deploy gauge

        const deployGaugeTx = await curve.cryptoFactory.deployGauge(poolAddress);
        const gaugeAddress = await curve.factory.getDeployedGaugeAddress(deployGaugeTx);

        // Deposit & Stake

        const poolId = await curve.cryptoFactory.fetchRecentlyDeployedPool(poolAddress);
        const pool = curve.getPool(poolId);
        assert.equal(poolAddress.toLowerCase(), pool.address);
        assert.equal(gaugeAddress.toLowerCase(), pool.gauge);

        const amounts = await pool.cryptoSeedAmounts(30);
        await pool.depositAndStake(amounts);
        const underlyingBalances = await pool.stats.underlyingBalances();
        const wrappedBalances = await pool.stats.wrappedBalances();
        for (let i = 0; i < amounts.length; i++) {
            assert.equal(Number(underlyingBalances[i]), Number(amounts[i]));
            assert.equal(Number(wrappedBalances[i]), Number(amounts[i]));
        }
    });
});
