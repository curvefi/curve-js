import { curve } from "../../curve.js";
import { PoolTemplate } from "../PoolTemplate.js";
import { fromBN, toBN, parseUnits, mulBy1_3, smartNumber, DIGas } from '../../utils.js';

// @ts-ignore
async function _withdrawWrappedCheck(this: PoolTemplate, lpTokenAmount: number | string): Promise<bigint> {
    const lpTokenBalance = (await this.wallet.lpTokenBalances())['lpToken'];
    if (Number(lpTokenBalance) < Number(lpTokenAmount)) {
        throw Error(`Not enough LP tokens. Actual: ${lpTokenBalance}, required: ${lpTokenAmount}`);
    }

    await curve.updateFeeData();

    return parseUnits(lpTokenAmount);
}

async function _withdrawWrappedMinAmounts(this: PoolTemplate, _lpTokenAmount: bigint, slippage = 0.5): Promise<bigint[]> {
    const expectedAmounts = await this.withdrawWrappedExpected(curve.formatUnits(_lpTokenAmount));
    const _expectedAmounts = expectedAmounts.map((a, i) => curve.parseUnits(a, this.wrappedDecimals[i]));
    const minRecvAmountsBN = _expectedAmounts.map((_a, i) => toBN(_a, this.wrappedDecimals[i]).times(100 - slippage).div(100));

    return minRecvAmountsBN.map((a, i) => fromBN(a, this.wrappedDecimals[i]));
}

// @ts-ignore
export const withdrawWrapped2argsMixin: PoolTemplate = {
    // @ts-ignore
    async _withdrawWrapped(_lpTokenAmount: bigint, slippage?: number, estimateGas = false): Promise<string | number | number[]> {
        const _minAmounts = await _withdrawWrappedMinAmounts.call(this, _lpTokenAmount, slippage);
        const contract = curve.contracts[this.address].contract;

        const gas = await contract.remove_liquidity.estimateGas(_lpTokenAmount, _minAmounts, curve.constantOptions);
        if (estimateGas) return smartNumber(gas);

        const gasLimit = mulBy1_3(DIGas(gas));
        return (await contract.remove_liquidity(_lpTokenAmount, _minAmounts, { ...curve.options, gasLimit })).hash;
    },

    async withdrawWrappedEstimateGas(lpTokenAmount: number | string): Promise<number> {
        // @ts-ignore
        const _lpTokenAmount = await _withdrawWrappedCheck.call(this, lpTokenAmount);

        // @ts-ignore
        return await this._withdrawWrapped(_lpTokenAmount, 0.1, true);
    },

    async withdrawWrapped(lpTokenAmount: number | string, slippage?: number): Promise<string> {
        // @ts-ignore
        const _lpTokenAmount = await _withdrawWrappedCheck.call(this, lpTokenAmount);

        // @ts-ignore
        return await this._withdrawWrapped(_lpTokenAmount, slippage);
    },
}

// @ts-ignore
export const withdrawWrapped3argsMixin: PoolTemplate = {
    // @ts-ignore
    async _withdrawWrapped(_lpTokenAmount: bigint, slippage?: number, estimateGas = false): Promise<string | number | number[]> {
        const _minAmounts = await _withdrawWrappedMinAmounts.call(this, _lpTokenAmount, slippage);
        const contract = curve.contracts[this.address].contract;

        const gas = await contract.remove_liquidity.estimateGas(_lpTokenAmount, _minAmounts, false, curve.constantOptions);
        if (estimateGas) return smartNumber(gas);

        const gasLimit = mulBy1_3(DIGas(gas));
        return (await contract.remove_liquidity(_lpTokenAmount, _minAmounts, false, { ...curve.options, gasLimit })).hash;
    },

    async withdrawWrappedEstimateGas(lpTokenAmount: number | string): Promise<number> {
        // @ts-ignore
        const _lpTokenAmount = await _withdrawWrappedCheck.call(this, lpTokenAmount);

        // @ts-ignore
        return await this._withdrawWrapped(_lpTokenAmount, 0.1, true);
    },

    async withdrawWrapped(lpTokenAmount: number | string, slippage?: number): Promise<string> {
        // @ts-ignore
        const _lpTokenAmount = await _withdrawWrappedCheck.call(this, lpTokenAmount);

        // @ts-ignore
        return await this._withdrawWrapped(_lpTokenAmount, slippage);
    },
}