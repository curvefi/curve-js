import { lowerCaseValues } from "../utils";

export const COINS_CELO: { [index: string]: string } = lowerCaseValues({
    'crv': '0x0a7432cF27F1aE3825c313F3C81e7D3efD7639aB',  // <--- TODO CHANGE

    // --- USD ---
    'dai': '0x90Ca507a5D4458a4C6C6249d186b6dCb02a5BCCd',
    'usdc': '0xef4229c8c3250C675F21BCefa42f58EfbfF6002a',
    'usdt': '0x88eeC49252c8cbc039DCdB394c0c2BA2f1637EA0',
    '3crv': '0x998395fEd908d33CF27115A1D9Ab6555def6cd45',
});

export const cTokensCelo = []; //.map((a) => a.toLowerCase());
export const yTokensCelo = []; //.map((a) => a.toLowerCase());
export const ycTokensCelo = []; //.map((a) => a.toLowerCase());
export const aTokensCelo = []; //.map((a) => a.toLowerCase());
