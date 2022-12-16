import { ethers } from "ethers";
import { PoolTemplate } from "../PoolTemplate";
import { curve } from "../../curve";
import { _ensureAllowance, fromBN, hasAllowance, toBN, parseUnits } from "../../utils";

// @ts-ignore
async function _withdrawOneCoinCheck(this: PoolTemplate, lpTokenAmount: number | string, coin: string | number, estimateGas = false):
    Promise<[ethers.BigNumber, number]>
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

async function _withdrawOneCoinMinAmount(this: PoolTemplate, _lpTokenAmount: ethers.BigNumber, i: number, slippage = 0.5): Promise<ethers.BigNumber> {
    // @ts-ignore
    const _expectedLpTokenAmount = await this._withdrawOneCoinExpected(_lpTokenAmount, i);
    const minAmountBN = toBN(_expectedLpTokenAmount).times(100 - slippage).div(100);

    return fromBN(minAmountBN);
}

// @ts-ignore
export const withdrawOneCoinMetaFactoryMixin: PoolTemplate = {
    // @ts-ignore
    async _withdrawOneCoin(_lpTokenAmount: ethers.BigNumber, i: number, slippage?: number, estimateGas = false): Promise<string | number> {
        if (!estimateGas) await _ensureAllowance([this.lpToken], [_lpTokenAmount], this.zap as string);

        const _minAmount = await _withdrawOneCoinMinAmount.call(this, _lpTokenAmount, i, slippage);
        const  contract = curve.contracts[this.zap as string].contract;

        const gas = await contract.estimateGas.remove_liquidity_one_coin(this.address, _lpTokenAmount, i, _minAmount, curve.constantOptions);
        if (estimateGas) return gas.toNumber()

        const gasLimit = gas.mul(130).div(100);
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
    async _withdrawOneCoin(_lpTokenAmount: ethers.BigNumber, i: number, slippage?: number, estimateGas = false): Promise<string | number> {
        if (!estimateGas) await _ensureAllowance([this.lpToken], [_lpTokenAmount], this.zap as string);

        const _minAmount = await _withdrawOneCoinMinAmount.call(this, _lpTokenAmount, i, slippage);
        const  contract = curve.contracts[this.zap as string].contract;

        const gas = await contract.estimateGas.remove_liquidity_one_coin(this.address, _lpTokenAmount, i, _minAmount, true, curve.constantOptions);
        if (estimateGas) return gas.toNumber()

        const gasLimit = gas.mul(130).div(100);
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
    async _withdrawOneCoin(_lpTokenAmount: ethers.BigNumber, i: number, slippage?: number, estimateGas = false): Promise<string | number> {
        if (!estimateGas) await _ensureAllowance([this.lpToken], [_lpTokenAmount], this.zap as string);

        const _minAmount = await _withdrawOneCoinMinAmount.call(this, _lpTokenAmount, i, slippage);
        const  contract = curve.contracts[this.zap as string].contract;

        const gas = await contract.estimateGas.remove_liquidity_one_coin(_lpTokenAmount, i, _minAmount, curve.constantOptions);
        if (estimateGas) return gas.toNumber();

        const gasLimit = gas.mul(130).div(100);
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

// @ts-ignore
export const withdrawOneCoinLendingOrCryptoMixin: PoolTemplate = {
    // @ts-ignore
    async _withdrawOneCoin(_lpTokenAmount: ethers.BigNumber, i: number, slippage?: number, estimateGas = false): Promise<string | number> {
        const _minAmount = await _withdrawOneCoinMinAmount.call(this, _lpTokenAmount, i, slippage);
        const  contract = curve.contracts[this.address].contract;

        const gas = await contract.estimateGas.remove_liquidity_one_coin(_lpTokenAmount, i, _minAmount, true, curve.constantOptions);
        if (estimateGas) return gas.toNumber();

        const gasLimit = curve.chainId === 137 && this.id === 'ren' ? gas.mul(160).div(100) : gas.mul(130).div(100);
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
    async _withdrawOneCoin(_lpTokenAmount: ethers.BigNumber, i: number, slippage?: number, estimateGas = false): Promise<string | number> {
        const _minAmount = await _withdrawOneCoinMinAmount.call(this, _lpTokenAmount, i, slippage);
        const  contract = curve.contracts[this.address].contract;

        const gas = await contract.estimateGas.remove_liquidity_one_coin(_lpTokenAmount, i, _minAmount, curve.constantOptions);
        if (estimateGas) return gas.toNumber();

        const gasLimit = gas.mul(130).div(100);
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