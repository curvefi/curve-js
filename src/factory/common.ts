import {ICurve, IPoolDataFromApi, IPoolDataShort} from "../interfaces";
import { FACTORY_CONSTANTS } from "./constants.js";
import { CRYPTO_FACTORY_CONSTANTS } from "./constants-crypto.js";
import { getPoolIdBySwapAddress } from "../utils.js";

export function setFactoryZapContracts(this: ICurve, isCrypto: boolean): void {
    const basePoolIdZapDict = (isCrypto ? CRYPTO_FACTORY_CONSTANTS : FACTORY_CONSTANTS)[this.chainId].basePoolIdZapDict;
    for (const basePoolId in basePoolIdZapDict) {
        if (!Object.prototype.hasOwnProperty.call(basePoolIdZapDict, basePoolId)) continue;
        const basePool = basePoolIdZapDict[basePoolId];

        if(basePool.address in this.constants) continue;

        this.setContract(basePool.address, basePool.ABI);
    }
}

export function getPoolIdByAddress(poolList: IPoolDataShort[] , address: string): string {
    const pool = poolList.find((item) => item.address.toLowerCase() === address.toLowerCase())
    if(pool) {
        return pool.id;
    } else {
        return getPoolIdBySwapAddress(address.toLowerCase())
    }
}