import { IExtendedPoolDataFromApi, IPoolType, TPricesPoolType } from "../interfaces.js";
import { volumeNetworks } from "./volumeNetworks.js";

export const EMPTY_EXTENDED_POOL_DATA: IExtendedPoolDataFromApi = { poolData: [], tvl: 0, tvlAll: 0 };

export const LEGACY_POOL_TYPES: readonly IPoolType[] = [
    "main",
    "crypto",
    "factory",
    "factory-crvusd",
    "factory-crypto",
    "factory-twocrypto",
    "factory-tricrypto",
    "factory-stable-ng",
] as const;

export const PRICES_POOL_TYPE_TO_LEGACY: Record<NonNullable<TPricesPoolType>, IPoolType> = {
    main: "main",
    crypto: "crypto",
    factory: "factory",
    crvusd: "factory-crvusd",
    factory_crypto: "factory-crypto",
    factory_tricrypto: "factory-tricrypto",
    stableswapng: "factory-stable-ng",
    twocryptong: "factory-twocrypto",
};

export const SUPPORTED_NON_LITE_POOL_CHAIN_IDS = new Set<number>(volumeNetworks.getVolumes);
