import {PoolTemplate} from "../PoolTemplate.js";
import {IMethodInfo} from "../../interfaces.js";
import {
    abiInfoBuild,
    _ensureAllowance,
    DIGas,
    fromBN,
    hasAllowance,
    mulBy1_3,
    parseUnits,
    smartNumber,
    toBN,
} from '../../utils.js';

async function _depositCheck(this: PoolTemplate, amounts: (number | string)[], estimateGas = false): Promise<bigint[]> {
    if (amounts.length !== this.underlyingCoinAddresses.length) {
        throw Error(`${this.name} pool has ${this.underlyingCoinAddresses.length} coins (amounts provided for ${amounts.length})`);
    }

    const balances = Object.values(await this.wallet.underlyingCoinBalances());
    for (let i = 0; i < balances.length; i++) {
        if (Number(balances[i]) < Number(amounts[i])) {
            throw Error(`Not enough ${this.underlyingCoins[i]}. Actual: ${balances[i]}, required: ${amounts[i]}`);
        }
    }

    if (estimateGas && !(await hasAllowance.call(this.curve, this.underlyingCoinAddresses, amounts, this.curve.signerAddress, this.zap || this.address))) {
        throw Error("Token allowance is needed to estimate gas")
    }

    if (!estimateGas) await this.curve.updateFeeData();

    return amounts.map((amount, i) => parseUnits(amount, this.underlyingDecimals[i]));
}

async function _depositMinAmount(this: PoolTemplate, _amounts: bigint[], slippage = 0.5): Promise<bigint> {
    const _expectedLpTokenAmount = await this._calcLpTokenAmount(_amounts);
    const minAmountBN = toBN(_expectedLpTokenAmount).times(100 - slippage).div(100);
    return fromBN(minAmountBN);
}

export const depositMetaFactoryMixin = {
    async _deposit(this: PoolTemplate, _amounts: bigint[], slippage?: number, estimateGas = false, getInfo = false): Promise<string | number | number[] | IMethodInfo> {
        const contract = this.curve.contracts[this.zap as string].contract;

        if (getInfo) {
            return abiInfoBuild(this.zap as string, 'add_liquidity', contract.add_liquidity.fragment);
        }

        if (!estimateGas) await _ensureAllowance.call(this.curve, this.underlyingCoinAddresses, _amounts, this.zap as string);

        const _minMintAmount = await _depositMinAmount.call(this, _amounts, slippage);
        const ethIndex = this.curve.getEthIndex(this.underlyingCoinAddresses);
        const value = _amounts[ethIndex] || parseUnits("0");

        const gas = await contract.add_liquidity.estimateGas(this.address, _amounts, _minMintAmount, { ...this.curve.constantOptions, value });
        if (estimateGas) return smartNumber(gas);

        const gasLimit = mulBy1_3(DIGas(gas));
        return (await contract.add_liquidity(this.address, _amounts, _minMintAmount, { ...this.curve.options, gasLimit, value })).hash;
    },

    async depositEstimateGas(this: PoolTemplate, amounts: (number | string)[]) {
        const _amounts = await _depositCheck.call(this, amounts, true);
        return await depositMetaFactoryMixin._deposit.call(this, _amounts, 0.1, true) as number;
    },

    async deposit(this: PoolTemplate, amounts: (number | string)[], slippage?: number) {
        const _amounts = await _depositCheck.call(this, amounts);
        return await depositMetaFactoryMixin._deposit.call(this, _amounts, slippage) as string;
    },

    async getDepositInfo(this: PoolTemplate): Promise<IMethodInfo> {
        return await depositMetaFactoryMixin._deposit.call(this, [], 0, false, true) as IMethodInfo;
    },
}

export const depositCryptoMetaFactoryMixin = {
    async _deposit(this: PoolTemplate, _amounts: bigint[], slippage?: number, estimateGas = false, getInfo = false): Promise<string | number | number[] | IMethodInfo> {
        const contract = this.curve.contracts[this.zap as string].contract;

        if (getInfo) {
            return abiInfoBuild(this.zap as string, 'add_liquidity', contract.add_liquidity.fragment);
        }

        if (!estimateGas) await _ensureAllowance.call(this.curve, this.underlyingCoinAddresses, _amounts, this.zap as string);

        const _minMintAmount = await _depositMinAmount.call(this, _amounts, slippage);
        const ethIndex = this.curve.getEthIndex(this.underlyingCoinAddresses);
        const value = _amounts[ethIndex] || this.curve.parseUnits("0");

        const gas = await contract.add_liquidity.estimateGas(this.address, _amounts, _minMintAmount, true, { ...this.curve.constantOptions, value });
        if (estimateGas) return smartNumber(gas);

        const gasLimit = mulBy1_3(DIGas(gas));
        return (await contract.add_liquidity(this.address, _amounts, _minMintAmount, true, { ...this.curve.options, gasLimit, value })).hash;
    },

    async depositEstimateGas(this: PoolTemplate, amounts: (number | string)[]): Promise<number | number[]> {
        const _amounts = await _depositCheck.call(this, amounts, true);
        return await depositCryptoMetaFactoryMixin._deposit.call(this, _amounts, 0.1, true) as number | number[];
    },

    async deposit(this: PoolTemplate, amounts: (number | string)[], slippage?: number): Promise<string> {
        const _amounts = await _depositCheck.call(this, amounts);
        return await depositCryptoMetaFactoryMixin._deposit.call(this, _amounts, slippage) as string;
    },

    async getDepositInfo(this: PoolTemplate): Promise<IMethodInfo> {
        return await depositCryptoMetaFactoryMixin._deposit.call(this, [], 0, false, true) as IMethodInfo;
    },
}

export const depositZapMixin = {
    async _deposit(this: PoolTemplate, _amounts: bigint[], slippage?: number, estimateGas = false, getInfo = false): Promise<string | number | number[] | IMethodInfo> {
        const contract = this.curve.contracts[this.zap as string].contract;

        if (getInfo) {
            return abiInfoBuild(this.zap as string, 'add_liquidity', contract.add_liquidity.fragment);
        }

        if (!estimateGas) await _ensureAllowance.call(this.curve, this.underlyingCoinAddresses, _amounts, this.zap as string);

        const _minMintAmount = await _depositMinAmount.call(this, _amounts, slippage);
        const ethIndex = this.curve.getEthIndex(this.underlyingCoinAddresses);
        const value = _amounts[ethIndex] || this.curve.parseUnits("0");

        const args: any[] = [_amounts, _minMintAmount];
        if (`add_liquidity(uint256[${this.underlyingCoinAddresses.length}],uint256,bool)` in contract) args.push(true);
        const gas = await contract.add_liquidity.estimateGas(...args, { ...this.curve.constantOptions, value });
        if (estimateGas) return smartNumber(gas);

        const gasLimit = mulBy1_3(DIGas(gas));
        return (await contract.add_liquidity(...args, { ...this.curve.options, gasLimit, value })).hash;
    },

    async depositEstimateGas(this: PoolTemplate, amounts: (number | string)[]): Promise<number | number[]> {
        const _amounts = await _depositCheck.call(this, amounts, true);
        return await depositZapMixin._deposit.call(this, _amounts, 0.1, true) as number | number[];
    },

    async deposit(this: PoolTemplate, amounts: (number | string)[], slippage?: number): Promise<string> {
        const _amounts = await _depositCheck.call(this, amounts);
        return await depositZapMixin._deposit.call(this, _amounts, slippage) as string;
    },

    async getDepositInfo(this: PoolTemplate): Promise<IMethodInfo> {
        return await depositZapMixin._deposit.call(this, [], 0, false, true) as IMethodInfo;
    },
}

export const depositLendingOrCryptoMixin = {
    async _deposit(this: PoolTemplate, _amounts: bigint[], slippage?: number, estimateGas = false, getInfo = false): Promise<string | number | number[] | IMethodInfo> {
        const contract = this.curve.contracts[this.address].contract;

        if (getInfo) {
            return abiInfoBuild(this.address, 'add_liquidity', contract.add_liquidity.fragment);
        }

        if (!estimateGas) await _ensureAllowance.call(this.curve, this.underlyingCoinAddresses, _amounts, this.address);

        const _minMintAmount = await _depositMinAmount.call(this, _amounts, slippage);
        const ethIndex = this.curve.getEthIndex(this.underlyingCoinAddresses);
        const value = _amounts[ethIndex] || this.curve.parseUnits("0");

        const gas = await contract.add_liquidity.estimateGas(_amounts, _minMintAmount, true, { ...this.curve.constantOptions, value });
        if (estimateGas) return smartNumber(gas);

        const gasLimit = mulBy1_3(DIGas(gas));
        return (await contract.add_liquidity(_amounts, _minMintAmount, true, { ...this.curve.options, gasLimit, value })).hash;
    },

    async depositEstimateGas(this: PoolTemplate, amounts: (number | string)[]): Promise<number | number[]> {
        const _amounts = await _depositCheck.call(this, amounts, true);
        return await depositLendingOrCryptoMixin._deposit.call(this, _amounts, 0.1, true) as number | number[];
    },

    async deposit(this: PoolTemplate, amounts: (number | string)[], slippage?: number): Promise<string> {
        const _amounts = await _depositCheck.call(this, amounts);
        return await depositLendingOrCryptoMixin._deposit.call(this, _amounts, slippage) as string;
    },

    async getDepositInfo(this: PoolTemplate): Promise<IMethodInfo> {
        return await depositLendingOrCryptoMixin._deposit.call(this, [], 0, false, true) as IMethodInfo;
    },
}

export const depositPlainMixin = {
    async _deposit(this: PoolTemplate, _amounts: bigint[], slippage?: number, estimateGas = false, getInfo = false): Promise<string | number | number[] | IMethodInfo> {
        const contract = this.curve.contracts[this.address].contract;

        if (getInfo) {
            return abiInfoBuild(this.address, 'add_liquidity', contract.add_liquidity.fragment);
        }

        if (!estimateGas) await _ensureAllowance.call(this.curve, this.wrappedCoinAddresses, _amounts, this.address);
        const _minMintAmount = await _depositMinAmount.call(this, _amounts, slippage);
        const ethIndex = this.curve.getEthIndex(this.wrappedCoinAddresses);
        const value = _amounts[ethIndex] || this.curve.parseUnits("0");

        const gas = await contract.add_liquidity.estimateGas(_amounts, _minMintAmount, { ...this.curve.constantOptions, value });
        if (estimateGas) return smartNumber(gas);

        const gasLimit = mulBy1_3(DIGas(gas));
        return (await contract.add_liquidity(_amounts, _minMintAmount, { ...this.curve.options, gasLimit, value })).hash;
    },

    async depositEstimateGas(this: PoolTemplate, amounts: (number | string)[]): Promise<number | number[]> {
        const _amounts = await _depositCheck.call(this, amounts, true);
        return await depositPlainMixin._deposit.call(this, _amounts, 0.1, true) as number | number[];
    },

    async deposit(this: PoolTemplate, amounts: (number | string)[], slippage?: number): Promise<string> {
        const _amounts = await _depositCheck.call(this, amounts);
        return await depositPlainMixin._deposit.call(this, _amounts, slippage) as string
    },

    async getDepositInfo(this: PoolTemplate): Promise<IMethodInfo> {
        return await depositPlainMixin._deposit.call(this, [], 0, false, true) as IMethodInfo;
    },
}