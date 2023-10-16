import { curve } from "../../curve.js";
import { PoolTemplate } from "../PoolTemplate.js";
import { fromBN, toBN, parseUnits, mulBy1_3, smartNumber, DIGas } from '../../utils.js';

// @ts-ignore
async function _withdrawOneCoinWrappedCheck(this: PoolTemplate, lpTokenAmount: number | string, coin: string | number):
    Promise<[bigint, number]>
{
    const lpTokenBalance = (await this.wallet.lpTokenBalances())['lpToken'];
    if (Number(lpTokenBalance) < Number(lpTokenAmount)) {
        throw Error(`Not enough LP tokens. Actual: ${lpTokenBalance}, required: ${lpTokenAmount}`);
    }

    await curve.updateFeeData();

    // @ts-ignore
    const i = this._getCoinIdx(coin, false);
    const _lpTokenAmount = parseUnits(lpTokenAmount);

    return [_lpTokenAmount, i];
}

async function _withdrawOneCoinWrappedMinAmount(this: PoolTemplate, _lpTokenAmount: bigint, i: number, slippage = 0.5): Promise<bigint> {
    // @ts-ignore
    const _expectedLpTokenAmount = await this._withdrawOneCoinWrappedExpected(_lpTokenAmount, i);
    const minAmountBN = toBN(_expectedLpTokenAmount).times(100 - slippage).div(100);

    return fromBN(minAmountBN);
}

// @ts-ignore
export const withdrawOneCoinWrappedLendingOrCryptoMixin: PoolTemplate = {
    // @ts-ignore
    async _withdrawOneCoinWrapped(_lpTokenAmount: bigint, i: number, slippage?: number, estimateGas = false): Promise<string | number | number[]> {
        const _minAmount = await _withdrawOneCoinWrappedMinAmount.call(this, _lpTokenAmount, i, slippage);
        const contract = curve.contracts[this.address].contract;

        const gas = await contract.remove_liquidity_one_coin.estimateGas(_lpTokenAmount, i, _minAmount, false, curve.constantOptions);
        if (estimateGas) return smartNumber(gas);

        const gasLimit = curve.chainId === 137 && this.id === 'ren' ? DIGas(gas) * curve.parseUnits("160", 0) / curve.parseUnits("100", 0) : mulBy1_3(DIGas(gas));
        return (await contract.remove_liquidity_one_coin(_lpTokenAmount, i, _minAmount, false, { ...curve.options, gasLimit })).hash
    },

    async withdrawOneCoinWrappedEstimateGas(lpTokenAmount: number | string, coin: string | number): Promise<number> {
        // @ts-ignore
        const [_lpTokenAmount, i] = await _withdrawOneCoinWrappedCheck.call(this, lpTokenAmount, coin);

        // @ts-ignore
        return await this._withdrawOneCoinWrapped(_lpTokenAmount, i, 0.1, true);
    },

    async withdrawOneCoinWrapped(lpTokenAmount: number | string, coin: string | number, slippage?: number): Promise<string> {
        // @ts-ignore
        const [_lpTokenAmount, i] = await _withdrawOneCoinWrappedCheck.call(this, lpTokenAmount, coin);

        // @ts-ignore
        return await this._withdrawOneCoinWrapped(_lpTokenAmount, i, slippage);
    },
}

// @ts-ignore
export const withdrawOneCoinWrappedMixin: PoolTemplate = {
    // @ts-ignore
    async _withdrawOneCoinWrapped(_lpTokenAmount: bigint, i: number, slippage?: number, estimateGas = false): Promise<string | number | number[]> {
        const _minAmount = await _withdrawOneCoinWrappedMinAmount.call(this, _lpTokenAmount, i, slippage);
        const  contract = curve.contracts[this.address].contract;

        const gas = await contract.remove_liquidity_one_coin.estimateGas(_lpTokenAmount, i, _minAmount, curve.constantOptions);
        if (estimateGas) return smartNumber(gas);

        const gasLimit = mulBy1_3(DIGas(gas));
        return (await contract.remove_liquidity_one_coin(_lpTokenAmount, i, _minAmount, { ...curve.options, gasLimit })).hash
    },

    async withdrawOneCoinWrappedEstimateGas(lpTokenAmount: number | string, coin: string | number): Promise<number> {
        // @ts-ignore
        const [_lpTokenAmount, i] = await _withdrawOneCoinWrappedCheck.call(this, lpTokenAmount, coin);

        // @ts-ignore
        return await this._withdrawOneCoinWrapped(_lpTokenAmount, i, 0.1, true);
    },

    async withdrawOneCoinWrapped(lpTokenAmount: number | string, coin: string | number, slippage?: number): Promise<string> {
        // @ts-ignore
        const [_lpTokenAmount, i] = await _withdrawOneCoinWrappedCheck.call(this, lpTokenAmount, coin);

        // @ts-ignore
        return await this._withdrawOneCoinWrapped(_lpTokenAmount, i, slippage);
    },
}