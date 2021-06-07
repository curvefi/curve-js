export interface DictInterface<T> {
    [index: string]: T,
}

export interface PoolListItemInterface {
    type: string,
    name: string,
}

export interface CoinInterface {
    name: string,
    decimals: number,
    tethered: boolean,
    underlying_address: string,
    wrapped_address?: string,
    wrapped_decimals?: number,
}

export interface PoolDataInterface {
    lp_contract: string,
    lp_token_address: string,
    gauge_addresses: string[],
    coins: CoinInterface[],
    swap_address?: string,
    base_pool?: string,
    pool_types?: string[],
    zap_address?: string,
    lp_constructor?: DictInterface<unknown>,
    swap_constructor?: DictInterface<unknown>,
    testing?: DictInterface<unknown>,
}

export interface PoolsDataInterface {
    [inndex: string]: {
        swap_address: string,
        token_address: string,
        gauge_address: string,
        deposit_address?: string,
        swap_abi: any,
        deposit_abi?: any,
        underlying_coins: string[],
        coins: string[],
    }
}