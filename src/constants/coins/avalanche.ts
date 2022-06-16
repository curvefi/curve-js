import { lowerCaseValues } from "../utils";

export const COINS_AVALANCHE: { [index: string]: string } = lowerCaseValues({
    'crv.e': '0x249848BeCA43aC405b8102Ec90Dd5F22CA513c06',

    // --- USD ---

    'dai.e': '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70',
    'usdc.e': '0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664',
    'usdt.e': '0xc7198437980c041c805A1EDcbA50c1Ce5db95118',
    'avdai': '0x47AFa96Cdc9fAb46904A55a6ad4bf6660B53c38a',
    'avusdc': '0x46A51127C3ce23fb7AB1DE06226147F446e4a857',
    'avusdt': '0x532E6537FEA298397212F09A61e03311686f548e',

    // --- BTC ---

    'wbtc.e': '0x50b7545627a5162F82A992c33b87aDc75187B218',
    'renbtc': '0xDBf31dF14B66535aF65AaC99C32e9eA844e14501',
    'avwbtc': '0x686bEF2417b6Dc32C50a3cBfbCC3bb60E1e9a15D',

    // --- ETH ---

    'weth.e': '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB',
    'avweth': '0x53f7c5869a859F0AeC3D334ee8B4Cf01E3492f21',
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
