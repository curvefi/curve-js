import { PoolTemplate } from "../PoolTemplate.js";
import { parseUnits } from "../../utils.js";
import { _calcExpectedAmounts, _calcExpectedUnderlyingAmountsMeta } from "./common.js";
import {formatUnits} from "../../constants/utils";

export const withdrawExpectedMixin = {
    async withdrawExpected(this: PoolTemplate, lpTokenAmount: number | string): Promise<string[]> {
        const _lpTokenAmount = parseUnits(lpTokenAmount);
        const _expected = await _calcExpectedAmounts.call(this, _lpTokenAmount);
        return _expected.map((amount: bigint, i: number) => formatUnits(amount, this.underlyingDecimals[i]));
    },
}

export const withdrawExpectedLendingOrCryptoMixin = {
    async withdrawExpected(this: PoolTemplate, lpTokenAmount: number | string): Promise<string[]> {
        const _lpTokenAmount = parseUnits(lpTokenAmount);
        const _expectedAmounts = await _calcExpectedAmounts.call(this, _lpTokenAmount);
        const _rates: bigint[] = await this._getRates();
        const _expected = _expectedAmounts.map((_amount: bigint, i: number) => _amount * _rates[i] / parseUnits(String(10**18), 0));

        return _expected.map((amount: bigint, i: number) => formatUnits(amount, this.underlyingDecimals[i]));
    },
}

export const withdrawExpectedMetaMixin = {
    async withdrawExpected(this: PoolTemplate, lpTokenAmount: number | string): Promise<string[]> {
        const _lpTokenAmount = parseUnits(lpTokenAmount);
        const _expected = await _calcExpectedUnderlyingAmountsMeta.call(this, _lpTokenAmount)

        return _expected.map((amount: bigint, i: number) => formatUnits(amount, this.underlyingDecimals[i]));
    },
}

export const withdrawWrappedExpectedMixin = {
    async withdrawWrappedExpected(this: PoolTemplate, lpTokenAmount: number | string): Promise<string[]> {
        const _lpTokenAmount = parseUnits(lpTokenAmount);
        const _expected = await _calcExpectedAmounts.call(this, _lpTokenAmount)
        return _expected.map((amount: bigint, i: number) => formatUnits(amount, this.wrappedDecimals[i]));
    },
}