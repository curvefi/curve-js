import {PoolTemplate} from "../PoolTemplate";
import { fromBN, toBN } from "../../utils";
import {curve} from "../../curve";
import {ethers} from "ethers";
import BigNumber from "bignumber.js";

async function _calcExpectedAmounts(this: PoolTemplate, _lpTokenAmount: ethers.BigNumber): Promise<ethers.BigNumber[]> {
    const coinBalancesBN: BigNumber[] = [];
    for (let i = 0; i < this.coinAddresses.length; i++) {
        const _balance: ethers.BigNumber = await curve.contracts[this.poolAddress].contract.balances(i, curve.constantOptions);
        coinBalancesBN.push(toBN(_balance, this.decimals[i]));
    }
    const totalSupplyBN: BigNumber = toBN(await curve.contracts[this.lpToken].contract.totalSupply(curve.constantOptions));

    const expectedAmountsBN: BigNumber[] = [];
    for (const coinBalance of coinBalancesBN) {
        expectedAmountsBN.push(coinBalance.times(toBN(_lpTokenAmount)).div(totalSupplyBN));
    }

    return expectedAmountsBN.map((amount: BigNumber, i: number) => fromBN(amount, this.decimals[i]));
}

// @ts-ignore
export const withdrawExpectedMixin: PoolTemplate = {
    async withdrawExpected(lpTokenAmount: string): Promise<string[]> {
        const _lpTokenAmount = ethers.utils.parseUnits(lpTokenAmount);
        const _expected = await _calcExpectedAmounts.call(this, _lpTokenAmount);

        return _expected.map((amount: ethers.BigNumber, i: number) => ethers.utils.formatUnits(amount, this.underlyingDecimals[i]));
    },
}

// @ts-ignore
export const withdrawExpectedLendingOrCryptoMixin: PoolTemplate = {
    async withdrawExpected(lpTokenAmount: string): Promise<string[]> {
        const _lpTokenAmount = ethers.utils.parseUnits(lpTokenAmount);
        const _expectedAmounts = await _calcExpectedAmounts.call(this, _lpTokenAmount);
        // @ts-ignore
        const _rates: ethers.BigNumber[] = await this._getRates();
        const _expected = _expectedAmounts.map((_amount: ethers.BigNumber, i: number) => _amount.mul(_rates[i]).div(ethers.BigNumber.from(10).pow(18)))

        return _expected.map((amount: ethers.BigNumber, i: number) => ethers.utils.formatUnits(amount, this.underlyingDecimals[i]));
    },
}

// @ts-ignore
export const withdrawExpectedMetaMixin: PoolTemplate = {
    async withdrawExpected(lpTokenAmount: string): Promise<string[]> {
        const _lpTokenAmount = ethers.utils.parseUnits(lpTokenAmount);
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
    async withdrawExpected(lpTokenAmount: string): Promise<string[]> {
        const _lpTokenAmount = ethers.utils.parseUnits(lpTokenAmount);
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
    async withdrawWrappedExpected(lpTokenAmount: string): Promise<string[]> {
        const _lpTokenAmount = ethers.utils.parseUnits(lpTokenAmount);
        const _expected = await _calcExpectedAmounts.call(this, _lpTokenAmount)

        return _expected.map((amount: ethers.BigNumber, i: number) => ethers.utils.formatUnits(amount, this.decimals[i]));
    },
}
