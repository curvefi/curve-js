import { assert } from "chai";
import curve from "../src";


const checkNumber = (n: string) => Number(n) === Number(n);

describe('Rewards test', async function () {
    this.timeout(240000);

    before(async function() {
        await curve.init('JsonRpc', {}, { gasPrice: 0 });
        await curve.fetchFactoryPools();
        await curve.fetchCryptoFactoryPools();
    });

    it('crvProfit', async function () {
        const pools = [...curve.getPoolList(), ...curve.getFactoryPoolList().slice(0, 10), ...curve.getCryptoFactoryPoolList().slice(0, 10)];
        for (const poolId of pools) {
            console.log(poolId);
            const pool = curve.getPool(poolId);

            try {
                if (pool.rewardsOnly()) {
                    console.log('Rewards-Only');
                    continue;
                }

                const crvProfit = await pool.crvProfit();
                console.log(crvProfit, '\n');
                assert.isTrue(checkNumber(crvProfit.day));
                assert.isTrue(checkNumber(crvProfit.week));
                assert.isTrue(checkNumber(crvProfit.month));
                assert.isTrue(checkNumber(crvProfit.year));
                assert.equal(typeof crvProfit.token, "string");
                assert.equal(typeof crvProfit.symbol, "string");
                assert.isAbove(crvProfit.price, 0);
            } catch (err: any) {
                console.log(err.message, '\n');
                assert.equal(err.message, `${pool.name} doesn't have gauge`);
            }
        }
    });

    it('rewardsProfit', async function () {
        const pools = [...curve.getPoolList(), ...curve.getFactoryPoolList(), ...curve.getCryptoFactoryPoolList()];
        for (const poolId of pools) {
            console.log(poolId);
            const pool = curve.getPool(poolId);
            try {
                const rewardsProfit = await pool.rewardsProfit();
                console.log(rewardsProfit, '\n');

                for (const profit of rewardsProfit) {
                    assert.isTrue(checkNumber(profit.day));
                    assert.isTrue(checkNumber(profit.week));
                    assert.isTrue(checkNumber(profit.month));
                    assert.isTrue(checkNumber(profit.year));
                    assert.equal(typeof profit.token, "string");
                    assert.equal(typeof profit.symbol, "string");
                    assert.isAbove(profit.price, 0);
                }
            } catch (err: any) {
                console.log(err.message, '\n');
                assert.equal(err.message, `${pool.name} doesn't have gauge`);
            }
        }
    });
});