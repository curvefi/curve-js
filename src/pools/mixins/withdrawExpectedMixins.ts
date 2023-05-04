import { curve } from "../../curve.js";
import { PoolTemplate } from "../PoolTemplate.js";
import { parseUnits } from "../../utils.js";
import { _calcExpectedAmounts, _calcExpectedUnderlyingAmountsMeta } from "./common.js";

// @ts-ignore
export const withdrawExpectedMixin: PoolTemplate = {
    async withdrawExpected(lpTokenAmount: number | string): Promise<string[]> {
        const _lpTokenAmount = parseUnits(lpTokenAmount);
        const _expected = await _calcExpectedAmounts.call(this, _lpTokenAmount);

        return _expected.map((amount: bigint, i: number) => curve.formatUnits(amount, this.underlyingDecimals[i]));
    },
}

// @ts-ignore
export const withdrawExpectedLendingOrCryptoMixin: PoolTemplate = {
    async withdrawExpected(lpTokenAmount: number | string): Promise<string[]> {
        const _lpTokenAmount = parseUnits(lpTokenAmount);
        const _expectedAmounts = await _calcExpectedAmounts.call(this, _lpTokenAmount);
        // @ts-ignore
        const _rates: bigint[] = await this._getRates();
        const _expected = _expectedAmounts.map((_amount: bigint, i: number) => _amount * _rates[i] / curve.parseUnits(String(10**18), 0));

        return _expected.map((amount: bigint, i: number) => curve.formatUnits(amount, this.underlyingDecimals[i]));
    },
}

// @ts-ignore
export const withdrawExpectedMetaMixin: PoolTemplate = {
    async withdrawExpected(lpTokenAmount: number | string): Promise<string[]> {
        const _lpTokenAmount = parseUnits(lpTokenAmount);
        const _expected = await _calcExpectedUnderlyingAmountsMeta.call(this, _lpTokenAmount)

        return _expected.map((amount: bigint, i: number) => curve.formatUnits(amount, this.underlyingDecimals[i]));
    },
}

// @ts-ignore
export const withdrawWrappedExpectedMixin: PoolTemplate = {
    async withdrawWrappedExpected(lpTokenAmount: number | string): Promise<string[]> {
        const _lpTokenAmount = parseUnits(lpTokenAmount);
        const _expected = await _calcExpectedAmounts.call(this, _lpTokenAmount)

        return _expected.map((amount: bigint, i: number) => curve.formatUnits(amount, this.wrappedDecimals[i]));
    },
}