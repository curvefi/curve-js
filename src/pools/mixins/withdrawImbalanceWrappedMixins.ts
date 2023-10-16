import { ethers } from "ethers";
import { curve } from "../../curve.js";
import { PoolTemplate } from "../PoolTemplate.js";
import { fromBN, toBN, parseUnits, mulBy1_3, smartNumber, DIGas } from '../../utils.js';

// @ts-ignore
async function _withdrawImbalanceWrappedCheck(this: PoolTemplate, amounts: (number | string)[]): Promise<ethers.BigNumbe[]> {
    const lpTokenAmount = await this.withdrawImbalanceWrappedExpected(amounts);
    const lpTokenBalance = (await this.wallet.lpTokenBalances())['lpToken'];
    if (Number(lpTokenBalance) < Number(lpTokenAmount)) {
        throw Error(`Not enough LP tokens. Actual: ${lpTokenBalance}, required: ${lpTokenAmount}`);
    }

    await curve.updateFeeData();

    return  amounts.map((amount, i) => parseUnits(amount, this.wrappedDecimals[i]));
}

async function _withdrawImbalanceWrappedMaxBurnAmount(this: PoolTemplate, _amounts: bigint[], slippage = 0.5): Promise<bigint> {
    // @ts-ignore
    const _expectedLpTokenAmount = await this._calcLpTokenAmount(_amounts, false, false);
    const maxBurnAmountBN = toBN(_expectedLpTokenAmount).times(100 + slippage).div(100);

    return fromBN(maxBurnAmountBN);
}

// @ts-ignore
export const withdrawImbalanceWrapped2argsMixin: PoolTemplate = {
    // @ts-ignore
    async _withdrawImbalanceWrapped(_amounts: bigint[], slippage?: number, estimateGas = false): Promise<string | number | number[]> {
        const _maxBurnAmount = await _withdrawImbalanceWrappedMaxBurnAmount.call(this, _amounts, slippage);
        const  contract = curve.contracts[this.address].contract;

        const gas = await contract.remove_liquidity_imbalance.estimateGas(_amounts, _maxBurnAmount, curve.constantOptions);
        if (estimateGas) return smartNumber(gas);

        const gasLimit = mulBy1_3(DIGas(gas));
        return (await contract.remove_liquidity_imbalance(_amounts, _maxBurnAmount, { ...curve.options, gasLimit })).hash;
    },

    async withdrawImbalanceWrappedEstimateGas(amounts: (number | string)[]): Promise<number> {
        // @ts-ignore
        const _amounts = await _withdrawImbalanceWrappedCheck.call(this, amounts);

        // @ts-ignore
        return await this._withdrawImbalanceWrapped(_amounts, 0.1, true);
    },

    async withdrawImbalanceWrapped(amounts: (number | string)[], slippage?: number): Promise<string> {
        // @ts-ignore
        const _amounts = await _withdrawImbalanceWrappedCheck.call(this, amounts);

        // @ts-ignore
        return await this._withdrawImbalanceWrapped(_amounts, slippage);
    },
}

// @ts-ignore
export const withdrawImbalanceWrapped3argsMixin: PoolTemplate = {
    // @ts-ignore
    async _withdrawImbalanceWrapped(_amounts: bigint[], slippage?: number, estimateGas = false): Promise<string | number | number[]> {
        const _maxBurnAmount = await _withdrawImbalanceWrappedMaxBurnAmount.call(this, _amounts, slippage);
        const  contract = curve.contracts[this.address].contract;

        const gas = await contract.remove_liquidity_imbalance.estimateGas(_amounts, _maxBurnAmount, false, curve.constantOptions);
        if (estimateGas) return smartNumber(gas);

        const gasLimit = curve.chainId === 137 && this.id === 'ren' ? DIGas(gas) * curve.parseUnits("140", 0) / curve.parseUnits("100", 0) : mulBy1_3(DIGas(gas));
        return (await contract.remove_liquidity_imbalance(_amounts, _maxBurnAmount, false, { ...curve.options, gasLimit })).hash;
    },

    async withdrawImbalanceWrappedEstimateGas(amounts: (number | string)[]): Promise<number> {
        // @ts-ignore
        const _amounts = await _withdrawImbalanceWrappedCheck.call(this, amounts);

        // @ts-ignore
        return await this._withdrawImbalanceWrapped(_amounts, 0.1, true);
    },

    async withdrawImbalanceWrapped(amounts: (number | string)[], slippage?: number): Promise<string> {
        // @ts-ignore
        const _amounts = await _withdrawImbalanceWrappedCheck.call(this, amounts);

        // @ts-ignore
        return await this._withdrawImbalanceWrapped(_amounts, slippage);
    },
}
