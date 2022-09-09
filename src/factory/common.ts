import { Contract } from "ethers";
import { Contract as MulticallContract } from "ethcall";
import { ICurve } from "../interfaces";
import { FACTORY_CONSTANTS } from "./constants";
import atricrypto3ZapABI from "../constants/abis/atricrypto3/base_pool_zap.json";

export function setFactoryZapContracts(this: ICurve): void {
    const basePoolIdZapDict = FACTORY_CONSTANTS[this.chainId].basePoolIdZapDict;
    for (const basePoolId in basePoolIdZapDict) {
        if (!Object.prototype.hasOwnProperty.call(basePoolIdZapDict, basePoolId)) continue;
        const basePool = basePoolIdZapDict[basePoolId];

        if(basePool.address in this.constants) continue;

        this.setContract(basePool.address, basePool.ABI);
    }
}

export function setCryptoFactoryZapContracts(this: ICurve): void {
    if (this.chainId === 137) {
        const atricrypto3ZapAddress = "0x3d8EADb739D1Ef95dd53D718e4810721837c69c1".toLowerCase();
        this.contracts[atricrypto3ZapAddress] = {
            contract: new Contract(atricrypto3ZapAddress, atricrypto3ZapABI, this.signer || this.provider),
            multicallContract: new MulticallContract(atricrypto3ZapAddress, atricrypto3ZapABI),
        };
    }
}
