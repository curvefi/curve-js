import { curve } from "../../curve.js";
import { PoolTemplate } from "../PoolTemplate.js";
import { _ensureAllowance, fromBN, getEthIndex, hasAllowance, toBN, parseUnits, mulBy1_3, DIGas, smartNumber } from '../../utils.js';

// @ts-ignore
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

    if (estimateGas && !(await hasAllowance(this.underlyingCoinAddresses, amounts, curve.signerAddress, this.zap || this.address))) {
        throw Error("Token allowance is needed to estimate gas")
    }

    if (!estimateGas) await curve.updateFeeData();

    return amounts.map((amount, i) => parseUnits(amount, this.underlyingDecimals[i]));
}

async function _depositMinAmount(this: PoolTemplate, _amounts: bigint[], slippage = 0.5): Promise<bigint> {
    // @ts-ignore
    const _expectedLpTokenAmount = await this._calcLpTokenAmount(_amounts);
    const minAmountBN = toBN(_expectedLpTokenAmount).times(100 - slippage).div(100);

    return fromBN(minAmountBN);
}

// @ts-ignore
export const depositMetaFactoryMixin: PoolTemplate = {
    // @ts-ignore
    async _deposit(_amounts: bigint[], slippage?: number, estimateGas = false): Promise<string | number | number[]> {
        if (!estimateGas) await _ensureAllowance(this.underlyingCoinAddresses, _amounts, this.zap as string);

        // @ts-ignore
        const _minMintAmount = await _depositMinAmount.call(this, _amounts, slippage);
        const ethIndex = getEthIndex(this.underlyingCoinAddresses);
        const value = _amounts[ethIndex] || curve.parseUnits("0");
        const contract = curve.contracts[this.zap as string].contract;

        const gas = await contract.add_liquidity.estimateGas(this.address, _amounts, _minMintAmount, { ...curve.constantOptions, value });
        if (estimateGas) return smartNumber(gas);

        const gasLimit = mulBy1_3(DIGas(gas));
        return (await contract.add_liquidity(this.address, _amounts, _minMintAmount, { ...curve.options, gasLimit, value })).hash;
    },

    async depositEstimateGas(amounts: (number | string)[]): Promise<number | number[]> {
        // @ts-ignore
        const _amounts = await _depositCheck.call(this, amounts, true);

        // @ts-ignore
        return await this._deposit(_amounts, 0.1, true);
    },

    async deposit(amounts: (number | string)[], slippage?: number): Promise<string> {
        // @ts-ignore
        const _amounts = await _depositCheck.call(this, amounts);

        // @ts-ignore
        return await this._deposit(_amounts, slippage);
    },
}

// @ts-ignore
export const depositCryptoMetaFactoryMixin: PoolTemplate = {
    // @ts-ignore
    async _deposit(_amounts: bigint[], slippage?: number, estimateGas = false): Promise<string | number | number[]> {
        if (!estimateGas) await _ensureAllowance(this.underlyingCoinAddresses, _amounts, this.zap as string);

        // @ts-ignore
        const _minMintAmount = await _depositMinAmount.call(this, _amounts, slippage);
        const ethIndex = getEthIndex(this.underlyingCoinAddresses);
        const value = _amounts[ethIndex] || curve.parseUnits("0");
        const contract = curve.contracts[this.zap as string].contract;

        const gas = await contract.add_liquidity.estimateGas(this.address, _amounts, _minMintAmount, true, { ...curve.constantOptions, value });
        if (estimateGas) return smartNumber(gas);

        const gasLimit = mulBy1_3(DIGas(gas));
        return (await contract.add_liquidity(this.address, _amounts, _minMintAmount, true, { ...curve.options, gasLimit, value })).hash;
    },

    async depositEstimateGas(amounts: (number | string)[]): Promise<number | number[]> {
        // @ts-ignore
        const _amounts = await _depositCheck.call(this, amounts, true);

        // @ts-ignore
        return await this._deposit(_amounts, 0.1, true);
    },

    async deposit(amounts: (number | string)[], slippage?: number): Promise<string> {
        // @ts-ignore
        const _amounts = await _depositCheck.call(this, amounts);

        // @ts-ignore
        return await this._deposit(_amounts, slippage);
    },
}

// @ts-ignore
export const depositZapMixin: PoolTemplate = {
    // @ts-ignore
    async _deposit(_amounts: bigint[], slippage?: number, estimateGas = false): Promise<string | number | number[]> {
        if (!estimateGas) await _ensureAllowance(this.underlyingCoinAddresses, _amounts, this.zap as string);

        // @ts-ignore
        const _minMintAmount = await _depositMinAmount.call(this, _amounts, slippage);
        const ethIndex = getEthIndex(this.underlyingCoinAddresses);
        const value = _amounts[ethIndex] || curve.parseUnits("0");
        const contract = curve.contracts[this.zap as string].contract;

        const args: any[] = [_amounts, _minMintAmount];
        if (`add_liquidity(uint256[${this.underlyingCoinAddresses.length}],uint256,bool)` in contract) args.push(true);
        const gas = await contract.add_liquidity.estimateGas(...args, { ...curve.constantOptions, value });
        if (estimateGas) return smartNumber(gas);

        const gasLimit = mulBy1_3(DIGas(gas));
        return (await contract.add_liquidity(...args, { ...curve.options, gasLimit, value })).hash;
    },

    async depositEstimateGas(amounts: (number | string)[]): Promise<number | number[]> {
        // @ts-ignore
        const _amounts = await _depositCheck.call(this, amounts, true);

        // @ts-ignore
        return await this._deposit(_amounts, 0.1, true);
    },

    async deposit(amounts: (number | string)[], slippage?: number): Promise<string> {
        // @ts-ignore
        const _amounts = await _depositCheck.call(this, amounts);

        // @ts-ignore
        return await this._deposit(_amounts, slippage);
    },
}

// @ts-ignore
export const depositLendingOrCryptoMixin: PoolTemplate = {
    // @ts-ignore
    async _deposit(_amounts: bigint[], slippage?: number, estimateGas = false): Promise<string | number | number[]> {
        if (!estimateGas) await _ensureAllowance(this.underlyingCoinAddresses, _amounts, this.address);

        // @ts-ignore
        const _minMintAmount = await _depositMinAmount.call(this, _amounts, slippage);
        const ethIndex = getEthIndex(this.underlyingCoinAddresses);
        const value = _amounts[ethIndex] || curve.parseUnits("0");
        const contract = curve.contracts[this.address].contract;

        const gas = await contract.add_liquidity.estimateGas(_amounts, _minMintAmount, true, { ...curve.constantOptions, value });
        if (estimateGas) return smartNumber(gas);

        const gasLimit = mulBy1_3(DIGas(gas));
        return (await contract.add_liquidity(_amounts, _minMintAmount, true, { ...curve.options, gasLimit, value })).hash;
    },

    async depositEstimateGas(amounts: (number | string)[]): Promise<number | number[]> {
        // @ts-ignore
        const _amounts = await _depositCheck.call(this, amounts, true);

        // @ts-ignore
        return await this._deposit(_amounts, 0.1, true);
    },

    async deposit(amounts: (number | string)[], slippage?: number): Promise<string> {
        // @ts-ignore
        const _amounts = await _depositCheck.call(this, amounts);

        // @ts-ignore
        return await this._deposit(_amounts, slippage);
    },
}

// @ts-ignore
export const depositPlainMixin: PoolTemplate = {
    // @ts-ignore
    async _deposit(_amounts: bigint[], slippage?: number, estimateGas = false): Promise<string | number | number[]> {
        if (!estimateGas) await _ensureAllowance(this.wrappedCoinAddresses, _amounts, this.address);
        // @ts-ignore
        const _minMintAmount = await _depositMinAmount.call(this, _amounts, slippage);
        const ethIndex = getEthIndex(this.wrappedCoinAddresses);
        const value = _amounts[ethIndex] || curve.parseUnits("0");
        const contract = curve.contracts[this.address].contract;

        const gas = await contract.add_liquidity.estimateGas(_amounts, _minMintAmount, { ...curve.constantOptions, value });
        if (estimateGas) return smartNumber(gas);

        const gasLimit = mulBy1_3(DIGas(gas));
        return (await contract.add_liquidity(_amounts, _minMintAmount, { ...curve.options, gasLimit, value })).hash;
    },

    async depositEstimateGas(amounts: (number | string)[]): Promise<number | number[]> {
        // @ts-ignore
        const _amounts = await _depositCheck.call(this, amounts, true);

        // @ts-ignore
        return await this._deposit(_amounts, 0.1, true);
    },

    async deposit(amounts: (number | string)[], slippage?: number): Promise<string> {
        // @ts-ignore
        const _amounts = await _depositCheck.call(this, amounts);

        // @ts-ignore
        return await this._deposit(_amounts, slippage);
    },
}