import {assert} from "chai";
import {_getCoinAddresses, BN} from "../src/utils.js";
import curve from "../src/index.js";
import {curve as _curve} from "../src/curve.js";
import {JsonRpcSigner} from "ethers";
import {ETH_RPC} from "./rpcUrls.test.js";


const AAVE_TOKENS = ['adai', 'ausdc', 'ausdt', 'asusd', 'awbtc', 'amdai', 'amusdt', 'amusdc', 'amwbtc', 'avdai', 'avusdt', 'avusdc', 'avwbtc', 'gdai', 'gusdc', 'gfusdt'];

const routerSwapTest = async (coin1: string, coin2: string) => {
    const title = 'Swap ' + coin1 + ' --> ' + coin2;
    console.time(title);

    const amount = '1';
    const initialBalances = await curve.getBalances([coin1, coin2]) as string[];

    const { route, output } = await curve.router.getBestRouteAndOutput(coin1, coin2, amount);
    assert.isTrue(route.length > 0);
    const required = await curve.router.required(coin1, coin2, output);
    await stealTokens(coin1);

    console.log(route.map((step) => `${step.poolId} (${step.swapParams})`).join(' --> '))
    console.log(route);
    console.log("Output:", output);
    console.log("Required:", required);

    try {
        await curve.router.swap(coin1, coin2, amount);
    } catch (e) {
        if ((e as Error).message === "This pair can't be exchanged") return;
        throw e;
    } finally {
        console.timeEnd(title);
    }

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
    this.timeout(240_000); // 4 minutes

    const resetFork = () => _curve.provider.send("hardhat_reset", [{ forking: { jsonRpcUrl: ETH_RPC } }]);

    before(async function () {
        console.time('init');
        await curve.init('JsonRpc', {}, { gasPrice: 0 });
        await resetFork();
        await Promise.all([
            curve.factory.fetchPools(),
            curve.cryptoFactory.fetchPools(),
            curve.tricryptoFactory.fetchPools(),
            curve.crvUSDFactory.fetchPools(),
            curve.EYWAFactory.fetchPools(),
        ]);
        console.timeEnd('init');
    });

    beforeEach(resetFork);

    // const coins = Object.keys(COINS_POLYGON).filter((c) => c !== 'snx' && c !== 'eurs'); // TODO remove eurs

    // ETHEREUM
    const coins = ['crv', 'dai'];
    // const coins = ['sbtc', 'susd', 'dai', 'mim', 'frax', 'crv', 'cvx', 'eth', 'steth', 'wsteth', 'frxeth', 'sfrxeth', 'wbeth', 'eurt', '3crv', '0x62b9c7356a2dc64a1969e19c23e4f579f9810aa7', '0x045da4bfe02b320f4403674b3b7d121737727a36']; // cvxCRV, DCHF

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

    coins.forEach(coin1 => coins.forEach(coin2 =>
        coin1 !== coin2 && it(`${coin1} --> ${coin2}`, () => routerSwapTest(coin1, coin2))
    ))
})


/**
 * Function that limits the number of calls to the function per time period, delaying the next call.
 * We use this to avoid hitting the rate limit of the API.
 */
function rateLimit<R, F extends (...args: Parameters<F>) => Promise<R>>(func: F, timeout: number): F {
    let lastCall = Date.now() - timeout;
    return (async (...args: Parameters<F>): Promise<R> => {
        const now = Date.now();
        const wait = now - lastCall + timeout;
        if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
        lastCall = now;
        return await func(...args);
    }) as F;
}

type TokenHolder = { address: string, rawBalance: string, balance: number };
const getRichestCoinHolders = rateLimit(async (target: string) => {
    const response = await fetch(`https://api.ethplorer.io/getTopTokenHolders/${target}?apiKey=freekey&limit=10`);
    const {holders, error} = await response.json();
    if (error) throw new Error(error);
    return holders as TokenHolder[];
}, 2000); // 2 requests per second, using free api key

function mockProperty<T, K extends keyof T>(obj: T, prop: K, value: T[K]) {
    const oldValue = obj[prop];
    Object.defineProperty(obj, prop, { get: () => value });
    return () => Object.defineProperty(obj, prop, { get: () => oldValue });
}

async function getRichestCoinHolder(coinAddress: string, coinName: string) {
    for (const account of await getRichestCoinHolders(coinAddress)) {
        const code = await _curve.provider.getCode(account.address);
        if (!code) return account; // if account has code, it's not an EOA
    }
    throw new Error(`No rich account found for ${coinName}`);
}

async function stealTokens(coinName: string, amount: string = `0x1${'0'.repeat(22)}`) {
    const [coinAddress] = _getCoinAddresses(coinName);
    const richAccount = await getRichestCoinHolder(coinAddress, coinName);

    const richAddress = richAccount.address;
    const contract = _curve.contracts[coinAddress].contract;
    const cleanup = mockProperty(_curve.signer as JsonRpcSigner, 'address', richAddress);
    try {
        await _curve.provider.send("hardhat_setBalance", [richAddress, `0x1${'0'.repeat(12)}`]);
        await _curve.provider.send("hardhat_impersonateAccount", [richAddress]);

        console.log(`Stealing ${amount} ${coinName} from ${richAddress}. It has ${richAccount.rawBalance}.`);
        const tx = await contract.transfer(curve.signerAddress, amount, {from: richAddress});
        console.log(`Stole ${coinName} from ${richAddress}: ${JSON.stringify(tx)}`);
    }
    catch (e) {
        console.error(`Cannot steal ${amount} ${coinName} from ${richAddress}, even if it has ${richAccount.rawBalance}: ${e}`);
        throw e;
    } finally {
        cleanup();
    }
}
