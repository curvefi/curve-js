import { PoolTemplate } from "../PoolTemplate";
import { curve } from "../../curve";
import { ethers } from "ethers";

// @ts-ignore
export const withdrawOneCoinWrappedExpected2argsMixin: PoolTemplate = {
    async _withdrawOneCoinWrappedExpected(_lpTokenAmount: ethers.BigNumber, i: number): Promise<ethers.BigNumber> {
        const contract = curve.contracts[this.poolAddress].contract;
        return await contract.calc_withdraw_one_coin(_lpTokenAmount, i, curve.constantOptions);
    },
}

// @ts-ignore
export const withdrawOneCoinWrappedExpected3argsMixin: PoolTemplate = {
    async _withdrawOneCoinWrappedExpected(_lpTokenAmount: ethers.BigNumber, i: number): Promise<ethers.BigNumber> {
        const contract = curve.contracts[this.poolAddress].contract;
        return await contract.calc_withdraw_one_coin(_lpTokenAmount, i, false, curve.constantOptions);
    },
}