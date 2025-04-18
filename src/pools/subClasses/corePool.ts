import {curve} from "../../curve.js";
import {GaugePool, IGaugePool} from "./gaugePool.js";

export interface ICorePool {
    id: string;
    name: string;
    fullName: string;
    symbol: string;
    referenceAsset: string;
    address: string;
    lpToken: string;
    gauge: IGaugePool;
    zap: string | null;
    sRewardContract: string | null;
    rewardContract: string | null;
    implementation: string | null;
    isPlain: boolean;
    isLending: boolean;
    isMeta: boolean;
    isCrypto: boolean;
    isFake: boolean;
    isFactory: boolean;
    isMetaFactory: boolean;
    isNg: boolean;
    isLlamma: boolean;
    basePool: string;
    metaCoinIdx: number;
    underlyingCoins: string[];
    wrappedCoins: string[];
    underlyingCoinAddresses: string[];
    wrappedCoinAddresses: string[];
    underlyingDecimals: number[];
    wrappedDecimals: number[];
    useLending: boolean[];
    inApi: boolean;
}

export class CorePool implements ICorePool {
    id: string;
    name: string;
    fullName: string;
    symbol: string;
    referenceAsset: string;
    address: string;
    lpToken: string;
    gauge: IGaugePool;
    zap: string | null;
    sRewardContract: string | null;
    rewardContract: string | null;
    implementation: string | null;
    isPlain: boolean;
    isLending: boolean;
    isMeta: boolean;
    isCrypto: boolean;
    isFake: boolean;
    isFactory: boolean;
    isMetaFactory: boolean;
    isNg: boolean;
    isLlamma: boolean;
    basePool: string;
    metaCoinIdx: number;
    underlyingCoins: string[];
    wrappedCoins: string[];
    underlyingCoinAddresses: string[];
    wrappedCoinAddresses: string[];
    underlyingDecimals: number[];
    wrappedDecimals: number[];
    useLending: boolean[];
    inApi: boolean;

    constructor(id: string) {
        const poolsData = curve.getPoolsData();
        if (!poolsData[id]) {
            throw new Error(`Pool ${id} not found. Available pools: ${Object.keys(poolsData).join(', ')}`);
        }
        const poolData = poolsData[id];

        this.id = id;
        this.name = poolData.name;
        this.fullName = poolData.full_name;
        this.symbol = poolData.symbol;
        this.referenceAsset = poolData.reference_asset;
        this.address = poolData.swap_address;
        this.lpToken = poolData.token_address;
        this.gauge = new GaugePool(poolData.gauge_address, poolData.name);
        this.zap = poolData.deposit_address || null;
        this.sRewardContract = poolData.sCurveRewards_address || null;
        this.rewardContract = poolData.reward_contract || null;
        this.implementation = poolData.implementation_address || null;
        this.isPlain = poolData.is_plain || false;
        this.isLending = poolData.is_lending || false;
        this.isMeta = poolData.is_meta || false;
        this.isCrypto = poolData.is_crypto || false;
        this.isFake = poolData.is_fake || false;
        this.isFactory = poolData.is_factory || false;
        this.isMetaFactory = (this.isMeta && this.isFactory) || this.zap === '0xa79828df1850e8a3a3064576f380d90aecdd3359';
        this.isNg = poolData.is_ng || false;
        this.isLlamma = poolData.is_llamma || false;
        this.basePool = poolData.base_pool || '';
        this.metaCoinIdx = this.isMeta ? poolData.meta_coin_idx ?? poolData.wrapped_coins.length - 1 : -1;
        this.underlyingCoins = poolData.underlying_coins;
        this.wrappedCoins = poolData.wrapped_coins;
        this.underlyingCoinAddresses = poolData.underlying_coin_addresses;
        this.wrappedCoinAddresses = poolData.wrapped_coin_addresses;
        this.underlyingDecimals = poolData.underlying_decimals;
        this.wrappedDecimals = poolData.wrapped_decimals;
        this.useLending = poolData.use_lending || poolData.underlying_coin_addresses.map(() => false);
        this.inApi = poolData.in_api ?? false;
    }
}

