import { ICurve, IPoolDataShort } from "../interfaces";
import { getPoolIdBySwapAddress } from "../utils.js";
import {Curve} from "../curve";

export function setFactoryZapContracts(this: ICurve, isCrypto: boolean): void {
    const basePoolIdZapDict = (isCrypto ? this.constants.CRYPTO_FACTORY_CONSTANTS : this.constants.STABLE_FACTORY_CONSTANTS).basePoolIdZapDict ?? {};
    for (const basePoolId in basePoolIdZapDict) {
        if (!Object.prototype.hasOwnProperty.call(basePoolIdZapDict, basePoolId)) continue;
        const basePool = basePoolIdZapDict[basePoolId];

        if(basePool.address in this.constants) continue;

        this.setContract(basePool.address, basePool.ABI);
    }
}

export function getPoolIdByAddress(this: Curve, poolList: IPoolDataShort[] , address: string): string {
    const pool = poolList.find((item) => item.address.toLowerCase() === address.toLowerCase())
    if(pool) {
        return pool.id;
    } else {
        return getPoolIdBySwapAddress.call(this, address.toLowerCase())
    }
}