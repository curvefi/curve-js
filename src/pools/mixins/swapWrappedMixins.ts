import BigNumber from "bignumber.js";
import {PoolTemplate} from "../PoolTemplate.js";
import {
    _ensureAllowance,
    _getCoinDecimals,
    DIGas,
    ensureAllowance,
    ensureAllowanceEstimateGas,
    fromBN,
    hasAllowance,
    isEth,
    mulBy1_3,
    parseUnits,
    smartNumber,
    toBN,
} from '../../utils.js';

async function _swapWrappedCheck(
    this: PoolTemplate,
    inputCoin: string | number,
    outputCoin: string | number,
    amount: number | string,
    estimateGas = false
): Promise<[number, number, bigint]> {
    const i = this._getCoinIdx(inputCoin, false);
    const j = this._getCoinIdx(outputCoin, false);

    const inputCoinBalance = Object.values(await this.wallet.wrappedCoinBalances())[i];
    if (Number(inputCoinBalance) < Number(amount)) {
        throw Error(`Not enough ${this.wrappedCoins[i]}. Actual: ${inputCoinBalance}, required: ${amount}`);
    }

    if (estimateGas && !(await hasAllowance.call(this.curve, [this.wrappedCoinAddresses[i]], [amount], this.curve.signerAddress, this.address))) {
        throw Error("Token allowance is needed to estimate gas")
    }

    if (!estimateGas) await this.curve.updateFeeData();

    const _amount = parseUnits(amount, this.wrappedDecimals[i]);

    return [i, j, _amount]
}

async function _swapWrappedMinAmount(this: PoolTemplate, i: number, j: number, _amount: bigint, slippage = 0.5): Promise<bigint> {
    const _expected: bigint = await this._swapWrappedExpected.call(this, i, j, _amount);
    const [outputCoinDecimals] = _getCoinDecimals.call(this.curve, this.wrappedCoinAddresses[j]);
    const minAmountBN: BigNumber = toBN(_expected, outputCoinDecimals).times(100 - slippage).div(100);

    return fromBN(minAmountBN, outputCoinDecimals);
}

export const swapWrappedTricrypto2Mixin= {
    async _swapWrapped(this: PoolTemplate, i: number, j: number, _amount: bigint, slippage?: number, estimateGas = false): Promise<string | number | number[]> {
        if (!estimateGas) await _ensureAllowance.call(this.curve, [this.wrappedCoinAddresses[i]], [_amount], this.address);

        const _minRecvAmount = await _swapWrappedMinAmount.call(this, i, j, _amount, slippage);
        const contract = this.curve.contracts[this.address].contract;
        const value = isEth(this.wrappedCoinAddresses[i]) ? _amount : this.curve.parseUnits("0");

        const gas = await contract.exchange.estimateGas(i, j, _amount, _minRecvAmount, false, { ...this.curve.constantOptions, value });
        if (estimateGas) return smartNumber(gas);

        const gasLimit = mulBy1_3(DIGas(gas));
        return (await contract.exchange(i, j, _amount, _minRecvAmount, false, { ...this.curve.options, value, gasLimit })).hash
    },

    async swapWrappedEstimateGas(this: PoolTemplate, inputCoin: string | number, outputCoin: string | number, amount: number | string): Promise<number> {
        const [i, j, _amount] = await _swapWrappedCheck.call(this, inputCoin, outputCoin, amount, true);
        return await swapWrappedTricrypto2Mixin._swapWrapped.call(this, i, j, _amount, 0.1, true) as number;
    },

    async swapWrapped(this: PoolTemplate, inputCoin: string | number, outputCoin: string | number, amount: number | string, slippage?: number): Promise<string> {
        const [i, j, _amount] = await _swapWrappedCheck.call(this, inputCoin, outputCoin, amount);
        return await swapWrappedTricrypto2Mixin._swapWrapped.call(this, i, j, _amount, slippage) as string;
    },
}

export const swapWrappedMixin= {
    async _swapWrapped(this: PoolTemplate, i: number, j: number, _amount: bigint, slippage?: number, estimateGas = false): Promise<string | number | number[]> {
        if (!estimateGas) await _ensureAllowance.call(this.curve, [this.wrappedCoinAddresses[i]], [_amount], this.address);

        const _minRecvAmount = await _swapWrappedMinAmount.call(this, i, j, _amount, slippage);
        const contract = this.curve.contracts[this.address].contract;
        const value = isEth(this.wrappedCoinAddresses[i]) ? _amount : this.curve.parseUnits("0");

        const gas = await contract.exchange.estimateGas(i, j, _amount, _minRecvAmount, { ...this.curve.constantOptions, value });
        if (estimateGas) return smartNumber(gas);

        const gasLimit = this.curve.chainId === 137 && this.id === 'ren' ? DIGas(gas) * this.curve.parseUnits("140", 0) / this.curve.parseUnits("100", 0) : mulBy1_3(DIGas(gas));
        return (await contract.exchange(i, j, _amount, _minRecvAmount, { ...this.curve.options, value, gasLimit })).hash
    },

    async swapWrappedEstimateGas(this: PoolTemplate, inputCoin: string | number, outputCoin: string | number, amount: number | string): Promise<number> {
        const [i, j, _amount] = await _swapWrappedCheck.call(this, inputCoin, outputCoin, amount, true);
        return await swapWrappedMixin._swapWrapped.call(this, i, j, _amount, 0.1, true) as number;
    },

    async swapWrapped(this: PoolTemplate, inputCoin: string | number, outputCoin: string | number, amount: number | string, slippage?: number): Promise<string> {
        const [i, j, _amount] = await _swapWrappedCheck.call(this, inputCoin, outputCoin, amount);
        return await swapWrappedMixin._swapWrapped.call(this, i, j, _amount, slippage) as string;
    },
}

export const swapWrappedExpectedAndApproveMixin = {
    async swapWrappedExpected(this: PoolTemplate, inputCoin: string | number, outputCoin: string | number, amount: number | string): Promise<string> {
        const i = this._getCoinIdx(inputCoin, false);
        const j = this._getCoinIdx(outputCoin, false);
        const _amount = parseUnits(amount, this.wrappedDecimals[i]);
        const _expected = await this._swapWrappedExpected.call(this, i, j, _amount);

        return this.curve.formatUnits(_expected, this.wrappedDecimals[j])
    },

    async swapWrappedIsApproved(this: PoolTemplate, inputCoin: string | number, amount: number | string): Promise<boolean> {
        const i = this._getCoinIdx.call(this, inputCoin, false);
        return await hasAllowance.call(this.curve, [this.wrappedCoinAddresses[i]], [amount], this.curve.signerAddress, this.address);
    },

    async swapWrappedApproveEstimateGas(this: PoolTemplate, inputCoin: string | number, amount: number | string): Promise<number | number[]> {
        const i = this._getCoinIdx.call(this, inputCoin, false);
        return await ensureAllowanceEstimateGas.call(this.curve, [this.wrappedCoinAddresses[i]], [amount], this.address);
    },

    async swapWrappedApprove(this: PoolTemplate, inputCoin: string | number, amount: number | string): Promise<string[]> {
        const i = this._getCoinIdx.call(this, inputCoin, false);
        return await ensureAllowance.call(this.curve, [this.wrappedCoinAddresses[i]], [amount], this.address);
    },
}

export const swapWrappedRequiredMixin = {
    async swapWrappedRequired(this: PoolTemplate, inputCoin: string | number, outputCoin: string | number, amount: number | string): Promise<string> {
        const i = this._getCoinIdx.call(this, inputCoin, false);
        const j = this._getCoinIdx.call(this, outputCoin, false);
        const _amount = parseUnits(amount, this.wrappedDecimals[j]);
        const _required = await this._swapRequired.call(this, i, j, _amount, false);
        return this.curve.formatUnits(_required, this.wrappedDecimals[i])
    },
}