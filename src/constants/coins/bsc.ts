import { lowerCaseValues } from "../utils.js";
import { IDict } from "../../interfaces.js";


export const COINS_BSC: IDict<string> = lowerCaseValues({
    //crv: '0x8Ee73c484A26e0A5df2Ee2a4960B789967dd0415', // <--- TODO ADD

    // --- BSC ---
    bnb: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    wbnb: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
});

export const cTokensBsc = []; //.map((a) => a.toLowerCase());
export const yTokensBsc = []; //.map((a) => a.toLowerCase());
export const ycTokensBsc = []; //.map((a) => a.toLowerCase());
export const aTokensBsc = []; //.map((a) => a.toLowerCase());
