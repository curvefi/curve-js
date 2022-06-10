import { PoolTemplate } from "../PoolTemplate";
import {
    _ensureAllowance,
    _getCoinDecimals,
    ensureAllowance,
    ensureAllowanceEstimateGas,
    fromBN,
    hasAllowance,
    isEth,
    toBN,
    parseUnits,
} from "../../utils";
import { curve } from "../../curve";
import { ethers } from "ethers";
import BigNumber from "bignumber.js";

// @ts-ignore
async function _swapWrappedCheck(
    this: PoolTemplate,
    inputCoin: string | number,
    outputCoin: string | number,
    amount: number | string,
    estimateGas = false
): Promise<[number, number, ethers.BigNumber]> {
    // @ts-ignore
    const i = this._getCoinIdx(inputCoin, false);
    // @ts-ignore
    const j = this._getCoinIdx(outputCoin, false);

    const inputCoinBalance = Object.values(await this.wallet.wrappedCoinBalances())[i];
    if (Number(inputCoinBalance) < Number(amount)) {
        throw Error(`Not enough ${this.wrappedCoins[i]}. Actual: ${inputCoinBalance}, required: ${amount}`);
    }

    if (estimateGas && !(await hasAllowance([this.wrappedCoinAddresses[i]], [amount], curve.signerAddress, this.address))) {
        throw Error("Token allowance is needed to estimate gas")
    }

    if (!estimateGas) await curve.updateFeeData();

    const _amount = parseUnits(amount, this.wrappedDecimals[i]);

    return [i, j, _amount]
}

async function _swapWrappedMinAmount(this: PoolTemplate, i: number, j: number, _amount: ethers.BigNumber, slippage = 0.5): Promise<ethers.BigNumber> {
    // @ts-ignore
    const _expected: ethers.BigNumber = await this._swapWrappedExpected(i, j, _amount);
    const [outputCoinDecimals] = _getCoinDecimals(this.wrappedCoinAddresses[j]);
    const minAmountBN: BigNumber = toBN(_expected, outputCoinDecimals).times(100 - slippage).div(100);

    return fromBN(minAmountBN, outputCoinDecimals);
}

// @ts-ignore
export const swapWrappedTricrypto2Mixin: PoolTemplate = {
    // @ts-ignore
    async _swapWrapped(i: number, j: number, _amount: ethers.BigNumber, slippage?: number, estimateGas = false): Promise<string | number> {
        if (!estimateGas) await _ensureAllowance([this.wrappedCoinAddresses[i]], [_amount], this.address);

        const _minRecvAmount = await _swapWrappedMinAmount.call(this, i, j, _amount, slippage);
        const contract = curve.contracts[this.address].contract;
        const value = isEth(this.wrappedCoinAddresses[i]) ? _amount : ethers.BigNumber.from(0);

        const gas = await contract.estimateGas.exchange(i, j, _amount, _minRecvAmount, false, { ...curve.constantOptions, value });
        if (estimateGas) return gas.toNumber();

        const gasLimit = gas.mul(130).div(100);
        return (await contract.exchange(i, j, _amount, _minRecvAmount, false, { ...curve.options, value, gasLimit })).hash
    },

    async swapWrappedEstimateGas(inputCoin: string | number, outputCoin: string | number, amount: number | string): Promise<number> {
        // @ts-ignore
        const [i, j, _amount] = await _swapWrappedCheck.call(this, inputCoin, outputCoin, amount, true);

        // @ts-ignore
        return await this._swapWrapped(i, j, _amount, 0.1, true);
    },

    async swapWrapped(inputCoin: string | number, outputCoin: string | number, amount: number | string, slippage?: number): Promise<string> {
        // @ts-ignore
        const [i, j, _amount] = await _swapWrappedCheck.call(this, inputCoin, outputCoin, amount);

        // @ts-ignore
        return await this._swapWrapped(i, j, _amount, slippage);
    },
}

// @ts-ignore
export const swapWrappedMixin: PoolTemplate = {
    // @ts-ignore
    async _swapWrapped(i: number, j: number, _amount: ethers.BigNumber, slippage?: number, estimateGas = false): Promise<string | number> {
        if (!estimateGas) await _ensureAllowance([this.wrappedCoinAddresses[i]], [_amount], this.address);

        const _minRecvAmount = await _swapWrappedMinAmount.call(this, i, j, _amount, slippage);
        const contract = curve.contracts[this.address].contract;
        const value = isEth(this.wrappedCoinAddresses[i]) ? _amount : ethers.BigNumber.from(0);

        const gas = await contract.estimateGas.exchange(i, j, _amount, _minRecvAmount, { ...curve.constantOptions, value });
        if (estimateGas) return gas.toNumber();

        const gasLimit = curve.chainId === 137 && this.id === 'ren' ? gas.mul(140).div(100) : gas.mul(130).div(100);
        return (await contract.exchange(i, j, _amount, _minRecvAmount, { ...curve.options, value, gasLimit })).hash
    },

    async swapWrappedEstimateGas(inputCoin: string | number, outputCoin: string | number, amount: number | string): Promise<number> {
        // @ts-ignore
        const [i, j, _amount] = await _swapWrappedCheck.call(this, inputCoin, outputCoin, amount, true);

        // @ts-ignore
        return await this._swapWrapped(i, j, _amount, 0.1, true);
    },

    async swapWrapped(inputCoin: string | number, outputCoin: string | number, amount: number | string, slippage?: number): Promise<string> {
        // @ts-ignore
        const [i, j, _amount] = await _swapWrappedCheck.call(this, inputCoin, outputCoin, amount);

        // @ts-ignore
        return await this._swapWrapped(i, j, _amount, slippage);
    },
}

// @ts-ignore
export const swapWrappedExpectedAndApproveMixin: PoolTemplate = {
    async swapWrappedExpected(inputCoin: string | number, outputCoin: string | number, amount: number | string): Promise<string> {
        // @ts-ignore
        const i = this._getCoinIdx(inputCoin, false);
        // @ts-ignore
        const j = this._getCoinIdx(outputCoin, false);
        const _amount = parseUnits(amount, this.wrappedDecimals[i]);
        // @ts-ignore
        const _expected = await this._swapWrappedExpected(i, j, _amount);

        return ethers.utils.formatUnits(_expected, this.wrappedDecimals[j])
    },

    async swapWrappedIsApproved(inputCoin: string | number, amount: number | string): Promise<boolean> {
        // @ts-ignore
        const i = this._getCoinIdx(inputCoin, false);
        return await hasAllowance([this.wrappedCoinAddresses[i]], [amount], curve.signerAddress, this.address);
    },

    async swapWrappedApproveEstimateGas(inputCoin: string | number, amount: number | string): Promise<number> {
        // @ts-ignore
        const i = this._getCoinIdx(inputCoin, false);
        return await ensureAllowanceEstimateGas([this.wrappedCoinAddresses[i]], [amount], this.address);
    },

    async swapWrappedApprove(inputCoin: string | number, amount: number | string): Promise<string[]> {
        // @ts-ignore
        const i = this._getCoinIdx(inputCoin, false);
        return await ensureAllowance([this.wrappedCoinAddresses[i]], [amount], this.address);
    },
}