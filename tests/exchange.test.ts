import { assert } from "chai";
import { getBestPoolAndOutput, exchange } from "../src/pools";
import { BN, getBalances } from "../src/utils";
import { curve } from "../src/curve";

const bestExchangeTest = async (coin1: string, coin2: string) => {
    const address = curve.signerAddress;
    const amount = '100';
    const initialBalances = (await getBalances([address], [coin1, coin2]))[address];

    const { output } = await getBestPoolAndOutput(coin1, coin2, amount);
    await exchange(coin1, coin2, amount);

    const balancesAfterSwap = (await getBalances([address], [coin1, coin2]))[address];

    assert.deepStrictEqual(BN(balancesAfterSwap[0]), BN(initialBalances[0]).minus(BN(amount)));
    assert.isAtLeast(Number(balancesAfterSwap[1]), Number(BN(initialBalances[1]).plus(BN(output).times(0.99)).toString()));
}

describe('Exchange using all pools', async function () {
    this.timeout(240000);

    before(async function () {
        await curve.init('JsonRpc', {}, { gasPrice: 0 });
    });

    const DAI = "0x6b175474e89094c44da98b954eedeac495271d0f";
    const USDC = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
    const cDAI = "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643";
    const cUSDC = "0x39AA39c021dfbaE8faC545936693aC917d5E7563";

    it('DAI --> USDC (underlying)', async function () {
        await bestExchangeTest(DAI, USDC)
    });

    it('cDAI --> cUSDC (wrapped)', async function () {
        await bestExchangeTest(cDAI, cUSDC)
    });

    it('DAI --> cUSDC (error)', async function () {
        const amount = '100';

        try {
            await exchange(DAI, cUSDC, amount);
        } catch (err) {
            assert.equal(err.message, "This pair can't be exchanged")
        }
    });
})
