import {PoolTemplate} from "../PoolTemplate.js";

export const withdrawOneCoinWrappedExpected2argsMixin = {
    async _withdrawOneCoinWrappedExpected(this: PoolTemplate, _lpTokenAmount: bigint, i: number): Promise<bigint> {
        const contract = this.curve.contracts[this.address].contract;
        return await contract.calc_withdraw_one_coin(_lpTokenAmount, i, this.curve.constantOptions);
    },

    async withdrawOneCoinWrappedExpectedBigInt(this: PoolTemplate, lpTokenAmount: bigint, coin: string | number): Promise<bigint> {
        const i = this._getCoinIdx(coin, false);
        return await this._withdrawOneCoinWrappedExpected(lpTokenAmount, i);
    },
}

export const withdrawOneCoinWrappedExpected3argsMixin = {
    async _withdrawOneCoinWrappedExpected(this: PoolTemplate, _lpTokenAmount: bigint, i: number): Promise<bigint> {
        const contract = this.curve.contracts[this.address].contract;
        return await contract.calc_withdraw_one_coin(_lpTokenAmount, i, false, this.curve.constantOptions);
    },

    async withdrawOneCoinWrappedExpectedBigInt(this: PoolTemplate, lpTokenAmount: bigint, coin: string | number): Promise<bigint> {
        const i = this._getCoinIdx(coin, false);
        return await this._withdrawOneCoinWrappedExpected(lpTokenAmount, i);
    },
}