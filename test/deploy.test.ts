import { ethers } from "ethers";
import { assert } from "chai";
import { deployStablePlainPool, deployStableMetaPool, deployStableGauge } from '../src/factory/deploy';
import { curve } from "../src/curve";

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
        const coins = [curve.constants.COINS['usdp'], curve.constants.COINS['mim']];

        const deployPoolTx = await deployStablePlainPool('Test pool', 'TST', coins, 200, 0.1, 0, 0);
        const deployPoolTxInfo = await deployPoolTx.wait();
        const poolAddress = deployPoolTxInfo.logs[0].address;
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        const deployGaugeTx = await deployStableGauge(poolAddress);
        const deployGaugeTxInfo: ethers.ContractReceipt = await deployGaugeTx.wait();
        // @ts-ignore
        const gaugeAddress = deployGaugeTxInfo.events[0].args[1];
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));
    });

    it('Deploy stable plain pool and gauge (2 coins, implementation 1)', async function () {
        const coins = [curve.constants.COINS['usdp'], curve.constants.COINS['mim']];

        const deployPoolTx = await deployStablePlainPool('Test pool', 'TST', coins, 200, 0.1, 0, 1);
        const deployPoolTxInfo = await deployPoolTx.wait();
        const poolAddress = deployPoolTxInfo.logs[0].address;
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        const deployGaugeTx = await deployStableGauge(poolAddress);
        const deployGaugeTxInfo: ethers.ContractReceipt = await deployGaugeTx.wait();
        // @ts-ignore
        const gaugeAddress = deployGaugeTxInfo.events[0].args[1];
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));
    });

    it('Deploy stable plain pool and gauge (2 coins, implementation 2)', async function () {
        const coins = [curve.constants.COINS['eth'], curve.constants.COINS['steth']];

        const deployPoolTx = await deployStablePlainPool('Test pool', 'TST', coins, 200, 0.1, 0, 2);
        const deployPoolTxInfo = await deployPoolTx.wait();
        const poolAddress = deployPoolTxInfo.logs[0].address;
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        const deployGaugeTx = await deployStableGauge(poolAddress);
        const deployGaugeTxInfo: ethers.ContractReceipt = await deployGaugeTx.wait();
        // @ts-ignore
        const gaugeAddress = deployGaugeTxInfo.events[0].args[1];
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));
    });

    it('Deploy stable plain pool and gauge (2 coins, implementation 3)', async function () {
        const coins = [curve.constants.COINS['usdp'], curve.constants.COINS['mim']];

        const deployPoolTx = await deployStablePlainPool('Test pool', 'TST', coins, 200, 0.1, 0, 3);
        const deployPoolTxInfo = await deployPoolTx.wait();
        const poolAddress = deployPoolTxInfo.logs[0].address;
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        const deployGaugeTx = await deployStableGauge(poolAddress);
        const deployGaugeTxInfo: ethers.ContractReceipt = await deployGaugeTx.wait();
        // @ts-ignore
        const gaugeAddress = deployGaugeTxInfo.events[0].args[1];
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));
    });

    // --- PLAIN (3 COINS) ---

    it('Deploy stable plain pool and gauge (3 coins, implementation 0)', async function () {
        const coins = [curve.constants.COINS['usdp'], curve.constants.COINS['mim'], curve.constants.COINS['lusd']];

        const deployPoolTx = await deployStablePlainPool('Test pool', 'TST', coins, 200, 0.1, 0, 0);
        const deployPoolTxInfo = await deployPoolTx.wait();
        const poolAddress = deployPoolTxInfo.logs[0].address;
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        const deployGaugeTx = await deployStableGauge(poolAddress);
        const deployGaugeTxInfo: ethers.ContractReceipt = await deployGaugeTx.wait();
        // @ts-ignore
        const gaugeAddress = deployGaugeTxInfo.events[0].args[1];
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));
    });

    it('Deploy stable plain pool and gauge (3 coins, implementation 1)', async function () {
        const coins = [curve.constants.COINS['usdp'], curve.constants.COINS['mim'], curve.constants.COINS['lusd']];

        const deployPoolTx = await deployStablePlainPool('Test pool', 'TST', coins, 200, 0.1, 0, 1);
        const deployPoolTxInfo = await deployPoolTx.wait();
        const poolAddress = deployPoolTxInfo.logs[0].address;
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        const deployGaugeTx = await deployStableGauge(poolAddress);
        const deployGaugeTxInfo: ethers.ContractReceipt = await deployGaugeTx.wait();
        // @ts-ignore
        const gaugeAddress = deployGaugeTxInfo.events[0].args[1];
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));
    });

    it('Deploy stable plain pool and gauge (3 coins, implementation 2)', async function () {
        const coins = [curve.constants.COINS['eth'], curve.constants.COINS['steth'], curve.constants.COINS['weth']];

        const deployPoolTx = await deployStablePlainPool('Test pool', 'TST', coins, 200, 0.1, 0, 2);
        const deployPoolTxInfo = await deployPoolTx.wait();
        const poolAddress = deployPoolTxInfo.logs[0].address;
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        const deployGaugeTx = await deployStableGauge(poolAddress);
        const deployGaugeTxInfo: ethers.ContractReceipt = await deployGaugeTx.wait();
        // @ts-ignore
        const gaugeAddress = deployGaugeTxInfo.events[0].args[1];
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));
    });

    it('Deploy stable plain pool and gauge (3 coins, implementation 3)', async function () {
        const coins = [curve.constants.COINS['usdp'], curve.constants.COINS['mim'], curve.constants.COINS['lusd']];

        const deployPoolTx = await deployStablePlainPool('Test pool', 'TST', coins, 200, 0.1, 0, 3);
        const deployPoolTxInfo = await deployPoolTx.wait();
        const poolAddress = deployPoolTxInfo.logs[0].address;
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        const deployGaugeTx = await deployStableGauge(poolAddress);
        const deployGaugeTxInfo: ethers.ContractReceipt = await deployGaugeTx.wait();
        // @ts-ignore
        const gaugeAddress = deployGaugeTxInfo.events[0].args[1];
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));
    });

    // --- PLAIN (4 COINS) ---

    it('Deploy stable plain pool and gauge (4 coins, implementation 0)', async function () {
        const coins = [curve.constants.COINS['usdp'], curve.constants.COINS['mim'], curve.constants.COINS['lusd'], curve.constants.COINS['busd']];

        const deployPoolTx = await deployStablePlainPool('Test pool', 'TST', coins, 200, 0.1, 0, 0);
        const deployPoolTxInfo = await deployPoolTx.wait();
        const poolAddress = deployPoolTxInfo.logs[0].address;
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        const deployGaugeTx = await deployStableGauge(poolAddress);
        const deployGaugeTxInfo: ethers.ContractReceipt = await deployGaugeTx.wait();
        // @ts-ignore
        const gaugeAddress = deployGaugeTxInfo.events[0].args[1];
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));
    });

    it('Deploy stable plain pool and gauge (4 coins, implementation 1)', async function () {
        const coins = [curve.constants.COINS['usdp'], curve.constants.COINS['mim'], curve.constants.COINS['lusd'], curve.constants.COINS['busd']];

        const deployPoolTx = await deployStablePlainPool('Test pool', 'TST', coins, 200, 0.1, 0, 1);
        const deployPoolTxInfo = await deployPoolTx.wait();
        const poolAddress = deployPoolTxInfo.logs[0].address;
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        const deployGaugeTx = await deployStableGauge(poolAddress);
        const deployGaugeTxInfo: ethers.ContractReceipt = await deployGaugeTx.wait();
        // @ts-ignore
        const gaugeAddress = deployGaugeTxInfo.events[0].args[1];
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));
    });

    it('Deploy stable plain pool and gauge (4 coins, implementation 2)', async function () {
        const coins = [curve.constants.COINS['eth'], curve.constants.COINS['steth'], curve.constants.COINS['weth'], curve.constants.COINS['reth']];

        const deployPoolTx = await deployStablePlainPool('Test pool', 'TST', coins, 200, 0.1, 0, 2);
        const deployPoolTxInfo = await deployPoolTx.wait();
        const poolAddress = deployPoolTxInfo.logs[0].address;
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        const deployGaugeTx = await deployStableGauge(poolAddress);
        const deployGaugeTxInfo: ethers.ContractReceipt = await deployGaugeTx.wait();
        // @ts-ignore
        const gaugeAddress = deployGaugeTxInfo.events[0].args[1];
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));
    });

    it('Deploy stable plain pool and gauge (4 coins, implementation 3)', async function () {
        const coins = [curve.constants.COINS['usdp'], curve.constants.COINS['mim'], curve.constants.COINS['lusd'], curve.constants.COINS['busd']];

        const deployPoolTx = await deployStablePlainPool('Test pool', 'TST', coins, 200, 0.1, 0, 3);
        const deployPoolTxInfo = await deployPoolTx.wait();
        const poolAddress = deployPoolTxInfo.logs[0].address;
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        const deployGaugeTx = await deployStableGauge(poolAddress);
        const deployGaugeTxInfo: ethers.ContractReceipt = await deployGaugeTx.wait();
        // @ts-ignore
        const gaugeAddress = deployGaugeTxInfo.events[0].args[1];
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));
    });

    // --- META (3pool) ---

    it('Deploy stable meta pool and gauge (3pool, implementation 0)', async function () {
        const basePoolData = curve.constants.POOLS_DATA['3pool'];
        const basePool = basePoolData.swap_address;
        const n = basePoolData.underlying_coins.length;
        const coin = curve.constants.COINS['mim'];

        const deployPoolTx = await deployStableMetaPool(basePool, 'Test pool', 'TST', coin, 200, 0.1, 0);
        const deployPoolTxInfo = await deployPoolTx.wait();
        const poolAddress = deployPoolTxInfo.logs[n].address;
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        const deployGaugeTx = await deployStableGauge(poolAddress);
        const deployGaugeTxInfo: ethers.ContractReceipt = await deployGaugeTx.wait();
        // @ts-ignore
        const gaugeAddress = deployGaugeTxInfo.events[0].args[1];
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));
    });

    it('Deploy stable meta pool and gauge (3pool, implementation 1)', async function () {
        const basePoolData = curve.constants.POOLS_DATA['3pool'];
        const basePool = basePoolData.swap_address;
        const n = basePoolData.underlying_coins.length;
        const coin = curve.constants.COINS['mim'];

        const deployPoolTx = await deployStableMetaPool(basePool, 'Test pool', 'TST', coin, 200, 0.1, 1);
        const deployPoolTxInfo = await deployPoolTx.wait();
        const poolAddress = deployPoolTxInfo.logs[n].address;
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        const deployGaugeTx = await deployStableGauge(poolAddress);
        const deployGaugeTxInfo: ethers.ContractReceipt = await deployGaugeTx.wait();
        // @ts-ignore
        const gaugeAddress = deployGaugeTxInfo.events[0].args[1];
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));
    });

    // --- META (fraxusdc) ---

    it('Deploy stable meta pool and gauge (fraxusc, implementation 0)', async function () {
        const basePoolData = curve.constants.POOLS_DATA['fraxusdc'];
        const basePool = basePoolData.swap_address;
        const n = basePoolData.underlying_coins.length;
        const coin = curve.constants.COINS['mim'];

        const deployPoolTx = await deployStableMetaPool(basePool, 'Test pool', 'TST', coin, 200, 0.1, 0);
        const deployPoolTxInfo = await deployPoolTx.wait();
        const poolAddress = deployPoolTxInfo.logs[n].address;
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        const deployGaugeTx = await deployStableGauge(poolAddress);
        const deployGaugeTxInfo: ethers.ContractReceipt = await deployGaugeTx.wait();
        // @ts-ignore
        const gaugeAddress = deployGaugeTxInfo.events[0].args[1];
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));
    });

    it('Deploy stable meta pool and gauge (fraxusc, implementation 1)', async function () {
        const basePoolData = curve.constants.POOLS_DATA['fraxusdc'];
        const basePool = basePoolData.swap_address;
        const n = basePoolData.underlying_coins.length;
        const coin = curve.constants.COINS['mim'];

        const deployPoolTx = await deployStableMetaPool(basePool, 'Test pool', 'TST', coin, 200, 0.1, 1);
        const deployPoolTxInfo = await deployPoolTx.wait();
        const poolAddress = deployPoolTxInfo.logs[n].address;
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        const deployGaugeTx = await deployStableGauge(poolAddress);
        const deployGaugeTxInfo: ethers.ContractReceipt = await deployGaugeTx.wait();
        // @ts-ignore
        const gaugeAddress = deployGaugeTxInfo.events[0].args[1];
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));
    });

    // --- META (sbtc) ---

    it('Deploy stable meta pool and gauge (sbtc, implementation 0)', async function () {
        const basePoolData = curve.constants.POOLS_DATA['sbtc'];
        const basePool = basePoolData.swap_address;
        const n = basePoolData.underlying_coins.length;
        const coin = curve.constants.COINS['tbtc'];

        const deployPoolTx = await deployStableMetaPool(basePool, 'Test pool', 'TST', coin, 200, 0.1, 0);
        const deployPoolTxInfo = await deployPoolTx.wait();
        const poolAddress = deployPoolTxInfo.logs[n].address;
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        const deployGaugeTx = await deployStableGauge(poolAddress);
        const deployGaugeTxInfo: ethers.ContractReceipt = await deployGaugeTx.wait();
        // @ts-ignore
        const gaugeAddress = deployGaugeTxInfo.events[0].args[1];
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));
    });

    it('Deploy stable meta pool and gauge (sbtc, implementation 1)', async function () {
        const basePoolData = curve.constants.POOLS_DATA['sbtc'];
        const basePool = basePoolData.swap_address;
        const n = basePoolData.underlying_coins.length;
        const coin = curve.constants.COINS['tbtc'];

        const deployPoolTx = await deployStableMetaPool(basePool, 'Test pool', 'TST', coin, 200, 0.1, 1);
        const deployPoolTxInfo = await deployPoolTx.wait();
        const poolAddress = deployPoolTxInfo.logs[n].address;
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        const deployGaugeTx = await deployStableGauge(poolAddress);
        const deployGaugeTxInfo: ethers.ContractReceipt = await deployGaugeTx.wait();
        // @ts-ignore
        const gaugeAddress = deployGaugeTxInfo.events[0].args[1];
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));
    });

    // --- META (ren) ---

    it('Deploy stable meta pool and gauge (ren, implementation 0)', async function () {
        const basePoolData = curve.constants.POOLS_DATA['ren'];
        const basePool = basePoolData.swap_address;
        const n = basePoolData.underlying_coins.length;
        const coin = curve.constants.COINS['tbtc'];

        const deployPoolTx = await deployStableMetaPool(basePool, 'Test pool', 'TST', coin, 200, 0.1, 0);
        const deployPoolTxInfo = await deployPoolTx.wait();
        const poolAddress = deployPoolTxInfo.logs[n].address;
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        const deployGaugeTx = await deployStableGauge(poolAddress);
        const deployGaugeTxInfo: ethers.ContractReceipt = await deployGaugeTx.wait();
        // @ts-ignore
        const gaugeAddress = deployGaugeTxInfo.events[0].args[1];
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));
    });

    it('Deploy stable meta pool and gauge (ren, implementation 1)', async function () {
        const basePoolData = curve.constants.POOLS_DATA['ren'];
        const basePool = basePoolData.swap_address;
        const n = basePoolData.underlying_coins.length;
        const coin = curve.constants.COINS['tbtc'];

        const deployPoolTx = await deployStableMetaPool(basePool, 'Test pool', 'TST', coin, 200, 0.1, 1);
        const deployPoolTxInfo = await deployPoolTx.wait();
        const poolAddress = deployPoolTxInfo.logs[n].address;
        assert.isTrue(ethers.utils.isAddress(poolAddress));

        const deployGaugeTx = await deployStableGauge(poolAddress);
        const deployGaugeTxInfo: ethers.ContractReceipt = await deployGaugeTx.wait();
        // @ts-ignore
        const gaugeAddress = deployGaugeTxInfo.events[0].args[1];
        assert.isTrue(ethers.utils.isAddress(gaugeAddress));
    });
});
