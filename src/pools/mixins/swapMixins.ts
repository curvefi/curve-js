import BigNumber from "bignumber.js";
import { curve } from "../../curve.js";
import { PoolTemplate } from "../PoolTemplate.js";
import { _ensureAllowance, _getCoinDecimals, fromBN, hasAllowance, isEth, toBN, parseUnits, mulBy1_3, DIGas, smartNumber } from '../../utils.js';

// @ts-ignore
async function _swapCheck(
    this: PoolTemplate,
    inputCoin: string | number,
    outputCoin: string | number,
    amount: number | string,
    estimateGas = false
): Promise<[number, number, bigint]> {
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

async function _swapMinAmount(this: PoolTemplate, i: number, j: number, _amount: bigint, slippage = 0.5): Promise<bigint> {
    // @ts-ignore
    const _expected: bigint = await this._swapExpected(i, j, _amount);
    const [outputCoinDecimals] = _getCoinDecimals(this.underlyingCoinAddresses[j]);
    const minAmountBN: BigNumber = toBN(_expected, outputCoinDecimals).times(100 - slippage).div(100);

    return fromBN(minAmountBN, outputCoinDecimals);
}

// @ts-ignore
export const swapTricrypto2Mixin: PoolTemplate = {
    // @ts-ignore
    async _swap(i: number, j: number, _amount: bigint, slippage?: number, estimateGas = false): Promise<string | number | number[]> {
        // @ts-ignore
        const contractAddress = this._swapContractAddress();
        if (!estimateGas) await _ensureAllowance([this.underlyingCoinAddresses[i]], [_amount], contractAddress);

        const _minRecvAmount = await _swapMinAmount.call(this, i, j, _amount, slippage);
        const contract = curve.contracts[contractAddress].contract;
        const exchangeMethod = 'exchange_underlying' in contract ? 'exchange_underlying' : 'exchange';
        const value = isEth(this.underlyingCoinAddresses[i]) ? _amount : curve.parseUnits("0");

        const gas = await contract[exchangeMethod].estimateGas(i, j, _amount, _minRecvAmount, true, { ...curve.constantOptions, value });
        if (estimateGas) return smartNumber(gas);
        
        const gasLimit = mulBy1_3(DIGas(gas));
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
    async _swap(i: number, j: number, _amount: bigint, slippage?: number, estimateGas = false): Promise<string | number | number[]> {
        // @ts-ignore
        const contractAddress = this._swapContractAddress();
        if (!estimateGas) await _ensureAllowance([this.underlyingCoinAddresses[i]], [_amount], contractAddress);

        const _minRecvAmount = await _swapMinAmount.call(this, i, j, _amount, slippage);
        const contract = curve.contracts[contractAddress].contract;
        const exchangeMethod = 'exchange_underlying' in contract ? 'exchange_underlying' : 'exchange';
        const value = isEth(this.underlyingCoinAddresses[i]) ? _amount : curve.parseUnits("0");

        const gas = await contract[exchangeMethod].estimateGas(this.address, i, j, _amount, _minRecvAmount, { ...curve.constantOptions, value });
        if (estimateGas) return smartNumber(gas);

        const gasLimit = DIGas(gas) * curve.parseUnits("140", 0) / curve.parseUnits("100", 0);
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
    async _swap(i: number, j: number, _amount: bigint, slippage?: number, estimateGas = false): Promise<string | number | number[]> {
        // @ts-ignore
        const contractAddress = this._swapContractAddress();
        if (!estimateGas) await _ensureAllowance([this.underlyingCoinAddresses[i]], [_amount], contractAddress);

        const _minRecvAmount = await _swapMinAmount.call(this, i, j, _amount, slippage);
        const contract = curve.contracts[contractAddress].contract;
        const exchangeMethod = 'exchange_underlying' in contract ? 'exchange_underlying' : 'exchange';
        const value = isEth(this.underlyingCoinAddresses[i]) ? _amount : curve.parseUnits("0");

        const gas = await contract[exchangeMethod].estimateGas(this.address, i, j, _amount, _minRecvAmount, true, { ...curve.constantOptions, value });
        if (estimateGas) return smartNumber(gas);

        const gasLimit = DIGas(gas) * curve.parseUnits("140", 0) / curve.parseUnits("100", 0);
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
    async _swap(i: number, j: number, _amount: bigint, slippage?: number, estimateGas = false): Promise<string | number | number[]> {
        // @ts-ignore
        const contractAddress = this._swapContractAddress();
        if (!estimateGas) await _ensureAllowance([this.underlyingCoinAddresses[i]], [_amount], contractAddress);

        const _minRecvAmount = await _swapMinAmount.call(this, i, j, _amount, slippage);
        const contract = curve.contracts[contractAddress].contract;
        const exchangeMethod = 'exchange_underlying' in contract ? 'exchange_underlying' : 'exchange';
        const value = isEth(this.underlyingCoinAddresses[i]) ? _amount : curve.parseUnits("0");

        const gas = await contract[exchangeMethod].estimateGas(i, j, _amount, _minRecvAmount, { ...curve.constantOptions, value });
        if (estimateGas) return smartNumber(gas);

        await curve.updateFeeData();
        const gasLimit = curve.chainId === 137 && this.id === 'ren' ? DIGas(gas) * curve.parseUnits("160", 0) / curve.parseUnits("100", 0) : mulBy1_3(DIGas(gas));
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