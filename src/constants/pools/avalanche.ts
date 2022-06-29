import { lowerCasePoolDataAddresses } from "../utils";
import { IPoolData } from "../../interfaces";
import aaveSwapABI from '../abis/aave/swap.json';
import paaveRewardsabi from '../abis/paave/rewards.json';
import renSwapABI from '../abis/ren-polygon/swap.json';
import atricrypto3Swap from '../abis/atricrypto3/swap.json';
import atricrypto3Zap from '../abis/atricrypto3/zap.json';
import gaugeRewardsOnlyABI from '../abis/gauge_rewards_only.json';


export const POOLS_DATA_AVALANCHE: { [index: string]: IPoolData } = lowerCasePoolDataAddresses({
    aave: {
        name: "aave",
        full_name: "aave",
        symbol: "aave",
        reference_asset: 'USD',
        swap_address: '0x7f90122BF0700F9E7e1F688fe926940E8839F353',
        token_address: '0x1337BedC9D22ecbe766dF105c9623922A27963EC',
        gauge_address: '0x5B5CFE992AdAC0C9D48E05854B2d91C73a003858',
        reward_contract: '0xB504b6EB06760019801a91B451d3f7BD9f027fC9',
        is_lending: true,
        underlying_coins: ['DAI.e', 'USDC.e', 'USDT.e'],
        wrapped_coins: ['avDAI', 'avUSDC', 'avUSDT'],
        underlying_coin_addresses: [
            '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70',
            '0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664',
            '0xc7198437980c041c805A1EDcbA50c1Ce5db95118',
        ],
        wrapped_coin_addresses: [
            '0x47AFa96Cdc9fAb46904A55a6ad4bf6660B53c38a',
            '0x46A51127C3ce23fb7AB1DE06226147F446e4a857',
            '0x532E6537FEA298397212F09A61e03311686f548e',
        ],
        underlying_decimals: [18, 6, 6],
        wrapped_decimals: [18, 6, 6],
        use_lending: [true, true, true],
        swap_abi: aaveSwapABI,
        gauge_abi: gaugeRewardsOnlyABI,
        sCurveRewards_abi: paaveRewardsabi,
    },
    ren: {
        name: "ren",
        full_name: "ren",
        symbol: "ren",
        reference_asset: 'BTC',
        swap_address: '0x16a7DA911A4DD1d83F3fF066fE28F3C792C50d90',
        token_address: '0xC2b1DF84112619D190193E48148000e3990Bf627',
        gauge_address: '0x0f9cb53Ebe405d49A0bbdBD291A65Ff571bC83e1',
        reward_contract: '0x75D05190f35567e79012c2F0a02330D3Ed8a1F74',
        is_lending: true,
        underlying_coins: ['WBTC.e', 'renBTC'],
        wrapped_coins: ['avWBTC', 'renBTC'],
        underlying_coin_addresses: [
            '0x50b7545627a5162F82A992c33b87aDc75187B218',
            '0xDBf31dF14B66535aF65AaC99C32e9eA844e14501',
        ],
        wrapped_coin_addresses: [
            '0x686bEF2417b6Dc32C50a3cBfbCC3bb60E1e9a15D',
            '0xDBf31dF14B66535aF65AaC99C32e9eA844e14501',
        ],
        underlying_decimals: [8, 8],
        wrapped_decimals: [8, 8],
        use_lending: [true, false],
        swap_abi: renSwapABI,
        gauge_abi: gaugeRewardsOnlyABI,
        sCurveRewards_abi: paaveRewardsabi,
    },
    atricrypto: {
        name: "atricrypto",
        full_name: "atricrypto",
        symbol: "atricrypto",
        reference_asset: 'CRYPTO',
        swap_address: '0xB755B949C126C04e0348DD881a5cF55d424742B2',
        token_address: '0x1daB6560494B04473A0BE3E7D83CF3Fdf3a51828',
        gauge_address: '0x445FE580eF8d70FF569aB36e80c647af338db351',
        deposit_address: '0x58e57cA18B7A47112b877E31929798Cd3D703b0f',
        reward_contract: '0xa05E565cA0a103FcD999c7A7b8de7Bd15D5f6505',
        is_meta: true,
        is_crypto: true,
        is_fake: true,
        base_pool: 'aave',
        underlying_coins: ['DAI.e', 'USDC.e', 'USDT.e', 'WBTC.e', 'WETH.e'],
        wrapped_coins: ['av3CRV', 'avWBTC', 'avWETH'],
        underlying_coin_addresses: [
            '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70', // DAI.e
            '0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664', // USDC.e
            '0xc7198437980c041c805A1EDcbA50c1Ce5db95118', // USDT.e
            '0x50b7545627a5162F82A992c33b87aDc75187B218', // WBTC.e
            '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB', // WETH.e
        ],
        wrapped_coin_addresses: [
            '0x1337BedC9D22ecbe766dF105c9623922A27963EC', // av3CRV
            '0x686bEF2417b6Dc32C50a3cBfbCC3bb60E1e9a15D', // avWBTC
            '0x53f7c5869a859F0AeC3D334ee8B4Cf01E3492f21', // avWETH
        ],
        underlying_decimals: [18, 6, 6, 8, 18],
        wrapped_decimals: [18, 8, 18],
        use_lending: [false, false, false, false, false],
        swap_abi: atricrypto3Swap,
        gauge_abi: gaugeRewardsOnlyABI,
        deposit_abi: atricrypto3Zap,
        sCurveRewards_abi: paaveRewardsabi,
    },
});
