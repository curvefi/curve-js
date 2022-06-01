import { PoolTemplate } from "../PoolTemplate";
import { curve } from "../../curve";
import { ethers } from "ethers";

// @ts-ignore
export const withdrawOneCoinExpectedMetaFactoryMixin: PoolTemplate = {
    async _withdrawOneCoinExpected(_lpTokenAmount: ethers.BigNumber, i: number): Promise<ethers.BigNumber> {
        const contract = curve.contracts[this.zap as string].contract;
        return await contract.calc_withdraw_one_coin(this.poolAddress, _lpTokenAmount, i, curve.constantOptions);
    },
}

// @ts-ignore
export const withdrawOneCoinExpectedZapMixin: PoolTemplate = {
    async _withdrawOneCoinExpected(_lpTokenAmount: ethers.BigNumber, i: number): Promise<ethers.BigNumber> {
        const contract = curve.contracts[this.zap as string].contract;
        return await contract.calc_withdraw_one_coin(_lpTokenAmount, i, curve.constantOptions);
    },
}

// @ts-ignore
export const withdrawOneCoinExpected3argsMixin: PoolTemplate = {
    async _withdrawOneCoinExpected(_lpTokenAmount: ethers.BigNumber, i: number): Promise<ethers.BigNumber> {
        const contract = curve.contracts[this.poolAddress].contract;
        return await contract.calc_withdraw_one_coin(_lpTokenAmount, i, true, curve.constantOptions);
    },
}

// @ts-ignore
export const withdrawOneCoinExpected2argsMixin: PoolTemplate = {
    async _withdrawOneCoinExpected(_lpTokenAmount: ethers.BigNumber, i: number): Promise<ethers.BigNumber> {
        const contract = curve.contracts[this.poolAddress].contract;
        return await contract.calc_withdraw_one_coin(_lpTokenAmount, i, curve.constantOptions);
    },
}
