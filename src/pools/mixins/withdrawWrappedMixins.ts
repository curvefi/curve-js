import {PoolTemplate} from "../PoolTemplate.js";
import {DIGas, fromBN, mulBy1_3, parseUnits, smartNumber, toBN} from '../../utils.js';

async function _withdrawWrappedCheck(this: PoolTemplate, lpTokenAmount: number | string): Promise<bigint> {
    const lpTokenBalance = (await this.wallet.lpTokenBalances())['lpToken'];
    if (Number(lpTokenBalance) < Number(lpTokenAmount)) {
        throw Error(`Not enough LP tokens. Actual: ${lpTokenBalance}, required: ${lpTokenAmount}`);
    }

    await this.curve.updateFeeData();

    return parseUnits(lpTokenAmount);
}

async function _withdrawWrappedMinAmounts(this: PoolTemplate, _lpTokenAmount: bigint, slippage = 0.5): Promise<bigint[]> {
    const expectedAmounts = await this.withdrawWrappedExpected(this.curve.formatUnits(_lpTokenAmount));
    const _expectedAmounts = expectedAmounts.map((a, i) => this.curve.parseUnits(a, this.wrappedDecimals[i]));
    const minRecvAmountsBN = _expectedAmounts.map((_a, i) => toBN(_a, this.wrappedDecimals[i]).times(100 - slippage).div(100));

    return minRecvAmountsBN.map((a, i) => fromBN(a, this.wrappedDecimals[i]));
}

export const withdrawWrapped2argsMixin = {
    async _withdrawWrapped(this: PoolTemplate, _lpTokenAmount: bigint, slippage?: number, estimateGas = false): Promise<string | number | number[]> {
        const _minAmounts = await _withdrawWrappedMinAmounts.call(this, _lpTokenAmount, slippage);
        const contract = this.curve.contracts[this.address].contract;

        const gas = await contract.remove_liquidity.estimateGas(_lpTokenAmount, _minAmounts, this.curve.constantOptions);
        if (estimateGas) return smartNumber(gas);

        const gasLimit = mulBy1_3(DIGas(gas));
        return (await contract.remove_liquidity(_lpTokenAmount, _minAmounts, { ...this.curve.options, gasLimit })).hash;
    },

    async withdrawWrappedEstimateGas(this: PoolTemplate, lpTokenAmount: number | string): Promise<number> {
        const _lpTokenAmount = await _withdrawWrappedCheck.call(this, lpTokenAmount);
        return await withdrawWrapped2argsMixin._withdrawWrapped.call(this, _lpTokenAmount, 0.1, true) as number;
    },

    async withdrawWrapped(this: PoolTemplate, lpTokenAmount: number | string, slippage?: number): Promise<string> {
        const _lpTokenAmount = await _withdrawWrappedCheck.call(this, lpTokenAmount);
        return await withdrawWrapped2argsMixin._withdrawWrapped.call(this, _lpTokenAmount, slippage) as string;
    },
}

export const withdrawWrapped3argsMixin = {
    async _withdrawWrapped(this: PoolTemplate, _lpTokenAmount: bigint, slippage?: number, estimateGas = false): Promise<string | number | number[]> {
        const _minAmounts = await _withdrawWrappedMinAmounts.call(this, _lpTokenAmount, slippage);
        const contract = this.curve.contracts[this.address].contract;

        const gas = await contract.remove_liquidity.estimateGas(_lpTokenAmount, _minAmounts, false, this.curve.constantOptions);
        if (estimateGas) return smartNumber(gas);

        const gasLimit = mulBy1_3(DIGas(gas));
        return (await contract.remove_liquidity(_lpTokenAmount, _minAmounts, false, { ...this.curve.options, gasLimit })).hash;
    },

    async withdrawWrappedEstimateGas(this: PoolTemplate, lpTokenAmount: number | string): Promise<number> {
        const _lpTokenAmount = await _withdrawWrappedCheck.call(this, lpTokenAmount);
        return await withdrawWrapped3argsMixin._withdrawWrapped.call(this, _lpTokenAmount, 0.1, true) as number;
    },

    async withdrawWrapped(this: PoolTemplate, lpTokenAmount: number | string, slippage?: number): Promise<string> {
        const _lpTokenAmount = await _withdrawWrappedCheck.call(this, lpTokenAmount);
        return await withdrawWrapped3argsMixin._withdrawWrapped.call(this, _lpTokenAmount, slippage) as string;
    },
}