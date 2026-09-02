import { assert } from "chai";
import { curve } from "../src/curve.js";
import { IDict, IPoolData } from "../src/interfaces.js";
// The production hidden-pool fetch was removed (the API path already excludes them);
// this test still uses the legacy getHiddenPools list directly as a reference set to
// verify prices.curve.finance doesn't leak any pool that was flagged as hidden.
const _getLegacyHiddenPools = async (): Promise<IDict<string[]>> => {
    const response = await fetch("https://api.curve.finance/v1/getHiddenPools");
    const { data } = (await response.json()) ?? {};
    return data ?? {};
};
import { getFactoryPoolData } from "../src/factory/factory.js";
import { getCryptoFactoryPoolData } from "../src/factory/factory-crypto.js";
import { getTwocryptoFactoryPoolData } from "../src/factory/factory-twocrypto.js";
import { getTricryptoFactoryPoolData } from "../src/factory/factory-tricrypto.js";
import { getFactoryPoolsDataFromApi } from "../src/factory/factory-api.js";
import { ETH_RPC } from "./rpcUrls.test.js";

declare const run: () => void;

interface IFactoryCase {
    title: string;
    idPrefix: string;
    alias: string;
    apiPoolType: Parameters<typeof getFactoryPoolsDataFromApi>[0];
    fetchOnChain: () => Promise<IDict<IPoolData>>;
}

const FACTORIES: IFactoryCase[] = [
    {
        title: "Factory (stable)",
        idPrefix: "factory-v2",
        alias: "factory",
        apiPoolType: "factory",
        fetchOnChain: () => getFactoryPoolData.call(curve),
    },
    {
        title: "crvUSD factory",
        idPrefix: "factory-crvusd",
        alias: "crvusd_factory",
        apiPoolType: "factory-crvusd",
        fetchOnChain: () => getFactoryPoolData.call(curve, 0, undefined, curve.constants.ALIASES.crvusd_factory),
    },
    {
        title: "Stable NG factory",
        idPrefix: "factory-stable-ng",
        alias: "stable_ng_factory",
        apiPoolType: "factory-stable-ng",
        fetchOnChain: () => getFactoryPoolData.call(curve, 0, undefined, curve.constants.ALIASES.stable_ng_factory),
    },
    {
        title: "Crypto factory",
        idPrefix: "factory-crypto",
        alias: "crypto_factory",
        apiPoolType: "factory-crypto",
        fetchOnChain: () => getCryptoFactoryPoolData.call(curve),
    },
    {
        title: "Twocrypto factory",
        idPrefix: "factory-twocrypto",
        alias: "twocrypto_factory",
        apiPoolType: "factory-twocrypto",
        fetchOnChain: () => getTwocryptoFactoryPoolData.call(curve),
    },
    {
        title: "Tricrypto factory",
        idPrefix: "factory-tricrypto",
        alias: "tricrypto_factory",
        apiPoolType: "factory-tricrypto",
        fetchOnChain: () => getTricryptoFactoryPoolData.call(curve),
    },
];

const main = async () => {
    const networkName = "ethereum";
    if (!ETH_RPC) {
        console.log("ETH_RPC URL is not set, skipping (fill .env or pass env vars)");
        return run();
    }

    console.log(`\n${networkName}: initializing...`);
    await curve.init("JsonRpc", { url: ETH_RPC }, { gasPrice: 0 });

    const hiddenPoolsAll = await _getLegacyHiddenPools();
    const hiddenIds = (hiddenPoolsAll[networkName] ?? []).filter((id) =>
        FACTORIES.some((f) => id.startsWith(`${f.idPrefix}-`))
    );
    console.log(`${networkName}: ${hiddenIds.length} hidden pool ids to check (from legacy getHiddenPools)`);

    const onChainAddressById: IDict<string> = {};
    const apiAddresses = new Set<string>();

    for (const factoryCase of FACTORIES) {
        if (!(factoryCase.alias in curve.constants.ALIASES)) continue;

        process.stdout.write(`  ${factoryCase.title}: fetching on-chain (unfiltered)...`);
        const onChainData = await factoryCase.fetchOnChain();
        for (const [id, pool] of Object.entries(onChainData)) {
            onChainAddressById[id] = pool.swap_address.toLowerCase();
        }
        console.log(" done");

        process.stdout.write(`  ${factoryCase.title}: fetching via prices API...`);
        const apiData = await getFactoryPoolsDataFromApi.call(curve, factoryCase.apiPoolType);
        for (const pool of Object.values(apiData)) {
            apiAddresses.add(pool.swap_address.toLowerCase());
        }
        console.log(" done");
    }

    console.log("\nChecking each hidden pool against the prices API pool set...\n");

    describe(`${networkName} / hidden pools leaking into prices API`, function () {
        for (const id of hiddenIds) {
            it(id, function () {
                const address = onChainAddressById[id];
                if (!address) this.skip();

                const leaked = apiAddresses.has(address);
                if (leaked) console.log(`    [LEAK] ${id} (${address}) is present in prices API despite being hidden`);
                assert.isFalse(leaked, `${id} (${address}) is hidden in legacy API but still present in prices.curve.finance`);
            });
        }
    });

    run();
};

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
