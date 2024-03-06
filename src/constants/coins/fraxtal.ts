import { lowerCaseValues } from "../utils.js";
import { IDict } from "../../interfaces.js";


export const COINS_FRAXTAL: IDict<string> = lowerCaseValues({
    crv: '0x331B9182088e2A7d6D3Fe4742AbA1fB231aEcc56',

    // --- FRAXTAL ---
    frxETH: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
});

export const cTokensFraxtal = []; //.map((a) => a.toLowerCase());
export const yTokensFraxtal = []; //.map((a) => a.toLowerCase());
export const ycTokensFraxtal = []; //.map((a) => a.toLowerCase());
export const aTokensFraxtal = []; //.map((a) => a.toLowerCase());
