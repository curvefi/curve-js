import { Contract, ethers } from "ethers";
import { Contract as MulticallContract, Provider as MulticallProvider } from "ethcall";

export interface IDict<T> {
    [index: string]: T,
}

export type INetworkName = "ethereum" | "bsc" | "optimism" | "xdai" | "polygon" | "x-layer" | "fantom" | "fraxtal" | "zksync" | "moonbeam" | "kava" | "base" | "arbitrum" | "celo" | "avalanche" | "aurora";
export type IChainId = 1 | 10 | 56 | 100 | 137 | 196 | 250 | 252 | 324 | 1284 | 2222 | 8453 | 42161 | 42220 | 43114 | 1313161554;
export type IFactoryPoolType = "factory" | "factory-crvusd" | "factory-eywa" | "factory-crypto" | "factory-twocrypto" | "factory-tricrypto" | "factory-stable-ng";
export type IPoolType = "main" | "crypto" | IFactoryPoolType;
export type ISwapType = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

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
    is_stable_ng?: boolean,
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
    gauge_status?: Record<string, boolean> | null,
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
        BASE_POOLS: IDict<number>,
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
    isMetaPool: boolean,
    basePoolAddress?: string,
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

export interface IPoolDataShort {
    id: string,
    address: string,
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
    swapAddress: string,
    inputCoinAddress: string,
    outputCoinAddress: string,
    swapParams: [number, number, ISwapType, number, number],  // i, j, swap_type, pool_type, n_coins
    poolAddress: string,
    basePool: string,
    baseToken: string,
    secondBasePool: string,
    secondBaseToken: string,
    tvl: number,
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

export interface IGaugesDataFromApi {
    gauge: string,
    swap: string,
    swap_token: string,
    shortName: string,
    gauge_controller: {
        gauge_relative_weight: string,
        get_gauge_weight: string,
    },
    poolUrls: {
        swap: string[],
    }
    is_killed?: boolean,
    hasNoCrv?: boolean,
    gaugeStatus?: Record<string, boolean> | null,
}

export interface IVotingGauge {
    poolUrl: string,
    network: string,
    gaugeAddress: string,
    poolAddress: string,
    lpTokenAddress: string,
    poolName: string,
    totalVeCrv: string,
    relativeWeight: string,  // %
    isKilled: boolean,
}

export interface IGaugeUserVote {
    userPower: string,  // %
    userVeCrv: string,
    userFutureVeCrv: string,
    expired: boolean,
    gaugeData: IVotingGauge,
}

export interface IDaoProposalListItem {
    voteId: number,
    voteType: "PARAMETER" | "OWNERSHIP",
    creator: string,
    startDate: number,
    snapshotBlock: number,
    ipfsMetadata: string,
    metadata: string,
    votesFor: string,
    votesAgainst: string,
    voteCount: number,
    supportRequired: string,
    minAcceptQuorum: string,
    totalSupply: string,
    executed: boolean,
}

export interface IDaoProposalUserListItem extends IDaoProposalListItem{
    userVote: "yes" | "no" | "even"
}

export interface IDaoProposalVote {
    tx: string,
    voteId: number,
    voter: string,
    supports: boolean,
    stake: number,
}

export interface IDaoProposal extends IDaoProposalListItem{
    tx: string,
    creatorVotingPower: number,
    script: string,
    votes: IDaoProposalVote[],
}

export interface IVolumeAndAPYsPoolData {
    address: string,
    volumeUSD: number,
    day: number,
    week: number,
}

export interface IVolumeAndAPYs {
    totalVolume: number,
    cryptoVolume: number,
    cryptoShare: number,
    poolsData: IVolumeAndAPYsPoolData[],
}

export interface IBasePoolShortItem {
    coins: string[],
    id: string,
    name: string,
    pool: string,
    token: string,
}