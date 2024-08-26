import { ethers } from "ethers";
import { assert } from "chai";
import curve from "../src/index.js";
import { curve as _curve } from "../src/curve.js";


describe('Factory deploy', function() {
    this.timeout(240000);
    // let address = '';

    before(async function() {
        await curve.init('JsonRpc', {}, { gasPrice: 0 });
        // address = curve.signerAddress;
        if (curve.chainId !== 1) {
            throw Error('Run this test only on Ethereum network');
        }
    });

    // --- PLAIN (2 COINS) ---

    it('Deploy stable plain pool and gauge (2 coins, implementation 4 (0 with ema))', async function () {
        const coins = [_curve.constants.COINS['usdp'], _curve.constants.COINS['mim']];

        // Deploy pool

        const deployPoolTx = await curve.factory.deployPlainPool('Test pool', 'TST', coins, 200, 0.1, 0, 4, 600);
        const poolAddress = await curve.factory.getDeployedPlainPoolAddress(deployPoolTx);
        assert.isTrue(ethers.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await curve.factory.deployGauge(poolAddress);
        const gaugeAddress = await curve.factory.getDeployedGaugeAddress(deployGaugeTx);
        assert.isTrue(ethers.isAddress(gaugeAddress));

        // Deposit & Stake

        const poolId = await curve.factory.fetchRecentlyDeployedPool(poolAddress);
        const pool = curve.getPool(poolId);
        assert.equal(poolAddress.toLowerCase(), pool.address);
        assert.equal(gaugeAddress.toLowerCase(), pool.gauge.address);

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
        assert.isTrue(ethers.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await curve.factory.deployGauge(poolAddress);
        const gaugeAddress = await curve.factory.getDeployedGaugeAddress(deployGaugeTx);
        assert.isTrue(ethers.isAddress(gaugeAddress));

        // Deposit & Stake

        const poolId = await curve.factory.fetchRecentlyDeployedPool(poolAddress);
        const pool = curve.getPool(poolId);
        assert.equal(poolAddress.toLowerCase(), pool.address);
        assert.equal(gaugeAddress.toLowerCase(), pool.gauge.address);

        await pool.depositAndStake([10, 10]);
        const balances = await pool.stats.underlyingBalances();
        for (const b of balances) {
            assert.equal(Number(b), 10);
        }
    });

    it('Deploy stable plain pool and gauge (2 coins, implementation 5 (2 with ema and oracle), no oracle)', async function () {
        const coins = [_curve.constants.COINS['eth'], _curve.constants.COINS['steth']];

        // Deploy pool

        const deployPoolTx = await curve.factory.deployPlainPool('Test pool', 'TST', coins, 200, 0.1, 1, 5);
        const poolAddress = await curve.factory.getDeployedPlainPoolAddress(deployPoolTx);
        await curve.factory.setOracle(poolAddress);
        const poolContract = _curve.contracts[poolAddress].contract;
        const methodId = await poolContract.oracle_method(_curve.constantOptions);

        assert.isTrue(ethers.isAddress(poolAddress));
        assert.equal(methodId.toString(), "0");

        // Deploy gauge

        const deployGaugeTx = await curve.factory.deployGauge(poolAddress);
        const gaugeAddress = await curve.factory.getDeployedGaugeAddress(deployGaugeTx);
        assert.isTrue(ethers.isAddress(gaugeAddress));

        // Deposit & Stake

        const poolId = await curve.factory.fetchRecentlyDeployedPool(poolAddress);
        const pool = curve.getPool(poolId);
        assert.equal(poolAddress.toLowerCase(), pool.address);
        assert.equal(gaugeAddress.toLowerCase(), pool.gauge.address);

        await pool.depositAndStake([10, 10]);
        const balances = await pool.stats.underlyingBalances();
        for (const b of balances) {
            assert.equal(Number(b), 10);
        }
    });

    it('Deploy stable plain pool and gauge (2 coins, implementation 5 (2 with ema and oracle), with oracle)', async function () {
        const coins = [_curve.constants.COINS['eth'], _curve.constants.COINS['wbeth']];

        // Deploy pool

        const deployPoolTx = await curve.factory.deployPlainPool('Test pool', 'TST', coins, 200, 0.1, 1, 5, 300);
        const poolAddress = await curve.factory.getDeployedPlainPoolAddress(deployPoolTx);
        await curve.factory.setOracle(poolAddress, _curve.constants.COINS['wbeth'], "exchangeRate()");
        const poolContract = _curve.contracts[poolAddress].contract;
        const methodId = await poolContract.oracle_method(_curve.constantOptions);

        assert.isTrue(ethers.isAddress(poolAddress));
        assert.equal(methodId.toString(), "26970434976082401409518253780829902607332438938587170119746310637809052410593");

        // Deploy gauge

        const deployGaugeTx = await curve.factory.deployGauge(poolAddress);
        const gaugeAddress = await curve.factory.getDeployedGaugeAddress(deployGaugeTx);
        assert.isTrue(ethers.isAddress(gaugeAddress));

        // Deposit & Stake

        const poolId = await curve.factory.fetchRecentlyDeployedPool(poolAddress);
        const pool = curve.getPool(poolId);
        assert.equal(poolAddress.toLowerCase(), pool.address);
        assert.equal(gaugeAddress.toLowerCase(), pool.gauge.address);

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
        assert.isTrue(ethers.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await curve.factory.deployGauge(poolAddress);
        const gaugeAddress = await curve.factory.getDeployedGaugeAddress(deployGaugeTx);
        assert.isTrue(ethers.isAddress(gaugeAddress));

        // Deposit & Stake

        const poolId = await curve.factory.fetchRecentlyDeployedPool(poolAddress);
        const pool = curve.getPool(poolId);
        assert.equal(poolAddress.toLowerCase(), pool.address);
        assert.equal(gaugeAddress.toLowerCase(), pool.gauge.address);

        await pool.depositAndStake([10, 10]);
        const balances = await pool.stats.underlyingBalances();
        for (const b of balances) {
            assert.equal(Number(b), 10);
        }
    });

    it('Deploy stable-ng plain pool and gauge (2 coins, implementation 0, (2 with ema and oracle), with oracle)', async function () {
        const coins = [
            "0xae7ab96520de3a18e5e111b5eaab095312d7fe84", // stETH
            "0xac3e018457b222d93114458476f3e3416abbe38f", // sfrxETH
        ];

        //0 = Standard, 1 = Oracle, 2 = Rebasing, 3 = ERC4626
        const assetTypes = [2, 1] as Array<0 | 1 | 2 | 3>;

        const oracleAddresses = [
            '0x0000000000000000000000000000000000000000',
            '0xac3e018457b222d93114458476f3e3416abbe38f',
        ];

        const methodNames = [
            '',
            'pricePerShare',
        ]
        // Deploy pool

        const deployPoolTx = await curve.stableNgFactory.deployPlainPool('Test pool', 'test', coins, 5, 0.05,5, assetTypes,0,600, oracleAddresses, methodNames);
        const poolAddress = await curve.stableNgFactory.getDeployedPlainPoolAddress(deployPoolTx);
        assert.isTrue(ethers.isAddress(poolAddress));
    });

    // --- PLAIN (3 COINS) ---

    it('Deploy stable plain pool and gauge (3 coins, implementation 0)', async function () {
        const coins = [_curve.constants.COINS['usdp'], _curve.constants.COINS['mim'], _curve.constants.COINS['lusd']];

        // Deploy pool

        const deployPoolTx = await curve.factory.deployPlainPool('Test pool', 'TST', coins, 200, 0.1, 0, 0);
        const poolAddress = await curve.factory.getDeployedPlainPoolAddress(deployPoolTx);
        assert.isTrue(ethers.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await curve.factory.deployGauge(poolAddress);
        const gaugeAddress = await curve.factory.getDeployedGaugeAddress(deployGaugeTx);
        assert.isTrue(ethers.isAddress(gaugeAddress));

        // Deposit & Stake

        const poolId = await curve.factory.fetchRecentlyDeployedPool(poolAddress);
        const pool = curve.getPool(poolId);
        assert.equal(poolAddress.toLowerCase(), pool.address);
        assert.equal(gaugeAddress.toLowerCase(), pool.gauge.address);

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
        assert.isTrue(ethers.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await curve.factory.deployGauge(poolAddress);
        const gaugeAddress = await curve.factory.getDeployedGaugeAddress(deployGaugeTx);
        assert.isTrue(ethers.isAddress(gaugeAddress));

        // Deposit & Stake

        const poolId = await curve.factory.fetchRecentlyDeployedPool(poolAddress);
        const pool = curve.getPool(poolId);
        assert.equal(poolAddress.toLowerCase(), pool.address);
        assert.equal(gaugeAddress.toLowerCase(), pool.gauge.address);

        await pool.depositAndStake([10, 10, 10]);
        const balances = await pool.stats.underlyingBalances();
        for (const b of balances) {
            assert.equal(Number(b), 10);
        }
    });

    it('Deploy stable plain pool and gauge (3 coins, implementation 2)', async function () {
        const coins = [_curve.constants.COINS['eth'], _curve.constants.COINS['steth'], _curve.constants.COINS['weth']];

        // Deploy pool

        const deployPoolTx = await curve.factory.deployPlainPool('Test pool', 'TST', coins, 200, 0.1, 1, 2);
        const poolAddress = await curve.factory.getDeployedPlainPoolAddress(deployPoolTx);
        assert.isTrue(ethers.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await curve.factory.deployGauge(poolAddress);
        const gaugeAddress = await curve.factory.getDeployedGaugeAddress(deployGaugeTx);
        assert.isTrue(ethers.isAddress(gaugeAddress));

        // Deposit & Stake

        const poolId = await curve.factory.fetchRecentlyDeployedPool(poolAddress);
        const pool = curve.getPool(poolId);
        assert.equal(poolAddress.toLowerCase(), pool.address);
        assert.equal(gaugeAddress.toLowerCase(), pool.gauge.address);

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
        assert.isTrue(ethers.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await curve.factory.deployGauge(poolAddress);
        const gaugeAddress = await curve.factory.getDeployedGaugeAddress(deployGaugeTx);
        assert.isTrue(ethers.isAddress(gaugeAddress));

        // Deposit & Stake

        const poolId = await curve.factory.fetchRecentlyDeployedPool(poolAddress);
        const pool = curve.getPool(poolId);
        assert.equal(poolAddress.toLowerCase(), pool.address);
        assert.equal(gaugeAddress.toLowerCase(), pool.gauge.address);

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
        assert.isTrue(ethers.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await curve.factory.deployGauge(poolAddress);
        const gaugeAddress = await curve.factory.getDeployedGaugeAddress(deployGaugeTx);
        assert.isTrue(ethers.isAddress(gaugeAddress));

        // Deposit & Stake

        const poolId = await curve.factory.fetchRecentlyDeployedPool(poolAddress);
        const pool = curve.getPool(poolId);
        assert.equal(poolAddress.toLowerCase(), pool.address);
        assert.equal(gaugeAddress.toLowerCase(), pool.gauge.address);

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
        assert.isTrue(ethers.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await curve.factory.deployGauge(poolAddress);
        const gaugeAddress = await curve.factory.getDeployedGaugeAddress(deployGaugeTx);
        assert.isTrue(ethers.isAddress(gaugeAddress));

        // Deposit & Stake

        const poolId = await curve.factory.fetchRecentlyDeployedPool(poolAddress);
        const pool = curve.getPool(poolId);
        assert.equal(poolAddress.toLowerCase(), pool.address);
        assert.equal(gaugeAddress.toLowerCase(), pool.gauge.address);

        await pool.depositAndStake([10, 10, 10, 10]);
        const balances = await pool.stats.underlyingBalances();
        for (const b of balances) {
            assert.equal(Number(b), 10);
        }
    });

    it('Deploy stable plain pool and gauge (4 coins, implementation 2)', async function () {
        const coins = [_curve.constants.COINS['eth'], _curve.constants.COINS['steth'], _curve.constants.COINS['weth'], _curve.constants.COINS['frxeth']];

        // Deploy pool

        const deployPoolTx = await curve.factory.deployPlainPool('Test pool', 'TST', coins, 200, 0.1, 1, 2);
        const poolAddress = await curve.factory.getDeployedPlainPoolAddress(deployPoolTx);
        assert.isTrue(ethers.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await curve.factory.deployGauge(poolAddress);
        const gaugeAddress = await curve.factory.getDeployedGaugeAddress(deployGaugeTx);
        assert.isTrue(ethers.isAddress(gaugeAddress));

        // Deposit & Stake

        const poolId = await curve.factory.fetchRecentlyDeployedPool(poolAddress);
        const pool = curve.getPool(poolId);
        assert.equal(poolAddress.toLowerCase(), pool.address);
        assert.equal(gaugeAddress.toLowerCase(), pool.gauge.address);

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
        assert.isTrue(ethers.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await curve.factory.deployGauge(poolAddress);
        const gaugeAddress = await curve.factory.getDeployedGaugeAddress(deployGaugeTx);
        assert.isTrue(ethers.isAddress(gaugeAddress));

        // Deposit & Stake

        const poolId = await curve.factory.fetchRecentlyDeployedPool(poolAddress);
        const pool = curve.getPool(poolId);
        assert.equal(poolAddress.toLowerCase(), pool.address);
        assert.equal(gaugeAddress.toLowerCase(), pool.gauge.address);

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
        assert.isTrue(ethers.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await curve.factory.deployGauge(poolAddress);
        const gaugeAddress = await curve.factory.getDeployedGaugeAddress(deployGaugeTx);
        assert.isTrue(ethers.isAddress(gaugeAddress));

        // Deposit & Stake Wrapped

        const poolId = await curve.factory.fetchRecentlyDeployedPool(poolAddress);
        const pool = curve.getPool(poolId);
        assert.equal(poolAddress.toLowerCase(), pool.address);
        assert.equal(gaugeAddress.toLowerCase(), pool.gauge.address);

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
        assert.isTrue(ethers.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await curve.factory.deployGauge(poolAddress);
        const gaugeAddress = await curve.factory.getDeployedGaugeAddress(deployGaugeTx);
        assert.isTrue(ethers.isAddress(gaugeAddress));

        // Deposit & Stake Wrapped

        const poolId = await curve.factory.fetchRecentlyDeployedPool(poolAddress);
        const pool = curve.getPool(poolId);
        assert.equal(poolAddress.toLowerCase(), pool.address);
        assert.equal(gaugeAddress.toLowerCase(), pool.gauge.address);

        await pool.depositAndStakeWrapped([10, 10]);
        const balances = await pool.stats.wrappedBalances();
        for (const b of balances) {
            assert.equal(Number(b), 10);
        }
    });

    it('Deploy stable-ng meta pool (3pool, implementation 0)', async function () {
        const basePool = _curve.constants.POOLS_DATA['3pool'].swap_address;
        const coin = "0xac3e018457b222d93114458476f3e3416abbe38f"; // sfrxETH
        const oracleAddress = '0xac3e018457b222d93114458476f3e3416abbe38f';
        const methodName = 'pricePerShare';

        // Deploy pool

        const deployPoolTx = await curve.stableNgFactory.deployMetaPool(basePool, 'Test pool', 'test',coin, 5, 0.05, 5, 600, 0, 0, methodName, oracleAddress);
        const poolAddress = await curve.stableNgFactory.getDeployedMetaPoolAddress(deployPoolTx);
        assert.isTrue(ethers.isAddress(poolAddress));
    });

    // --- META (fraxusdc) ---

    it('Deploy stable meta pool and gauge (fraxusc, implementation 0)', async function () {
        const basePool = _curve.constants.POOLS_DATA['fraxusdc'].swap_address;
        const coin = _curve.constants.COINS['mim'];

        // Deploy pool

        const deployPoolTx = await curve.factory.deployMetaPool(basePool, 'Test pool', 'TST', coin, 200, 0.1, 0);
        const poolAddress = await curve.factory.getDeployedMetaPoolAddress(deployPoolTx);
        assert.isTrue(ethers.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await curve.factory.deployGauge(poolAddress);
        const gaugeAddress = await curve.factory.getDeployedGaugeAddress(deployGaugeTx);
        assert.isTrue(ethers.isAddress(gaugeAddress));

        // Deposit & Stake

        const poolId = await curve.factory.fetchRecentlyDeployedPool(poolAddress);
        const pool = curve.getPool(poolId);
        assert.equal(poolAddress.toLowerCase(), pool.address);
        assert.equal(gaugeAddress.toLowerCase(), pool.gauge.address);

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
        assert.isTrue(ethers.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await curve.factory.deployGauge(poolAddress);
        const gaugeAddress = await curve.factory.getDeployedGaugeAddress(deployGaugeTx);
        assert.isTrue(ethers.isAddress(gaugeAddress));

        // Deposit & Stake

        const poolId = await curve.factory.fetchRecentlyDeployedPool(poolAddress);
        const pool = curve.getPool(poolId);
        assert.equal(poolAddress.toLowerCase(), pool.address);
        assert.equal(gaugeAddress.toLowerCase(), pool.gauge.address);

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
        assert.isTrue(ethers.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await curve.factory.deployGauge(poolAddress);
        const gaugeAddress = await curve.factory.getDeployedGaugeAddress(deployGaugeTx);
        assert.isTrue(ethers.isAddress(gaugeAddress));

        // Deposit & Stake Wrapped

        const poolId = await curve.factory.fetchRecentlyDeployedPool(poolAddress);
        const pool = curve.getPool(poolId);
        assert.equal(poolAddress.toLowerCase(), pool.address);
        assert.equal(gaugeAddress.toLowerCase(), pool.gauge.address);

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
        assert.isTrue(ethers.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await curve.factory.deployGauge(poolAddress);
        const gaugeAddress = await curve.factory.getDeployedGaugeAddress(deployGaugeTx);
        assert.isTrue(ethers.isAddress(gaugeAddress));

        // Deposit & Stake Wrapped

        const poolId = await curve.factory.fetchRecentlyDeployedPool(poolAddress);
        const pool = curve.getPool(poolId);
        assert.equal(poolAddress.toLowerCase(), pool.address);
        assert.equal(gaugeAddress.toLowerCase(), pool.gauge.address);

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
        assert.isTrue(ethers.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await curve.factory.deployGauge(poolAddress);
        const gaugeAddress = await curve.factory.getDeployedGaugeAddress(deployGaugeTx);
        assert.isTrue(ethers.isAddress(gaugeAddress));

        // Deposit & Stake

        const poolId = await curve.factory.fetchRecentlyDeployedPool(poolAddress);
        const pool = curve.getPool(poolId);
        assert.equal(poolAddress.toLowerCase(), pool.address);
        assert.equal(gaugeAddress.toLowerCase(), pool.gauge.address);

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
        assert.isTrue(ethers.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await curve.factory.deployGauge(poolAddress);
        const gaugeAddress = await curve.factory.getDeployedGaugeAddress(deployGaugeTx);
        assert.isTrue(ethers.isAddress(gaugeAddress));

        // Deposit & Stake

        const poolId = await curve.factory.fetchRecentlyDeployedPool(poolAddress);
        const pool = curve.getPool(poolId);
        assert.equal(poolAddress.toLowerCase(), pool.address);
        assert.equal(gaugeAddress.toLowerCase(), pool.gauge.address);

        await pool.depositAndStake([10, 10, 10]);
        const balances = await pool.stats.underlyingBalances();
        for (const b of balances) {
            assert.isAtLeast(Number(b), 5);
        }
    });

    // --- CRYPTO ---

    it('Deploy crypto factory pool and gauge', async function () {
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
        assert.equal(gaugeAddress.toLowerCase(), pool.gauge.address);

        const amounts = await pool.getSeedAmounts(30);
        await pool.depositAndStake(amounts);
        const underlyingBalances = await pool.stats.underlyingBalances();
        const wrappedBalances = await pool.stats.wrappedBalances();
        for (let i = 0; i < amounts.length; i++) {
            assert.equal(Number(underlyingBalances[i]), Number(amounts[i]));
            assert.equal(Number(wrappedBalances[i]), Number(amounts[i]));
        }
    });

    // --- TRICRYPTO ---

    it('Deploy tricrypto factory pool and gauge', async function () {
        const coins = [_curve.constants.COINS['eurt'], _curve.constants.COINS['weth'], _curve.constants.COINS['wbtc']];

        // Deploy pool

        const deployPoolTx = await curve.tricryptoFactory.deployPool(
            "Test tricrypto pool",
            "TTP",
            coins,
            400000,
            0.0000725,
            0.25,
            0.45,
            0.000002,
            0.00023,
            0.000146,
            600,
            [1900, 27000]
        );
        const poolAddress = await curve.tricryptoFactory.getDeployedPoolAddress(deployPoolTx);
        console.log(poolAddress);

        // Deploy gauge

        const deployGaugeTx = await curve.tricryptoFactory.deployGauge(poolAddress);
        const gaugeAddress = await curve.factory.getDeployedGaugeAddress(deployGaugeTx);

        // Deposit & Stake

        const poolId = await curve.tricryptoFactory.fetchRecentlyDeployedPool(poolAddress);
        const pool = curve.getPool(poolId);
        assert.equal(poolAddress.toLowerCase(), pool.address);
        assert.equal(gaugeAddress.toLowerCase(), pool.gauge.address);

        const amounts = await pool.getSeedAmounts(30);
        console.log(amounts);
        await pool.depositAndStake(amounts);
        const underlyingBalances = await pool.stats.underlyingBalances();
        const wrappedBalances = await pool.stats.wrappedBalances();
        for (let i = 0; i < amounts.length; i++) {
            assert.equal(Number(underlyingBalances[i]), Number(amounts[i]));
            assert.equal(Number(wrappedBalances[i]), Number(amounts[i]));
        }
    });
});
