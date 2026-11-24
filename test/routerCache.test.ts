import { assert } from "chai";
import { memoizeMethod } from "../src/constants/utils.js";
import { clearRouterCache, setRouterBlacklist, setRouterCacheOptions } from "../src/router.js";
import { Curve } from "../src/curve.js";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const createCounter = () => {
    const counter = {
        calls: 0,
        impl: async function (this: object, x: number): Promise<number> {
            counter.calls++;
            return x * 2;
        },
    };
    return counter;
};

describe('memoizeMethod', () => {
    it('caches results within maxAge and refetches after it expires', async () => {
        const obj = {};
        const counter = createCounter();
        const get = () => memoizeMethod(obj, '_method', counter.impl, 50);

        assert.equal(await get().call(obj, 1), 2);
        assert.equal(await get().call(obj, 1), 2);
        assert.equal(counter.calls, 1);

        await sleep(80);
        assert.equal(await get().call(obj, 1), 2);
        assert.equal(counter.calls, 2);
    });

    it('does not cache when maxAge is 0', async () => {
        const obj = {};
        const counter = createCounter();
        const get = () => memoizeMethod(obj, '_method', counter.impl, 0);

        await get().call(obj, 1);
        await get().call(obj, 1);
        assert.equal(counter.calls, 2);
    });

    it('keeps the 5 minutes default when maxAge is omitted', async () => {
        const obj = {};
        const counter = createCounter();
        const get = () => memoizeMethod(obj, '_method', counter.impl);

        await get().call(obj, 1);
        await sleep(20);
        await get().call(obj, 1);
        assert.equal(counter.calls, 1);
    });
});

describe('Router cache control', () => {
    let curve: Curve;
    const memoize = (name: string, maxAge: number) => {
        const counter = createCounter();
        return { counter, get: () => memoizeMethod(curve, name, counter.impl, maxAge) };
    };

    beforeEach(() => {
        curve = new Curve();
    });

    it('uses 5 minutes for both caches by default', () => {
        assert.deepEqual(curve.routerCacheOptions, { routesMaxAge: 5 * 60 * 1000, outputMaxAge: 5 * 60 * 1000 });
    });

    it('clearCache drops route graph, best route and output memoizers', async () => {
        const memoized = ['_buildRouteGraph', '_getBestRoute', '_getOutputForRoute'].map((name) => memoize(name, 60_000));
        for (const { get } of memoized) await get().call(curve, 1);

        clearRouterCache.call(curve);

        for (const name of ['_buildRouteGraph', '_getBestRoute', '_getOutputForRoute']) assert.notProperty(curve, name);
        for (const { get, counter } of memoized) {
            await get().call(curve, 1);
            assert.equal(counter.calls, 2);
        }
    });

    it('setBlacklist still drops only the route memoizers', async () => {
        for (const name of ['_buildRouteGraph', '_getBestRoute', '_getOutputForRoute']) await memoize(name, 60_000).get().call(curve, 1);

        setRouterBlacklist.call(curve, ['0xABC']);

        assert.deepEqual(curve.routerBlacklist, ['0xabc']);
        assert.notProperty(curve, '_buildRouteGraph');
        assert.notProperty(curve, '_getBestRoute');
        assert.property(curve, '_getOutputForRoute');
    });

    it('setCacheOptions updates given values, keeps the others and clears the cache', async () => {
        await memoize('_getOutputForRoute', 60_000).get().call(curve, 1);

        setRouterCacheOptions.call(curve, { outputMaxAge: 0 });

        assert.deepEqual(curve.routerCacheOptions, { routesMaxAge: 5 * 60 * 1000, outputMaxAge: 0 });
        assert.notProperty(curve, '_getOutputForRoute');

        const { get, counter } = memoize('_getOutputForRoute', curve.routerCacheOptions.outputMaxAge);
        await get().call(curve, 1);
        await get().call(curve, 1);
        assert.equal(counter.calls, 2);
    });

    it('setCacheOptions rejects invalid values without changing options', () => {
        const before = { ...curve.routerCacheOptions };
        for (const options of [{ routesMaxAge: -1 }, { outputMaxAge: NaN }, { routesMaxAge: Infinity }, { outputMaxAge: '1000' }, { maxAge: 1000 }]) {
            assert.throws(() => setRouterCacheOptions.call(curve, options as any));
        }
        assert.deepEqual(curve.routerCacheOptions, before);
    });
});
