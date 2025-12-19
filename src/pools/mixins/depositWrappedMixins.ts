import {PoolTemplate} from "../PoolTemplate.js";
import {
    _ensureAllowance,
    DIGas,
    fromBN,
    hasAllowance,
    mulBy1_3,
    parseUnits,
    smartNumber,
    toBN,
} from '../../utils.js';

async function _depositWrappedCheck(this: PoolTemplate, amounts: (number | string)[], estimateGas = false): Promise<bigint[]> {
    if (this.isFake) {
        throw Error(`depositWrappedExpected method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    if (amounts.length !== this.wrappedCoinAddresses.length) {
        throw Error(`${this.name} pool has ${this.wrappedCoinAddresses.length} coins (amounts provided for ${amounts.length})`);
    }

    const balances = Object.values(await this.wallet.wrappedCoinBalances());
    for (let i = 0; i < balances.length; i++) {
        if (Number(balances[i]) < Number(amounts[i])) {
            throw Error(`Not enough ${this.wrappedCoins[i]}. Actual: ${balances[i]}, required: ${amounts[i]}`);
        }
    }

    if (estimateGas && !(await hasAllowance.call(this.curve, this.wrappedCoinAddresses, amounts, this.curve.signerAddress, this.address))) {
        throw Error("Token allowance is needed to estimate gas")
    }

    if (!estimateGas) await this.curve.updateFeeData();

    return  amounts.map((amount, i) => parseUnits(amount, this.wrappedDecimals[i]));
}

async function _depositWrappedMinAmount(this: PoolTemplate, _amounts: bigint[], slippage = 0.5): Promise<bigint> {
    const _expectedLpTokenAmount = await this._calcLpTokenAmount(_amounts, true, false);
    const minAmountBN = toBN(_expectedLpTokenAmount).times(100 - slippage).div(100);

    return fromBN(minAmountBN);
}

export const depositWrapped2argsMixin = {
    async _depositWrapped(this: PoolTemplate, _amounts: bigint[], slippage?: number, estimateGas = false): Promise<string | number | number[]> {
        if (!estimateGas) await _ensureAllowance.call(this.curve, this.wrappedCoinAddresses, _amounts, this.address);

        const _minMintAmount = await _depositWrappedMinAmount.call(this, _amounts, slippage);
        const ethIndex = this.curve.getEthIndex(this.wrappedCoinAddresses);
        const value = _amounts[ethIndex] || this.curve.parseUnits("0");
        const contract = this.curve.contracts[this.address].contract;

        const gas = await contract.add_liquidity.estimateGas(_amounts, _minMintAmount, { ...this.curve.constantOptions, value });
        if (estimateGas) return smartNumber(gas);

        const gasLimit = mulBy1_3(DIGas(gas));
        return (await contract.add_liquidity(_amounts, _minMintAmount, { ...this.curve.options, gasLimit, value })).hash;
    },

    async depositWrappedEstimateGas(this: PoolTemplate, amounts: (number | string)[]): Promise<number> {
        const _amounts = await _depositWrappedCheck.call(this, amounts, true);
        return await depositWrapped2argsMixin._depositWrapped.call(this, _amounts, 0.1, true) as number;
    },

    async depositWrapped(this: PoolTemplate, amounts: (number | string)[], slippage?: number): Promise<string> {
        const _amounts = await _depositWrappedCheck.call(this, amounts);
        return await depositWrapped2argsMixin._depositWrapped.call(this, _amounts, slippage) as string;
    },
}

export const depositWrapped3argsMixin = {
    async _depositWrapped(this: PoolTemplate, _amounts: bigint[], slippage?: number, estimateGas = false): Promise<string | number | number[]> {
        if (!estimateGas) await _ensureAllowance.call(this.curve, this.wrappedCoinAddresses, _amounts, this.address);

        const _minMintAmount = await _depositWrappedMinAmount.call(this, _amounts, slippage);
        const ethIndex = this.curve.getEthIndex(this.wrappedCoinAddresses);
        const value = _amounts[ethIndex] || this.curve.parseUnits("0");
        const contract = this.curve.contracts[this.address].contract;

        const gas = await contract.add_liquidity.estimateGas(_amounts, _minMintAmount, false, { ...this.curve.constantOptions, value });
        if (estimateGas) return smartNumber(gas);

        const gasLimit = mulBy1_3(DIGas(gas));
        return (await contract.add_liquidity(_amounts, _minMintAmount, false, { ...this.curve.options, gasLimit, value })).hash;
    },

    async depositWrappedEstimateGas(this: PoolTemplate, amounts: (number | string)[]): Promise<number> {
        const _amounts = await _depositWrappedCheck.call(this, amounts, true);
        return await depositWrapped3argsMixin._depositWrapped.call(this, _amounts, 0.1, true) as number;
    },

    async depositWrapped(this: PoolTemplate, amounts: (number | string)[], slippage?: number): Promise<string> {
        const _amounts = await _depositWrappedCheck.call(this, amounts);
        return await depositWrapped3argsMixin._depositWrapped.call(this, _amounts, slippage) as string;
    },
}