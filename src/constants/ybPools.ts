export const YB_POOLS = [
    "0xf1f435b05d255a5dbde37333c0f61da6f69c6127",
    "0xd9ff8396554a0d18b2cfbec53e1979b7ecce8373",
    "0x83f24023d15d835a213df24fd309c47dab5beb32",
].map((pool) => pool.toLowerCase());

export const isYBPool = (poolAddress: string): boolean => {
    return YB_POOLS.includes(poolAddress.toLowerCase());
};
