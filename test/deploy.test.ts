import { ethers } from "ethers";
import { assert } from "chai";
import curve from "../src";
import { curve as _curve } from "../src/curve";
import { deployStablePlainPool, deployStableMetaPool, deployStableGauge } from '../src/factory/deploy';

describe('Factory deploy', function() {
    this.timeout(120000);
    // let address = '';

    before(async function() {
        await curve.init('JsonRpc', {});
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

        const deployPoolTx = await deployStablePlainPool('Test pool', 'TST', coins, 200, 0.1, 0, 0);
        const deployPoolTxInfo = await deployPoolTx.wait();
        const poolAddress = deployPoolTxInfo.logs[0].address;
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await deployStableGauge(poolAddress);
        const deployGaugeTxInfo: ethers.ContractReceipt = await deployGaugeTx.wait();
        // @ts-ignore
        const gaugeAddress = deployGaugeTxInfo.events[0].args[1];
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));

        // Deposit & Stake

        const poolId = await curve.fetchRecentlyCreatedFactoryPool(poolAddress);
        const pool = curve.getPool(poolId);
        await pool.depositAndStake([10, 10]);
        const balances = await pool.stats.underlyingBalances();
        for (const b of balances) {
            assert.equal(Number(b), 10);
        }
    });

    it('Deploy stable plain pool and gauge (2 coins, implementation 1)', async function () {
        const coins = [_curve.constants.COINS['usdp'], _curve.constants.COINS['mim']];

        // Deploy pool

        const deployPoolTx = await deployStablePlainPool('Test pool', 'TST', coins, 200, 0.1, 0, 1);
        const deployPoolTxInfo = await deployPoolTx.wait();
        const poolAddress = deployPoolTxInfo.logs[0].address;
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await deployStableGauge(poolAddress);
        const deployGaugeTxInfo: ethers.ContractReceipt = await deployGaugeTx.wait();
        // @ts-ignore
        const gaugeAddress = deployGaugeTxInfo.events[0].args[1];
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));

        // Deposit & Stake

        const poolId = await curve.fetchRecentlyCreatedFactoryPool(poolAddress);
        const pool = curve.getPool(poolId);
        await pool.depositAndStake([10, 10]);
        const balances = await pool.stats.underlyingBalances();
        for (const b of balances) {
            assert.equal(Number(b), 10);
        }
    });

    it('Deploy stable plain pool and gauge (2 coins, implementation 2)', async function () {
        const coins = [_curve.constants.COINS['eth'], _curve.constants.COINS['steth']];

        // Deploy pool

        const deployPoolTx = await deployStablePlainPool('Test pool', 'TST', coins, 200, 0.1, 0, 2);
        const deployPoolTxInfo = await deployPoolTx.wait();
        const poolAddress = deployPoolTxInfo.logs[0].address;
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await deployStableGauge(poolAddress);
        const deployGaugeTxInfo: ethers.ContractReceipt = await deployGaugeTx.wait();
        // @ts-ignore
        const gaugeAddress = deployGaugeTxInfo.events[0].args[1];
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));

        // Deposit & Stake

        const poolId = await curve.fetchRecentlyCreatedFactoryPool(poolAddress);
        const pool = curve.getPool(poolId);
        await pool.depositAndStake([10, 10]);
        const balances = await pool.stats.underlyingBalances();
        for (const b of balances) {
            assert.equal(Number(b), 10);
        }
    });

    it('Deploy stable plain pool and gauge (2 coins, implementation 3)', async function () {
        const coins = [_curve.constants.COINS['usdp'], _curve.constants.COINS['mim']];

        // Deploy pool

        const deployPoolTx = await deployStablePlainPool('Test pool', 'TST', coins, 200, 0.1, 0, 3);
        const deployPoolTxInfo = await deployPoolTx.wait();
        const poolAddress = deployPoolTxInfo.logs[0].address;
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await deployStableGauge(poolAddress);
        const deployGaugeTxInfo: ethers.ContractReceipt = await deployGaugeTx.wait();
        // @ts-ignore
        const gaugeAddress = deployGaugeTxInfo.events[0].args[1];
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));

        // Deposit & Stake

        const poolId = await curve.fetchRecentlyCreatedFactoryPool(poolAddress);
        const pool = curve.getPool(poolId);
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

        const deployPoolTx = await deployStablePlainPool('Test pool', 'TST', coins, 200, 0.1, 0, 0);
        const deployPoolTxInfo = await deployPoolTx.wait();
        const poolAddress = deployPoolTxInfo.logs[0].address;
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await deployStableGauge(poolAddress);
        const deployGaugeTxInfo: ethers.ContractReceipt = await deployGaugeTx.wait();
        // @ts-ignore
        const gaugeAddress = deployGaugeTxInfo.events[0].args[1];
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));

        // Deposit & Stake

        const poolId = await curve.fetchRecentlyCreatedFactoryPool(poolAddress);
        const pool = curve.getPool(poolId);
        await pool.depositAndStake([10, 10, 10]);
        const balances = await pool.stats.underlyingBalances();
        for (const b of balances) {
            assert.equal(Number(b), 10);
        }
    });

    it('Deploy stable plain pool and gauge (3 coins, implementation 1)', async function () {
        const coins = [_curve.constants.COINS['usdp'], _curve.constants.COINS['mim'], _curve.constants.COINS['lusd']];

        // Deploy pool

        const deployPoolTx = await deployStablePlainPool('Test pool', 'TST', coins, 200, 0.1, 0, 1);
        const deployPoolTxInfo = await deployPoolTx.wait();
        const poolAddress = deployPoolTxInfo.logs[0].address;
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await deployStableGauge(poolAddress);
        const deployGaugeTxInfo: ethers.ContractReceipt = await deployGaugeTx.wait();
        // @ts-ignore
        const gaugeAddress = deployGaugeTxInfo.events[0].args[1];
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));

        // Deposit & Stake

        const poolId = await curve.fetchRecentlyCreatedFactoryPool(poolAddress);
        const pool = curve.getPool(poolId);
        await pool.depositAndStake([10, 10, 10]);
        const balances = await pool.stats.underlyingBalances();
        for (const b of balances) {
            assert.equal(Number(b), 10);
        }
    });

    it('Deploy stable plain pool and gauge (3 coins, implementation 2)', async function () {
        const coins = [_curve.constants.COINS['eth'], _curve.constants.COINS['steth'], _curve.constants.COINS['weth']];

        // Deploy pool

        const deployPoolTx = await deployStablePlainPool('Test pool', 'TST', coins, 200, 0.1, 0, 2);
        const deployPoolTxInfo = await deployPoolTx.wait();
        const poolAddress = deployPoolTxInfo.logs[0].address;
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await deployStableGauge(poolAddress);
        const deployGaugeTxInfo: ethers.ContractReceipt = await deployGaugeTx.wait();
        // @ts-ignore
        const gaugeAddress = deployGaugeTxInfo.events[0].args[1];
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));

        // Deposit & Stake

        const poolId = await curve.fetchRecentlyCreatedFactoryPool(poolAddress);
        const pool = curve.getPool(poolId);
        await pool.depositAndStake([10, 10, 10]);
        const balances = await pool.stats.underlyingBalances();
        for (const b of balances) {
            assert.equal(Number(b), 10);
        }
    });

    it('Deploy stable plain pool and gauge (3 coins, implementation 3)', async function () {
        const coins = [_curve.constants.COINS['usdp'], _curve.constants.COINS['mim'], _curve.constants.COINS['lusd']];

        // Deploy pool

        const deployPoolTx = await deployStablePlainPool('Test pool', 'TST', coins, 200, 0.1, 0, 3);
        const deployPoolTxInfo = await deployPoolTx.wait();
        const poolAddress = deployPoolTxInfo.logs[0].address;
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await deployStableGauge(poolAddress);
        const deployGaugeTxInfo: ethers.ContractReceipt = await deployGaugeTx.wait();
        // @ts-ignore
        const gaugeAddress = deployGaugeTxInfo.events[0].args[1];
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));

        // Deposit & Stake

        const poolId = await curve.fetchRecentlyCreatedFactoryPool(poolAddress);
        const pool = curve.getPool(poolId);
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

        const deployPoolTx = await deployStablePlainPool('Test pool', 'TST', coins, 200, 0.1, 0, 0);
        const deployPoolTxInfo = await deployPoolTx.wait();
        const poolAddress = deployPoolTxInfo.logs[0].address;
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await deployStableGauge(poolAddress);
        const deployGaugeTxInfo: ethers.ContractReceipt = await deployGaugeTx.wait();
        // @ts-ignore
        const gaugeAddress = deployGaugeTxInfo.events[0].args[1];
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));

        // Deposit & Stake

        const poolId = await curve.fetchRecentlyCreatedFactoryPool(poolAddress);
        const pool = curve.getPool(poolId);
        await pool.depositAndStake([10, 10, 10, 10]);
        const balances = await pool.stats.underlyingBalances();
        for (const b of balances) {
            assert.equal(Number(b), 10);
        }
    });

    it('Deploy stable plain pool and gauge (4 coins, implementation 1)', async function () {
        const coins = [_curve.constants.COINS['usdp'], _curve.constants.COINS['mim'], _curve.constants.COINS['lusd'], _curve.constants.COINS['busd']];

        // Deploy pool

        const deployPoolTx = await deployStablePlainPool('Test pool', 'TST', coins, 200, 0.1, 0, 1);
        const deployPoolTxInfo = await deployPoolTx.wait();
        const poolAddress = deployPoolTxInfo.logs[0].address;
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await deployStableGauge(poolAddress);
        const deployGaugeTxInfo: ethers.ContractReceipt = await deployGaugeTx.wait();
        // @ts-ignore
        const gaugeAddress = deployGaugeTxInfo.events[0].args[1];
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));

        // Deposit & Stake

        const poolId = await curve.fetchRecentlyCreatedFactoryPool(poolAddress);
        const pool = curve.getPool(poolId);
        await pool.depositAndStake([10, 10, 10, 10]);
        const balances = await pool.stats.underlyingBalances();
        for (const b of balances) {
            assert.equal(Number(b), 10);
        }
    });

    it('Deploy stable plain pool and gauge (4 coins, implementation 2)', async function () {
        const coins = [_curve.constants.COINS['eth'], _curve.constants.COINS['steth'], _curve.constants.COINS['weth'], _curve.constants.COINS['reth']];

        // Deploy pool

        const deployPoolTx = await deployStablePlainPool('Test pool', 'TST', coins, 200, 0.1, 0, 2);
        const deployPoolTxInfo = await deployPoolTx.wait();
        const poolAddress = deployPoolTxInfo.logs[0].address;
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await deployStableGauge(poolAddress);
        const deployGaugeTxInfo: ethers.ContractReceipt = await deployGaugeTx.wait();
        // @ts-ignore
        const gaugeAddress = deployGaugeTxInfo.events[0].args[1];
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));

        // Deposit & Stake

        const poolId = await curve.fetchRecentlyCreatedFactoryPool(poolAddress);
        const pool = curve.getPool(poolId);
        await pool.depositAndStake([10, 10, 10, 10]);
        const balances = await pool.stats.underlyingBalances();
        for (const b of balances) {
            assert.equal(Number(b), 10);
        }
    });

    it('Deploy stable plain pool and gauge (4 coins, implementation 3)', async function () {
        const coins = [_curve.constants.COINS['usdp'], _curve.constants.COINS['mim'], _curve.constants.COINS['lusd'], _curve.constants.COINS['busd']];

        // Deploy pool

        const deployPoolTx = await deployStablePlainPool('Test pool', 'TST', coins, 200, 0.1, 0, 3);
        const deployPoolTxInfo = await deployPoolTx.wait();
        const poolAddress = deployPoolTxInfo.logs[0].address;
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await deployStableGauge(poolAddress);
        const deployGaugeTxInfo: ethers.ContractReceipt = await deployGaugeTx.wait();
        // @ts-ignore
        const gaugeAddress = deployGaugeTxInfo.events[0].args[1];
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));

        // Deposit & Stake

        const poolId = await curve.fetchRecentlyCreatedFactoryPool(poolAddress);
        const pool = curve.getPool(poolId);
        await pool.depositAndStake([10, 10, 10, 10]);
        const balances = await pool.stats.underlyingBalances();
        for (const b of balances) {
            assert.equal(Number(b), 10);
        }
    });

    // --- META (3pool) ---

    it('Deploy stable meta pool and gauge (3pool, implementation 0)', async function () {
        const basePoolData = _curve.constants.POOLS_DATA['3pool'];
        const basePool = basePoolData.swap_address;
        const n = basePoolData.underlying_coins.length;
        const coin = _curve.constants.COINS['mim'];

        // Deploy pool

        const deployPoolTx = await deployStableMetaPool(basePool, 'Test pool', 'TST', coin, 200, 0.1, 0);
        const deployPoolTxInfo = await deployPoolTx.wait();
        const poolAddress = deployPoolTxInfo.logs[n].address;
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await deployStableGauge(poolAddress);
        const deployGaugeTxInfo: ethers.ContractReceipt = await deployGaugeTx.wait();
        // @ts-ignore
        const gaugeAddress = deployGaugeTxInfo.events[0].args[1];
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));

        // Deposit & Stake Wrapped

        const poolId = await curve.fetchRecentlyCreatedFactoryPool(poolAddress);
        const pool = curve.getPool(poolId);
        await pool.depositAndStakeWrapped([10, 10]);
        const balances = await pool.stats.wrappedBalances();
        for (const b of balances) {
            assert.equal(Number(b), 10);
        }
    });

    it('Deploy stable meta pool and gauge (3pool, implementation 1)', async function () {
        const basePoolData = _curve.constants.POOLS_DATA['3pool'];
        const basePool = basePoolData.swap_address;
        const n = basePoolData.underlying_coins.length;
        const coin = _curve.constants.COINS['mim'];

        // Deploy pool

        const deployPoolTx = await deployStableMetaPool(basePool, 'Test pool', 'TST', coin, 200, 0.1, 1);
        const deployPoolTxInfo = await deployPoolTx.wait();
        const poolAddress = deployPoolTxInfo.logs[n].address;
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await deployStableGauge(poolAddress);
        const deployGaugeTxInfo: ethers.ContractReceipt = await deployGaugeTx.wait();
        // @ts-ignore
        const gaugeAddress = deployGaugeTxInfo.events[0].args[1];
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));

        // Deposit & Stake Wrapped

        const poolId = await curve.fetchRecentlyCreatedFactoryPool(poolAddress);
        const pool = curve.getPool(poolId);
        await pool.depositAndStakeWrapped([10, 10]);
        const balances = await pool.stats.wrappedBalances();
        for (const b of balances) {
            assert.equal(Number(b), 10);
        }
    });

    // --- META (fraxusdc) ---

    it('Deploy stable meta pool and gauge (fraxusc, implementation 0)', async function () {
        const basePoolData = _curve.constants.POOLS_DATA['fraxusdc'];
        const basePool = basePoolData.swap_address;
        const n = basePoolData.underlying_coins.length;
        const coin = _curve.constants.COINS['mim'];

        // Deploy pool

        const deployPoolTx = await deployStableMetaPool(basePool, 'Test pool', 'TST', coin, 200, 0.1, 0);
        const deployPoolTxInfo = await deployPoolTx.wait();
        const poolAddress = deployPoolTxInfo.logs[n].address;
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await deployStableGauge(poolAddress);
        const deployGaugeTxInfo: ethers.ContractReceipt = await deployGaugeTx.wait();
        // @ts-ignore
        const gaugeAddress = deployGaugeTxInfo.events[0].args[1];
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));

        // Deposit & Stake

        const poolId = await curve.fetchRecentlyCreatedFactoryPool(poolAddress);
        const pool = curve.getPool(poolId);
        await pool.depositAndStake([10, 10, 10]);
        const balances = await pool.stats.underlyingBalances();
        for (const b of balances) {
            assert.isAtLeast(Number(b), 5);
        }
    });

    it('Deploy stable meta pool and gauge (fraxusc, implementation 1)', async function () {
        const basePoolData = _curve.constants.POOLS_DATA['fraxusdc'];
        const basePool = basePoolData.swap_address;
        const n = basePoolData.underlying_coins.length;
        const coin = _curve.constants.COINS['mim'];

        // Deploy pool

        const deployPoolTx = await deployStableMetaPool(basePool, 'Test pool', 'TST', coin, 200, 0.1, 1);
        const deployPoolTxInfo = await deployPoolTx.wait();
        const poolAddress = deployPoolTxInfo.logs[n].address;
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await deployStableGauge(poolAddress);
        const deployGaugeTxInfo: ethers.ContractReceipt = await deployGaugeTx.wait();
        // @ts-ignore
        const gaugeAddress = deployGaugeTxInfo.events[0].args[1];
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));

        // Deposit & Stake

        const poolId = await curve.fetchRecentlyCreatedFactoryPool(poolAddress);
        const pool = curve.getPool(poolId);
        await pool.depositAndStake([10, 10, 10]);
        const balances = await pool.stats.underlyingBalances();
        for (const b of balances) {
            assert.isAtLeast(Number(b), 5);
        }
    });

    // --- META (sbtc) ---

    it('Deploy stable meta pool and gauge (sbtc, implementation 0)', async function () {
        const basePoolData = _curve.constants.POOLS_DATA['sbtc'];
        const basePool = basePoolData.swap_address;
        const n = basePoolData.underlying_coins.length;
        const coin = _curve.constants.COINS['tbtc'];

        // Deploy pool

        const deployPoolTx = await deployStableMetaPool(basePool, 'Test pool', 'TST', coin, 200, 0.1, 0);
        const deployPoolTxInfo = await deployPoolTx.wait();
        const poolAddress = deployPoolTxInfo.logs[n].address;
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await deployStableGauge(poolAddress);
        const deployGaugeTxInfo: ethers.ContractReceipt = await deployGaugeTx.wait();
        // @ts-ignore
        const gaugeAddress = deployGaugeTxInfo.events[0].args[1];
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));

        // Deposit & Stake Wrapped

        const poolId = await curve.fetchRecentlyCreatedFactoryPool(poolAddress);
        const pool = curve.getPool(poolId);
        await pool.depositAndStakeWrapped([10, 10]);
        const balances = await pool.stats.wrappedBalances();
        for (const b of balances) {
            assert.equal(Number(b), 10);
        }
    });

    it('Deploy stable meta pool and gauge (sbtc, implementation 1)', async function () {
        const basePoolData = _curve.constants.POOLS_DATA['sbtc'];
        const basePool = basePoolData.swap_address;
        const n = basePoolData.underlying_coins.length;
        const coin = _curve.constants.COINS['tbtc'];

        // Deploy pool

        const deployPoolTx = await deployStableMetaPool(basePool, 'Test pool', 'TST', coin, 200, 0.1, 1);
        const deployPoolTxInfo = await deployPoolTx.wait();
        const poolAddress = deployPoolTxInfo.logs[n].address;
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await deployStableGauge(poolAddress);
        const deployGaugeTxInfo: ethers.ContractReceipt = await deployGaugeTx.wait();
        // @ts-ignore
        const gaugeAddress = deployGaugeTxInfo.events[0].args[1];
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));

        // Deposit & Stake Wrapped

        const poolId = await curve.fetchRecentlyCreatedFactoryPool(poolAddress);
        const pool = curve.getPool(poolId);
        await pool.depositAndStakeWrapped([10, 10]);
        const balances = await pool.stats.wrappedBalances();
        for (const b of balances) {
            assert.equal(Number(b), 10);
        }
    });

    // --- META (ren) ---

    it('Deploy stable meta pool and gauge (ren, implementation 0)', async function () {
        const basePoolData = _curve.constants.POOLS_DATA['ren'];
        const basePool = basePoolData.swap_address;
        const n = basePoolData.underlying_coins.length;
        const coin = _curve.constants.COINS['tbtc'];

        // Deploy pool

        const deployPoolTx = await deployStableMetaPool(basePool, 'Test pool', 'TST', coin, 200, 0.1, 0);
        const deployPoolTxInfo = await deployPoolTx.wait();
        const poolAddress = deployPoolTxInfo.logs[n].address;
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await deployStableGauge(poolAddress);
        const deployGaugeTxInfo: ethers.ContractReceipt = await deployGaugeTx.wait();
        // @ts-ignore
        const gaugeAddress = deployGaugeTxInfo.events[0].args[1];
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));

        // Deposit & Stake

        const poolId = await curve.fetchRecentlyCreatedFactoryPool(poolAddress);
        const pool = curve.getPool(poolId);
        await pool.depositAndStake([10, 10, 10]);
        const balances = await pool.stats.underlyingBalances();
        for (const b of balances) {
            assert.isAtLeast(Number(b), 5);
        }
    });

    it('Deploy stable meta pool and gauge (ren, implementation 1)', async function () {
        const basePoolData = _curve.constants.POOLS_DATA['ren'];
        const basePool = basePoolData.swap_address;
        const n = basePoolData.underlying_coins.length;
        const coin = _curve.constants.COINS['tbtc'];

        // Deploy pool

        const deployPoolTx = await deployStableMetaPool(basePool, 'Test pool', 'TST', coin, 200, 0.1, 1);
        const deployPoolTxInfo = await deployPoolTx.wait();
        const poolAddress = deployPoolTxInfo.logs[n].address;
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        // Deploy gauge

        const deployGaugeTx = await deployStableGauge(poolAddress);
        const deployGaugeTxInfo: ethers.ContractReceipt = await deployGaugeTx.wait();
        // @ts-ignore
        const gaugeAddress = deployGaugeTxInfo.events[0].args[1];
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));

        // Deposit & Stake

        const poolId = await curve.fetchRecentlyCreatedFactoryPool(poolAddress);
        const pool = curve.getPool(poolId);
        await pool.depositAndStake([10, 10, 10]);
        const balances = await pool.stats.underlyingBalances();
        for (const b of balances) {
            assert.isAtLeast(Number(b), 5);
        }
    });
});
