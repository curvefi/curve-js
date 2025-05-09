import {PoolTemplate} from "../PoolTemplate.js";
import {_ensureAllowance, DIGas, fromBN, hasAllowance, mulBy1_3, parseUnits, smartNumber, toBN} from '../../utils.js';

async function _withdrawImbalanceCheck(this: PoolTemplate, amounts: (number | string)[], estimateGas = false): Promise<bigint[]> {
    const lpTokenAmount = await this.withdrawImbalanceExpected(amounts);
    const lpTokenBalance = (await this.wallet.lpTokenBalances())['lpToken'];
    if (Number(lpTokenBalance) < Number(lpTokenAmount)) {
        throw Error(`Not enough LP tokens. Actual: ${lpTokenBalance}, required: ${lpTokenAmount}`);
    }

    if (estimateGas && this.zap && !(await hasAllowance.call(this.curve, [this.lpToken], [lpTokenAmount], this.curve.signerAddress, this.zap))) {
        throw Error("Token allowance is needed to estimate gas")
    }

    if (!estimateGas) await this.curve.updateFeeData();

    return amounts.map((amount, i) => parseUnits(amount, this.underlyingDecimals[i]));
}

async function _withdrawImbalanceMaxBurnAmount(this: PoolTemplate, _amounts: bigint[], slippage = 0.5): Promise<bigint> {
    const _expectedLpTokenAmount = await this._calcLpTokenAmount(_amounts, false);
    const maxBurnAmountBN = toBN(_expectedLpTokenAmount).times(100 + slippage).div(100);

    return fromBN(maxBurnAmountBN);
}

export const withdrawImbalanceMetaFactoryMixin = {
    async _withdrawImbalance(this: PoolTemplate, _amounts: bigint[], slippage?: number, estimateGas = false): Promise<string | number | number[]> {
        const _maxBurnAmount = await _withdrawImbalanceMaxBurnAmount.call(this, _amounts, slippage);
        if (!estimateGas) await _ensureAllowance.call(this.curve, [this.lpToken], [_maxBurnAmount], this.zap as string);

        const contract = this.curve.contracts[this.zap as string].contract;
        const gas = await contract.remove_liquidity_imbalance.estimateGas(this.address, _amounts, _maxBurnAmount, this.curve.constantOptions);
        if (estimateGas) return smartNumber(gas);

        const gasLimit = mulBy1_3(DIGas(gas));
        return (await contract.remove_liquidity_imbalance(this.address, _amounts, _maxBurnAmount, { ...this.curve.options, gasLimit })).hash;
    },

    async withdrawImbalanceEstimateGas(this: PoolTemplate, amounts: (number | string)[]): Promise<number> {
        const _amounts = await _withdrawImbalanceCheck.call(this, amounts, true);
        return await withdrawImbalanceMetaFactoryMixin._withdrawImbalance.call(this, _amounts, 0.1, true) as number;
    },

    async withdrawImbalance(this: PoolTemplate, amounts: (number | string)[], slippage?: number): Promise<string> {
        const _amounts = await _withdrawImbalanceCheck.call(this, amounts);
        return await withdrawImbalanceMetaFactoryMixin._withdrawImbalance.call(this, _amounts, slippage) as string;
    },
}

export const withdrawImbalanceZapMixin = {
    async _withdrawImbalance(this: PoolTemplate, _amounts: bigint[], slippage?: number, estimateGas = false): Promise<string | number | number[]> {
        const _maxBurnAmount = await _withdrawImbalanceMaxBurnAmount.call(this, _amounts, slippage);
        if (!estimateGas) await _ensureAllowance.call(this.curve, [this.lpToken], [_maxBurnAmount], this.zap as string);

        const contract = this.curve.contracts[this.zap as string].contract;
        const gas = await contract.remove_liquidity_imbalance.estimateGas(_amounts, _maxBurnAmount, this.curve.constantOptions);
        if (estimateGas) return smartNumber(gas);

        const gasLimit = mulBy1_3(DIGas(gas));
        return (await contract.remove_liquidity_imbalance(_amounts, _maxBurnAmount, { ...this.curve.options, gasLimit })).hash;
    },

    async withdrawImbalanceEstimateGas(this: PoolTemplate, amounts: (number | string)[]): Promise<number> {
        const _amounts = await _withdrawImbalanceCheck.call(this, amounts, true);
        return await withdrawImbalanceZapMixin._withdrawImbalance.call(this, _amounts, 0.1, true) as number;
    },

    async withdrawImbalance(this: PoolTemplate, amounts: (number | string)[], slippage?: number): Promise<string> {
        const _amounts = await _withdrawImbalanceCheck.call(this, amounts);
        return await withdrawImbalanceZapMixin._withdrawImbalance.call(this, _amounts, slippage) as string;
    },
}

export const withdrawImbalanceLendingMixin = {
    async _withdrawImbalance(this: PoolTemplate, _amounts: bigint[], slippage?: number, estimateGas = false): Promise<string | number | number[]> {
        const _maxBurnAmount = await _withdrawImbalanceMaxBurnAmount.call(this, _amounts, slippage);
        const  contract = this.curve.contracts[this.address].contract;

        const gas = await contract.remove_liquidity_imbalance.estimateGas(_amounts, _maxBurnAmount, true, this.curve.constantOptions);
        if (estimateGas) return smartNumber(gas);

        const gasLimit = this.curve.chainId === 137 && this.id === 'ren' ? gas * this.curve.parseUnits("140", 0) / this.curve.parseUnits("100", 0) : mulBy1_3(DIGas(gas));
        return (await contract.remove_liquidity_imbalance(_amounts, _maxBurnAmount, true, { ...this.curve.options, gasLimit })).hash;
    },

    async withdrawImbalanceEstimateGas(this: PoolTemplate, amounts: (number | string)[]): Promise<number> {
        const _amounts = await _withdrawImbalanceCheck.call(this, amounts, true);
        return await withdrawImbalanceLendingMixin._withdrawImbalance.call(this, _amounts, 0.1, true) as number;
    },

    async withdrawImbalance(this: PoolTemplate, amounts: (number | string)[], slippage?: number): Promise<string> {
        const _amounts = await _withdrawImbalanceCheck.call(this, amounts);
        return await withdrawImbalanceLendingMixin._withdrawImbalance.call(this, _amounts, slippage) as string;
    },
}

export const withdrawImbalancePlainMixin = {
    async _withdrawImbalance(this: PoolTemplate, _amounts: bigint[], slippage?: number, estimateGas = false): Promise<string | number | number[]> {
        const _maxBurnAmount = await _withdrawImbalanceMaxBurnAmount.call(this, _amounts, slippage);
        const  contract = this.curve.contracts[this.address].contract;

        const gas = await contract.remove_liquidity_imbalance.estimateGas(_amounts, _maxBurnAmount, this.curve.constantOptions);
        if (estimateGas) return smartNumber(gas);

        const gasLimit = mulBy1_3(DIGas(gas));
        return (await contract.remove_liquidity_imbalance(_amounts, _maxBurnAmount, { ...this.curve.options, gasLimit })).hash;
    },

    async withdrawImbalanceEstimateGas(this: PoolTemplate, amounts: (number | string)[]): Promise<number> {
        const _amounts = await _withdrawImbalanceCheck.call(this, amounts, true);
        return await withdrawImbalancePlainMixin._withdrawImbalance.call(this, _amounts, 0.1, true) as number;
    },

    async withdrawImbalance(this: PoolTemplate, amounts: (number | string)[], slippage?: number): Promise<string> {
        const _amounts = await _withdrawImbalanceCheck.call(this, amounts);
        return await withdrawImbalancePlainMixin._withdrawImbalance.call(this, _amounts, slippage) as string;
    },
}