import { ethers } from "ethers";
import { PoolTemplate } from "../PoolTemplate";
import { curve } from "../../curve";
import { fromBN, toBN, parseUnits } from "../../utils";

// @ts-ignore
async function _withdrawWrappedCheck(this: PoolTemplate, lpTokenAmount: number | string): Promise<ethers.BigNumber> {
    const lpTokenBalance = (await this.wallet.lpTokenBalances())['lpToken'];
    if (Number(lpTokenBalance) < Number(lpTokenAmount)) {
        throw Error(`Not enough LP tokens. Actual: ${lpTokenBalance}, required: ${lpTokenAmount}`);
    }

    await curve.updateFeeData();

    return parseUnits(lpTokenAmount);
}

async function _withdrawWrappedMinAmounts(this: PoolTemplate, _lpTokenAmount: ethers.BigNumber, maxSlippage = 0.005): Promise<ethers.BigNumber[]> {
    const expectedAmounts = await this.withdrawWrappedExpected(ethers.utils.formatUnits(_lpTokenAmount));
    const _expectedAmounts = expectedAmounts.map((a, i) => ethers.utils.parseUnits(a, this.decimals[i]));
    const minRecvAmountsBN = _expectedAmounts.map((_a, i) => toBN(_a, this.decimals[i]).times(1 - maxSlippage));

    return minRecvAmountsBN.map((a, i) => fromBN(a, this.decimals[i]));
}

// @ts-ignore
export const withdrawWrapped2argsMixin: PoolTemplate = {
    // @ts-ignore
    async _withdrawWrapped(_lpTokenAmount: ethers.BigNumber, maxSlippage?: number, estimateGas = false): Promise<string | number> {
        const _minAmounts = await _withdrawWrappedMinAmounts.call(this, _lpTokenAmount, maxSlippage);
        const contract = curve.contracts[this.poolAddress].contract;

        const gas = await contract.estimateGas.remove_liquidity(_lpTokenAmount, _minAmounts, curve.constantOptions);
        if (estimateGas) return gas.toNumber();

        const gasLimit = gas.mul(130).div(100);
        return (await contract.remove_liquidity(_lpTokenAmount, _minAmounts, { ...curve.options, gasLimit })).hash;
    },

    async withdrawWrappedEstimateGas(lpTokenAmount: number | string): Promise<number> {
        // @ts-ignore
        const _lpTokenAmount = await _withdrawWrappedCheck.call(this, lpTokenAmount);

        // @ts-ignore
        return await this._withdrawWrapped(_lpTokenAmount, 0.1, true);
    },

    async withdrawWrapped(lpTokenAmount: number | string, maxSlippage?: number): Promise<string> {
        // @ts-ignore
        const _lpTokenAmount = await _withdrawWrappedCheck.call(this, lpTokenAmount);

        // @ts-ignore
        return await this._withdrawWrapped(_lpTokenAmount, maxSlippage);
    },
}

// @ts-ignore
export const withdrawWrapped3argsMixin: PoolTemplate = {
    // @ts-ignore
    async _withdrawWrapped(_lpTokenAmount: ethers.BigNumber, maxSlippage?: number, estimateGas = false): Promise<string | number> {
        const _minAmounts = await _withdrawWrappedMinAmounts.call(this, _lpTokenAmount, maxSlippage);
        const contract = curve.contracts[this.poolAddress].contract;

        const gas = await contract.estimateGas.remove_liquidity(_lpTokenAmount, _minAmounts, false, curve.constantOptions);
        if (estimateGas) return gas.toNumber();

        const gasLimit = gas.mul(130).div(100);
        return (await contract.remove_liquidity(_lpTokenAmount, _minAmounts, false, { ...curve.options, gasLimit })).hash;
    },

    async withdrawWrappedEstimateGas(lpTokenAmount: number | string): Promise<number> {
        // @ts-ignore
        const _lpTokenAmount = await _withdrawWrappedCheck.call(this, lpTokenAmount);

        // @ts-ignore
        return await this._withdrawWrapped(_lpTokenAmount, 0.1, true);
    },

    async withdrawWrapped(lpTokenAmount: number | string, maxSlippage?: number): Promise<string> {
        // @ts-ignore
        const _lpTokenAmount = await _withdrawWrappedCheck.call(this, lpTokenAmount);

        // @ts-ignore
        return await this._withdrawWrapped(_lpTokenAmount, maxSlippage);
    },
}