import tripoolSwapABI from '../abis/3pool/swap.json';
import raiSwapABI from '../abis/rai/swap.json';
import raiZapABI from '../abis/rai/deposit.json';
import gaugeRewardsOnlyABI from '../abis/gauge_rewards_only.json';
import { lowerCasePoolDataAddresses } from "../utils";
import { IPoolData } from "../../interfaces";

export const POOLS_DATA_XDAI: { [index: string]: IPoolData } = lowerCasePoolDataAddresses({
    '3pool': {
        name: "3pool",
        full_name: "3pool",
        symbol: "3pool",
        reference_asset: 'USD',
        swap_address: '0x7f90122BF0700F9E7e1F688fe926940E8839F353',
        token_address: '0x1337BedC9D22ecbe766dF105c9623922A27963EC',
        gauge_address: '0x78CF256256C8089d68Cde634Cf7cDEFb39286470', // Rewards-Only
        is_plain: true,
        underlying_coins: ['DAI', 'USDC', 'USDT'],
        wrapped_coins: ['DAI', 'USDC', 'USDT'],
        underlying_coin_addresses: [
            '0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d',
            '0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83',
            '0x4ECaBa5870353805a9F068101A40E0f32ed605C6',
        ],
        wrapped_coin_addresses: [
            '0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d',
            '0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83',
            '0x4ECaBa5870353805a9F068101A40E0f32ed605C6',
        ],
        underlying_decimals: [18, 6, 6],
        wrapped_decimals: [18, 6, 6],
        swap_abi: tripoolSwapABI,
        gauge_abi: gaugeRewardsOnlyABI,
    },
    rai: {
        name: "rai",
        full_name: "rai",
        symbol: "rai",
        reference_asset: 'USD',
        swap_address: '0x85bA9Dfb4a3E4541420Fc75Be02E2B42042D7e46',
        token_address: '0x36390a1Ae126f16C5D222CB1F2AB341dD09f2FEC',
        gauge_address: '0x0000000000000000000000000000000000000000', // NO GAUGE FOR THIS POOL BUT NECESSARY TO AVOID REVERTS
        deposit_address: '0xdf6eb52c4A9d7d5964b918c50D47a643Fd7D3D4c',
        is_meta: true,
        base_pool: '3pool',
        underlying_coins: ['RAI', 'DAI', 'USDC', 'USDT'],
        wrapped_coins: ['RAI', 'x3CRV'],
        underlying_coin_addresses: [
            '0xd7a28aa9c470e7e9d8c676bcd5dd2f40c5683afa',
            '0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d',
            '0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83',
            '0x4ECaBa5870353805a9F068101A40E0f32ed605C6',
        ],
        wrapped_coin_addresses: [
            '0xd7a28aa9c470e7e9d8c676bcd5dd2f40c5683afa',
            '0x1337BedC9D22ecbe766dF105c9623922A27963EC',
        ],
        underlying_decimals: [18, 18, 6, 6],
        wrapped_decimals: [18, 18],
        swap_abi: raiSwapABI,
        gauge_abi: gaugeRewardsOnlyABI,
        deposit_abi: raiZapABI,
    },
});
