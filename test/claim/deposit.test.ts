import curve from "../../src";
import {IDict} from "../../src/interfaces";

const PLAIN_POOLS =  ['susd', 'ren', 'sbtc', 'hbtc', '3pool', 'seth', 'steth', 'ankreth', 'link', 'reth', 'eurt']; // Without eurs
const LENDING_POOLS = ['compound', 'usdt', 'y', 'busd', 'pax', 'aave', 'saave', 'ib'];
const META_POOLS = ['gusd', 'husd', 'usdk', 'usdn', 'musd', 'rsv', 'tbtc', 'dusd', 'pbtc', 'bbtc', 'obtc', 'ust', 'usdp', 'tusd', 'frax', 'lusd', 'busdv2', 'alusd', 'mim'];
const CRYPTO_POOLS = ['tricrypto2', 'eurtusd', 'crveth', 'cvxeth'];
const ETHEREUM_POOLS = [...PLAIN_POOLS, ...LENDING_POOLS, ...META_POOLS, ...CRYPTO_POOLS];

const POLYGON_POOLS = ['aave', 'ren', 'atricrypto3', 'eurtusd'];

(async function () {
    await curve.init('JsonRpc', {},{ gasPrice: 0 });

    for (const poolName of ['susd']) {
        const pool = curve.getPool(poolName);
        const amounts = pool.underlyingCoinAddresses.map(() => '10');

        await pool.depositAndStake(amounts);

        console.log(`Deposited LP tokens to ${poolName.toUpperCase()} gauge`);
    }
})()
