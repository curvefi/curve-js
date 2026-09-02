import { assert } from "chai";
import { curve } from "../src/curve.js";
import { IDict, IPoolData } from "../src/interfaces.js";
import { BLACK_LIST } from "../src/factory/factory.js";
import { CorePool } from "../src/pools/subClasses/corePool.js";
import { ETH_RPC, OPTIMISM_RPC } from "./rpcUrls.test.js";

interface IFactoryCase {
    title: string;
    alias: string;
    fetchPools: (useApi: boolean) => Promise<void>;
    getData: () => IDict<IPoolData>;
}

const FACTORIES: IFactoryCase[] = [
    {
        title: "Factory (stable)",
        alias: "factory",
        fetchPools: (useApi) => curve.fetchFactoryPools(useApi),
        getData: () => ({ ...curve.constants.FACTORY_POOLS_DATA }),
    },
    {
        title: "crvUSD factory",
        alias: "crvusd_factory",
        fetchPools: (useApi) => curve.fetchCrvusdFactoryPools(useApi),
        getData: () => ({ ...curve.constants.CRVUSD_FACTORY_POOLS_DATA }),
    },
    {
        title: "Stable NG factory",
        alias: "stable_ng_factory",
        fetchPools: (useApi) => curve.fetchStableNgFactoryPools(useApi),
        getData: () => ({ ...curve.constants.STABLE_NG_FACTORY_POOLS_DATA }),
    },
    {
        title: "Crypto factory",
        alias: "crypto_factory",
        fetchPools: (useApi) => curve.fetchCryptoFactoryPools(useApi),
        getData: () => ({ ...curve.constants.CRYPTO_FACTORY_POOLS_DATA }),
    },
    {
        title: "Twocrypto factory",
        alias: "twocrypto_factory",
        fetchPools: (useApi) => curve.fetchTworyptoFactoryPools(useApi),
        getData: () => ({ ...curve.constants.TWOCRYPTO_FACTORY_POOLS_DATA }),
    },
    {
        title: "Tricrypto factory",
        alias: "tricrypto_factory",
        fetchPools: (useApi) => curve.fetchTricryptoFactoryPools(useApi),
        getData: () => ({ ...curve.constants.TRICRYPTO_FACTORY_POOLS_DATA }),
    },
];

const toCorePools = (poolsData: IDict<IPoolData>): IDict<CorePool> => {
    const result: IDict<CorePool> = {};
    for (const poolId in poolsData) {
        result[poolId] = new CorePool(poolId, poolsData[poolId], curve);
    }
    return result;
};

const removeBlacklisted = (poolsData: IDict<IPoolData>): IDict<IPoolData> => {
    const blacklist: string[] = BLACK_LIST[curve.chainId] ?? [];
    const result: IDict<IPoolData> = {};
    for (const poolId in poolsData) {
        if (!blacklist.includes(poolsData[poolId].swap_address.toLowerCase())) {
            result[poolId] = poolsData[poolId];
        }
    }
    return result;
};


const SOFT_SCALAR_FIELDS: (keyof CorePool)[] = ["name", "fullName", "symbol", "referenceAsset"];
const SOFT_ARRAY_FIELDS: (keyof CorePool)[] = ["underlyingCoins", "wrappedCoins"];

const STRICT_SCALAR_FIELDS: (keyof CorePool)[] = [
    "address", "lpToken", "zap",
    "sRewardContract", "rewardContract", "implementation",
    "isPlain", "isLending", "isMeta", "isCrypto", "isFake", "isFactory",
    "isMetaFactory", "isNg", "isLlamma", "basePool", "metaCoinIdx",
];
const STRICT_ARRAY_FIELDS: (keyof CorePool)[] = [
    "underlyingCoinAddresses", "wrappedCoinAddresses",
    "underlyingDecimals", "wrappedDecimals", "useLending",
];

const comparePool = (apiPool: CorePool, chainPool: CorePool) => {
    const errors: string[] = [];

    for (const field of STRICT_SCALAR_FIELDS) {
        if (chainPool[field] !== apiPool[field]) {
            errors.push(`${String(field)}: ${JSON.stringify(chainPool[field])} (blockchain) != ${JSON.stringify(apiPool[field])} (api)`);
        }
    }

    if (chainPool.gauge.address !== apiPool.gauge.address) {
        errors.push(`gauge.address: ${chainPool.gauge.address} (blockchain) != ${apiPool.gauge.address} (api)`);
    }

    for (const field of STRICT_ARRAY_FIELDS) {
        const apiValue = JSON.stringify(apiPool[field]);
        const chainValue = JSON.stringify(chainPool[field]);
        if (apiValue !== chainValue) {
            errors.push(`${String(field)}: ${chainValue} (blockchain) != ${apiValue} (api)`);
        }
    }

    for (const field of [...SOFT_SCALAR_FIELDS, ...SOFT_ARRAY_FIELDS]) {
        const apiValue = JSON.stringify(apiPool[field]);
        const chainValue = JSON.stringify(chainPool[field]);
        if (apiValue !== chainValue) {
            console.log(`      [soft] ${apiPool.id}: ${String(field)}: ${chainValue} (blockchain) != ${apiValue} (api)`);
        }
    }


    if (!apiPool.inApi) errors.push("inApi is expected to be true for API data");
    if (chainPool.inApi) errors.push("inApi is expected to be false for on-chain data");

    assert.isEmpty(errors, `\n${errors.join("\n")}`);
};

const timed = async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
    process.stdout.write(`    ${label}...`);
    const start = Date.now();
    try {
        const result = await fn();
        process.stdout.write(` done in ${((Date.now() - start) / 1000).toFixed(1)}s\n`);
        return result;
    } catch (err) {
        process.stdout.write(` FAILED after ${((Date.now() - start) / 1000).toFixed(1)}s\n`);
        throw err;
    }
};


const buildFactorySuite = async (networkName: string, factoryCase: IFactoryCase) => {
    const suiteTitle = `${networkName} / ${factoryCase.title}`;

    if (!(factoryCase.alias in curve.constants.ALIASES)) {
        console.log(`  ${suiteTitle}: no such factory on this network, skipping`);
        return;
    }
    console.log(`  ${suiteTitle}:`);

    try {
        await timed("fetching pools via API", () => factoryCase.fetchPools(true));
        const fromApi = toCorePools(removeBlacklisted(factoryCase.getData()));

        await timed(`fetching pools via blockchain (${Object.keys(fromApi).length} pools in API)`, () => factoryCase.fetchPools(false));
        const fromChain = toCorePools(factoryCase.getData());

        const apiIds = Object.keys(fromApi).sort();
        const chainIds = Object.keys(fromChain).sort();

        describe(suiteTitle, function () {
            it("pool id sets match", function () {
                const onlyApi = apiIds.filter((id) => !chainIds.includes(id));
                const onlyChain = chainIds.filter((id) => !apiIds.includes(id));
                assert.isEmpty(onlyApi, `pools only in API: [${onlyApi}]`);
                assert.isEmpty(onlyChain, `pools only on-chain: [${onlyChain}]`);
            });

            for (const poolId of apiIds.filter((id) => chainIds.includes(id))) {
                it(poolId, function () {
                    comparePool(fromApi[poolId], fromChain[poolId]);
                });
            }
        });
    } catch (err) {
        describe(suiteTitle, function () {
            it("fetch pools data", function () {
                throw err;
            });
        });
    }
};

const main = async () => {
    const networks: [string, string | undefined][] = [["ethereum", ETH_RPC], ["optimism", OPTIMISM_RPC]];

    for (const [networkName, rpcUrl] of networks) {
        if (!rpcUrl) {
            console.log(`\n${networkName}: RPC URL is not set, skipping (fill .env or pass env vars)`);
            continue;
        }

        console.log(`\n${networkName}: initializing...`);

        const batchMaxCount = process.env.RPC_BATCH_MAX_COUNT ? Number(process.env.RPC_BATCH_MAX_COUNT) : undefined;
        await curve.init("JsonRpc", { url: rpcUrl, batchMaxCount }, { gasPrice: 0 });

        for (const factoryCase of FACTORIES) {
            await buildFactorySuite(networkName, factoryCase);
        }
    }

    console.log("\nAll data fetched, running per-pool comparisons...\n");
    run();
};

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
