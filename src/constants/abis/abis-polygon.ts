import aaveSwapABI from './json/aave/swap.json';
import paaveRewardsabi from './json/paave/rewards.json';
import renSwapABI from './json/ren-polygon/swap.json';
import {PoolDataInterface} from "../../interfaces";

export const POOLS_DATA_POLYGON: { [index: string]: PoolDataInterface } = {
    aave: {
        N_COINS: 3,
        is_aave: true,
        underlying_decimals: [18, 6, 6],
        decimals: [18, 6, 6],
        use_lending: [true, true, true],
        tethered: [false, false, true],
        is_plain: [false, false, false],
        swap_address: '0x445FE580eF8d70FF569aB36e80c647af338db351',
        token_address: '0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171',
        gauge_address: '0x19793B454D3AfC7b454F206Ffe95aDE26cA6912c',
        underlying_coins: ['DAI', 'USDC', 'USDT'],
        coins: ['aDAI', 'aUSDC', 'aUSDT'],
        underlying_coin_addresses: [
            '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063',
            '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
            '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
        ],
        coin_addresses: [
            '0x27F8D03b3a2196956ED754baDc28D73be8830A6e',
            '0x1a13F4Ca1d028320A707D99520AbFefca3998b7F',
            '0x60D55F02A771d515e077c9C2403a1ef324885CeC',
        ],
        swap_abi: aaveSwapABI,
        sCurveRewards_abi: paaveRewardsabi,
        sCurveRewards_address: '0xBdFF0C27dd073C119ebcb1299a68A6A92aE607F0',
        reward_token: "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
    },

    ren: {
        N_COINS: 2,
        is_aave: true,
        underlying_decimals: [8, 8],
        decimals: [8, 8],
        use_lending: [true, false],
        tethered: [false, false],
        is_plain: [false, true],
        swap_address: '0xC2d95EEF97Ec6C17551d45e77B590dc1F9117C67',
        token_address: '0xf8a57c1d3b9629b77b6726a042ca48990A84Fb49',
        gauge_address: '0xffbACcE0CC7C19d46132f1258FC16CF6871D153c',
        underlying_coins: ['WBTC', 'renBTC'],
        coins: ['aWBTC', 'renBTC'],
        underlying_coin_addresses: [
            '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6',
            '0xDBf31dF14B66535aF65AaC99C32e9eA844e14501',
        ],
        coin_addresses: [
            '0x5c2ed810328349100A66B82b78a1791B101C9D61',
            '0xDBf31dF14B66535aF65AaC99C32e9eA844e14501',
        ],
        swap_abi: renSwapABI,
    },
};