import { IDict, IPoolData } from "../../interfaces";
import { lowerCasePoolDataAddresses } from "../utils.js";
import tripoolSwapABI from '../abis/3pool-optimism/swap.json' with { type: 'json' };
import gaugeChildABI from '../abis/gauge_child.json' with { type: 'json' };


export const POOLS_DATA_MOONBEAM: IDict<IPoolData> = lowerCasePoolDataAddresses({
    '3pool': {
        name: "3pool",
        full_name: "3pool",
        symbol: "3pool",
        reference_asset: 'USD',
        swap_address: '0xace58a26b8db90498ef0330fdc9c2655db0c45e2',
        token_address: '0xace58a26b8db90498ef0330fdc9c2655db0c45e2',
        gauge_address: '0x0000000000000000000000000000000000000000', // NO GAUGE
        is_plain: true,
        underlying_coins: ['DAI', 'USDC', 'USDT'],
        wrapped_coins: ['DAI', 'USDC', 'USDT'],
        underlying_coin_addresses: [
            '0xc234A67a4F840E61adE794be47de455361b52413',
            '0x8f552a71EFE5eeFc207Bf75485b356A0b3f01eC9',
            '0x8e70cD5B4Ff3f62659049e74b6649c6603A0E594',
        ],
        wrapped_coin_addresses: [
            '0xc234A67a4F840E61adE794be47de455361b52413',
            '0x8f552a71EFE5eeFc207Bf75485b356A0b3f01eC9',
            '0x8e70cD5B4Ff3f62659049e74b6649c6603A0E594',
        ],
        underlying_decimals: [18, 6, 6],
        wrapped_decimals: [18, 6, 6],
        swap_abi: tripoolSwapABI,
        gauge_abi: gaugeChildABI,
    },
});
