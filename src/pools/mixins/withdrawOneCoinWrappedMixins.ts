import {PoolTemplate} from "../PoolTemplate.js";
import {IMethodInfo} from "../../interfaces.js";
import {abiInfoBuild, DIGas, fromBN, mulBy1_3, parseUnits, smartNumber, toBN} from '../../utils.js';

async function _withdrawOneCoinWrappedCheck(this: PoolTemplate, lpTokenAmount: number | string, coin: string | number):
    Promise<[bigint, number]>
{
    const lpTokenBalance = (await this.wallet.lpTokenBalances())['lpToken'];
    if (Number(lpTokenBalance) < Number(lpTokenAmount)) {
        throw Error(`Not enough LP tokens. Actual: ${lpTokenBalance}, required: ${lpTokenAmount}`);
    }

    await this.curve.updateFeeData();

    const i = this._getCoinIdx(coin, false);
    const _lpTokenAmount = parseUnits(lpTokenAmount);

    return [_lpTokenAmount, i];
}

async function _withdrawOneCoinWrappedMinAmount(this: PoolTemplate, _lpTokenAmount: bigint, i: number, slippage = 0.5): Promise<bigint> {
    const _expectedLpTokenAmount = await this._withdrawOneCoinWrappedExpected(_lpTokenAmount, i);
    const minAmountBN = toBN(_expectedLpTokenAmount).times(100 - slippage).div(100);

    return fromBN(minAmountBN);
}

export const withdrawOneCoinWrappedLendingOrCryptoMixin = {
    async _withdrawOneCoinWrapped(this: PoolTemplate, _lpTokenAmount: bigint, i: number, slippage?: number, estimateGas = false, getInfo = false): Promise<string | number | number[] | IMethodInfo> {
        const contract = this.curve.contracts[this.address].contract;

        if (getInfo) {
            return abiInfoBuild(this.address, 'remove_liquidity_one_coin', contract.remove_liquidity_one_coin.fragment);
        }

        const _minAmount = await _withdrawOneCoinWrappedMinAmount.call(this, _lpTokenAmount, i, slippage);

        const gas = await contract.remove_liquidity_one_coin.estimateGas(_lpTokenAmount, i, _minAmount, false, this.curve.constantOptions);
        if (estimateGas) return smartNumber(gas);

        const gasLimit = this.curve.chainId === 137 && this.id === 'ren' ? DIGas(gas) * this.curve.parseUnits("160", 0) / this.curve.parseUnits("100", 0) : mulBy1_3(DIGas(gas));
        return (await contract.remove_liquidity_one_coin(_lpTokenAmount, i, _minAmount, false, { ...this.curve.options, gasLimit })).hash
    },

    async withdrawOneCoinWrappedEstimateGas(this: PoolTemplate, lpTokenAmount: number | string, coin: string | number): Promise<number> {
        const [_lpTokenAmount, i] = await _withdrawOneCoinWrappedCheck.call(this, lpTokenAmount, coin);
        return await withdrawOneCoinWrappedLendingOrCryptoMixin._withdrawOneCoinWrapped.call(this, _lpTokenAmount, i, 0.1, true) as number;
    },

    async withdrawOneCoinWrapped(this: PoolTemplate, lpTokenAmount: number | string, coin: string | number, slippage?: number): Promise<string> {
        const [_lpTokenAmount, i] = await _withdrawOneCoinWrappedCheck.call(this, lpTokenAmount, coin);
        return await withdrawOneCoinWrappedLendingOrCryptoMixin._withdrawOneCoinWrapped.call(this, _lpTokenAmount, i, slippage) as string;
    },

    async getWithdrawOneCoinWrappedInfo(this: PoolTemplate): Promise<IMethodInfo> {
        return await withdrawOneCoinWrappedLendingOrCryptoMixin._withdrawOneCoinWrapped.call(this, BigInt(0), 0, 0, false, true) as IMethodInfo;
    },
}

export const withdrawOneCoinWrappedMixin = {
    async _withdrawOneCoinWrapped(this: PoolTemplate, _lpTokenAmount: bigint, i: number, slippage?: number, estimateGas = false, getInfo = false): Promise<string | number | number[] | IMethodInfo> {
        const contract = this.curve.contracts[this.address].contract;

        if (getInfo) {
            return abiInfoBuild(this.address, 'remove_liquidity_one_coin', contract.remove_liquidity_one_coin.fragment);
        }

        const _minAmount = await _withdrawOneCoinWrappedMinAmount.call(this, _lpTokenAmount, i, slippage);

        const gas = await contract.remove_liquidity_one_coin.estimateGas(_lpTokenAmount, i, _minAmount, this.curve.constantOptions);
        if (estimateGas) return smartNumber(gas);

        const gasLimit = mulBy1_3(DIGas(gas));
        return (await contract.remove_liquidity_one_coin(_lpTokenAmount, i, _minAmount, { ...this.curve.options, gasLimit })).hash
    },

    async withdrawOneCoinWrappedEstimateGas(this: PoolTemplate, lpTokenAmount: number | string, coin: string | number): Promise<number> {
        const [_lpTokenAmount, i] = await _withdrawOneCoinWrappedCheck.call(this, lpTokenAmount, coin);
        return await withdrawOneCoinWrappedMixin._withdrawOneCoinWrapped.call(this, _lpTokenAmount, i, 0.1, true) as number;
    },

    async withdrawOneCoinWrapped(this: PoolTemplate, lpTokenAmount: number | string, coin: string | number, slippage?: number): Promise<string> {
        const [_lpTokenAmount, i] = await _withdrawOneCoinWrappedCheck.call(this, lpTokenAmount, coin);
        return await withdrawOneCoinWrappedMixin._withdrawOneCoinWrapped.call(this, _lpTokenAmount, i, slippage) as string;
    },

    async getWithdrawOneCoinWrappedInfo(this: PoolTemplate): Promise<IMethodInfo> {
        return await withdrawOneCoinWrappedMixin._withdrawOneCoinWrapped.call(this, BigInt(0), 0, 0, false, true) as IMethodInfo;
    },
}