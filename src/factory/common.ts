import { ICurve } from "../interfaces";
import { FACTORY_CONSTANTS } from "./constants";
import { CRYPTO_FACTORY_CONSTANTS } from "./constants-crypto";

export function setFactoryZapContracts(this: ICurve, isCrypto: boolean): void {
    const basePoolIdZapDict = (isCrypto ? CRYPTO_FACTORY_CONSTANTS : FACTORY_CONSTANTS)[this.chainId].basePoolIdZapDict;
    for (const basePoolId in basePoolIdZapDict) {
        if (!Object.prototype.hasOwnProperty.call(basePoolIdZapDict, basePoolId)) continue;
        const basePool = basePoolIdZapDict[basePoolId];

        if(basePool.address in this.constants) continue;

        this.setContract(basePool.address, basePool.ABI);
    }
}
