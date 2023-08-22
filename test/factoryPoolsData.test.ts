import { assert } from "chai";
import { curve } from "../src/curve.js";
import { ETH_RPC } from "./rpcUrls.test.js";
import { IDict, IPoolData } from "../src/interfaces.js";
import { BLACK_LIST } from "../src/factory/factory.js";


const factoryPoolsDataTest = (factoryPoolsDataFromApi: IDict<IPoolData>, factoryPoolsData: IDict<IPoolData>, isStrict: boolean) => {
    assert.deepStrictEqual(Object.keys(factoryPoolsDataFromApi), Object.keys(factoryPoolsData));

    for (const poolId in factoryPoolsData) {
        assert.equal(factoryPoolsData[poolId].name, factoryPoolsDataFromApi[poolId].name, `${poolId}: name`);
        assert.equal(factoryPoolsData[poolId].full_name, factoryPoolsDataFromApi[poolId].full_name, `${poolId}: full_name`);
        assert.equal(factoryPoolsData[poolId].symbol, factoryPoolsDataFromApi[poolId].symbol, `${poolId}: symbol`);

        if (isStrict) {
            assert.equal(factoryPoolsData[poolId].reference_asset, factoryPoolsDataFromApi[poolId].reference_asset, `${poolId}: reference_asset`);
        } else {
            if (factoryPoolsData[poolId].reference_asset !== factoryPoolsDataFromApi[poolId].reference_asset) {
                console.log(poolId, `reference asset: ${factoryPoolsData[poolId].reference_asset} (blockchain) != ${factoryPoolsDataFromApi[poolId].reference_asset} (api)`);
                console.log("Wrapped coins:", factoryPoolsDataFromApi[poolId].wrapped_coins);
                console.log("Underlying coins:", factoryPoolsDataFromApi[poolId].underlying_coins, "\n");
            }
        }

        assert.equal(factoryPoolsData[poolId].swap_address, factoryPoolsDataFromApi[poolId].swap_address, `${poolId}: swap_address`);
        assert.equal(factoryPoolsData[poolId].token_address, factoryPoolsDataFromApi[poolId].token_address, `${poolId}: token_address`);
        assert.equal(factoryPoolsData[poolId].gauge_address, factoryPoolsDataFromApi[poolId].gauge_address, `${poolId}: gauge_address`);
        assert.equal(factoryPoolsData[poolId].deposit_address, factoryPoolsDataFromApi[poolId].deposit_address, `${poolId}: deposit_address`);
        assert.equal(factoryPoolsData[poolId].sCurveRewards_address, factoryPoolsDataFromApi[poolId].sCurveRewards_address, `${poolId}: sCurveRewards_address`);
        assert.equal(factoryPoolsData[poolId].reward_contract, factoryPoolsDataFromApi[poolId].reward_contract, `${poolId}: reward_contract`);
        assert.equal(factoryPoolsData[poolId].implementation_address, factoryPoolsDataFromApi[poolId].implementation_address, `${poolId}: implementation_address`);
        assert.equal(factoryPoolsData[poolId].is_plain, factoryPoolsDataFromApi[poolId].is_plain, `${poolId}: is_plain`);
        assert.equal(factoryPoolsData[poolId].is_lending, factoryPoolsDataFromApi[poolId].is_lending, `${poolId}: is_lending`);
        assert.equal(factoryPoolsData[poolId].is_meta, factoryPoolsDataFromApi[poolId].is_meta, `${poolId}: is_meta`);
        assert.equal(factoryPoolsData[poolId].is_crypto, factoryPoolsDataFromApi[poolId].is_crypto, `${poolId}: is_crypto`);
        assert.equal(factoryPoolsData[poolId].is_fake, factoryPoolsDataFromApi[poolId].is_fake, `${poolId}: is_fake`);
        assert.equal(factoryPoolsData[poolId].is_factory, factoryPoolsDataFromApi[poolId].is_factory, `${poolId}: is_factory`);
        assert.equal(factoryPoolsData[poolId].base_pool, factoryPoolsDataFromApi[poolId].base_pool, `${poolId}: base_pool`);

        if (isStrict) {
            assert.deepStrictEqual(factoryPoolsData[poolId].underlying_coins, factoryPoolsDataFromApi[poolId].underlying_coins, `${poolId}: underlying_coins`);
        } else {
            if (JSON.stringify(factoryPoolsData[poolId].underlying_coins) !== JSON.stringify(factoryPoolsDataFromApi[poolId].underlying_coins)) {
                console.log(poolId, `underlying_coins: ${factoryPoolsData[poolId].underlying_coins} (blockchain) != ${factoryPoolsDataFromApi[poolId].underlying_coins} (api) \n`);
            }
        }

        if (isStrict) {
            assert.deepStrictEqual(factoryPoolsData[poolId].wrapped_coins, factoryPoolsDataFromApi[poolId].wrapped_coins, `${poolId}: wrapped_coins`);
        } else {
            if (JSON.stringify(factoryPoolsData[poolId].wrapped_coins) !== JSON.stringify(factoryPoolsDataFromApi[poolId].wrapped_coins)) {
                console.log(poolId, `wrapped_coins: ${factoryPoolsData[poolId].wrapped_coins} (blockchain) != ${factoryPoolsDataFromApi[poolId].wrapped_coins} (api) \n`);
            }
        }

        assert.deepStrictEqual(factoryPoolsData[poolId].underlying_coin_addresses, factoryPoolsDataFromApi[poolId].underlying_coin_addresses, `${poolId}: underlying_coin_addresses`);
        assert.deepStrictEqual(factoryPoolsData[poolId].wrapped_coin_addresses, factoryPoolsDataFromApi[poolId].wrapped_coin_addresses, `${poolId}: wrapped_coin_addresses`);
        assert.deepStrictEqual(factoryPoolsData[poolId].underlying_decimals, factoryPoolsDataFromApi[poolId].underlying_decimals, `${poolId}: underlying_decimals`);
        assert.deepStrictEqual(factoryPoolsData[poolId].wrapped_decimals, factoryPoolsDataFromApi[poolId].wrapped_decimals, `${poolId}: wrapped_decimals`);
        assert.deepStrictEqual(factoryPoolsData[poolId].use_lending, factoryPoolsDataFromApi[poolId].use_lending, `${poolId}: use_lending`);
        assert.deepStrictEqual(factoryPoolsData[poolId].swap_abi, factoryPoolsDataFromApi[poolId].swap_abi, `${poolId}: swap_abi`);
        assert.deepStrictEqual(factoryPoolsData[poolId].gauge_abi, factoryPoolsDataFromApi[poolId].gauge_abi, `${poolId}: gauge_abi`);
        assert.deepStrictEqual(factoryPoolsData[poolId].deposit_abi, factoryPoolsDataFromApi[poolId].deposit_abi, `${poolId}: deposit_abi`);
        assert.deepStrictEqual(factoryPoolsData[poolId].sCurveRewards_abi, factoryPoolsDataFromApi[poolId].sCurveRewards_abi, `${poolId}: sCurveRewards_abi`);
    }
}

describe('Factory pools data', async function () {
    this.timeout(120000);

    before(async function() {
        await curve.init('JsonRpc', { url: ETH_RPC }, { gasPrice: 0 });
        // await curve.init('JsonRpc', {},{ gasPrice: 0 });
    });

    it('Factory', async function () {
        await curve.fetchFactoryPools();
        const factoryPoolsDataFromApi = { ...curve.constants.FACTORY_POOLS_DATA };
        BLACK_LIST[1].forEach((item:string) => {
            for(let key in factoryPoolsDataFromApi) {
                if(factoryPoolsDataFromApi[key].swap_address === item) {
                    delete factoryPoolsDataFromApi[key]
                }
            }
        })
        await curve.fetchFactoryPools(false);
        const factoryPoolsData = { ...curve.constants.FACTORY_POOLS_DATA };

        factoryPoolsDataTest(factoryPoolsDataFromApi, factoryPoolsData, false);
    });

    it('crvUSD factory', async function () {
        await curve.fetchCrvusdFactoryPools();
        const factoryPoolsDataFromApi = { ...curve.constants.CRVUSD_FACTORY_POOLS_DATA };
        await curve.fetchCrvusdFactoryPools(false);
        const factoryPoolsData = { ...curve.constants.CRVUSD_FACTORY_POOLS_DATA };

        factoryPoolsDataTest(factoryPoolsDataFromApi, factoryPoolsData, false);
    });

    it('EYWA factory', async function () {
        await curve.fetchEywaFactoryPools();
        const factoryPoolsDataFromApi = { ...curve.constants.EYWA_FACTORY_POOLS_DATA };
        await curve.fetchEywaFactoryPools(false);
        const factoryPoolsData = { ...curve.constants.EYWA_FACTORY_POOLS_DATA };

        factoryPoolsDataTest(factoryPoolsDataFromApi, factoryPoolsData, false);
    });

    it('Crypto factory', async function () {
        await curve.fetchCryptoFactoryPools();
        const cryptoFactoryPoolsDataFromApi = { ...curve.constants.CRYPTO_FACTORY_POOLS_DATA };
        await curve.fetchCryptoFactoryPools(false);
        const cryptoFactoryPoolsData = { ...curve.constants.CRYPTO_FACTORY_POOLS_DATA };

        factoryPoolsDataTest(cryptoFactoryPoolsDataFromApi, cryptoFactoryPoolsData, false);
    });

    it('Tricrypto factory', async function () {
        await curve.fetchTricryptoFactoryPools();
        const tricryptoFactoryPoolsDataFromApi = { ...curve.constants.TRICRYPTO_FACTORY_POOLS_DATA };
        await curve.fetchTricryptoFactoryPools(false);
        const tricryptoFactoryPoolsData = { ...curve.constants.TRICRYPTO_FACTORY_POOLS_DATA };

        factoryPoolsDataTest(tricryptoFactoryPoolsDataFromApi, tricryptoFactoryPoolsData, true);
    });
});
