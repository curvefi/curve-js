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

export async function getBasePoolIds(this: ICurve, factoryAddress: string, rawSwapAddresses: string[], tmpPools: IPoolDataShort[]): Promise<Array<string>> {
    const factoryMulticallContract = this.contracts[factoryAddress].multicallContract;

    const calls = [];
    for (const addr of rawSwapAddresses) {
        calls.push(factoryMulticallContract.get_base_pool(addr));
    }

    const result: string[] = await this.multicallProvider.all(calls);

    const basePoolIds: Array<string> = [];

    result.forEach((item: string) => {
        if(item !== '0x0000000000000000000000000000000000000000') {
            basePoolIds.push(getPoolIdByAddress(tmpPools, item));
        } else {
            basePoolIds.push('')
        }
    })

    return basePoolIds;
}