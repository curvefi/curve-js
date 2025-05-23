import {PoolTemplate} from "../PoolTemplate.js";

export const withdrawOneCoinExpectedMetaFactoryMixin = {
    async _withdrawOneCoinExpected(this: PoolTemplate,_lpTokenAmount: bigint, i: number): Promise<bigint> {
        const contract = this.curve.contracts[this.zap as string].contract;
        return await contract.calc_withdraw_one_coin(this.address, _lpTokenAmount, i, this.curve.constantOptions);
    },
}

export const withdrawOneCoinExpectedZapMixin = {
    async _withdrawOneCoinExpected(this: PoolTemplate,_lpTokenAmount: bigint, i: number): Promise<bigint> {
        const contract = this.curve.contracts[this.zap as string].contract;
        return await contract.calc_withdraw_one_coin(_lpTokenAmount, i, this.curve.constantOptions);
    },
}

export const withdrawOneCoinExpected3argsMixin = {
    async _withdrawOneCoinExpected(this: PoolTemplate,_lpTokenAmount: bigint, i: number): Promise<bigint> {
        const contract = this.curve.contracts[this.address].contract;
        return await contract.calc_withdraw_one_coin(_lpTokenAmount, i, true, this.curve.constantOptions);
    },
}

export const withdrawOneCoinExpected2argsMixin = {
    async _withdrawOneCoinExpected(this: PoolTemplate,_lpTokenAmount: bigint, i: number): Promise<bigint> {
        const contract = this.curve.contracts[this.address].contract;
        return await contract.calc_withdraw_one_coin(_lpTokenAmount, i, this.curve.constantOptions);
    },
}