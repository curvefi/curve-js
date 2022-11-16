import { lowerCaseValues } from "../utils";

export const COINS_FANTOM: { [index: string]: string } = lowerCaseValues({
    'crv': '0x1E4F97b9f9F913c46F1632781732927B9019C68b',

    // --- USD ---

    'dai': '0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e',
    'usdc': '0x04068da6c83afcfa0e13ba15a6696662335d5b75',
    'fusdt': '0x049d68029688eabf473097a2fc38ef61633a3c7a',

    'idai': '0x04c762a5dF2Fa02FE868F25359E0C259fB811CfE',
    'iusdc': '0x328A7b4d538A2b3942653a9983fdA3C12c571141',
    'ifusdt': '0x70faC71debfD67394D1278D98A29dea79DC6E57A',

    'gdai': '0x07e6332dd090d287d3489245038daf987955dcfb',
    'gusdc': '0xe578c856933d8e1082740bf7661e379aa2a30b26',
    'gfusdt': '0x940f41f0ec9ba1a34cf001cc03347ac092f5f6b5',

    'dai+usdc': '0x27e611fd27b276acbd5ffd632e5eaebec9761e40', // LP token
    'frax': '0xdc301622e621166bd8e82f2ca0a26c13ad0be355',

    // --- BTC ---

    'wbtc': '0x321162Cd933E2Be498Cd2267a90534A804051b11',
    'renbtc': '0xDBf31dF14B66535aF65AaC99C32e9eA844e14501',

    // --- ETH ---

    'eth': '0x74b23882a30290451A17c44f4F05243b6b58C76d',
})

export const cTokensFantom = [
    '0x04c762a5dF2Fa02FE868F25359E0C259fB811CfE', // iDAI
    '0x328A7b4d538A2b3942653a9983fdA3C12c571141', // iUSDC
    '0x70faC71debfD67394D1278D98A29dea79DC6E57A', // iFUSDT
].map((a) => a.toLowerCase());

export const yTokensFantom = []; //.map((a) => a.toLowerCase());
export const ycTokensFantom = []; //.map((a) => a.toLowerCase());

export const aTokensFantom = [
    '0x07e6332dd090d287d3489245038daf987955dcfb', // gDAI
    '0xe578c856933d8e1082740bf7661e379aa2a30b26', // gUSDC
    '0x940f41f0ec9ba1a34cf001cc03347ac092f5f6b5', // gfUSDT
].map((a) => a.toLowerCase());
