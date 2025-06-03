import { PoolTemplate } from "../PoolTemplate.js";
import { fromBN, toBN, parseUnits, mulBy1_3, smartNumber, DIGas } from '../../utils.js';

async function _withdrawImbalanceWrappedCheck(this: PoolTemplate, amounts: (number | string)[]): Promise<bigint[]> {
    const lpTokenAmount = await this.withdrawImbalanceWrappedExpected(amounts);
    const lpTokenBalance = (await this.wallet.lpTokenBalances())['lpToken'];
    if (Number(lpTokenBalance) < Number(lpTokenAmount)) {
        throw Error(`Not enough LP tokens. Actual: ${lpTokenBalance}, required: ${lpTokenAmount}`);
    }

    await this.curve.updateFeeData();

    return  amounts.map((amount, i) => parseUnits(amount, this.wrappedDecimals[i]));
}

async function _withdrawImbalanceWrappedMaxBurnAmount(this: PoolTemplate, _amounts: bigint[], slippage = 0.5): Promise<bigint> {
    const _expectedLpTokenAmount = await this._calcLpTokenAmount(_amounts, false, false);
    const maxBurnAmountBN = toBN(_expectedLpTokenAmount).times(100 + slippage).div(100);

    return fromBN(maxBurnAmountBN);
}

export const withdrawImbalanceWrapped2argsMixin = {
    async _withdrawImbalanceWrapped(this: PoolTemplate, _amounts: bigint[], slippage?: number, estimateGas = false): Promise<string | number | number[]> {
        const _maxBurnAmount = await _withdrawImbalanceWrappedMaxBurnAmount.call(this, _amounts, slippage);
        const  contract = this.curve.contracts[this.address].contract;

        const gas = await contract.remove_liquidity_imbalance.estimateGas(_amounts, _maxBurnAmount, this.curve.constantOptions);
        if (estimateGas) return smartNumber(gas);

        const gasLimit = mulBy1_3(DIGas(gas));
        return (await contract.remove_liquidity_imbalance(_amounts, _maxBurnAmount, { ...this.curve.options, gasLimit })).hash;
    },

    async withdrawImbalanceWrappedEstimateGas(this: PoolTemplate, amounts: (number | string)[]): Promise<number> {
        const _amounts = await _withdrawImbalanceWrappedCheck.call(this, amounts);
        return await withdrawImbalanceWrapped2argsMixin._withdrawImbalanceWrapped.call(this, _amounts, 0.1, true) as number;
    },

    async withdrawImbalanceWrapped(this: PoolTemplate, amounts: (number | string)[], slippage?: number): Promise<string> {
        const _amounts = await _withdrawImbalanceWrappedCheck.call(this, amounts);
        return await withdrawImbalanceWrapped2argsMixin._withdrawImbalanceWrapped.call(this, _amounts, slippage) as string;
    },
}

export const withdrawImbalanceWrapped3argsMixin = {
    async _withdrawImbalanceWrapped(this: PoolTemplate, _amounts: bigint[], slippage?: number, estimateGas = false): Promise<string | number | number[]> {
        const _maxBurnAmount = await _withdrawImbalanceWrappedMaxBurnAmount.call(this, _amounts, slippage);
        const  contract = this.curve.contracts[this.address].contract;

        const gas = await contract.remove_liquidity_imbalance.estimateGas(_amounts, _maxBurnAmount, false, this.curve.constantOptions);
        if (estimateGas) return smartNumber(gas);

        const gasLimit = this.curve.chainId === 137 && this.id === 'ren' ? DIGas(gas) * this.curve.parseUnits("140", 0) / this.curve.parseUnits("100", 0) : mulBy1_3(DIGas(gas));
        return (await contract.remove_liquidity_imbalance(_amounts, _maxBurnAmount, false, { ...this.curve.options, gasLimit })).hash;
    },

    async withdrawImbalanceWrappedEstimateGas(this: PoolTemplate, amounts: (number | string)[]): Promise<number> {
        const _amounts = await _withdrawImbalanceWrappedCheck.call(this, amounts);
        return await withdrawImbalanceWrapped3argsMixin._withdrawImbalanceWrapped.call(this, _amounts, 0.1, true) as number;
    },

    async withdrawImbalanceWrapped(this: PoolTemplate, amounts: (number | string)[], slippage?: number): Promise<string> {
        const _amounts = await _withdrawImbalanceWrappedCheck.call(this, amounts);
        return await withdrawImbalanceWrapped3argsMixin._withdrawImbalanceWrapped.call(this, _amounts, slippage) as string;
    },
}
