import { assert } from "chai";
import { crossAssetExchangeAvailable, crossAssetExchangeExpected, crossAssetExchange } from "../src/pools";
import { BN, getBalances } from "../src/utils";
import { COINS } from "../src/constants/coins";
import { curve } from "../src/curve";

const exchangeTest = async (coin1: string, coin2: string) => {
    const address = curve.signerAddress;
    const amount = '1';
    const initialBalances = (await getBalances([address], [coin1, coin2]))[address];

    const output = await crossAssetExchangeExpected(coin1, coin2, amount);
    await crossAssetExchange(coin1, coin2, amount);

    const balances = (await getBalances([address], [coin1, coin2]))[address];

    if (coin1 === 'steth' || coin2 === 'steth') {
        assert.approximately(Number(Object.values(balances)[0]), Number(BN(Object.values(initialBalances)[0]).minus(BN(amount)).toString()), 1e-18);
    } else if (['adai', 'ausdc', 'ausdt', 'asusd'].includes(coin1) || ['adai', 'ausdc', 'ausdt', 'asusd'].includes(coin2)) {
        assert.approximately(Number(Object.values(balances)[0]), Number(BN(Object.values(initialBalances)[0]).minus(BN(amount)).toString()), 1e-4);
    } else {
        assert.deepStrictEqual(BN(balances[0]), BN(initialBalances[0]).minus(BN(amount)));
    }
    assert.isAtLeast(Number(balances[1]), Number(BN(initialBalances[1]).plus(BN(output).times(0.99)).toString()));
}

describe('Exchange using all pools', async function () {
    this.timeout(240000);

    before(async function () {
        await curve.init('JsonRpc', {}, { gasPrice: 0 });
    });

    for (const coin1 of Object.keys(COINS)) {
        for (const coin2 of Object.keys(COINS)) {
            if (coin1 === 'snx' || coin2 === 'snx') continue;
            if (coin1 === 'eurs' || coin2 === 'eurs') continue; // TODO remove
            if (coin1 !== coin2) {
                it(`${coin1} --> ${coin2}`, async function () {
                    if (await crossAssetExchangeAvailable(coin1, coin2)) {
                        await exchangeTest(coin1, coin2);
                    } else {
                        console.log("Not available");
                    }
                });
            }
        }
    }
})
