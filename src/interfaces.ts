export interface ObjectInterface<T> {
    [index: string]: T,
}

export interface PoolListItemInterface {
    type: string,
    name: string,
}

export interface PoolDataInterface {
    lp_contract: string,
    lp_token_address: string,
    gauge_addresses: string[],
    coins: ObjectInterface<unknown>[],
    swap_address?: string,
    base_pool?: string,
    pool_types?: string[],
    zap_address?: string,
    lp_constructor?: ObjectInterface<unknown>,
    swap_constructor?: ObjectInterface<unknown>,
    testing?: ObjectInterface<unknown>
}

export interface BigNumberInterface {
    _hex: string,
    _isBigNumber: boolean,
}
