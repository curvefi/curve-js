import { Contract, ethers } from "ethers";
import { Contract as MulticallContract, Provider as MulticallProvider } from "ethcall";

export interface IDict<T> {
    [index: string]: T,
}

export type INetworkName = "ethereum" | "optimism" | "xdai" | "polygon" | "fantom" | "zksync" | "moonbeam" | "kava" | "base" | "arbitrum" | "celo" | "avalanche" | "aurora";
export type IChainId = 1 | 10 | 100 | 137 | 250 | 324 | 1284 | 2222 | 8453 | 42161 | 42220 | 43114 | 1313161554;
export type IFactoryPoolType = "factory" | "factory-crvusd" | "factory-eywa" | "factory-crypto" | "factory-tricrypto";
export type IPoolType = "main" | "crypto" | IFactoryPoolType;

export type REFERENCE_ASSET = 'USD' | 'EUR' | 'BTC' | 'ETH' | 'LINK' | 'CRYPTO' | 'OTHER';

export interface IPoolData {
    name: string,
    full_name: string,
    symbol: string,
    reference_asset: REFERENCE_ASSET,
    swap_address: string,
    token_address: string,
    gauge_address: string,
    deposit_address?: string,
    sCurveRewards_address?: string,
    reward_contract?: string,
    implementation_address?: string,  // Only for testing
    is_plain?: boolean,
    is_lending?: boolean,
    is_meta?: boolean,
    is_crypto?: boolean,
    is_fake?: boolean,
    is_factory?: boolean,
    is_llamma?: boolean,
    base_pool?: string,
    meta_coin_idx?: number,
    underlying_coins: string[],
    wrapped_coins: string[],
    underlying_coin_addresses: string[],
    wrapped_coin_addresses: string[],
    underlying_decimals: number[],
    wrapped_decimals: number[],
    use_lending?: boolean[],
    swap_abi: any,
    gauge_abi: any,
    deposit_abi?: any,
    sCurveRewards_abi?: any,
    in_api?: boolean,
    is_gauge_killed?: boolean,
}

export interface ICurve {
    provider: ethers.BrowserProvider | ethers.JsonRpcProvider,
    multicallProvider: MulticallProvider,
    signer: ethers.Signer | null,
    signerAddress: string,
    chainId: number,
    contracts: { [index: string]: { contract: Contract, multicallContract: MulticallContract } },
    feeData: { gasPrice?: number, maxFeePerGas?: number, maxPriorityFeePerGas?: number },
    constantOptions: { gasLimit: number },
    options: { gasPrice?: number | bigint, maxFeePerGas?: number | bigint, maxPriorityFeePerGas?: number | bigint },
    constants: {
        NATIVE_TOKEN: { symbol: string, wrappedSymbol: string, address: string, wrappedAddress: string },
        NETWORK_NAME: INetworkName,
        ALIASES: IDict<string>,
        POOLS_DATA: IDict<IPoolData>,
        FACTORY_POOLS_DATA: IDict<IPoolData>,
        CRVUSD_FACTORY_POOLS_DATA: IDict<IPoolData>,
        CRYPTO_FACTORY_POOLS_DATA: IDict<IPoolData>,
        TRICRYPTO_FACTORY_POOLS_DATA: IDict<IPoolData>,
        LLAMMAS_DATA: IDict<IPoolData>,
        COINS: IDict<string>,
        DECIMALS: IDict<number>,
        GAUGES: string[],
    };
    setContract: (address: string, abi: any) => void,
}

export interface ICoinFromPoolDataApi {
    address: string,
    symbol: string,
    decimals: string,
    usdPrice: number | string,
}

export interface IReward {
    gaugeAddress: string,
    tokenAddress: string,
    symbol: string,
    apy: number
}

export interface IRewardFromApi {
    gaugeAddress: string,
    tokenAddress: string,
    tokenPrice: number,
    name: string,
    symbol: string,
    decimals: number | string,
    apy: number
}

export interface IPoolDataFromApi {
    id: string,
    name: string,
    symbol: string,
    assetTypeName: string,
    address: string,
    lpTokenAddress?: string,
    gaugeAddress?: string,
    implementation: string,
    implementationAddress: string,
    coins: ICoinFromPoolDataApi[],
    gaugeRewards: IRewardFromApi[],
    usdTotal: number,
    totalSupply: number,
    amplificationCoefficient: string,
    gaugeCrvApy: [number | null, number | null],
}

export interface ISubgraphPoolData {
    address: string,
    volumeUSD: number,
    latestDailyApy: number,
    latestWeeklyApy: number,
}

export interface IExtendedPoolDataFromApi {
    poolData: IPoolDataFromApi[],
    tvl?: number,
    tvlAll: number,
}

export interface IRouteStep {
    poolId: string,
    poolAddress: string,
    inputCoinAddress: string,
    outputCoinAddress: string,
    i: number,
    j: number,
    swapType: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15,
    swapAddress: string,  // for swapType == 4
}

export type IRoute = IRouteStep[];

export interface IRouteTvl {
    route: IRoute,
    minTvl: number,
    totalTvl: number,
}

export interface IRouteOutputAndCost {
    route: IRoute,
    _output: bigint,
    outputUsd: number,
    txCostUsd: number,
}

export interface IProfit {
    day: string,
    week: string,
    month: string,
    year: string,
    token: string,
    symbol: string,
    price: number,
}
