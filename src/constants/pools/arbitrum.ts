import { lowerCasePoolDataAddresses } from "../utils";
import { IPoolData } from "../../interfaces";
import twopoolSwapABI from '../abis/2pool/swap.json';
import tricrypto2SwapABI from '../abis/tricrypto2/swap.json';
import tricrypto2DepositABI from '../abis/tricrypto2/deposit.json';
import eursusdSwapABI from '../abis/eursusd2/swap.json';
import eursusdZapABI from '../abis/eursusd2/zap.json';
import renSwapABI from '../abis/ren-arbitrum/swap.json';
import gaugeChildABI from '../abis/gauge_child.json';


export const POOLS_DATA_ARBITRUM: { [index: string]: IPoolData } = lowerCasePoolDataAddresses({
    '2pool': {
        name: "2pool",
        full_name: "2pool",
        symbol: "2pool",
        reference_asset: "USD",
        swap_address: '0x7f90122bf0700f9e7e1f688fe926940e8839f353',
        token_address: '0x7f90122bf0700f9e7e1f688fe926940e8839f353',
        // gauge_address: '0xbF7E49483881C76487b0989CD7d9A8239B20CA41',  // Rewards-Only
        gauge_address: '0xCE5F24B7A95e9cBa7df4B54E911B4A3Dc8CDAf6f',
        is_plain: true,
        underlying_coins: ['USDC', 'USDT'],
        wrapped_coins: ['USDC', 'USDT'],
        underlying_coin_addresses: [
            '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
            '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
        ],
        wrapped_coin_addresses: [
            '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
            '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
        ],
        underlying_decimals: [6, 6],
        wrapped_decimals: [6, 6],
        swap_abi: twopoolSwapABI,
        gauge_abi: gaugeChildABI,
    },

    tricrypto: {
        name: "tricrypto",
        full_name: "tricrypto",
        symbol: "tricrypto",
        reference_asset: 'CRYPTO',
        is_crypto: true,
        swap_address: '0x960ea3e3C7FB317332d990873d354E18d7645590',
        token_address: '0x8e0B8c8BB9db49a46697F3a5Bb8A308e744821D2',
        // gauge_address: '0x97E2768e8E73511cA874545DC5Ff8067eB19B787',  // Rewards-Only
        gauge_address: '0x555766f3da968ecBefa690Ffd49A2Ac02f47aa5f',
        deposit_address: '0xF97c707024ef0DD3E77a0824555a46B622bfB500',
        underlying_coins: ['USDT', 'WBTC', 'ETH'],
        wrapped_coins: ['USDT', 'WBTC', 'WETH'],
        underlying_coin_addresses: [
            '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
            '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f',
            '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        ],
        wrapped_coin_addresses: [
            '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
            '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f',
            '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
        ],
        underlying_decimals: [6, 8, 18],
        wrapped_decimals: [6, 8, 18],
        swap_abi: tricrypto2SwapABI,
        gauge_abi: gaugeChildABI,
        deposit_abi: tricrypto2DepositABI,
    },

    'ren': {
        name: "ren",
        full_name: "ren",
        symbol: "ren",
        reference_asset: 'BTC',
        is_plain: true,
        swap_address: '0x3E01dD8a5E1fb3481F0F589056b428Fc308AF0Fb',
        token_address: '0x3E01dD8a5E1fb3481F0F589056b428Fc308AF0Fb',
        // gauge_address: '0xC2b1DF84112619D190193E48148000e3990Bf627',  // Rewards-Only
        gauge_address: '0xDB3fd1bfC67b5D4325cb31C04E0Cae52f1787FD6',
        underlying_coins: ['WBTC', 'renBTC'],
        wrapped_coins: ['WBTC', 'renBTC'],
        underlying_coin_addresses: [
            '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
            '0xDBf31dF14B66535aF65AaC99C32e9eA844e14501',
        ],
        wrapped_coin_addresses: [
            '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
            '0xDBf31dF14B66535aF65AaC99C32e9eA844e14501',
        ],
        underlying_decimals: [8, 8],
        wrapped_decimals: [8, 8],
        swap_abi: renSwapABI,
        gauge_abi: gaugeChildABI,
    },

    eursusd: {
        name: "eursusd",
        full_name: "eursusd",
        symbol: "eursusd",
        reference_asset: 'CRYPTO',
        swap_address: '0xA827a652Ead76c6B0b3D19dba05452E06e25c27e',
        token_address: '0x3dFe1324A0ee9d86337d06aEB829dEb4528DB9CA',
        // gauge_address: '0x37C7ef6B0E23C9bd9B620A6daBbFEC13CE30D824',  // Rewards-Only
        gauge_address: '0x6339eF8Df0C2d3d3E7eE697E241666a916B81587',
        deposit_address: '0x25e2e8d104BC1A70492e2BE32dA7c1f8367F9d2c',
        is_meta: true,
        is_crypto: true,
        base_pool: '2pool',
        underlying_coins: ['EURS', 'USDC', 'USDT'],
        wrapped_coins: ['EURS', '2CRV'],
        underlying_coin_addresses: [
            '0xd22a58f79e9481d1a88e00c343885a588b34b68b',
            '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
            '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
        ],
        wrapped_coin_addresses: [
            '0xd22a58f79e9481d1a88e00c343885a588b34b68b',
            '0x7f90122bf0700f9e7e1f688fe926940e8839f353',
        ],
        underlying_decimals: [2, 6, 6],
        wrapped_decimals: [2, 18],
        swap_abi: eursusdSwapABI,
        gauge_abi: gaugeChildABI,
        deposit_abi: eursusdZapABI,
    },
});
