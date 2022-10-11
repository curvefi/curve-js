import { lowerCaseValues } from "../utils";

export const COINS_ARBITRUM: { [index: string]: string } = lowerCaseValues({
    'crv': '0x11cDb42B0EB46D95f990BeDD4695A6e3fA034978',

    // --- USD ---

    'usdc': '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
    'usdt': '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
    '2crv': '0x7f90122bf0700f9e7e1f688fe926940e8839f353',

    // --- EUR ---

    'eurs': '0xd22a58f79e9481d1a88e00c343885a588b34b68b',

    // --- BTC ---

    'wbtc': '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f',
    'renbtc': '0xDBf31dF14B66535aF65AaC99C32e9eA844e14501',

    // --- ETH ---

    "eth": "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    "weth": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
    "wsteth": "0x5979D7b546E38E414F7E9822514be443A4800529",

})

export const cTokensArbitrum = []; //.map((a) => a.toLowerCase());
export const yTokensArbitrum = []; //.map((a) => a.toLowerCase());
export const ycTokensArbitrum = []; //.map((a) => a.toLowerCase());
export const aTokensArbitrum = []; //.map((a) => a.toLowerCase());
