import { IDict, IPoolData } from "../../interfaces";
import { lowerCasePoolDataAddresses } from "../utils.js";
import aaveSwapABI from '../abis/aave/swap.json' assert { type: 'json' };
import renSwapABI from '../abis/ren-polygon/swap.json' assert { type: 'json' };
import atricrypto3Swap from '../abis/atricrypto3/swap.json' assert { type: 'json' };
import atricrypto3Zap from '../abis/atricrypto3/zap.json' assert { type: 'json' };
import AVAXCryptoSwapABI from "../abis/avaxcrypto/swap.json" assert { type: 'json' };
import AVAXCryptoZapABI from "../abis/avaxcrypto/zap.json" assert { type: 'json' };
import gaugeChildABI from '../abis/gauge_child.json' assert { type: 'json' };


export const POOLS_DATA_AVALANCHE: IDict<IPoolData> = lowerCasePoolDataAddresses({
    aave: {
        name: "aave",
        full_name: "aave",
        symbol: "aave",
        reference_asset: 'USD',
        swap_address: '0x7f90122BF0700F9E7e1F688fe926940E8839F353',
        token_address: '0x1337BedC9D22ecbe766dF105c9623922A27963EC',
        gauge_address: '0x4620D46b4db7fB04a01A75fFed228Bc027C9A899',
        // gauge_address: '0x5B5CFE992AdAC0C9D48E05854B2d91C73a003858',
        // reward_contract: '0xB504b6EB06760019801a91B451d3f7BD9f027fC9',
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
        gauge_abi: gaugeChildABI,
    },
    ren: {
        name: "ren",
        full_name: "ren",
        symbol: "ren",
        reference_asset: 'BTC',
        swap_address: '0x16a7DA911A4DD1d83F3fF066fE28F3C792C50d90',
        token_address: '0xC2b1DF84112619D190193E48148000e3990Bf627',
        gauge_address: '0x00F7d467ef51E44f11f52a0c0Bef2E56C271b264',
        // gauge_address: '0x0f9cb53Ebe405d49A0bbdBD291A65Ff571bC83e1',
        // reward_contract: '0x75D05190f35567e79012c2F0a02330D3Ed8a1F74',
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
        gauge_abi: gaugeChildABI,
    },
    atricrypto: {
        name: "atricrypto",
        full_name: "atricrypto",
        symbol: "atricrypto",
        reference_asset: 'CRYPTO',
        swap_address: '0xB755B949C126C04e0348DD881a5cF55d424742B2',
        token_address: '0x1daB6560494B04473A0BE3E7D83CF3Fdf3a51828',
        gauge_address: '0x1879075f1c055564CB968905aC404A5A01a1699A',
        deposit_address: '0x58e57cA18B7A47112b877E31929798Cd3D703b0f',
        // gauge_address: '0x445FE580eF8d70FF569aB36e80c647af338db351',
        // reward_contract: '0xa05E565cA0a103FcD999c7A7b8de7Bd15D5f6505',
        is_meta: true,
        is_crypto: true,
        is_fake: true,
        base_pool: 'aave',
        meta_coin_idx: 0,
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
        gauge_abi: gaugeChildABI,
        deposit_abi: atricrypto3Zap,
    },
    aaveV3: {
        name: "aaveV3",
        full_name: "aaveV3",
        symbol: "aaveV3",
        reference_asset: 'USD',
        swap_address: '0xD2AcAe14ae2ee0f6557aC6C6D0e407a92C36214b',
        token_address: '0x5bE26703a658c332CE612eAe3A497059dA98394a',
        gauge_address: '0x55f9Ba282c39793DB29C68F8f113fC97D23a6445',
        is_lending: true,
        underlying_coins: ['DAI.e', 'USDC', 'USDt'],
        wrapped_coins: ['aAvaDAI', 'aAvaUSDC', 'aAvaUSDT'],
        underlying_coin_addresses: [
            '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70',
            '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
            '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7',
        ],
        wrapped_coin_addresses: [
            '0x82E64f49Ed5EC1bC6e43DAD4FC8Af9bb3A2312EE',
            '0x625E7708f30cA75bfd92586e17077590C60eb4cD',
            '0x6ab707Aca953eDAeFBc4fD23bA73294241490620',
        ],
        underlying_decimals: [18, 6, 6],
        wrapped_decimals: [18, 6, 6],
        use_lending: [true, true, true],
        swap_abi: aaveSwapABI,
        gauge_abi: gaugeChildABI,
        // sCurveRewards_abi: paaveRewardsabi,
        // sCurveRewards_address: '0xB504b6EB06760019801a91B451d3f7BD9f027fC9',
        // reward_token: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
    },
    avaxcrypto: {
        name: "avaxcrypto",
        full_name: "avaxcrypto",
        symbol: "avaxcrypto",
        reference_asset: 'CRYPTO',
        swap_address: '0x204f0620E7E7f07B780535711884835977679bba',
        token_address: '0x6a4aC4DE3bF6bCD2975E2cb15A46954D9bA43fDb',
        gauge_address: '0xf6C5Be565A25Be925c9D8fB0368a87bd20ee470b',
        // deposit_address: '0x25b3D0eeBcd85Ea5A970981c5E2A342f4e1064e8',
        deposit_address: '0x9f2Fa7709B30c75047980a0d70A106728f0Ef2db',
        is_meta: true,
        is_crypto: true,
        base_pool: 'factory-v2-99',
        meta_coin_idx: 0,
        underlying_coins: ['USDC', 'USDt', 'BTC.b', 'AVAX'],
        wrapped_coins: ['2CRV', 'BTC.b', 'WAVAX'],
        underlying_coin_addresses: [
            '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
            '0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7',
            '0x152b9d0FdC40C096757F570A51E494bd4b943E50',
            '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        ],
        wrapped_coin_addresses: [
            '0x0974D9d3bc463Fa17497aAFc3a87535553298FbE',
            '0x152b9d0FdC40C096757F570A51E494bd4b943E50',
            '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
        ],
        underlying_decimals: [6, 6, 8, 18],
        wrapped_decimals: [18, 8, 18],
        swap_abi: AVAXCryptoSwapABI,
        gauge_abi: gaugeChildABI,
        deposit_abi: AVAXCryptoZapABI,
    },
});
