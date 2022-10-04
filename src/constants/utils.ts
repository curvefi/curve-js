import { ethers } from "ethers";
import { IDict, IPoolData } from "../interfaces";


export const lowerCasePoolDataAddresses = (poolsData: IDict<IPoolData>): IDict<IPoolData> => {
    for (const poolId in poolsData) {
        if (!Object.prototype.hasOwnProperty.call(poolsData, poolId)) continue;
        const poolData = poolsData[poolId];
        poolData.swap_address = poolData.swap_address.toLowerCase();
        poolData.token_address = poolData.token_address.toLowerCase();
        poolData.gauge_address = poolData.gauge_address.toLowerCase();
        if (poolData.deposit_address) poolData.deposit_address = poolData.deposit_address.toLowerCase();
        if (poolData.sCurveRewards_address) poolData.sCurveRewards_address = poolData.sCurveRewards_address.toLowerCase();
        if (poolData.reward_contract) poolData.reward_contract = poolData.reward_contract.toLowerCase();
        poolData.underlying_coin_addresses = poolData.underlying_coin_addresses.map((a) => a.toLowerCase());
        poolData.wrapped_coin_addresses = poolData.wrapped_coin_addresses.map((a) => a.toLowerCase());
    }

    return poolsData
}

export const extractDecimals = (poolsData: IDict<IPoolData>): IDict<number> => {
    const DECIMALS: IDict<number> = {};
    for (const poolId in poolsData) {
        if (!Object.prototype.hasOwnProperty.call(poolsData, poolId)) continue;
        const poolData = poolsData[poolId];

        // LP token
        DECIMALS[poolData.token_address] = 18;

        // Underlying coins
        for (let i = 0; i < poolData.underlying_coin_addresses.length; i++) {
            DECIMALS[poolData.underlying_coin_addresses[i]] = poolData.underlying_decimals[i];
        }

        // Wrapped coins
        for (let i = 0; i < poolData.wrapped_coin_addresses.length; i++) {
            DECIMALS[poolData.wrapped_coin_addresses[i]] = poolData.wrapped_decimals[i];
        }
    }

    return DECIMALS;
}

export const extractGauges = (poolsData: IDict<IPoolData>): string[] => {
    const GAUGES: string[] = [];
    for (const poolData of Object.values(poolsData)) {
        if (poolData.gauge_address === ethers.constants.AddressZero) continue;
        GAUGES.push(poolData.gauge_address);
    }

    return GAUGES;
}

export const lowerCaseValues = (dict: IDict<string>): IDict<string> => {
    // @ts-ignore
    return Object.fromEntries(Object.entries(dict).map((entry) => [entry[0], entry[1].toLowerCase()]))
}

export const lowerCaseKeys = (dict: IDict<string>): IDict<string> => {
    // @ts-ignore
    return Object.fromEntries(Object.entries(dict).map((entry) => [entry[0].toLowerCase(), entry[1]]))
}
