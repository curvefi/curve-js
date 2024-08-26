import { assert } from "chai";
import { BN } from "../src/utils.js";
import curve from "../src/index.js";


const AAVE_TOKENS = ['adai', 'ausdc', 'ausdt', 'asusd', 'awbtc', 'amdai', 'amusdt', 'amusdc', 'amwbtc', 'avdai', 'avusdt', 'avusdc', 'avwbtc', 'gdai', 'gusdc', 'gfusdt'];

const routerSwapTest = async (coin1: string, coin2: string) => {
    const amount = '1';
    const initialBalances = await curve.getBalances([coin1, coin2]) as string[];

    const { route, output } = await curve.router.getBestRouteAndOutput(coin1, coin2, amount);
    assert.isTrue(route.length > 0);
    const required = await curve.router.required(coin1, coin2, output);

    let routeStr = ''
    for (const step of route) {
        routeStr += `${step.poolId} (${step.swapParams}) --> `;
    }
    routeStr = routeStr.slice(0, routeStr.length - 5)
    console.log(routeStr)
    console.log(route);
    console.log("Output:", output);
    console.log("Required:", required);

    await curve.router.swap(coin1, coin2, amount);

    const balances = await curve.getBalances([coin1, coin2]) as string[];

    if (coin1 === 'steth' || coin2 === 'steth') {
        assert.approximately(Number(Object.values(balances)[0]), Number(BN(Object.values(initialBalances)[0]).minus(BN(amount)).toString()), 1e-18);
    } else if (AAVE_TOKENS.includes(coin1) || AAVE_TOKENS.includes(coin2)) {
        assert.approximately(Number(Object.values(balances)[0]), Number(BN(Object.values(initialBalances)[0]).minus(BN(amount)).toString()), 1e-2);
    } else {
        assert.deepStrictEqual(BN(balances[0]), BN(initialBalances[0]).minus(BN(amount)));
    }
    assert.isAtLeast(Number(balances[1]), Number(BN(initialBalances[1]).plus(BN(output).times(0.995)).toString()));
    assert.approximately(Number(required), Number(amount), 0.03);
}

describe('Router swap', async function () {
    this.timeout(240000);

    before(async function () {
        await curve.init('JsonRpc', {}, { gasPrice: 0 });
        await curve.factory.fetchPools();
        await curve.cryptoFactory.fetchPools();
        await curve.tricryptoFactory.fetchPools();
        await curve.crvUSDFactory.fetchPools();
        await curve.EYWAFactory.fetchPools();
    });

    // const coins = Object.keys(COINS_POLYGON).filter((c) => c !== 'snx' && c !== 'eurs'); // TODO remove eurs

    // ETHEREUM
    const coins = ['sbtc', 'susd', 'dai', 'mim', 'frax', 'crv', 'cvx', 'eth', 'steth', 'wsteth', 'frxeth', 'sfrxeth', 'wbeth', 'eurt', '3crv', '0x62b9c7356a2dc64a1969e19c23e4f579f9810aa7', '0x045da4bfe02b320f4403674b3b7d121737727a36']; // cvxCRV, DCHF

    // POLYGON
    // const coins = ['wbtc', 'crv', 'dai', 'usdc', 'usdt', 'eurt', 'weth', 'renbtc', 'amdai', 'amusdc', 'amusdt', 'am3crv', 'matic',
    //     '0x45c32fa6df82ead1e2ef74d17b76547eddfaff89', '0xdAD97F7713Ae9437fa9249920eC8507e5FbB23d3', '0xad326c253a84e9805559b73a08724e11e49ca651']; // frax, atricrypto3 LP, 4eur LP

    // AVALANCHE
    // const coins = ['dai.e', 'weth.e', 'wbtc.e', 'usdc', 'usdt', 'btc.b', 'avax', 'wavax', '2crv', 'avusdt', 'av3crv', '0x130966628846bfd36ff31a822705796e8cb8c18d']; // mim

    // FANTOM
    // const coins = ['dai', 'usdc', 'fusdt', 'idai', 'iusdc', 'ifusdt', 'gdai', 'gusdc', 'gfusdt', 'dai+usdc', 'eth', 'btc', 'renbtc', 'frax', 'crv', '0x666a3776b3e82f171cb1dff7428b6808d2cd7d02']; // aCRV

    // ARBITRUM
    // const coins = ['usdc', 'usdt', 'wbtc', 'eth', 'weth', 'eurs', '2crv', "0x8e0B8c8BB9db49a46697F3a5Bb8A308e744821D2"]; // tricrypto LP

    // OPTIMISM
    // const coins = ['dai', 'usdc', 'usdt', 'susd', '3crv', 'eth', 'weth', 'wsteth', 'seth'];

    // XDAI
    // const coins = ['wxdai', 'usdc', 'usdt', 'rai', 'x3crv', 'wbtc', 'weth', '0x9C58BAcC331c9aa871AFD802DB6379a98e80CEdb', '0xa4ef9da5ba71cc0d2e5e877a910a37ec43420445']; // GNO, sGNO

    // MOONBEAM
    // const coins = ['dai', 'usdc', 'usdt', '3crv', '0x765277EebeCA2e31912C9946eAe1021199B39C61']; // DAI2

    // AURORA && KAVA && CELO
    // const coins = ['dai', 'usdc', 'usdt'];

    for (const coin1 of coins) {
        for (const coin2 of coins) {
            if (coin1 !== coin2) {
                it(`${coin1} --> ${coin2}`, async function () {
                    try {
                        await routerSwapTest(coin1, coin2);
                    } catch (err: any) {
                        if (err.message != "This pair can't be exchanged") {
                            throw err;
                        }
                    }
                });
            }
        }
    }
})
