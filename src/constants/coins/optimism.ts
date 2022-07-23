import { lowerCaseValues } from "../utils";

export const COINS_OPTIMISM: { [index: string]: string } = lowerCaseValues({
    'crv': '0x0994206dfE8De6Ec6920FF4D779B0d950605Fb53',

    // --- USD ---

    'dai': '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1',
    'usdc': '0x7f5c764cbc14f9669b88837ca1490cca17c31607',
    'usdt': '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58',
    '3crv': '0x1337BedC9D22ecbe766dF105c9623922A27963EC',

    // --- ETH ---

    "eth": "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    "weth": "0x4200000000000000000000000000000000000006",
})

export const cTokensOptimism = []; //.map((a) => a.toLowerCase());
export const yTokensOptimism = []; //.map((a) => a.toLowerCase());
export const ycTokensOptimism = []; //.map((a) => a.toLowerCase());
export const aTokensOptimism = []; //.map((a) => a.toLowerCase());
