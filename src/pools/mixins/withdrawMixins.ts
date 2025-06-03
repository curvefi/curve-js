import {PoolTemplate} from "../PoolTemplate.js";
import {_ensureAllowance, DIGas, fromBN, hasAllowance, mulBy1_3, parseUnits, smartNumber, toBN} from '../../utils.js';

async function _withdrawCheck(this: PoolTemplate, lpTokenAmount: number | string, estimateGas = false): Promise<bigint> {
    const lpTokenBalance = (await this.wallet.lpTokenBalances())['lpToken'];
    if (Number(lpTokenBalance) < Number(lpTokenAmount)) {
        throw Error(`Not enough LP tokens. Actual: ${lpTokenBalance}, required: ${lpTokenAmount}`);
    }

    if (estimateGas && this.zap && !(await hasAllowance.call(this.curve, [this.lpToken], [lpTokenAmount], this.curve.signerAddress, this.zap))) {
        throw Error("Token allowance is needed to estimate gas")
    }

    if (!estimateGas) await this.curve.updateFeeData();

    return parseUnits(lpTokenAmount);
}

async function _withdrawMinAmounts(this: PoolTemplate, _lpTokenAmount: bigint, slippage = 0.5): Promise<bigint[]> {
    const expectedAmounts = await this.withdrawExpected(this.curve.formatUnits(_lpTokenAmount));
    const _expectedAmounts = expectedAmounts.map((a, i) => this.curve.parseUnits(a, this.underlyingDecimals[i]));
    const minRecvAmountsBN = _expectedAmounts.map((_a, i) => toBN(_a, this.underlyingDecimals[i]).times(100 - slippage).div(100));

    return minRecvAmountsBN.map((a, i) => fromBN(a, this.underlyingDecimals[i]));
}

export const withdrawMetaFactoryMixin = {
    async _withdraw(this: PoolTemplate, _lpTokenAmount: bigint, slippage?: number, estimateGas = false): Promise<string | number | number[]> {
        if (!estimateGas) await _ensureAllowance.bind(this.curve, [this.lpToken], [_lpTokenAmount], this.zap as string);

        const _minAmounts = await _withdrawMinAmounts.call(this, _lpTokenAmount, slippage);
        const contract = this.curve.contracts[this.zap as string].contract;

        const gas = await contract.remove_liquidity.estimateGas(this.address, _lpTokenAmount, _minAmounts, this.curve.constantOptions);
        if (estimateGas) return smartNumber(gas)
        
        const gasLimit = mulBy1_3(DIGas(gas));
        return (await contract.remove_liquidity(this.address, _lpTokenAmount, _minAmounts, { ...this.curve.options, gasLimit })).hash;
    },

    async withdrawEstimateGas(this: PoolTemplate, lpTokenAmount: number | string): Promise<number | number[]> {
        const _lpTokenAmount = await _withdrawCheck.call(this, lpTokenAmount, true);
        return await withdrawMetaFactoryMixin._withdraw.call(this, _lpTokenAmount, 0.1, true) as number | number[];
    },

    async withdraw(this: PoolTemplate, lpTokenAmount: number | string, slippage?: number): Promise<string> {
        const _lpTokenAmount = await _withdrawCheck.call(this, lpTokenAmount);
        return await withdrawMetaFactoryMixin._withdraw.call(this, _lpTokenAmount, slippage) as string;
    },
}

export const withdrawCryptoMetaFactoryMixin = {
    async _withdraw(this: PoolTemplate, _lpTokenAmount: bigint, slippage?: number, estimateGas = false): Promise<string | number | number[]> {
        if (!estimateGas) await _ensureAllowance.bind(this.curve, [this.lpToken], [_lpTokenAmount], this.zap as string);

        const _minAmounts = await _withdrawMinAmounts.call(this, _lpTokenAmount, slippage);
        const contract = this.curve.contracts[this.zap as string].contract;

        const gas = await contract.remove_liquidity.estimateGas(this.address, _lpTokenAmount, _minAmounts, true, this.curve.constantOptions);
        if (estimateGas) return smartNumber(gas)

        const gasLimit = mulBy1_3(DIGas(gas));
        return (await contract.remove_liquidity(this.address, _lpTokenAmount, _minAmounts, true, { ...this.curve.options, gasLimit })).hash;
    },

    async withdrawEstimateGas(this: PoolTemplate, lpTokenAmount: number | string): Promise<number | number[]> {
        const _lpTokenAmount = await _withdrawCheck.call(this, lpTokenAmount, true);
        return await withdrawCryptoMetaFactoryMixin._withdraw.call(this, _lpTokenAmount, 0.1, true) as number | number[];
    },

    async withdraw(this: PoolTemplate, lpTokenAmount: number | string, slippage?: number): Promise<string> {
        const _lpTokenAmount = await _withdrawCheck.call(this, lpTokenAmount);
        return await withdrawCryptoMetaFactoryMixin._withdraw.call(this, _lpTokenAmount, slippage) as string;
    },
}

export const withdrawZapMixin = {
    async _withdraw(this: PoolTemplate, _lpTokenAmount: bigint, slippage?: number, estimateGas = false): Promise<string | number | number[]> {
        if (!estimateGas) await _ensureAllowance.bind(this.curve, [this.lpToken], [_lpTokenAmount], this.zap as string);

        const _minAmounts = await _withdrawMinAmounts.call(this, _lpTokenAmount, slippage);
        const contract = this.curve.contracts[this.zap as string].contract;

        const args: any[] = [_lpTokenAmount, _minAmounts];
        if (`remove_liquidity(uint256,uint256[${this.underlyingCoinAddresses.length}],bool)` in contract) args.push(true);
        const gas = await contract.remove_liquidity.estimateGas(...args, this.curve.constantOptions);
        if (estimateGas) return smartNumber(gas);

        const gasLimit = mulBy1_3(DIGas(gas));
        return (await contract.remove_liquidity(...args, { ...this.curve.options, gasLimit })).hash;
    },

    async withdrawEstimateGas(this: PoolTemplate, lpTokenAmount: number | string): Promise<number | number[]> {
        const _lpTokenAmount = await _withdrawCheck.call(this, lpTokenAmount, true);
        return await withdrawZapMixin._withdraw.call(this, _lpTokenAmount, 0.1, true) as number | number[];
    },

    async withdraw(this: PoolTemplate, lpTokenAmount: number | string, slippage?: number): Promise<string> {
        const _lpTokenAmount = await _withdrawCheck.call(this, lpTokenAmount);
        return await withdrawZapMixin._withdraw.call(this, _lpTokenAmount, slippage) as string;
    },
}

export const withdrawLendingOrCryptoMixin = {
    async _withdraw(this: PoolTemplate, _lpTokenAmount: bigint, slippage?: number, estimateGas = false): Promise<string | number | number[]> {
        const _minAmounts = await _withdrawMinAmounts.call(this, _lpTokenAmount, slippage);
        const contract = this.curve.contracts[this.address].contract;

        const gas = await contract.remove_liquidity.estimateGas(_lpTokenAmount, _minAmounts, true, this.curve.constantOptions);
        if (estimateGas) return smartNumber(gas)

        const gasLimit = mulBy1_3(DIGas(gas));
        return (await contract.remove_liquidity(_lpTokenAmount, _minAmounts, true, { ...this.curve.options, gasLimit })).hash;
    },

    async withdrawEstimateGas(this: PoolTemplate, lpTokenAmount: number | string): Promise<number | number[]> {
        const _lpTokenAmount = await _withdrawCheck.call(this, lpTokenAmount, true);
        return await withdrawLendingOrCryptoMixin._withdraw.call(this, _lpTokenAmount, 0.1, true) as number | number[];
    },

    async withdraw(this: PoolTemplate, lpTokenAmount: number | string, slippage?: number): Promise<string> {
        const _lpTokenAmount = await _withdrawCheck.call(this, lpTokenAmount);
        return await withdrawLendingOrCryptoMixin._withdraw.call(this, _lpTokenAmount, slippage) as string;
    },
}

export const withdrawPlainMixin = {
    async _withdraw(this: PoolTemplate, _lpTokenAmount: bigint, slippage?: number, estimateGas = false): Promise<string | number | number[]> {
        const _minAmounts = await _withdrawMinAmounts.call(this, _lpTokenAmount, slippage);
        const contract = this.curve.contracts[this.address].contract;

        const gas = await contract.remove_liquidity.estimateGas(_lpTokenAmount, _minAmounts, this.curve.constantOptions);
        if (estimateGas) return smartNumber(gas);

        const gasLimit = mulBy1_3(DIGas(gas));
        return (await contract.remove_liquidity(_lpTokenAmount, _minAmounts, { ...this.curve.options, gasLimit })).hash;
    },

    async withdrawEstimateGas(this: PoolTemplate, lpTokenAmount: number | string): Promise<number | number[]> {
        const _lpTokenAmount = await _withdrawCheck.call(this, lpTokenAmount, true);

        return await withdrawPlainMixin._withdraw.call(this, _lpTokenAmount, 0.1, true) as number | number[];
    },

    async withdraw(this: PoolTemplate, lpTokenAmount: number | string, slippage?: number): Promise<string> {
        const _lpTokenAmount = await _withdrawCheck.call(this, lpTokenAmount);

        return await withdrawPlainMixin._withdraw.call(this, _lpTokenAmount, slippage) as string;
    },
}