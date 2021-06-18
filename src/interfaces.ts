export interface DictInterface<T> {
    [index: string]: T,
}

export interface PoolDataInterface {
    N_COINS: number,
    swap_address: string,
    token_address: string,
    gauge_address: string,
    deposit_address?: string,
    swap_abi: any,
    deposit_abi?: any,
    underlying_coins: string[],
    coins: string[],
    underlying_decimals: number[],
    decimals: number[],
    use_lending: boolean[],
    is_meta?: boolean,
    base_pool?: string,
    meta_coins?: string[],
    meta_coin_decimals?: number[],
}