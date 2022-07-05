import { assert } from "chai";
import curve from "../src";


const checkNumber = (n: string) => Number(n) === Number(n);

describe('Checking constants', async function () {
    this.timeout(240000);

    before(async function() {
        await curve.init('JsonRpc', {}, { gasPrice: 0 });
        await curve.fetchCryptoFactoryPools();
        await curve.fetchFactoryPools();
    });

    it('crvIncome', async function () {
        const pools = [...curve.getPoolList(), ...curve.getFactoryPoolList().slice(0, 10), ...curve.getCryptoFactoryPoolList().slice(0, 10)];
        for (const poolId of pools) {
            console.log(poolId);
            const pool = curve.getPool(poolId);
            try {
                const crvIncome = await pool.crvIncome();
                console.log(crvIncome, '\n');

                assert.isTrue(checkNumber(crvIncome.day));
                assert.isTrue(checkNumber(crvIncome.week));
                assert.isTrue(checkNumber(crvIncome.month));
                assert.isTrue(checkNumber(crvIncome.year));
            } catch (err: any) {
                console.log(err.message, '\n');
                assert.equal(err.message, `${pool.name} doesn't have gauge`);
            }
        }
    });
});