import { PoolTemplate } from "../PoolTemplate";
import { curve } from "../../curve";
import { ethers } from "ethers";

// @ts-ignore
export const withdrawOneCoinExpectedMataFactoryMixin: PoolTemplate = {
    async withdrawOneCoinExpected(lpTokenAmount: string, coin: string | number): Promise<string> {
        // @ts-ignore
        const i = this._getCoinIdx(coin);
        const _lpTokenAmount = ethers.utils.parseUnits(lpTokenAmount);
        const contract = curve.contracts[this.zap as string].contract;
        const _expected =  await contract.calc_withdraw_one_coin(this.swap, _lpTokenAmount, i, curve.constantOptions);

        return ethers.utils.formatUnits(_expected, this.underlyingDecimals[i]);
    },
}

// @ts-ignore
export const withdrawOneCoinExpectedZapMixin: PoolTemplate = {
    async withdrawOneCoinExpected(lpTokenAmount: string, coin: string | number): Promise<string> {
        // @ts-ignore
        const i = this._getCoinIdx(coin);
        const _lpTokenAmount = ethers.utils.parseUnits(lpTokenAmount);
        const contract = curve.contracts[this.zap as string].contract;
        const _expected =  await contract.calc_withdraw_one_coin(_lpTokenAmount, i, curve.constantOptions);

        return ethers.utils.formatUnits(_expected, this.underlyingDecimals[i]);
    },
}

// @ts-ignore
export const withdrawOneCoinExpected3argsMixin: PoolTemplate = {
    async withdrawOneCoinExpected(lpTokenAmount: string, coin: string | number): Promise<string> {
        // @ts-ignore
        const i = this._getCoinIdx(coin);
        const _lpTokenAmount = ethers.utils.parseUnits(lpTokenAmount);
        const contract = curve.contracts[this.swap].contract;
        const _expected =  await contract.calc_withdraw_one_coin(_lpTokenAmount, i, true, curve.constantOptions);

        return ethers.utils.formatUnits(_expected, this.underlyingDecimals[i]);
    },
}

// @ts-ignore
export const withdrawOneCoinExpected2argsMixin: PoolTemplate = {
    async withdrawOneCoinExpected(lpTokenAmount: string, coin: string | number): Promise<string> {
        // @ts-ignore
        const i = this._getCoinIdx(coin);
        const _lpTokenAmount = ethers.utils.parseUnits(lpTokenAmount);
        const contract = curve.contracts[this.swap].contract;
        const _expected =  await contract.calc_withdraw_one_coin(_lpTokenAmount, i, curve.constantOptions);

        return ethers.utils.formatUnits(_expected, this.underlyingDecimals[i]);
    },
}
