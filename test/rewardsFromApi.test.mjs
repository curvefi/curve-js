import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { _getAllPoolsFromApi, _setPoolsFromApi } from "../lib/cached.js";
import { _getRewardsFromApi } from "../lib/utils.js";

const gaugeAddress = "0x00000000000000000000000000000000000000AB";
const crvAddress = "0x0000000000000000000000000000000000000001";
const reward = {
    gaugeAddress,
    tokenAddress: "0x0000000000000000000000000000000000000002",
    tokenPrice: 1,
    name: "Reward",
    symbol: "RWD",
    decimals: 18,
    apy: 2,
};
const crvReward = { ...reward, tokenAddress: crvAddress.toUpperCase(), symbol: "CRV" };
const context = {
    chainId: 43114,
    isLiteChain: false,
    constants: { NETWORK_NAME: "avalanche", COINS: { crv: crvAddress } },
};
const makePool = (overrides = {}) => ({
    id: "reward-pool",
    name: "Reward pool",
    symbol: "LP",
    assetTypeName: null,
    address: "0x0000000000000000000000000000000000000003",
    isMetaPool: false,
    gaugeAddress,
    implementation: null,
    implementationAddress: null,
    coins: [],
    gaugeRewards: [],
    gaugeExtraRewards: [],
    usdTotal: 0,
    totalSupply: 0,
    amplificationCoefficient: "0",
    gaugeCrvApy: [null, null],
    ...overrides,
});

const getRewards = async (overrides, chainId = context.chainId) => {
    _setPoolsFromApi(context.constants.NETWORK_NAME, context.isLiteChain, {
        "factory-stable-ng": { poolData: [makePool(overrides)], tvl: 0 },
    });
    return await _getRewardsFromApi.call({ ...context, chainId });
};

describe("_getRewardsFromApi", () => {
    // Cache entries expire after five minutes; keep their timers inside each test.
    beforeEach(() => mock.timers.enable({ apis: ["setTimeout"] }));
    afterEach(() => {
        mock.restoreAll();
        mock.timers.reset();
    });

    it("returns API2 extra rewards through the Lite adapter and API cache", async () => {
        const network = "api2-rewards-test";
        const liteContext = {
            ...context,
            isLiteChain: true,
            constants: { ...context.constants, NETWORK_NAME: network },
        };
        mock.method(globalThis, "fetch", async (url) => {
            if (url === "https://api2.curve.finance/get_platforms") {
                return Response.json({ data: { platforms_metadata: { [network]: { chain_id: 43114 } } } });
            }
            assert.equal(url, "https://api2.curve.finance/get_pools/43114");
            return Response.json({ data: {
                pool_data: [{
                    address: makePool().address,
                    name: "Reward pool",
                    symbol: "LP",
                    registry_id: "factory_stable_ng",
                    coins: [],
                    gauge_address: gaugeAddress,
                    gauge_extra_rewards: [{
                        gauge_address: gaugeAddress,
                        token_address: reward.tokenAddress,
                        token_price: reward.tokenPrice,
                        name: reward.name,
                        symbol: reward.symbol,
                        decimals: reward.decimals,
                        apy: reward.apy,
                    }],
                }],
                tvl: 0,
            } });
        });

        const rewards = await _getRewardsFromApi.call(liteContext);
        const poolLists = await _getAllPoolsFromApi(network, true);
        const pool = poolLists.flatMap(({ poolData }) => poolData)[0];
        assert.deepEqual(pool.gaugeRewards, []);
        assert.deepEqual(pool.gaugeExtraRewards, [reward]);
        assert.deepEqual(rewards, { [gaugeAddress.toLowerCase()]: [reward] });
    });

    it("falls back to extra rewards when gaugeRewards is empty", async () => {
        assert.deepEqual(await getRewards({ gaugeExtraRewards: [reward] }), {
            [gaugeAddress.toLowerCase()]: [reward],
        });
    });

    it("keeps non-empty gaugeRewards ahead of extra rewards", async () => {
        const primaryReward = { ...reward, symbol: "PRIMARY" };
        assert.deepEqual(await getRewards({ gaugeRewards: [primaryReward], gaugeExtraRewards: [reward] }), {
            [gaugeAddress.toLowerCase()]: [primaryReward],
        });
    });

    it("supports missing gaugeRewards in legacy data", async () => {
        assert.deepEqual(await getRewards({ gaugeRewards: undefined, gaugeExtraRewards: [reward] }), {
            [gaugeAddress.toLowerCase()]: [reward],
        });
    });

    it("returns no rewards when both arrays are empty", async () => {
        assert.deepEqual(await getRewards({}), { [gaugeAddress.toLowerCase()]: [] });
    });

    it("returns no rewards when extra rewards are absent", async () => {
        assert.deepEqual(await getRewards({ gaugeExtraRewards: undefined }), {
            [gaugeAddress.toLowerCase()]: [],
        });
    });

    it("filters CRV from extra rewards on sidechains", async () => {
        assert.deepEqual(await getRewards({ gaugeExtraRewards: [crvReward, reward] }), {
            [gaugeAddress.toLowerCase()]: [reward],
        });
    });

    it("keeps CRV rewards on Ethereum", async () => {
        assert.deepEqual(await getRewards({ gaugeExtraRewards: [crvReward, reward] }, 1), {
            [gaugeAddress.toLowerCase()]: [crvReward, reward],
        });
    });

    it("does not fall back again after filtering primary rewards", async () => {
        assert.deepEqual(await getRewards({ gaugeRewards: [crvReward], gaugeExtraRewards: [reward] }), {
            [gaugeAddress.toLowerCase()]: [],
        });
    });

    it("ignores pools without a gauge", async () => {
        assert.deepEqual(await getRewards({ gaugeAddress: undefined, gaugeExtraRewards: [reward] }), {});
    });
});
