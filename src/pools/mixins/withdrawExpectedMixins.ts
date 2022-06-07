import { ethers } from "ethers";
import { _calcExpectedAmounts } from "./common";
import { PoolTemplate } from "../PoolTemplate";
import { parseUnits } from "../../utils";


// @ts-ignore
export const withdrawExpectedMixin: PoolTemplate = {
    async withdrawExpected(lpTokenAmount: number | string): Promise<string[]> {
        const _lpTokenAmount = parseUnits(lpTokenAmount);
        const _expected = await _calcExpectedAmounts.call(this, _lpTokenAmount);

        return _expected.map((amount: ethers.BigNumber, i: number) => ethers.utils.formatUnits(amount, this.underlyingDecimals[i]));
    },
}

// @ts-ignore
export const withdrawExpectedLendingOrCryptoMixin: PoolTemplate = {
    async withdrawExpected(lpTokenAmount: number | string): Promise<string[]> {
        const _lpTokenAmount = parseUnits(lpTokenAmount);
        const _expectedAmounts = await _calcExpectedAmounts.call(this, _lpTokenAmount);
        // @ts-ignore
        const _rates: ethers.BigNumber[] = await this._getRates();
        const _expected = _expectedAmounts.map((_amount: ethers.BigNumber, i: number) => _amount.mul(_rates[i]).div(ethers.BigNumber.from(10).pow(18)))

        return _expected.map((amount: ethers.BigNumber, i: number) => ethers.utils.formatUnits(amount, this.underlyingDecimals[i]));
    },
}

// @ts-ignore
export const withdrawExpectedMetaMixin: PoolTemplate = {
    async withdrawExpected(lpTokenAmount: number | string): Promise<string[]> {
        const _lpTokenAmount = parseUnits(lpTokenAmount);
        const _expectedWrappedAmounts = await _calcExpectedAmounts.call(this, _lpTokenAmount);
        _expectedWrappedAmounts.unshift(_expectedWrappedAmounts.pop() as ethers.BigNumber);
        const [_expectedMetaCoinAmount, ..._expectedUnderlyingAmounts] = _expectedWrappedAmounts;
        const basePool = new PoolTemplate(this.basePool);
        const _basePoolExpectedAmounts = await _calcExpectedAmounts.call(basePool, _expectedMetaCoinAmount);
        const _expected = [..._expectedUnderlyingAmounts, ..._basePoolExpectedAmounts];

        return _expected.map((amount: ethers.BigNumber, i: number) => ethers.utils.formatUnits(amount, this.underlyingDecimals[i]));
    },
}

// @ts-ignore
export const withdrawExpectedAtricrypto3Mixin: PoolTemplate = {
    async withdrawExpected(lpTokenAmount: number | string): Promise<string[]> {
        const _lpTokenAmount = parseUnits(lpTokenAmount);
        const _expectedWrappedAmounts = await _calcExpectedAmounts.call(this, _lpTokenAmount);
        const [_expectedMetaCoinAmount, ..._expectedUnderlyingAmounts] = _expectedWrappedAmounts;
        const basePool = new PoolTemplate(this.basePool);
        const _basePoolExpectedAmounts = await _calcExpectedAmounts.call(basePool, _expectedMetaCoinAmount);
        const _expected = [..._basePoolExpectedAmounts, ..._expectedUnderlyingAmounts];

        return _expected.map((amount: ethers.BigNumber, i: number) => ethers.utils.formatUnits(amount, this.underlyingDecimals[i]));
    },
}

// @ts-ignore
export const withdrawWrappedExpectedMixin: PoolTemplate = {
    async withdrawWrappedExpected(lpTokenAmount: number | string): Promise<string[]> {
        const _lpTokenAmount = parseUnits(lpTokenAmount);
        const _expected = await _calcExpectedAmounts.call(this, _lpTokenAmount)

        return _expected.map((amount: ethers.BigNumber, i: number) => ethers.utils.formatUnits(amount, this.decimals[i]));
    },
}