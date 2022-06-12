import { assert } from "chai";
import { ethers } from "ethers";
import { curve } from "../src/curve";

describe('Checking constants', async function () {
    this.timeout(120000);

    before(async function() {
        await curve.init('JsonRpc', {}, { gasPrice: 0 });
        await curve.fetchCryptoFactoryPools();
        await curve.fetchFactoryPools();
    });

    it('POOLS_DATA <-> COINS match', async function () {
        const COIN_ADDRESSES = Object.values(curve.constants.COINS);
        for (const poolData of Object.values(curve.constants.POOLS_DATA)) {
            const coinAddresses = [
                ...poolData.underlying_coin_addresses,
                ...poolData.wrapped_coin_addresses,
            ]
            for (const coinAddr of coinAddresses) {
                assert.isTrue(COIN_ADDRESSES.includes(coinAddr), `Addesss: ${coinAddr}`)
            }
        }
    });

    it('POOLS_DATA <-> DECIMALS match', async function () {
        for (const poolData of Object.values(curve.constants.POOLS_DATA)) {
            const coinAddresses = [
                ...poolData.underlying_coin_addresses,
                ...poolData.wrapped_coin_addresses,
            ]
            const coinDecimals = [
                ...poolData.underlying_decimals,
                ...poolData.wrapped_decimals,
            ]

            assert.equal(coinAddresses.length, coinDecimals.length, `Pool: ${poolData.name}, swap addesss: ${poolData.swap_address}`);
            for (let i = 0; i < coinAddresses.length; i++) {
                assert.equal(curve.constants.DECIMALS[coinAddresses[i]], coinDecimals[i], `Pool: ${poolData.name}, swap addesss: ${poolData.swap_address}`);
            }
        }
    });

    it('DECIMALS are correct', async function () {
        for (const [address, decimals] of Object.entries(curve.constants.DECIMALS)) {
            if (address === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") continue; // ETH
            // if (address === "0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f") continue; // SNX
            if (curve.contracts[address] === undefined) console.log(address);
            const contract = curve.contracts[address].contract;
            assert.equal(decimals, Number(ethers.utils.formatUnits(await contract.decimals(curve.constantOptions), 0)), address);
        }
    });

    it('POOLS_DATA names of coins are correct', async function () {
        for (const poolData of Object.values(curve.constants.POOLS_DATA)) {
            const coins = [
                ...poolData.underlying_coins,
                ...poolData.wrapped_coins,
            ]
            const coinAddresses = [
                ...poolData.underlying_coin_addresses,
                ...poolData.wrapped_coin_addresses,
            ]

            assert.equal(coins.length, coinAddresses.length, poolData.swap_address);
            for (let i = 0; i < coins.length; i++) {
                if (coinAddresses[i] === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") continue; // ETH
                if (coins[i] === "byDAI" || coins[i] === "byUSDC" || coins[i] === "byUSDT") continue; // Actually yDAI, yUSDC, yUSDT
                if (coins[i] === "sbtcCrv") continue; // Actually crvRenWSBTC
                if (coins[i] === "ankrETH") continue; // Actually aETHc
                if (coins[i] === "PAX") continue; // Actually USDP
                const contract = curve.contracts[coinAddresses[i]].contract;
                assert.equal(coins[i], await contract.symbol(), `Pool: ${poolData.name}, swap addesss: ${poolData.swap_address}`)
            }
        }
    });
});