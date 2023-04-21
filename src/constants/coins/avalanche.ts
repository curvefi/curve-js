import { lowerCaseValues } from "../utils.js";

export const COINS_AVALANCHE: { [index: string]: string } = lowerCaseValues({
    'crv': '0x47536F17F4fF30e64A96a7555826b8f9e66ec468',
    'crv.e': '0x249848BeCA43aC405b8102Ec90Dd5F22CA513c06',

    // --- USD ---

    'dai.e': '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70',
    'usdc.e': '0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664',
    'usdt.e': '0xc7198437980c041c805A1EDcbA50c1Ce5db95118',
    'usdc': '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    'usdt': '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7',
    'avdai': '0x47AFa96Cdc9fAb46904A55a6ad4bf6660B53c38a',
    'avusdc': '0x46A51127C3ce23fb7AB1DE06226147F446e4a857',
    'avusdt': '0x532E6537FEA298397212F09A61e03311686f548e',
    'av3crv': '0x1337bedc9d22ecbe766df105c9623922a27963ec',
    '2crv': '0x0974D9d3bc463Fa17497aAFc3a87535553298FbE',

    // --- BTC ---

    'wbtc.e': '0x50b7545627a5162F82A992c33b87aDc75187B218',
    'renbtc': '0xDBf31dF14B66535aF65AaC99C32e9eA844e14501',
    'avwbtc': '0x686bEF2417b6Dc32C50a3cBfbCC3bb60E1e9a15D',
    'btc.b': '0x152b9d0FdC40C096757F570A51E494bd4b943E50',

    // --- ETH ---

    'weth.e': '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB',
    'avweth': '0x53f7c5869a859F0AeC3D334ee8B4Cf01E3492f21',

    // --- AVAX ---
    'avax': '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    'wavax': '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
})

export const cTokensAvalanche = []; //.map((a) => a.toLowerCase());
export const yTokensAvalanche = []; //.map((a) => a.toLowerCase());
export const ycTokensAvalanche = []; //.map((a) => a.toLowerCase());

export const aTokensAvalanche = [
    '0x47AFa96Cdc9fAb46904A55a6ad4bf6660B53c38a',  // avDAI
    '0x46A51127C3ce23fb7AB1DE06226147F446e4a857',  // avUSDC
    '0x532E6537FEA298397212F09A61e03311686f548e',  // avUSDT
    '0x686bEF2417b6Dc32C50a3cBfbCC3bb60E1e9a15D',  // avWBTC
    '0x53f7c5869a859F0AeC3D334ee8B4Cf01E3492f21',  // avWETH
].map((a) => a.toLowerCase());
