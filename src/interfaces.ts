import { Contract, ethers } from "ethers";
import { Contract as MulticallContract, Provider as MulticallProvider } from "@curvefi/ethcall";
import {BigNumberish, Numeric} from "ethers";

export interface IDict<T> {
    [index: string]: T,
}

export type INetworkName = string;
export type IChainId = number;
export type IFactoryPoolType = "factory" | "factory-crvusd" | "factory-crypto" | "factory-twocrypto" | "factory-tricrypto" | "factory-stable-ng";
export type IPoolType = "main" | "crypto" | IFactoryPoolType;
export type ISwapType = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type IGasStrategy = 'economy' | 'standard' | 'aggressive';

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
    is_ng?: boolean,
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

export interface INetworkConstants {
    NATIVE_TOKEN: { symbol: string, wrappedSymbol: string, address: string, wrappedAddress: string, wrapperAddress?: string },
    NETWORK_NAME: INetworkName,
    ALIASES: IDict<string>,
    POOLS_DATA: IDict<IPoolData>,
    STABLE_FACTORY_CONSTANTS: { implementationABIDict?: IDict<any>, basePoolIdZapDict?: IDict<{ address: string, ABI: any }>, stableNgBasePoolZap?: string }
    CRYPTO_FACTORY_CONSTANTS: { lpTokenBasePoolIdDict?: IDict<string>, basePoolIdZapDict?: IDict<{ address: string, ABI: any }>, tricryptoDeployImplementations?: IDict<string | number> }
    FACTORY_POOLS_DATA: IDict<IPoolData>,
    STABLE_NG_FACTORY_POOLS_DATA: IDict<IPoolData>,
    CRVUSD_FACTORY_POOLS_DATA: IDict<IPoolData>,
    CRYPTO_FACTORY_POOLS_DATA: IDict<IPoolData>,
    TWOCRYPTO_FACTORY_POOLS_DATA: IDict<IPoolData>,
    TRICRYPTO_FACTORY_POOLS_DATA: IDict<IPoolData>,
    BASE_POOLS: IDict<number>,
    LLAMMAS_DATA: IDict<IPoolData>,
    COINS: IDict<string>,
    DECIMALS: IDict<number>,
    GAUGES: string[],
    FACTORY_GAUGE_IMPLEMENTATIONS: any,
    ZERO_ADDRESS: string,
    API_CONSTANTS?: {
        nativeTokenName: string
        wrappedNativeTokenAddress: string
    }
}

export interface ICurve {
    provider: ethers.BrowserProvider | ethers.JsonRpcProvider,
    multicallProvider: MulticallProvider,
    signer: ethers.Signer | null,
    signerAddress: string,
    chainId: number,
    isLiteChain: boolean,
    contracts: { [index: string]: { contract: Contract, multicallContract: MulticallContract } },
    feeData: { gasPrice?: number, maxFeePerGas?: number, maxPriorityFeePerGas?: number },
    gasStrategy: IGasStrategy,
    constantOptions: { gasLimit?: number },
    options: { gasPrice?: number | bigint, maxFeePerGas?: number | bigint, maxPriorityFeePerGas?: number | bigint },
    constants: INetworkConstants,
    setContract: (address: string | undefined, abi: any) => void,
    setGasStrategy(strategy: IGasStrategy): void,
    formatUnits(value: BigNumberish, unit?: string | Numeric): string
}

export interface ICoinFromPoolDataApi {
    address: string,
    symbol: string,
    decimals: string,
    usdPrice: number | string,
    name?: string,
    poolBalance?: string,
    isBasePoolLpToken?: boolean,
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

export type TPricesPoolType = "main" | "crypto" | "factory" | "factory_crypto" | "crvusd" | "factory_tricrypto" | "stableswapng" | "twocryptong";

export interface IPricesPoolCoin {
    symbol: string,
    name?: string | null,
    address: string,
    decimals: number | null,
}

export interface IPricesPool {
    name: string,
    address: string,
    pool_type: TPricesPoolType | null,
    lp_token_address?: string | null,
    lp_token_symbol?: string | null,
    lp_token_supply?: number | null,
    daily_volume?: number | null,
    base_daily_apr?: number | null,
    base_weekly_apr?: number | null,
    balances: number[],
    balances_usd: number[],
    coins: IPricesPoolCoin[],
    tvl_usd: number,
    base_pool?: string | null,
    is_metapool?: boolean | null,
    implementation_address?: string | null,
    creation_ts?: number | null,
    creation_block_number?: number | null,
    amplification_coefficient?: number | null,
    virtual_price?: number | string | null,
    price_oracle?: number | number[] | null,
    pool_methods?: string[] | null,
}

export interface IPricesPoolsResponse {
    total?: {
        total_tvl?: number,
        trading_volume_24h?: number,
    },
    data: IPricesPool[],
}

export interface IPricesGaugeReward {
    apr?: number | null,
    name: string,
    price?: number | null,
    symbol: string,
    address: string,
    decimals?: number | null,
}

export interface IPricesGaugePool {
    address: string,
    name?: string | null,
    chain: string,
}

export interface IPricesGauge {
    address: string,
    effective_address?: string | null,
    gauge_type?: string | null,
    name?: string | null,
    lp_token?: string | null,
    pool?: IPricesGaugePool | null,
    market?: IPricesGaugePool | null,
    rootAddress?: string | null,
    rootGauge?: string | null,
    gauge_relative_weight?: number | null,
    gauge_weight?: string | number | null,
    emissions?: number | null,
    working_supply?: number | null,
    lp_token_price?: number | null,
    is_factory?: boolean | null,
    poolUrls?: {
        swap?: string[] | null,
    } | null,
    is_killed?: boolean | null,
    hasNoCrv?: boolean | null,
    gaugeStatus?: Record<string, boolean> | null,
    crv_apr_base?: number | null,
    crv_apr_boosted?: number | null,
    extra_rewards?: IPricesGaugeReward[] | null,
}

export interface IPricesGaugesOverviewResponse {
    gauges: IPricesGauge[],
}

export interface IPricesGaugeData {
    gaugeAddress?: string,
    gaugeRewards: IRewardFromApi[],
    gaugeCrvApy: [number | null, number | null],
}

export interface IPricesDaoProposalListItem {
    vote_id: number,
    vote_type: "parameter" | "ownership",
    creator: string,
    start_date: number,
    snapshot_block: number,
    ipfs_metadata: string | null,
    metadata: string | null,
    votes_for: string,
    votes_against: string,
    vote_count: number,
    support_required: string,
    min_accept_quorum: string,
    total_supply: string,
    executed: boolean,
    execution_tx?: string | null,
    execution_date?: string | null,
    transaction_hash?: string,
    dt?: string,
}

export interface IPricesDaoProposalVote {
    voter: string,
    supports: boolean,
    voting_power: string,
    transaction_hash: string,
}

export interface IPricesDaoProposalDetail extends IPricesDaoProposalListItem {
    creator_voting_power: string,
    script: string | null,
    votes: IPricesDaoProposalVote[],
}

export interface IPricesDaoProposalListResponse {
    count: number,
    page: number,
    proposals: IPricesDaoProposalListItem[],
}

export interface IPoolDataFromApi {
    id: string,
    name: string,
    symbol: string,
    assetTypeName: string,
    assetType?: string,
    address: string,
    coinsAddresses?: string[],
    decimals?: string[],
    virtualPrice?: string | number | null,
    isMetaPool: boolean,
    basePoolAddress?: string,
    lpTokenAddress?: string,
    gaugeAddress?: string,
    implementation: string,
    implementationAddress?: string,
    priceOracle?: string | number | null,
    priceOracles?: Array<string | number> | null,
    zapAddress?: string,
    coins: ICoinFromPoolDataApi[],
    poolUrls?: {
        swap: string[],
        deposit?: string[],
        withdraw?: string[],
    },
    gaugeRewards: IRewardFromApi[],
    gaugeExtraRewards?: IRewardFromApi[],
    usdTotal: number,
    usdTotalExcludingBasePool?: number,
    totalSupply: number,
    amplificationCoefficient: string,
    gaugeCrvApy?: [number | null, number | null],
    gaugeFutureCrvApy?: [number | null, number | null],
    usesRateOracle?: boolean,
    isBroken?: boolean,
    hasMethods?: {
        exchange_received?: boolean,
        exchange_extended?: boolean,
    },
    creationTs?: number,
    creationBlockNumber?: number,
}

export interface IPoolDataShort {
    id: string,
    address: string,
}

export type IRoutePoolData = Pick<IPoolData, 'is_lending' | 'wrapped_coin_addresses' | 'underlying_coin_addresses' | 'token_address'>;

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
    blockchainId: string;
    isPool?: boolean,
    name?: string,
    gauge: string,
    rootGauge?: string,
    poolAddress?: string,
    virtualPrice?: number | string | null,
    factory?: boolean,
    type?: string | null,
    swap: string,
    swap_token: string,
    lpTokenPrice?: number | null,
    shortName: string,
    gauge_data?: {
        inflation_rate?: string,
        working_supply?: string,
    },
    gauge_controller: {
        gauge_relative_weight: string,
        gauge_future_relative_weight?: string,
        get_gauge_weight: string,
        inflation_rate?: string,
    },
    gaugeCrvApy?: [number | null, number | null],
    gaugeFutureCrvApy?: [number | null, number | null],
    side_chain?: boolean,
    poolUrls?: {
        swap: string[],
        deposit?: string[],
        withdraw?: string[],
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

export interface ICurveLiteNetwork {
    id: string
    chainId: number
    name: string
    rpcUrl: string
    explorerUrl: string
    nativeCurrencySymbol: string
    isTestnet: boolean
}

export type TVoteType = "PARAMETER" | "OWNERSHIP"

export type AbiParameter = { type: string, name?:string, components?: readonly AbiParameter[] }
type CtorMutability = 'payable' | 'nonpayable';
export type AbiStateMutability = 'pure' | 'view' | CtorMutability
export type AbiFunction = {
    type: 'function'
    constant?: boolean
    gas?: number
    inputs: readonly AbiParameter[]
    name: string
    outputs: readonly AbiParameter[]
    payable?: boolean | undefined
    stateMutability: AbiStateMutability
}
export type AbiConstructor = { type: 'constructor', inputs: readonly AbiParameter[], payable?: boolean, stateMutability: CtorMutability }
export type AbiFallback = { type: 'fallback', payable?: boolean, stateMutability: CtorMutability }
export type AbiReceive = {type: 'receive', stateMutability: Extract<AbiStateMutability, 'payable'>}
export type AbiEvent = {type: 'event', anonymous?: boolean, inputs: readonly AbiParameter[], name: string}
export type AbiError = {type: 'error', inputs: readonly AbiParameter[], name: string}
export type Abi = (AbiConstructor | AbiError | AbiEvent | AbiFallback | AbiFunction | AbiReceive)[]

export interface IMethodInfo {
    address: string;
    method: string;
    abi: any;
}
