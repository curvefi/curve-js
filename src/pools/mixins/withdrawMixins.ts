import { ethers } from "ethers";
import { PoolTemplate } from "../PoolTemplate";
import { curve } from "../../curve";
import { _ensureAllowance, fromBN, hasAllowance, toBN, parseUnits } from "../../utils";

// @ts-ignore
async function _withdrawCheck(this: PoolTemplate, lpTokenAmount: number | string, estimateGas = false): Promise<ethers.BigNumber> {
    const lpTokenBalance = (await this.wallet.lpTokenBalances())['lpToken'];
    if (Number(lpTokenBalance) < Number(lpTokenAmount)) {
        throw Error(`Not enough LP tokens. Actual: ${lpTokenBalance}, required: ${lpTokenAmount}`);
    }

    if (estimateGas && this.zap && !(await hasAllowance([this.lpToken], [lpTokenAmount], curve.signerAddress, this.zap))) {
        throw Error("Token allowance is needed to estimate gas")
    }

    if (!estimateGas) await curve.updateFeeData();

    return parseUnits(lpTokenAmount);
}

async function _withdrawMinAmounts(this: PoolTemplate, _lpTokenAmount: ethers.BigNumber, slippage = 0.5): Promise<ethers.BigNumber[]> {
    const expectedAmounts = await this.withdrawExpected(ethers.utils.formatUnits(_lpTokenAmount));
    const _expectedAmounts = expectedAmounts.map((a, i) => ethers.utils.parseUnits(a, this.underlyingDecimals[i]));
    const minRecvAmountsBN = _expectedAmounts.map((_a, i) => toBN(_a, this.underlyingDecimals[i]).times(100 - slippage).div(100));

    return minRecvAmountsBN.map((a, i) => fromBN(a, this.underlyingDecimals[i]));
}

// @ts-ignore
export const withdrawMetaFactoryMixin: PoolTemplate = {
    // @ts-ignore
    async _withdraw(_lpTokenAmount: ethers.BigNumber, slippage?: number, estimateGas = false): Promise<string | number> {
        if (!estimateGas) await _ensureAllowance([this.lpToken], [_lpTokenAmount], this.zap as string);

        const _minAmounts = await _withdrawMinAmounts.call(this, _lpTokenAmount, slippage);
        const contract = curve.contracts[this.zap as string].contract;

        const gas = await contract.estimateGas.remove_liquidity(this.address, _lpTokenAmount, _minAmounts, curve.constantOptions);
        if (estimateGas) return gas.toNumber()

        const gasLimit = gas.mul(130).div(100);
        return (await contract.remove_liquidity(this.address, _lpTokenAmount, _minAmounts, { ...curve.options, gasLimit })).hash;
    },

    async withdrawEstimateGas(lpTokenAmount: number | string): Promise<number> {
        // @ts-ignore
        const _lpTokenAmount = await _withdrawCheck.call(this, lpTokenAmount, true);

        // @ts-ignore
        return await this._withdraw(_lpTokenAmount, 0.1, true);
    },

    async withdraw(lpTokenAmount: number | string, slippage?: number): Promise<string> {
        // @ts-ignore
        const _lpTokenAmount = await _withdrawCheck.call(this, lpTokenAmount);

        // @ts-ignore
        return await this._withdraw(_lpTokenAmount, slippage);
    },
}

// @ts-ignore
export const withdrawCryptoMetaFactoryMixin: PoolTemplate = {
    // @ts-ignore
    async _withdraw(_lpTokenAmount: ethers.BigNumber, slippage?: number, estimateGas = false): Promise<string | number> {
        if (!estimateGas) await _ensureAllowance([this.lpToken], [_lpTokenAmount], this.zap as string);

        const _minAmounts = await _withdrawMinAmounts.call(this, _lpTokenAmount, slippage);
        const contract = curve.contracts[this.zap as string].contract;

        const gas = await contract.estimateGas.remove_liquidity(this.address, _lpTokenAmount, _minAmounts, true, curve.constantOptions);
        if (estimateGas) return gas.toNumber()

        const gasLimit = gas.mul(130).div(100);
        return (await contract.remove_liquidity(this.address, _lpTokenAmount, _minAmounts, true, { ...curve.options, gasLimit })).hash;
    },

    async withdrawEstimateGas(lpTokenAmount: number | string): Promise<number> {
        // @ts-ignore
        const _lpTokenAmount = await _withdrawCheck.call(this, lpTokenAmount, true);

        // @ts-ignore
        return await this._withdraw(_lpTokenAmount, 0.1, true);
    },

    async withdraw(lpTokenAmount: number | string, slippage?: number): Promise<string> {
        // @ts-ignore
        const _lpTokenAmount = await _withdrawCheck.call(this, lpTokenAmount);

        // @ts-ignore
        return await this._withdraw(_lpTokenAmount, slippage);
    },
}

// @ts-ignore
export const withdrawZapMixin: PoolTemplate = {
    // @ts-ignore
    async _withdraw(_lpTokenAmount: ethers.BigNumber, slippage?: number, estimateGas = false): Promise<string | number> {
        if (!estimateGas) await _ensureAllowance([this.lpToken], [_lpTokenAmount], this.zap as string);

        // @ts-ignore
        const _minAmounts = await _withdrawMinAmounts.call(this, _lpTokenAmount, slippage);
        const contract = curve.contracts[this.zap as string].contract;

        const gas = await contract.estimateGas.remove_liquidity(_lpTokenAmount, _minAmounts, curve.constantOptions);
        if (estimateGas) return gas.toNumber();

        const gasLimit = gas.mul(130).div(100);
        return (await contract.remove_liquidity(_lpTokenAmount, _minAmounts, { ...curve.options, gasLimit })).hash;
    },

    async withdrawEstimateGas(lpTokenAmount: number | string): Promise<number> {
        // @ts-ignore
        const _lpTokenAmount = await _withdrawCheck.call(this, lpTokenAmount, true);

        // @ts-ignore
        return await this._withdraw(_lpTokenAmount, 0.1, true);
    },

    async withdraw(lpTokenAmount: number | string, slippage?: number): Promise<string> {
        // @ts-ignore
        const _lpTokenAmount = await _withdrawCheck.call(this, lpTokenAmount);

        // @ts-ignore
        return await this._withdraw(_lpTokenAmount, slippage);
    },
}

// @ts-ignore
export const withdrawLendingOrCryptoMixin: PoolTemplate = {
    // @ts-ignore
    async _withdraw(_lpTokenAmount: ethers.BigNumber, slippage?: number, estimateGas = false): Promise<string | number> {
        // @ts-ignore
        const _minAmounts = await _withdrawMinAmounts.call(this, _lpTokenAmount, slippage);
        const contract = curve.contracts[this.address].contract;

        const gas = await contract.estimateGas.remove_liquidity(_lpTokenAmount, _minAmounts, true, curve.constantOptions);
        if (estimateGas) return gas.toNumber()

        const gasLimit = gas.mul(130).div(100);
        return (await contract.remove_liquidity(_lpTokenAmount, _minAmounts, true, { ...curve.options, gasLimit })).hash;
    },

    async withdrawEstimateGas(lpTokenAmount: number | string): Promise<number> {
        // @ts-ignore
        const _lpTokenAmount = await _withdrawCheck.call(this, lpTokenAmount, true);

        // @ts-ignore
        return await this._withdraw(_lpTokenAmount, 0.1, true);
    },

    async withdraw(lpTokenAmount: number | string, slippage?: number): Promise<string> {
        // @ts-ignore
        const _lpTokenAmount = await _withdrawCheck.call(this, lpTokenAmount);

        // @ts-ignore
        return await this._withdraw(_lpTokenAmount, slippage);
    },
}

// @ts-ignore
export const withdrawPlainMixin: PoolTemplate = {
    // @ts-ignore
    async _withdraw(_lpTokenAmount: ethers.BigNumber, slippage?: number, estimateGas = false): Promise<string | number> {
        // @ts-ignore
        const _minAmounts = await _withdrawMinAmounts.call(this, _lpTokenAmount, slippage);
        const contract = curve.contracts[this.address].contract;

        const gas = await contract.estimateGas.remove_liquidity(_lpTokenAmount, _minAmounts, curve.constantOptions);
        if (estimateGas) return gas.toNumber();

        const gasLimit = gas.mul(130).div(100);
        return (await contract.remove_liquidity(_lpTokenAmount, _minAmounts, { ...curve.options, gasLimit })).hash;
    },

    async withdrawEstimateGas(lpTokenAmount: number | string): Promise<number> {
        // @ts-ignore
        const _lpTokenAmount = await _withdrawCheck.call(this, lpTokenAmount, true);

        // @ts-ignore
        return await this._withdraw(_lpTokenAmount, 0.1, true);
    },

    async withdraw(lpTokenAmount: number | string, slippage?: number): Promise<string> {
        // @ts-ignore
        const _lpTokenAmount = await _withdrawCheck.call(this, lpTokenAmount);

        // @ts-ignore
        return await this._withdraw(_lpTokenAmount, slippage);
    },
}