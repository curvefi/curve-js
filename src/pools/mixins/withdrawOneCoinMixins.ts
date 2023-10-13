import { ethers } from "ethers";
import { curve } from "../../curve.js";
import { PoolTemplate } from "../PoolTemplate.js";
import { _ensureAllowance, fromBN, hasAllowance, toBN, parseUnits, mulBy1_3, smartNumber, DIGas } from '../../utils.js';

// @ts-ignore
async function _withdrawOneCoinCheck(this: PoolTemplate, lpTokenAmount: number | string, coin: string | number, estimateGas = false):
    Promise<[bigint, number]>
{
    const lpTokenBalance = (await this.wallet.lpTokenBalances())['lpToken'];
    if (Number(lpTokenBalance) < Number(lpTokenAmount)) {
        throw Error(`Not enough LP tokens. Actual: ${lpTokenBalance}, required: ${lpTokenAmount}`);
    }

    if (estimateGas && this.zap && !(await hasAllowance([this.lpToken], [lpTokenAmount], curve.signerAddress, this.zap))) {
        throw Error("Token allowance is needed to estimate gas");
    }

    if (!estimateGas) await curve.updateFeeData();

    // @ts-ignore
    const i = this._getCoinIdx(coin);
    const _lpTokenAmount = parseUnits(lpTokenAmount);

    return [_lpTokenAmount, i];
}

async function _withdrawOneCoinMinAmount(this: PoolTemplate, _lpTokenAmount: bigint, i: number, slippage = 0.5): Promise<bigint> {
    // @ts-ignore
    const _expectedLpTokenAmount = await this._withdrawOneCoinExpected(_lpTokenAmount, i);
    const minAmountBN = toBN(_expectedLpTokenAmount).times(100 - slippage).div(100);

    return fromBN(minAmountBN);
}

// @ts-ignore
export const withdrawOneCoinMetaFactoryMixin: PoolTemplate = {
    // @ts-ignore
    async _withdrawOneCoin(_lpTokenAmount: bigint, i: number, slippage?: number, estimateGas = false): Promise<string | number | number[]> {
        if (!estimateGas) await _ensureAllowance([this.lpToken], [_lpTokenAmount], this.zap as string);

        const _minAmount = await _withdrawOneCoinMinAmount.call(this, _lpTokenAmount, i, slippage);
        const  contract = curve.contracts[this.zap as string].contract;

        const gas = await contract.remove_liquidity_one_coin.estimateGas(this.address, _lpTokenAmount, i, _minAmount, curve.constantOptions);
        if (estimateGas) return smartNumber(gas)
        
        const gasLimit = mulBy1_3(DIGas(gas));
        return (await contract.remove_liquidity_one_coin(this.address, _lpTokenAmount, i, _minAmount, { ...curve.options, gasLimit })).hash
    },

    async withdrawOneCoinEstimateGas(lpTokenAmount: number | string, coin: string | number): Promise<number> {
        // @ts-ignore
        const [_lpTokenAmount, i] = await _withdrawOneCoinCheck.call(this, lpTokenAmount, coin, true);

        // @ts-ignore
        return await this._withdrawOneCoin(_lpTokenAmount, i, 0.1, true);
    },

    async withdrawOneCoin(lpTokenAmount: number | string, coin: string | number, slippage?: number): Promise<string> {
        // @ts-ignore
        const [_lpTokenAmount, i] = await _withdrawOneCoinCheck.call(this, lpTokenAmount, coin);

        // @ts-ignore
        return await this._withdrawOneCoin(_lpTokenAmount, i, slippage);
    },
}

// @ts-ignore
export const withdrawOneCoinCryptoMetaFactoryMixin: PoolTemplate = {
    // @ts-ignore
    async _withdrawOneCoin(_lpTokenAmount: bigint, i: number, slippage?: number, estimateGas = false): Promise<string | number | number[]> {
        if (!estimateGas) await _ensureAllowance([this.lpToken], [_lpTokenAmount], this.zap as string);

        const _minAmount = await _withdrawOneCoinMinAmount.call(this, _lpTokenAmount, i, slippage);
        const  contract = curve.contracts[this.zap as string].contract;

        const gas = await contract.remove_liquidity_one_coin.estimateGas(this.address, _lpTokenAmount, i, _minAmount, true, curve.constantOptions);
        if (estimateGas) return smartNumber(gas)
        
        const gasLimit = mulBy1_3(DIGas(gas));
        return (await contract.remove_liquidity_one_coin(this.address, _lpTokenAmount, i, _minAmount, true, { ...curve.options, gasLimit })).hash
    },

    async withdrawOneCoinEstimateGas(lpTokenAmount: number | string, coin: string | number): Promise<number> {
        // @ts-ignore
        const [_lpTokenAmount, i] = await _withdrawOneCoinCheck.call(this, lpTokenAmount, coin, true);

        // @ts-ignore
        return await this._withdrawOneCoin(_lpTokenAmount, i, 0.1, true);
    },

    async withdrawOneCoin(lpTokenAmount: number | string, coin: string | number, slippage?: number): Promise<string> {
        // @ts-ignore
        const [_lpTokenAmount, i] = await _withdrawOneCoinCheck.call(this, lpTokenAmount, coin);

        // @ts-ignore
        return await this._withdrawOneCoin(_lpTokenAmount, i, slippage);
    },
}

// @ts-ignore
export const withdrawOneCoinZapMixin: PoolTemplate = {
    // @ts-ignore
    async _withdrawOneCoin(_lpTokenAmount: bigint, i: number, slippage?: number, estimateGas = false): Promise<string | number | number[]> {
        if (!estimateGas) await _ensureAllowance([this.lpToken], [_lpTokenAmount], this.zap as string);

        const _minAmount = await _withdrawOneCoinMinAmount.call(this, _lpTokenAmount, i, slippage);
        const  contract = curve.contracts[this.zap as string].contract;

        const args: any[] = [_lpTokenAmount, i, _minAmount];
        if (`remove_liquidity_one_coin(uint256,uint256,uint256,bool)` in contract) args.push(true);
        const gas = await contract.remove_liquidity_one_coin.estimateGas(...args, curve.constantOptions);
        if (estimateGas) return smartNumber(gas);

        const gasLimit = mulBy1_3(DIGas(gas));
        return (await contract.remove_liquidity_one_coin(...args, { ...curve.options, gasLimit })).hash
    },

    async withdrawOneCoinEstimateGas(lpTokenAmount: number | string, coin: string | number): Promise<number> {
        // @ts-ignore
        const [_lpTokenAmount, i] = await _withdrawOneCoinCheck.call(this, lpTokenAmount, coin, true);

        // @ts-ignore
        return await this._withdrawOneCoin(_lpTokenAmount, i, 0.1, true);
    },

    async withdrawOneCoin(lpTokenAmount: number | string, coin: string | number, slippage?: number): Promise<string> {
        // @ts-ignore
        const [_lpTokenAmount, i] = await _withdrawOneCoinCheck.call(this, lpTokenAmount, coin);

        // @ts-ignore
        return await this._withdrawOneCoin(_lpTokenAmount, i, slippage);
    },
}

// @ts-ignore
export const withdrawOneCoinLendingOrCryptoMixin: PoolTemplate = {
    // @ts-ignore
    async _withdrawOneCoin(_lpTokenAmount: bigint, i: number, slippage?: number, estimateGas = false): Promise<string | number | number[]> {
        const _minAmount = await _withdrawOneCoinMinAmount.call(this, _lpTokenAmount, i, slippage);
        const  contract = curve.contracts[this.address].contract;

        const gas = await contract.remove_liquidity_one_coin.estimateGas(_lpTokenAmount, i, _minAmount, true, curve.constantOptions);
        if (estimateGas) return smartNumber(gas);

        const gasLimit = curve.chainId === 137 && this.id === 'ren' ? gas * curve.parseUnits("160", 0) / curve.parseUnits("100", 0) : mulBy1_3(DIGas(gas));
        return (await contract.remove_liquidity_one_coin(_lpTokenAmount, i, _minAmount, true, { ...curve.options, gasLimit })).hash
    },

    async withdrawOneCoinEstimateGas(lpTokenAmount: number | string, coin: string | number): Promise<number> {
        // @ts-ignore
        const [_lpTokenAmount, i] = await _withdrawOneCoinCheck.call(this, lpTokenAmount, coin, true);

        // @ts-ignore
        return await this._withdrawOneCoin(_lpTokenAmount, i, 0.1, true);
    },

    async withdrawOneCoin(lpTokenAmount: number | string, coin: string | number, slippage?: number): Promise<string> {
        // @ts-ignore
        const [_lpTokenAmount, i] = await _withdrawOneCoinCheck.call(this, lpTokenAmount, coin);

        // @ts-ignore
        return await this._withdrawOneCoin(_lpTokenAmount, i, slippage);
    },
}

// @ts-ignore
export const withdrawOneCoinPlainMixin: PoolTemplate = {
    // @ts-ignore
    async _withdrawOneCoin(_lpTokenAmount: bigint, i: number, slippage?: number, estimateGas = false): Promise<string | number | number[]> {
        const _minAmount = await _withdrawOneCoinMinAmount.call(this, _lpTokenAmount, i, slippage);
        const  contract = curve.contracts[this.address].contract;

        const gas = await contract.remove_liquidity_one_coin.estimateGas(_lpTokenAmount, i, _minAmount, curve.constantOptions);
        if (estimateGas) return smartNumber(gas);

        const gasLimit = mulBy1_3(DIGas(gas));
        return (await contract.remove_liquidity_one_coin(_lpTokenAmount, i, _minAmount, { ...curve.options, gasLimit })).hash
    },

    async withdrawOneCoinEstimateGas(lpTokenAmount: number | string, coin: string | number): Promise<number> {
        // @ts-ignore
        const [_lpTokenAmount, i] = await _withdrawOneCoinCheck.call(this, lpTokenAmount, coin, true);

        // @ts-ignore
        return await this._withdrawOneCoin(_lpTokenAmount, i, 0.1, true);
    },

    async withdrawOneCoin(lpTokenAmount: number | string, coin: string | number, slippage?: number): Promise<string> {
        // @ts-ignore
        const [_lpTokenAmount, i] = await _withdrawOneCoinCheck.call(this, lpTokenAmount, coin);

        // @ts-ignore
        return await this._withdrawOneCoin(_lpTokenAmount, i, slippage);
    },
}