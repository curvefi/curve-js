import { ethers } from "ethers";
import { assert } from "chai";
import curve from "../src/";
import { getPool, PoolTemplate } from "../src/pools";
import { IReward } from "../src/interfaces";
import { ETH_RPC, OPTIMISM_RPC, XDAI_RPC, POLYGON_RPC, FANTOM_RPC, MOONBEAM_RPC, KAVA_RPC, ARBITRUM_RPC, CELO_RPC, AVALANCHE_RPC, AURORA_RPC } from "./rpcUrls.test";


const poolStatsTest = (name: string) => {
    describe(`${name} apy test`, function () {
        this.timeout(120000);
        let pool: PoolTemplate;

        before(async function () {
            pool = getPool(name);
        });


        it('Token (CRV) APY', async function () {
            if (pool.gauge === ethers.constants.AddressZero || pool.rewardsOnly()) return;

            const apy = await pool.stats.tokenApy(false);
            const apyFromApi = await pool.stats.tokenApy();

            const diff = [
                Math.abs(apyFromApi[0] - apy[0]) / Math.max(apyFromApi[0], apy[0]),
                Math.abs(apyFromApi[1] - apy[1]) / Math.max(apyFromApi[1], apy[1]),
            ];
            console.log(apy[0], apyFromApi[0]);
            console.log(apy[1], apyFromApi[1]);
            diff[0] = isNaN(diff[0]) ? 0 : diff[0];
            diff[1] = isNaN(diff[1]) ? 0 : diff[1];

            assert.isAtMost(diff[0], 0.007, `${pool.id} BASE CRV APY. Calculated: ${apy[0]}, API: ${apyFromApi[0]}`);
            assert.isAtMost(diff[1], 0.007, `${pool.id} BOOSTED CRV APY. Calculated: ${apy[1]}, API: ${apyFromApi[1]}`);
        });

        it('Rewards APY', async function () {
            if (pool.gauge === ethers.constants.AddressZero) return;

            const rewardsApy = (await pool.stats.rewardsApy(false)).filter((r) => r.apy > 0);
            const rewardsApyFromApi = (await pool.stats.rewardsApy()).filter((r) => r.apy > 0);

            assert.equal(rewardsApy.length, rewardsApyFromApi.length,
                `${pool.id} rewards doesn't match. Rewards: \n${rewardsApy}\n. Rewards from API: \n${rewardsApyFromApi}\n`);

            for (const reward of rewardsApy) {
                const rewardFromApiMatch = rewardsApyFromApi.find((r) => r.tokenAddress.toLowerCase() === reward.tokenAddress.toLowerCase()) as IReward;

                console.log(reward.apy, rewardFromApiMatch.apy);
                let diff = Math.abs(reward.apy - (rewardFromApiMatch as IReward).apy) / Math.max(reward.apy, (rewardFromApiMatch as IReward).apy);
                diff = isNaN(diff) ? 0 : diff;
                assert.isAtMost(diff, 0.03, `${pool.id} ${reward.symbol} reward. Calculated: ${reward.apy}, API: ${rewardFromApiMatch.apy}`);
            }
        });
    })
}

describe('Compare calculated APY with APY from API', async function () {
    this.timeout(120000);
    let POOLS: string[] = [];

    before(async function () {
        await curve.init('JsonRpc', { url: ETH_RPC }, { gasPrice: 0 });
        await curve.fetchFactoryPools();
        await curve.fetchCryptoFactoryPools();
        POOLS = [...curve.getPoolList(), ...curve.getFactoryPoolList(), ...curve.getCryptoFactoryPoolList()];
    });

    it('', async function () {
        for (const poolName of POOLS) {
            poolStatsTest(poolName);
        }
    });
})
