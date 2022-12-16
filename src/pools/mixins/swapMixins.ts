import { ethers } from "ethers";
import BigNumber from "bignumber.js";
import { PoolTemplate } from "../PoolTemplate";
import { curve } from "../../curve";
import { _ensureAllowance, _getCoinDecimals, fromBN, hasAllowance, isEth, toBN, parseUnits } from "../../utils";

// @ts-ignore
async function _swapCheck(
    this: PoolTemplate,
    inputCoin: string | number,
    outputCoin: string | number,
    amount: number | string,
    estimateGas = false
): Promise<[number, number, ethers.BigNumber]> {
    // @ts-ignore
    const contractAddress = this._swapContractAddress();
    // @ts-ignore
    const i = this._getCoinIdx(inputCoin);
    // @ts-ignore
    const j = this._getCoinIdx(outputCoin);

    const inputCoinBalance = Object.values(await this.wallet.underlyingCoinBalances())[i];
    if (Number(inputCoinBalance) < Number(amount)) {
        throw Error(`Not enough ${this.underlyingCoins[i]}. Actual: ${inputCoinBalance}, required: ${amount}`);
    }

    if (estimateGas && !(await hasAllowance([this.underlyingCoinAddresses[i]], [amount], curve.signerAddress, contractAddress))) {
        throw Error("Token allowance is needed to estimate gas")
    }

    if (!estimateGas) await curve.updateFeeData();

    const _amount = parseUnits(amount, this.underlyingDecimals[i]);

    return [i, j, _amount]
}

async function _swapMinAmount(this: PoolTemplate, i: number, j: number, _amount: ethers.BigNumber, slippage = 0.5): Promise<ethers.BigNumber> {
    // @ts-ignore
    const _expected: ethers.BigNumber = await this._swapExpected(i, j, _amount);
    const [outputCoinDecimals] = _getCoinDecimals(this.underlyingCoinAddresses[j]);
    const minAmountBN: BigNumber = toBN(_expected, outputCoinDecimals).times(100 - slippage).div(100);

    return fromBN(minAmountBN, outputCoinDecimals);
}

// @ts-ignore
export const swapTricrypto2Mixin: PoolTemplate = {
    // @ts-ignore
    async _swap(i: number, j: number, _amount: ethers.BigNumber, slippage?: number, estimateGas = false): Promise<string | number> {
        // @ts-ignore
        const contractAddress = this._swapContractAddress();
        if (!estimateGas) await _ensureAllowance([this.underlyingCoinAddresses[i]], [_amount], contractAddress);

        const _minRecvAmount = await _swapMinAmount.call(this, i, j, _amount, slippage);
        const contract = curve.contracts[contractAddress].contract;
        const exchangeMethod = Object.prototype.hasOwnProperty.call(contract, 'exchange_underlying') ? 'exchange_underlying' : 'exchange';
        const value = isEth(this.underlyingCoinAddresses[i]) ? _amount : ethers.BigNumber.from(0);

        const gas = await contract.estimateGas[exchangeMethod](i, j, _amount, _minRecvAmount, true, { ...curve.constantOptions, value });
        if (estimateGas) return gas.toNumber();

        const gasLimit = gas.mul(130).div(100);
        return (await contract[exchangeMethod](i, j, _amount, _minRecvAmount, true, { ...curve.options, value, gasLimit })).hash
    },

    async swapEstimateGas(inputCoin: string | number, outputCoin: string | number, amount: number | string): Promise<number> {
        // @ts-ignore
        const [i, j, _amount] = await _swapCheck.call(this, inputCoin, outputCoin, amount, true);

        // @ts-ignore
        return await this._swap(i, j, _amount, 0.1, true);
    },

    async swap(inputCoin: string | number, outputCoin: string | number, amount: number | string, slippage?: number): Promise<string> {
        // @ts-ignore
        const [i, j, _amount] = await _swapCheck.call(this, inputCoin, outputCoin, amount);

        // @ts-ignore
        return await this._swap(i, j, _amount, slippage);
    },
}

// @ts-ignore
export const swapMetaFactoryMixin: PoolTemplate = {
    // @ts-ignore
    async _swap(i: number, j: number, _amount: ethers.BigNumber, slippage?: number, estimateGas = false): Promise<string | number> {
        // @ts-ignore
        const contractAddress = this._swapContractAddress();
        if (!estimateGas) await _ensureAllowance([this.underlyingCoinAddresses[i]], [_amount], contractAddress);

        const _minRecvAmount = await _swapMinAmount.call(this, i, j, _amount, slippage);
        const contract = curve.contracts[contractAddress].contract;
        const exchangeMethod = Object.prototype.hasOwnProperty.call(contract, 'exchange_underlying') ? 'exchange_underlying' : 'exchange';
        const value = isEth(this.underlyingCoinAddresses[i]) ? _amount : ethers.BigNumber.from(0);

        const gas = await contract.estimateGas[exchangeMethod](this.address, i, j, _amount, _minRecvAmount, { ...curve.constantOptions, value });
        if (estimateGas) return gas.toNumber();

        const gasLimit = gas.mul(140).div(100);
        return (await contract[exchangeMethod](this.address, i, j, _amount, _minRecvAmount, { ...curve.options, value, gasLimit })).hash
    },

    async swapEstimateGas(inputCoin: string | number, outputCoin: string | number, amount: number | string): Promise<number> {
        // @ts-ignore
        const [i, j, _amount] = await _swapCheck.call(this, inputCoin, outputCoin, amount, true);

        // @ts-ignore
        return await this._swap(i, j, _amount, 0.1, true);
    },

    async swap(inputCoin: string | number, outputCoin: string | number, amount: number | string, slippage?: number): Promise<string> {
        // @ts-ignore
        const [i, j, _amount] = await _swapCheck.call(this, inputCoin, outputCoin, amount);

        // @ts-ignore
        return await this._swap(i, j, _amount, slippage);
    },
}

// @ts-ignore
export const swapCryptoMetaFactoryMixin: PoolTemplate = {
    // @ts-ignore
    async _swap(i: number, j: number, _amount: ethers.BigNumber, slippage?: number, estimateGas = false): Promise<string | number> {
        // @ts-ignore
        const contractAddress = this._swapContractAddress();
        if (!estimateGas) await _ensureAllowance([this.underlyingCoinAddresses[i]], [_amount], contractAddress);

        const _minRecvAmount = await _swapMinAmount.call(this, i, j, _amount, slippage);
        const contract = curve.contracts[contractAddress].contract;
        const exchangeMethod = Object.prototype.hasOwnProperty.call(contract, 'exchange_underlying') ? 'exchange_underlying' : 'exchange';
        const value = isEth(this.underlyingCoinAddresses[i]) ? _amount : ethers.BigNumber.from(0);

        const gas = await contract.estimateGas[exchangeMethod](this.address, i, j, _amount, _minRecvAmount, true, { ...curve.constantOptions, value });
        if (estimateGas) return gas.toNumber();

        const gasLimit = gas.mul(140).div(100);
        return (await contract[exchangeMethod](this.address, i, j, _amount, _minRecvAmount, true, { ...curve.options, value, gasLimit })).hash
    },

    async swapEstimateGas(inputCoin: string | number, outputCoin: string | number, amount: number | string): Promise<number> {
        // @ts-ignore
        const [i, j, _amount] = await _swapCheck.call(this, inputCoin, outputCoin, amount, true);

        // @ts-ignore
        return await this._swap(i, j, _amount, 0.1, true);
    },

    async swap(inputCoin: string | number, outputCoin: string | number, amount: number | string, slippage?: number): Promise<string> {
        // @ts-ignore
        const [i, j, _amount] = await _swapCheck.call(this, inputCoin, outputCoin, amount);

        // @ts-ignore
        return await this._swap(i, j, _amount, slippage);
    },
}

// @ts-ignore
export const swapMixin: PoolTemplate = {
    // @ts-ignore
    async _swap(i: number, j: number, _amount: ethers.BigNumber, slippage?: number, estimateGas = false): Promise<string | number> {
        // @ts-ignore
        const contractAddress = this._swapContractAddress();
        if (!estimateGas) await _ensureAllowance([this.underlyingCoinAddresses[i]], [_amount], contractAddress);

        const _minRecvAmount = await _swapMinAmount.call(this, i, j, _amount, slippage);
        const contract = curve.contracts[contractAddress].contract;
        const exchangeMethod = Object.prototype.hasOwnProperty.call(contract, 'exchange_underlying') ? 'exchange_underlying' : 'exchange';
        const value = isEth(this.underlyingCoinAddresses[i]) ? _amount : ethers.BigNumber.from(0);

        const gas = await contract.estimateGas[exchangeMethod](i, j, _amount, _minRecvAmount, { ...curve.constantOptions, value });
        if (estimateGas) return gas.toNumber();

        await curve.updateFeeData();
        const gasLimit = curve.chainId === 137 && this.id === 'ren' ? gas.mul(160).div(100) : gas.mul(130).div(100);
        return (await contract[exchangeMethod](i, j, _amount, _minRecvAmount, { ...curve.options, value, gasLimit })).hash
    },

    async swapEstimateGas(inputCoin: string | number, outputCoin: string | number, amount: number | string): Promise<number> {
        // @ts-ignore
        const [i, j, _amount] = await _swapCheck.call(this, inputCoin, outputCoin, amount, true);

        // @ts-ignore
        return await this._swap(i, j, _amount, 0.1, true);
    },

    async swap(inputCoin: string | number, outputCoin: string | number, amount: number | string, slippage?: number): Promise<string> {
        // @ts-ignore
        const [i, j, _amount] = await _swapCheck.call(this, inputCoin, outputCoin, amount);

        // @ts-ignore
        return await this._swap(i, j, _amount, slippage);
    },
}