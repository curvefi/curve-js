import {IDict, IPoolData} from "../interfaces.js";
import {BigNumberish, ethers, Numeric} from "ethers";
import memoize from "memoizee";
import {type Curve} from "../curve.js";

export const formatUnits = (value: BigNumberish, unit?: string | Numeric): string => ethers.formatUnits(value, unit);
export const parseUnits = (value: string, unit?: string | Numeric) => ethers.parseUnits(value, unit)

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

export function extractGauges(this: Curve, poolsData: IDict<IPoolData>): string[] {
    const GAUGES: string[] = [];
    for (const poolData of Object.values(poolsData)) {
        if (poolData.gauge_address === this.constants.ZERO_ADDRESS) continue;
        GAUGES.push(poolData.gauge_address);
    }

    return GAUGES;
}

export const lowerCaseValues = (dict: IDict<string>): IDict<string> => {
    return Object.fromEntries(Object.entries(dict).map((entry) => [entry[0], entry[1].toLowerCase()]))
}

export const lowerCaseKeys = (dict: IDict<any>): IDict<any> => {
    return Object.fromEntries(Object.entries(dict).map((entry) => [entry[0].toLowerCase(), entry[1]]))
}

/**
 * Memoizes a method of an object by binding it to this when needed.
 * The memoized method will cache the result for 5 minutes.
 * @param obj The object to which the method belongs.
 * @param name The name of the method to memoize. It must be unique within the object.
 * @param method The method to memoize. It must be a function that returns a Promise.
 * @returns The memoized method.
 */
export const memoizeMethod = <Obj extends object, Method extends (this: Obj, ...params: any[]) => Promise<unknown>>(obj: Obj, name: string, method: Method) => {
    if (!(name in obj)) {
        (obj as any)[name] = memoize(method.bind(obj), { promise: true, maxAge: 5 * 60 * 1000 /* 5m */ });
    }
    return (obj as any)[name] as Method;
}
