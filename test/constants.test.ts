import { assert } from "chai";
import { poolsData } from "../src/constants/abis/abis-ethereum";
import { COINS, DECIMALS } from "../src/constants";

describe('Checking constants', async function () {
    it('poolsData <-> COINS match', async function () {
        const COIN_ADDRESSES = Object.values(COINS);
        for (const poolData of Object.values(poolsData)) {
            const coinAddresses = [
                ...poolData.underlying_coin_addresses,
                ...poolData.coin_addresses,
                ...(poolData.meta_coin_addresses || []),
                ...(poolData.all_coin_addresses || []),
            ]
            for (const coinAddr of coinAddresses) {
                assert.isTrue(COIN_ADDRESSES.includes(coinAddr), `Addesss: ${coinAddr}`)
            }
        }
    });

    it('COINS <-> DECIMALS match', async function () {
        assert.deepStrictEqual(Object.values(COINS).sort(), Object.keys(DECIMALS).sort());
    });

    it('poolsData <-> DECIMALS match', async function () {
        for (const poolData of Object.values(poolsData)) {
            let coinAddresses = [
                ...poolData.underlying_coin_addresses,
                ...poolData.coin_addresses,
            ]
            let coinDecimals = [
                ...poolData.underlying_decimals,
                ...poolData.decimals,
            ]

            if (poolData.is_meta) {
                coinAddresses = [
                    poolData.underlying_coin_addresses[0],
                    ...poolData.meta_coin_addresses as string[],
                    ...poolData.coin_addresses,
                ]
                coinDecimals = [
                    ...poolData.meta_coin_decimals as number[],
                    ...poolData.decimals,
                ]
            }
            assert.equal(coinAddresses.length, coinDecimals.length);
            for (let i = 0; i < coinAddresses.length; i++) {
                assert.equal(DECIMALS[coinAddresses[i]], coinDecimals[i], `Swap addesss: ${poolData.swap_address}`)
            }
        }
    });

})