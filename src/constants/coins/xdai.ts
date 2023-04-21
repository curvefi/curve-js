import { lowerCaseValues } from "../utils.js";

export const COINS_XDAI: { [index: string]: string } = lowerCaseValues({
    'crv': '0x712b3d230f3c1c19db860d80619288b1f0bdd0bd',

    // --- USD ---

    'wxdai': '0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d',
    'usdc': '0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83',
    'usdt': '0x4ECaBa5870353805a9F068101A40E0f32ed605C6',
    'rai': '0xd7a28aa9c470e7e9d8c676bcd5dd2f40c5683afa',
    'x3crv': '0x1337BedC9D22ecbe766dF105c9623922A27963EC',

    // --- BTC ---

    'wbtc': '0x8e5bBbb09Ed1ebdE8674Cda39A0c169401db4252',

    // --- ETH ---

    'weth': '0x6A023CCd1ff6F2045C3309768eAd9E68F978f6e1',

    // --- EUR ---
    'eure': '0xcB444e90D8198415266c6a2724b7900fb12FC56E',
})

export const cTokensXDai = []; //.map((a) => a.toLowerCase());
export const yTokensXDai = []; //.map((a) => a.toLowerCase());
export const ycTokensXDai = []; //.map((a) => a.toLowerCase());
export const aTokensXDai = []; //.map((a) => a.toLowerCase());
