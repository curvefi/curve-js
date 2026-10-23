import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

let fetchPools;
mock.module('../lib/external-api.js', {
    namedExports: {
        uncached_getAllPoolsFromApi: (...args) => fetchPools(...args),
        createUsdPricesDict: () => ({}),
        createCrvApyDict: () => ({}),
    },
});
const { _getPoolsFromApi, _setPoolsFromApi } = await import('../lib/cached.js');

test('an older rejected request does not evict injected pool data', async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    let reject;
    fetchPools = () => new Promise((_, fail) => { reject = fail; });
    const pending = _getPoolsFromApi('cache-rejection-test', 'main');
    const expectedFailure = assert.rejects(pending, /fetch failed/);
    const pools = { main: { poolData: [], tvl: 123, tvlAll: 123 } };
    _setPoolsFromApi('cache-rejection-test', false, pools);
    reject(new Error('fetch failed'));
    await expectedFailure;
    fetchPools = () => { throw new Error('injected cache was evicted'); };
    assert.equal(await _getPoolsFromApi('cache-rejection-test', 'main'), pools.main);
});

test('an older successful request does not leave an extra eviction timer', async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    let resolve;
    fetchPools = () => new Promise((finish) => { resolve = finish; });
    const network = 'cache-resolution-test';
    const pending = _getPoolsFromApi(network, 'main');
    const pools = { main: { poolData: [], tvl: 123, tvlAll: 123 } };
    _setPoolsFromApi(network, false, pools);
    t.mock.timers.tick(1000);
    resolve({ main: { poolData: [], tvl: 1, tvlAll: 1 } });
    await pending;
    // Replace the injected data before its TTL expires. No earlier request's
    // timer should remove this replacement.
    t.mock.timers.tick(1000);
    _setPoolsFromApi(network, false, pools);
    t.mock.timers.tick(298000);
    fetchPools = () => { throw new Error('newer cache was evicted by an older timer'); };
    assert.equal(await _getPoolsFromApi(network, 'main'), pools.main);
});
