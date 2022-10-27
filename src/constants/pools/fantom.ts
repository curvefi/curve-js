import { lowerCasePoolDataAddresses } from "../utils";
import { IPoolData } from "../../interfaces";
import twopoolSwapABI from '../abis/2pool/swap.json';
import fusdtSwapABI from '../abis/fusdt/swap.json';
import fusdtZapABI from '../abis/fusdt/zap.json';
import renSwapABI from '../abis/ren-fantom/swap.json';
import triCryptoSwapNoZap from '../abis/tricrypto/swapNoZap.json';
import ibSwapABI from '../abis/ib/swap.json';
import aaveSwapABI from '../abis/aave/swap.json';
// import paaveRewardsabi from '../abis/paave/rewards.json';
import gaugeChildABI from '../abis/gauge_child.json';
import gaugeRewardsOnlyABI from '../abis/gauge_rewards_only.json';
import streamerABI from '../abis/streamer.json';


export const POOLS_DATA_FANTOM: { [index: string]: IPoolData } = lowerCasePoolDataAddresses({
    '2pool': {
        name: "2pool",
        full_name: "2pool",
        symbol: "2pool",
        reference_asset: "USD",
        swap_address: '0x27e611fd27b276acbd5ffd632e5eaebec9761e40',
        token_address: '0x27e611fd27b276acbd5ffd632e5eaebec9761e40',
        // old_gauge: '0x0a53FaDa2d943057C47A301D25a4D9b3B8e01e8E', // Unused
        // old_gauge: '0x8866414733F22295b7563f9C5299715D2D76CAf4',
        gauge_address: '0x15bB164F9827De760174d3d3dAD6816eF50dE13c',
        is_plain: true,
        underlying_coins: ['DAI', 'USDC'],
        wrapped_coins: ['DAI', 'USDC'],
        underlying_coin_addresses: [
            '0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e',
            '0x04068da6c83afcfa0e13ba15a6696662335d5b75',
        ],
        wrapped_coin_addresses: [
            '0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e',
            '0x04068da6c83afcfa0e13ba15a6696662335d5b75',
        ],
        underlying_decimals: [18, 6],
        wrapped_decimals: [18, 6],
        swap_abi: twopoolSwapABI,
        gauge_abi: gaugeChildABI,
    },
    fusdt: {
        name: "fusdt",
        full_name: "fusdt",
        symbol: "fusdt",
        reference_asset: "USD",
        swap_address: '0x92d5ebf3593a92888c25c0abef126583d4b5312e',
        token_address: '0x92d5ebf3593a92888c25c0abef126583d4b5312e',
        // old_gauge: '0x4f3E8F405CF5aFC05D68142F3783bDfE13811522', // Unused
        gauge_address: '0x06e3C4da96fd076b97b7ca3Ae23527314b6140dF', // Old non-cross-chain gauge
        deposit_address: '0xa42bd395f183726d1a8774cfa795771f8acfd777',
        sCurveRewards_address: '0xfe1a3dd8b169fb5bf0d5dbfe813d956f39ff6310',
        is_meta: true,
        base_pool: '2pool',
        underlying_coins: ['fUSDT', 'DAI', 'USDC'],
        wrapped_coins: ['fUSDT', 'DAI+USDC'],
        underlying_coin_addresses: [
            '0x049d68029688eabf473097a2fc38ef61633a3c7a',
            '0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e',
            '0x04068da6c83afcfa0e13ba15a6696662335d5b75',
        ],
        wrapped_coin_addresses: [
            '0x049d68029688eabf473097a2fc38ef61633a3c7a',
            '0x27e611fd27b276acbd5ffd632e5eaebec9761e40',
        ],
        underlying_decimals: [6, 18, 6],
        wrapped_decimals: [6, 18],
        swap_abi: fusdtSwapABI,
        gauge_abi: gaugeRewardsOnlyABI,
        deposit_abi: fusdtZapABI,
        sCurveRewards_abi: streamerABI,
    },
    ren: {
        name: "ren",
        full_name: "ren",
        symbol: "ren",
        reference_asset: "BTC",
        is_plain: true,
        swap_address: '0x3eF6A01A0f81D6046290f3e2A8c5b843e738E604',
        token_address: '0x5B5CFE992AdAC0C9D48E05854B2d91C73a003858',
        // old_gauge: '0x6600e98b71dabfD4A8Cac03b302B0189Adb86Afb',
        // gauge_address: '0xBdFF0C27dd073C119ebcb1299a68A6A92aE607F0',
        gauge_address: '0xbC38bD19227F91424eD4132F630f51C9A42Fa338',
        underlying_coins: ['BTC', 'renBTC'],
        wrapped_coins: ['BTC', 'renBTC'],
        underlying_coin_addresses: [
            '0x321162Cd933E2Be498Cd2267a90534A804051b11',
            '0xDBf31dF14B66535aF65AaC99C32e9eA844e14501',
        ],
        wrapped_coin_addresses: [
            '0x321162Cd933E2Be498Cd2267a90534A804051b11',
            '0xDBf31dF14B66535aF65AaC99C32e9eA844e14501',
        ],
        underlying_decimals: [8, 8],
        wrapped_decimals: [8, 8],
        swap_abi: renSwapABI,
        gauge_abi: gaugeChildABI,
    },
    tricrypto: {
        name: "tricrypto",
        full_name: "tricrypto",
        symbol: "tricrypto",
        reference_asset: "CRYPTO",
        swap_address: '0x3a1659Ddcf2339Be3aeA159cA010979FB49155FF',
        token_address: '0x58e57cA18B7A47112b877E31929798Cd3D703b0f',
        // gauge_address: '0x00702BbDEaD24C40647f235F15971dB0867F6bdB',
        gauge_address: '0x319E268f0A4C85D404734ee7958857F5891506d7',
        is_crypto: true,
        is_plain: true,
        underlying_coins: ['fUSDT', 'BTC', 'ETH'],
        wrapped_coins: ['fUSDT', 'BTC', 'ETH'],
        underlying_coin_addresses: [
            '0x049d68029688eAbF473097a2fC38ef61633A3C7A',
            '0x321162Cd933E2Be498Cd2267a90534A804051b11',
            '0x74b23882a30290451A17c44f4F05243b6b58C76d',
        ],
        wrapped_coin_addresses: [
            '0x049d68029688eAbF473097a2fC38ef61633A3C7A',
            '0x321162Cd933E2Be498Cd2267a90534A804051b11',
            '0x74b23882a30290451A17c44f4F05243b6b58C76d',
        ],
        underlying_decimals: [6, 8, 18],
        wrapped_decimals: [6, 8, 18],
        swap_abi: triCryptoSwapNoZap,
        gauge_abi: gaugeChildABI,
    },
    ib: {
        name: "ironbank",
        full_name: "ironbank",
        symbol: "ib",
        reference_asset: "USD",
        swap_address: '0x4FC8D635c3cB1d0aa123859e2B2587d0FF2707b1',
        token_address: '0xDf38ec60c0eC001142a33eAa039e49E9b84E64ED',
        gauge_address: '0xDee85272EAe1aB4afBc6433F4d819BaBC9c7045A', // Old non-cross-chain gauge
        sCurveRewards_address: '0x92bbf58c2a4514d44343b987d608627eb7d1d24f',
        is_lending: true,
        underlying_coins: ['DAI', 'USDC', 'fUSDT'],
        wrapped_coins: ['iDAI', 'iUSDC', 'iFUSDT'],
        underlying_coin_addresses: [
            '0x8D11eC38a3EB5E956B052f67Da8Bdc9bef8Abf3E',
            '0x04068DA6C83AFCFA0e13ba15A6696662335D5B75',
            '0x049d68029688eAbF473097a2fC38ef61633A3C7A',
        ],
        wrapped_coin_addresses: [
            '0x04c762a5dF2Fa02FE868F25359E0C259fB811CfE',
            '0x328A7b4d538A2b3942653a9983fdA3C12c571141',
            '0x70faC71debfD67394D1278D98A29dea79DC6E57A',
        ],
        underlying_decimals: [18, 6, 6],
        wrapped_decimals: [8, 8, 8],
        use_lending: [true, true, true],
        swap_abi: ibSwapABI,
        gauge_abi: gaugeRewardsOnlyABI,
        sCurveRewards_abi: streamerABI,
    },
    geist: {
        name: "geist",
        full_name: "geist",
        symbol: "geist",
        reference_asset: "USD",
        swap_address: '0x0fa949783947Bf6c1b171DB13AEACBB488845B3f',
        token_address: '0xD02a30d33153877BC20e5721ee53DeDEE0422B2F',
        // gauge_address: '0xd4F94D0aaa640BBb72b5EEc2D85F6D114D81a88E',
        gauge_address: '0xF7b9c402c4D6c2eDbA04a7a515b53D11B1E9b2cc',
        is_lending: true,
        underlying_coins: ['DAI', 'USDC', 'fUSDT'],
        wrapped_coins: ['gDAI', 'gUSDC', 'gfUSDT'],
        underlying_coin_addresses: [
            '0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e',
            '0x04068da6c83afcfa0e13ba15a6696662335d5b75',
            '0x049d68029688eabf473097a2fc38ef61633a3c7a',
        ],
        wrapped_coin_addresses: [
            '0x07e6332dd090d287d3489245038daf987955dcfb',
            '0xe578c856933d8e1082740bf7661e379aa2a30b26',
            '0x940f41f0ec9ba1a34cf001cc03347ac092f5f6b5',
        ],
        underlying_decimals: [18, 6, 6],
        wrapped_decimals: [18, 6, 6],
        use_lending: [true, true, true],
        swap_abi: aaveSwapABI,
        gauge_abi: gaugeChildABI,
        // sCurveRewards_abi: paaveRewardsabi,
        // sCurveRewards_address: '0xd4f94d0aaa640bbb72b5eec2d85f6d114d81a88e',
        // reward_token: "0xd8321aa83fb0a4ecd6348d4577431310a6e0814d",
    },
});