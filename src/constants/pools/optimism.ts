import tripoolSwapABI from '../abis/3pool-optimism/swap.json';
import gaugeRewardsOnlyABI from '../abis/gauge_rewards_only.json';
import { lowerCasePoolDataAddresses } from "../utils";
import { IPoolData } from "../../interfaces";

export const POOLS_DATA_OPTIMISM: { [index: string]: IPoolData } = lowerCasePoolDataAddresses({
    '3pool': {
        name: "3pool",
        full_name: "3pool",
        symbol: "3pool",
        reference_asset: 'USD',
        is_plain: true,
        swap_address: '0x1337BedC9D22ecbe766dF105c9623922A27963EC',
        token_address: '0x1337BedC9D22ecbe766dF105c9623922A27963EC',
        gauge_address: '0x7f90122BF0700F9E7e1F688fe926940E8839F353', // Rewards-Only
        underlying_coins: ['DAI', 'USDC', 'USDT'],
        wrapped_coins: ['DAI', 'USDC', 'USDT'],
        underlying_coin_addresses: [
            '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1',
            '0x7f5c764cbc14f9669b88837ca1490cca17c31607',
            '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58',
        ],
        wrapped_coin_addresses: [
            '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1',
            '0x7f5c764cbc14f9669b88837ca1490cca17c31607',
            '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58',
        ],
        underlying_decimals: [18, 6, 6],
        wrapped_decimals: [18, 6, 6],
        swap_abi: tripoolSwapABI,
        gauge_abi: gaugeRewardsOnlyABI,
    },
});
