import { lowerCaseValues } from "../utils.js";
import { IDict } from "../../interfaces.js";


export const COINS_ZKSYNC: IDict<string> = lowerCaseValues({
    'crv': '0x0a7432cF27F1aE3825c313F3C81e7D3efD7639aB',  // <--- TODO CHANGE

    // --- USD ---
    'weth': '0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91',
});

export const cTokensZkSync = []; //.map((a) => a.toLowerCase());
export const yTokensZkSync = []; //.map((a) => a.toLowerCase());
export const ycTokensZkSync = []; //.map((a) => a.toLowerCase());
export const aTokensZkSync = []; //.map((a) => a.toLowerCase());
