import { curve } from "../../curve.js";
import { PoolTemplate } from "../PoolTemplate.js";

// @ts-ignore
export const withdrawOneCoinExpectedMetaFactoryMixin: PoolTemplate = {
    async _withdrawOneCoinExpected(_lpTokenAmount: bigint, i: number): Promise<bigint> {
        const contract = curve.contracts[this.zap as string].contract;
        return await contract.calc_withdraw_one_coin(this.address, _lpTokenAmount, i, curve.constantOptions);
    },
}

// @ts-ignore
export const withdrawOneCoinExpectedZapMixin: PoolTemplate = {
    async _withdrawOneCoinExpected(_lpTokenAmount: bigint, i: number): Promise<bigint> {
        const contract = curve.contracts[this.zap as string].contract;
        return await contract.calc_withdraw_one_coin(_lpTokenAmount, i, curve.constantOptions);
    },
}

// @ts-ignore
export const withdrawOneCoinExpected3argsMixin: PoolTemplate = {
    async _withdrawOneCoinExpected(_lpTokenAmount: bigint, i: number): Promise<bigint> {
        const contract = curve.contracts[this.address].contract;
        return await contract.calc_withdraw_one_coin(_lpTokenAmount, i, true, curve.constantOptions);
    },
}

// @ts-ignore
export const withdrawOneCoinExpected2argsMixin: PoolTemplate = {
    async _withdrawOneCoinExpected(_lpTokenAmount: bigint, i: number): Promise<bigint> {
        const contract = curve.contracts[this.address].contract;
        return await contract.calc_withdraw_one_coin(_lpTokenAmount, i, curve.constantOptions);
    },
}