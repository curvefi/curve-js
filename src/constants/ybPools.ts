export const YB_POOLS = [
    "0xf1f435b05d255a5dbde37333c0f61da6f69c6127",
    "0xd9ff8396554a0d18b2cfbec53e1979b7ecce8373",
    "0x83f24023d15d835a213df24fd309c47dab5beb32",
].map((pool) => pool.toLowerCase());

export const YB_ASSETS = [
    "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // WBTC
    "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf", // cbBTC
    "0x18084fbA666a33d37592fA2633fD49a74DD93a88", // tBTC
].map((asset) => asset.toLowerCase());

export const isYBPool = (poolAddress: string): boolean => {
    return YB_POOLS.includes(poolAddress.toLowerCase());
};
