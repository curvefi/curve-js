import { PoolTemplate } from "../PoolTemplate";
import { fromBN, toBN, parseUnits } from "../../utils";
import { curve } from "../../curve";
import { ethers } from "ethers";

// @ts-ignore
async function _withdrawImbalanceWrappedCheck(this: PoolTemplate, amounts: (number | string)[]): Promise<ethers.BigNumbe[]> {
    const lpTokenAmount = await this.withdrawImbalanceWrappedExpected(amounts);
    const lpTokenBalance = (await this.wallet.lpTokenBalances())['lpToken'];
    if (Number(lpTokenBalance) < Number(lpTokenAmount)) {
        throw Error(`Not enough LP tokens. Actual: ${lpTokenBalance}, required: ${lpTokenAmount}`);
    }

    return  amounts.map((amount, i) => parseUnits(amount, this.decimals[i]));
}

async function _withdrawImbalanceWrappedMaxBurnAmount(this: PoolTemplate, _amounts: ethers.BigNumber[], maxSlippage = 0.005): Promise<ethers.BigNumber> {
    // @ts-ignore
    const _expectedLpTokenAmount = await this._calcLpTokenAmount(_amounts, false, false);
    const maxBurnAmountBN = toBN(_expectedLpTokenAmount).times(1 + maxSlippage);

    return fromBN(maxBurnAmountBN);
}

// @ts-ignore
export const withdrawImbalanceWrapped2argsMixin: PoolTemplate = {
    // @ts-ignore
    async _withdrawImbalanceWrapped(_amounts: ethers.BigNumber[], maxSlippage?: number, estimateGas = false): Promise<string | number> {
        const _maxBurnAmount = await _withdrawImbalanceWrappedMaxBurnAmount.call(this, _amounts, maxSlippage);
        const  contract = curve.contracts[this.poolAddress].contract;

        const gas = await contract.estimateGas.remove_liquidity_imbalance(_amounts, _maxBurnAmount, curve.constantOptions);
        if (estimateGas) return gas.toNumber();

        const gasLimit = gas.mul(130).div(100);
        return (await contract.remove_liquidity_imbalance(_amounts, _maxBurnAmount, { ...curve.options, gasLimit })).hash;
    },

    async withdrawImbalanceWrappedEstimateGas(amounts: (number | string)[]): Promise<number> {
        // @ts-ignore
        const _amounts = await _withdrawImbalanceWrappedCheck.call(this, amounts);

        // @ts-ignore
        return await this._withdrawImbalanceWrapped(_amounts, 0.1, true);
    },

    async withdrawImbalanceWrapped(amounts: (number | string)[], maxSlippage?: number): Promise<string> {
        // @ts-ignore
        const _amounts = await _withdrawImbalanceWrappedCheck.call(this, amounts);

        // @ts-ignore
        return await this._withdrawImbalanceWrapped(_amounts, maxSlippage);
    },
}

// @ts-ignore
export const withdrawImbalanceWrapped3argsMixin: PoolTemplate = {
    // @ts-ignore
    async _withdrawImbalanceWrapped(_amounts: ethers.BigNumber[], maxSlippage?: number, estimateGas = false): Promise<string | number> {
        const _maxBurnAmount = await _withdrawImbalanceWrappedMaxBurnAmount.call(this, _amounts, maxSlippage);
        const  contract = curve.contracts[this.poolAddress].contract;

        const gas = await contract.estimateGas.remove_liquidity_imbalance(_amounts, _maxBurnAmount, false, curve.constantOptions);
        if (estimateGas) return gas.toNumber();

        const gasLimit = curve.chainId === 137 && this.id === 'ren' ? gas.mul(140).div(100) : gas.mul(130).div(100);
        return (await contract.remove_liquidity_imbalance(_amounts, _maxBurnAmount, false, { ...curve.options, gasLimit })).hash;
    },

    async withdrawImbalanceWrappedEstimateGas(amounts: (number | string)[]): Promise<number> {
        // @ts-ignore
        const _amounts = await _withdrawImbalanceWrappedCheck.call(this, amounts);

        // @ts-ignore
        return await this._withdrawImbalanceWrapped(_amounts, 0.1, true);
    },

    async withdrawImbalanceWrapped(amounts: (number | string)[], maxSlippage?: number): Promise<string> {
        // @ts-ignore
        const _amounts = await _withdrawImbalanceWrappedCheck.call(this, amounts);

        // @ts-ignore
        return await this._withdrawImbalanceWrapped(_amounts, maxSlippage);
    },
}