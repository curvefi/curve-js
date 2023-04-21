import { curve } from "../../curve.js";
import { PoolTemplate } from "../PoolTemplate.js";

// @ts-ignore
export const withdrawOneCoinWrappedExpected2argsMixin: PoolTemplate = {
    async _withdrawOneCoinWrappedExpected(_lpTokenAmount: bigint, i: number): Promise<bigint> {
        const contract = curve.contracts[this.address].contract;
        return await contract.calc_withdraw_one_coin(_lpTokenAmount, i, curve.constantOptions);
    },
}

// @ts-ignore
export const withdrawOneCoinWrappedExpected3argsMixin: PoolTemplate = {
    async _withdrawOneCoinWrappedExpected(_lpTokenAmount: bigint, i: number): Promise<bigint> {
        const contract = curve.contracts[this.address].contract;
        return await contract.calc_withdraw_one_coin(_lpTokenAmount, i, false, curve.constantOptions);
    },
}