export const BTC_COINS_POLYGON: { [index: string]: string } = {
    wbtc: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6",  // WBTC
    renbtc: "0xDBf31dF14B66535aF65AaC99C32e9eA844e14501",  // renBTC
    awbtc: "0x5c2ed810328349100A66B82b78a1791B101C9D61",  // aWBTC
}
// @ts-ignore
export const BTC_COINS_LOWER_CASE_POLYGON = Object.fromEntries(Object.entries(BTC_COINS_POLYGON).map((entry) => [entry[0], entry[1].toLowerCase()]));

export const ETH_COINS_POLYGON: { [index: string]: string } = {}
// @ts-ignore
export const ETH_COINS_LOWER_CASE_POLYGON = Object.fromEntries(Object.entries(ETH_COINS_POLYGON).map((entry) => [entry[0], entry[1].toLowerCase()]));

export const LINK_COINS_POLYGON: { [index: string]: string } = {}
// @ts-ignore
export const LINK_COINS_LOWER_CASE_POLYGON = Object.fromEntries(Object.entries(LINK_COINS_POLYGON).map((entry) => [entry[0], entry[1].toLowerCase()]));

export const EUR_COINS_POLYGON: { [index: string]: string } = {}
// @ts-ignore
export const EUR_COINS_LOWER_CASE_POLYGON = Object.fromEntries(Object.entries(EUR_COINS_POLYGON).map((entry) => [entry[0], entry[1].toLowerCase()]));

export const USD_COINS_POLYGON: { [index: string]: string } = {
    dai: "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",  // DAI
    usdc: "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",  // USDC
    usdt: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",  // USDT

    adai: "0x27F8D03b3a2196956ED754baDc28D73be8830A6e",  // aDAI
    ausdc: "0x1a13F4Ca1d028320A707D99520AbFefca3998b7F",  // aUSDC
    ausdt: "0x60D55F02A771d515e077c9C2403a1ef324885CeC",  // aUSDT
}

// @ts-ignore
export const USD_COINS_LOWER_CASE_POLYGON = Object.fromEntries(Object.entries(USD_COINS_POLYGON).map((entry) => [entry[0], entry[1].toLowerCase()]));

export const COINS_POLYGON: { [index: string]: string } = {
    ...BTC_COINS_POLYGON,
    ...ETH_COINS_POLYGON,
    ...LINK_COINS_POLYGON,
    ...EUR_COINS_POLYGON,
    ...USD_COINS_POLYGON,
}

export const DECIMALS_POLYGON: { [index: string]: number } = {
    "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063": 18,  // DAI
    "0x2791bca1f2de4661ed88a30c99a7a9449aa84174": 6,  // USDC
    "0xc2132d05d31c914a87c6611c10748aeb04b58e8f": 6,  // USDT

    "0x27F8D03b3a2196956ED754baDc28D73be8830A6e": 18,  // aDAI
    "0x1a13F4Ca1d028320A707D99520AbFefca3998b7F": 6,  // aUSDC
    "0x60D55F02A771d515e077c9C2403a1ef324885CeC": 6,  // aUSDT

    "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6": 8,  // WBTC
    "0xDBf31dF14B66535aF65AaC99C32e9eA844e14501": 8,  // renBTC
    "0x5c2ed810328349100A66B82b78a1791B101C9D61": 8,  // aWBTC
}

// @ts-ignore
export const DECIMALS_LOWER_CASE_POLYGON = Object.fromEntries(Object.entries(DECIMALS_POLYGON).map((entry) => [entry[0].toLowerCase(), entry[1]]));

export const cTokensPolygon = []
export const yTokensPolygon = []
export const ycTokensPolygon = []

export const aTokensPolygon = [
    "0x27F8D03b3a2196956ED754baDc28D73be8830A6e",  // aDAI
    "0x1a13F4Ca1d028320A707D99520AbFefca3998b7F",  // aUSDC
    "0x60D55F02A771d515e077c9C2403a1ef324885CeC",  // aUSDT
]
