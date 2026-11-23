export interface IStandaloneWrapper {
    address: string;
    decimals: number;
}

export const STANDALONE_WRAPPERS: { [chainId: number]: { [symbol: string]: IStandaloneWrapper } } = {
    1: {
        scrvusd:   { address: "0x0655977FEb2f289A4aB78af67BAB0d17aAb84367", decimals: 18 },
        sreusd:    { address: "0x557AB1e003951A73c12D16F0fEA8490E39C33C35", decimals: 18 },
        ousd:      { address: "0x2A8e1E676Ec238d8A992307B495b45B3fEAa5e86", decimals: 18 },
        wousd:     { address: "0xd2af830e8cbdfed6cc11bab697bb25496ed6fa62", decimals: 18 },
        syrupusdc: { address: "0x80ac24aA929eaF5013f6436cdA2a7ba190f5Cc0b", decimals: 6 },
        zchf:      { address: "0xB58E61C3098d85632Df34EecfB899A1Ed80921cB", decimals: 18 },
        svzchf:    { address: "0xE5F130253fF137f9917C0107659A4c5262abf6b0", decimals: 18 },
    },
};

export const standaloneWrapperAddresses = (chainId: number): { [symbol: string]: string } =>
    Object.fromEntries(Object.entries(STANDALONE_WRAPPERS[chainId] ?? {}).map(([symbol, { address }]) => [symbol, address]));
