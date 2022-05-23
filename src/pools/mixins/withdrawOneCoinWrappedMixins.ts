import { PoolTemplate } from "../PoolTemplate";
import { fromBN, toBN } from "../../utils";
import { curve } from "../../curve";
import { ethers } from "ethers";

// @ts-ignore
async function _withdrawOneCoinWrappedCheck(this: PoolTemplate, lpTokenAmount: string, coin: string | number):
    Promise<[ethers.BigNumber, number]>
{
    const lpTokenBalance = (await this.lpTokenBalances())['lpToken'];
    if (Number(lpTokenBalance) < Number(lpTokenAmount)) {
        throw Error(`Not enough LP tokens. Actual: ${lpTokenBalance}, required: ${lpTokenAmount}`);
    }

    // @ts-ignore
    const i = this._getCoinIdx(coin, false);
    const _lpTokenAmount = ethers.utils.parseUnits(lpTokenAmount);

    return [_lpTokenAmount, i];
}

async function _withdrawOneCoinWrappedMinAmount(this: PoolTemplate, _lpTokenAmount: ethers.BigNumber, i: number, maxSlippage = 0.005): Promise<ethers.BigNumber> {
    // @ts-ignore
    const _expectedLpTokenAmount = await this._withdrawOneCoinWrappedExpected(_lpTokenAmount, i);
    const minAmountBN = toBN(_expectedLpTokenAmount).times(1 - maxSlippage);

    return fromBN(minAmountBN);
}

// @ts-ignore
export const withdrawOneCoinWrappedLendingOrCryptoMixin: PoolTemplate = {
    // @ts-ignore
    async _withdrawOneCoinWrapped(_lpTokenAmount: ethers.BigNumber, i: number, maxSlippage?: number, estimateGas = false): Promise<string | number> {
        const _minAmount = await _withdrawOneCoinWrappedMinAmount.call(this, _lpTokenAmount, i, maxSlippage);
        const contract = curve.contracts[this.swap].contract;

        const gas = await contract.estimateGas.remove_liquidity_one_coin(_lpTokenAmount, i, _minAmount, false, curve.constantOptions);
        if (estimateGas) return gas.toNumber();

        const gasLimit = curve.chainId === 137 && this.id === 'ren' ? gas.mul(160).div(100) : gas.mul(130).div(100);
        return (await contract.remove_liquidity_one_coin(_lpTokenAmount, i, _minAmount, false, { ...curve.options, gasLimit })).hash
    },

    async withdrawOneCoinWrappedEstimateGas(lpTokenAmount: string, coin: string | number): Promise<number> {
        // @ts-ignore
        const [_lpTokenAmount, i] = await _withdrawOneCoinWrappedCheck.call(this, lpTokenAmount, coin);

        // @ts-ignore
        return await this._withdrawOneCoinWrapped(_lpTokenAmount, i, 0.1, true);
    },

    async withdrawOneCoinWrapped(lpTokenAmount: string, coin: string | number, maxSlippage?: number): Promise<string> {
        // @ts-ignore
        const [_lpTokenAmount, i] = await _withdrawOneCoinWrappedCheck.call(this, lpTokenAmount, coin);

        // @ts-ignore
        return await this._withdrawOneCoinWrapped(_lpTokenAmount, i, maxSlippage);
    },
}

// @ts-ignore
export const withdrawOneCoinWrappedMixin: PoolTemplate = {
    // @ts-ignore
    async _withdrawOneCoinWrapped(_lpTokenAmount: ethers.BigNumber, i: number, maxSlippage?: number, estimateGas = false): Promise<string | number> {
        const _minAmount = await _withdrawOneCoinWrappedMinAmount.call(this, _lpTokenAmount, i, maxSlippage);
        const  contract = curve.contracts[this.swap].contract;

        const gas = await contract.estimateGas.remove_liquidity_one_coin(_lpTokenAmount, i, _minAmount, curve.constantOptions);
        if (estimateGas) return gas.toNumber();

        const gasLimit = gas.mul(130).div(100);
        return (await contract.remove_liquidity_one_coin(_lpTokenAmount, i, _minAmount, { ...curve.options, gasLimit })).hash
    },

    async withdrawOneCoinWrappedEstimateGas(lpTokenAmount: string, coin: string | number): Promise<number> {
        // @ts-ignore
        const [_lpTokenAmount, i] = await _withdrawOneCoinWrappedCheck.call(this, lpTokenAmount, coin);

        // @ts-ignore
        return await this._withdrawOneCoinWrapped(_lpTokenAmount, i, 0.1, true);
    },

    async withdrawOneCoinWrapped(lpTokenAmount: string, coin: string | number, maxSlippage?: number): Promise<string> {
        // @ts-ignore
        const [_lpTokenAmount, i] = await _withdrawOneCoinWrappedCheck.call(this, lpTokenAmount, coin);

        // @ts-ignore
        return await this._withdrawOneCoinWrapped(_lpTokenAmount, i, maxSlippage);
    },
}
