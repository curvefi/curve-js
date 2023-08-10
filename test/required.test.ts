import {expect} from "chai";
import curve from "../src/index.js";
import {ETH_RPC} from "./rpcUrls.test.js";

const test = (baseValue: number, resultValue: number, errorInPercentage: number) => {
    const difference = Math.abs(baseValue - resultValue);
    if ((difference / baseValue) * 100 < errorInPercentage) {
        return true;
    } else {
        return false;
    }
};

const testOfSwapRequired = (pool: string, curve: any) => {
    describe(`${pool} swapRequired test`, function () {
        it(`${pool} swapRequired test`,  async function () {
            const poolInstance = curve.getPool(pool)
            const to = await poolInstance.swapExpected(0, 1, 5);
            const result = await poolInstance.swapRequired(0, 1, to);
            const isTestSuccessful = test(5, Number(result), 0.5)
            expect(isTestSuccessful).to.be.equal(true)
        })
    })
}

const testOfSwapWrappedRequired = (pool: string, curve: any) => {
    describe(`${pool} swapWrappedRequired test`, function () {
        it(`${pool} swapWrappedRequired test`,  async function () {
            try {
                const poolInstance = curve.getPool(pool)
                const to = await poolInstance.swapWrappedExpected(0, 1, 5);
                const result = await poolInstance.swapWrappedRequired(0, 1, to);
                const isTestSuccessful = test(5, Number(result), 0.5)
                expect(isTestSuccessful).to.be.equal(true)
            } catch (e: any) {
                const isTestSuccessful = e.message.startsWith(`swapWrappedExpected method doesn't exist for pool`)
                expect(isTestSuccessful).to.be.equal(true)
            }
        })
    })
}

describe('Test swapRequired and swapWrappedRequired methods in PoolTemplate', async function (){
    this.timeout(120000)

    let allPools: string[] = [];

    before(async function (){
        await curve.init('JsonRpc', { url: ETH_RPC }, { gasPrice: 0 });
        await curve.factory.fetchPools();
        await curve.crvUSDFactory.fetchPools();
        await curve.EYWAFactory.fetchPools();
        await curve.cryptoFactory.fetchPools();
        await curve.tricryptoFactory.fetchPools();

        allPools = curve.getMainPoolList();
    })

    it('', function () {
        describe('TEST', () => {
            it('CONNECT WITH BLOCKCHAIN', () => {
                for(const pool of allPools) {
                    testOfSwapRequired(pool, curve)
                    testOfSwapWrappedRequired(pool, curve)
                }
            })
        })
    })
})