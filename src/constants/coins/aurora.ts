import { lowerCaseValues } from "../utils.js";

export const COINS_AURORA: { [index: string]: string } = lowerCaseValues({
    'crv': '0x64D5BaF5ac030e2b7c435aDD967f787ae94D0205',

    // --- USD ---
    'dai': '0xe3520349F477A5F6EB06107066048508498A291b',
    'usdc.e': '0xB12BFcA5A55806AaF64E99521918A4bf0fC40802',
    'usdt': '0x4988a896b1227218e4A686fdE5EabdcAbd91571f',
    '3crv': '0xbF7E49483881C76487b0989CD7d9A8239B20CA41',
})

export const cTokensAurora = []; //.map((a) => a.toLowerCase());
export const yTokensAurora = []; //.map((a) => a.toLowerCase());
export const ycTokensAurora = []; //.map((a) => a.toLowerCase());
export const aTokensAurora = []; //.map((a) => a.toLowerCase());
