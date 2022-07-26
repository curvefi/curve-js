import { lowerCaseValues } from "../utils";

export const COINS_XDAI: { [index: string]: string } = lowerCaseValues({
    'crv': '0x712b3d230f3c1c19db860d80619288b1f0bdd0bd',

    // --- USD ---

    'dai': '0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d',
    'usdc': '0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83',
    'usdt': '0x4ECaBa5870353805a9F068101A40E0f32ed605C6',
    'rai': '0xd7a28aa9c470e7e9d8c676bcd5dd2f40c5683afa',
    'x3crv': '0x1337BedC9D22ecbe766dF105c9623922A27963EC',
})

export const cTokensXDai = []; //.map((a) => a.toLowerCase());
export const yTokensXDai = []; //.map((a) => a.toLowerCase());
export const ycTokensXDai = []; //.map((a) => a.toLowerCase());
export const aTokensXDai = []; //.map((a) => a.toLowerCase());
