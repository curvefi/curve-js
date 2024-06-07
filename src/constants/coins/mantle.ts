import { lowerCaseValues } from "../utils.js";
import { IDict } from "../../interfaces.js";


export const COINS_MANTLE: IDict<string> = lowerCaseValues({
    crv: '0xcfd1d50ce23c46d3cf6407487b2f8934e96dc8f9',
    mnt: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
});

export const cTokensMantle = []; //.map((a) => a.toLowerCase());
export const yTokensMantle = []; //.map((a) => a.toLowerCase());
export const ycTokensMantle = []; //.map((a) => a.toLowerCase());
export const aTokensMantle = []; //.map((a) => a.toLowerCase());