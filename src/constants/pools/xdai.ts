import { IDict, IPoolData } from "../../interfaces";
import { lowerCasePoolDataAddresses } from "../utils.js";
import tripoolSwapABI from '../abis/3pool/swap.json' assert { type: 'json' };
import raiSwapABI from '../abis/rai/swap.json' assert { type: 'json' };
import raiZapABI from '../abis/rai/deposit.json' assert { type: 'json' };
import tricryptoSwapABI from '../abis/tricrypto-xdai/swap.json' assert { type: 'json' };
import tricryptoZapABI from '../abis/tricrypto-xdai/zap.json' assert { type: 'json' };
import eureSwapABI from "../abis/eureusd/swap.json" assert { type: 'json' };
import eureDepositABI from "../abis/eureusd/zap.json" assert { type: 'json' };
import gaugeRewardsOnlyABI from '../abis/gauge_rewards_only.json' assert { type: 'json' };
import gaugeChildABI from '../abis/gauge_child.json' assert { type: 'json' };
import streamerABI from '../abis/streamer.json' assert { type: 'json' };

export const POOLS_DATA_XDAI: IDict<IPoolData> = lowerCasePoolDataAddresses({
    '3pool': {
        name: "3pool",
        full_name: "3pool",
        symbol: "3pool",
        reference_asset: 'USD',
        swap_address: '0x7f90122BF0700F9E7e1F688fe926940E8839F353',
        token_address: '0x1337BedC9D22ecbe766dF105c9623922A27963EC',
        gauge_address: '0xabC000d88f23Bb45525E447528DBF656A9D55bf5',
        sCurveRewards_address: '0x6C09F6727113543Fd061a721da512B7eFCDD0267',
        is_plain: true,
        underlying_coins: ['WXDAI', 'USDC', 'USDT'],
        wrapped_coins: ['WXDAI', 'USDC', 'USDT'],
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
        gauge_abi: gaugeChildABI,
        sCurveRewards_abi: streamerABI,
    },
    rai: {
        name: "rai",
        full_name: "rai",
        symbol: "rai",
        reference_asset: 'USD',
        swap_address: '0x85bA9Dfb4a3E4541420Fc75Be02E2B42042D7e46',
        token_address: '0x36390a1Ae126f16C5D222CB1F2AB341dD09f2FEC',
        gauge_address: '0x0000000000000000000000000000000000000000', // NO GAUGE
        deposit_address: '0xdf6eb52c4A9d7d5964b918c50D47a643Fd7D3D4c',
        is_meta: true,
        base_pool: '3pool',
        underlying_coins: ['RAI', 'WXDAI', 'USDC', 'USDT'],
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
    tricrypto: {
        name: "tricrypto",
        full_name: "tricrypto",
        symbol: "tricrypto",
        reference_asset: 'CRYPTO',
        swap_address: '0x5633E00994896D0F472926050eCb32E38bef3e65',
        token_address: '0x02E7e2dd3BA409148A49D5cc9a9034D2f884F245',
        gauge_address: '0x0000000000000000000000000000000000000000', // NO GAUGE
        deposit_address: '0xF182926A64C0A19234E7E1FCDfE772aA7A1CA351',
        is_crypto: true,
        is_meta: true,
        base_pool: '3pool',
        meta_coin_idx: 0,
        underlying_coins: ['WXDAI', 'USDC', 'USDT', 'WBTC', 'WETH'],
        wrapped_coins: ['x3CRV', 'WBTC', 'WETH'],
        underlying_coin_addresses: [
            '0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d',
            '0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83',
            '0x4ECaBa5870353805a9F068101A40E0f32ed605C6',
            '0x8e5bBbb09Ed1ebdE8674Cda39A0c169401db4252',
            '0x6A023CCd1ff6F2045C3309768eAd9E68F978f6e1',
        ],
        wrapped_coin_addresses: [
            '0x1337BedC9D22ecbe766dF105c9623922A27963EC',
            '0x8e5bBbb09Ed1ebdE8674Cda39A0c169401db4252',
            '0x6A023CCd1ff6F2045C3309768eAd9E68F978f6e1',
        ],
        underlying_decimals: [18, 6, 6, 8, 18],
        wrapped_decimals: [18, 8, 18],
        swap_abi: tricryptoSwapABI,
        gauge_abi: gaugeRewardsOnlyABI, // No use
        deposit_abi: tricryptoZapABI,
    },
    eureusd: {
        name: "eureusd",
        full_name: "eureusd",
        symbol: "eureusd",
        reference_asset: 'CRYPTO',
        swap_address: '0x056C6C5e684CeC248635eD86033378Cc444459B0',
        token_address: '0x0CA1C1eC4EBf3CC67a9f545fF90a3795b318cA4a',
        gauge_address: '0xd91770E868c7471a9585d1819143063A40c54D00',
        deposit_address: '0xE3FFF29d4DC930EBb787FeCd49Ee5963DADf60b6',
        is_meta: true,
        is_crypto: true,
        base_pool: '3pool',
        underlying_coins: ['EURe', 'WXDAI', 'USDC', 'USDT'],
        wrapped_coins: ['EURe', 'x3CRV'],
        underlying_coin_addresses: [
            '0xcB444e90D8198415266c6a2724b7900fb12FC56E',
            '0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d',
            '0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83',
            '0x4ECaBa5870353805a9F068101A40E0f32ed605C6',
        ],
        wrapped_coin_addresses: [
            '0xcB444e90D8198415266c6a2724b7900fb12FC56E',
            '0x1337BedC9D22ecbe766dF105c9623922A27963EC',
        ],
        underlying_decimals: [18, 18, 6, 6],
        wrapped_decimals: [18, 18],
        swap_abi: eureSwapABI,
        gauge_abi: gaugeChildABI,
        deposit_abi: eureDepositABI,
    },
});
