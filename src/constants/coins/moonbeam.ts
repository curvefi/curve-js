import { lowerCaseValues } from "../utils";

export const COINS_MOONBEAM: { [index: string]: string } = lowerCaseValues({
    'crv': '0x712b3d230f3c1c19db860d80619288b1f0bdd0bd',

    // --- USD ---

    'dai': '0xc234A67a4F840E61adE794be47de455361b52413',
    'usdc': '0x8f552a71EFE5eeFc207Bf75485b356A0b3f01eC9',
    'usdt': '0x8e70cD5B4Ff3f62659049e74b6649c6603A0E594',
    '3crv': '0xace58a26b8db90498ef0330fdc9c2655db0c45e2',
})

export const cTokensMoonbeam = []; //.map((a) => a.toLowerCase());
export const yTokensMoonbeam = []; //.map((a) => a.toLowerCase());
export const ycTokensMoonbeam = []; //.map((a) => a.toLowerCase());
export const aTokensMoonbeam = []; //.map((a) => a.toLowerCase());
