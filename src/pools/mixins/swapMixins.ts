import BigNumber from "bignumber.js";
import {PoolTemplate} from "../PoolTemplate.js";
import {ISwapMethodInfo} from "../../interfaces.js";
import {
    _ensureAllowance,
    _getCoinDecimals,
    DIGas,
    fromBN,
    hasAllowance,
    mulBy1_3,
    parseUnits,
    smartNumber,
    toBN,
} from '../../utils.js';

async function _swapCheck(
    this: PoolTemplate,
    inputCoin: string | number,
    outputCoin: string | number,
    amount: number | string,
    estimateGas = false
): Promise<[number, number, bigint]> {
    const contractAddress = this._swapContractAddress();
    const i = this._getCoinIdx(inputCoin);
    const j = this._getCoinIdx(outputCoin);

    const inputCoinBalance = Object.values(await this.wallet.underlyingCoinBalances())[i];
    if (Number(inputCoinBalance) < Number(amount)) {
        throw Error(`Not enough ${this.underlyingCoins[i]}. Actual: ${inputCoinBalance}, required: ${amount}`);
    }

    if (estimateGas && !(await hasAllowance.call(this.curve, [this.underlyingCoinAddresses[i]], [amount], this.curve.signerAddress, contractAddress))) {
        throw Error("Token allowance is needed to estimate gas")
    }

    if (!estimateGas) await this.curve.updateFeeData();

    const _amount = parseUnits(amount, this.underlyingDecimals[i]);

    return [i, j, _amount]
}

async function _swapMinAmount(this: PoolTemplate, i: number, j: number, _amount: bigint, slippage = 0.5): Promise<bigint> {
    const _expected: bigint = await this._swapExpected(i, j, _amount);
    const [outputCoinDecimals] = _getCoinDecimals.call(this.curve, this.underlyingCoinAddresses[j]);
    const minAmountBN: BigNumber = toBN(_expected, outputCoinDecimals).times(100 - slippage).div(100);

    return fromBN(minAmountBN, outputCoinDecimals);
}

export const swapTricrypto2Mixin = {
    async _swap(this: PoolTemplate, i: number, j: number, _amount: bigint, slippage?: number, estimateGas = false, getInfo = false): Promise<string | number | number[] | ISwapMethodInfo> {
        const contractAddress = this._swapContractAddress();
        const contract = this.curve.contracts[contractAddress].contract;
        const exchangeMethod = 'exchange_underlying' in contract ? 'exchange_underlying' : 'exchange';

        if (getInfo) {
            return {
                address: contractAddress,
                method: exchangeMethod,
                abi: contract[exchangeMethod].fragment,
            };
        }

        if (!estimateGas) await _ensureAllowance.call(this.curve, [this.underlyingCoinAddresses[i]], [_amount], contractAddress);

        const _minRecvAmount = await _swapMinAmount.call(this, i, j, _amount, slippage);
        const value = this.curve.isEth(this.underlyingCoinAddresses[i]) ? _amount : this.curve.parseUnits("0");

        const gas = await contract[exchangeMethod].estimateGas(i, j, _amount, _minRecvAmount, true, { ...this.curve.constantOptions, value });
        if (estimateGas) return smartNumber(gas);
        
        const gasLimit = mulBy1_3(DIGas(gas));
        return (await contract[exchangeMethod](i, j, _amount, _minRecvAmount, true, { ...this.curve.options, value, gasLimit })).hash
    },

    async swapEstimateGas(this: PoolTemplate, inputCoin: string | number, outputCoin: string | number, amount: number | string): Promise<number> {
        const [i, j, _amount] = await _swapCheck.call(this, inputCoin, outputCoin, amount, true);
        return await swapTricrypto2Mixin._swap.call(this, i, j, _amount, 0.1, true) as number
    },

    async swap(this: PoolTemplate, inputCoin: string | number, outputCoin: string | number, amount: number | string, slippage?: number): Promise<string> {
        const [i, j, _amount] = await _swapCheck.call(this, inputCoin, outputCoin, amount);
        return await swapTricrypto2Mixin._swap.call(this, i, j, _amount, slippage) as string
    },

    async getSwapInfo(this: PoolTemplate): Promise<ISwapMethodInfo> {
        return await swapTricrypto2Mixin._swap.call(this, 0, 0, BigInt(0), 0, false, true) as ISwapMethodInfo;
    },
}

export const swapMetaFactoryMixin = {
    async _swap(this: PoolTemplate, i: number, j: number, _amount: bigint, slippage?: number, estimateGas = false, getInfo = false): Promise<string | number | number[] | ISwapMethodInfo> {
        const contractAddress = this._swapContractAddress();
        const contract = this.curve.contracts[contractAddress].contract;
        const exchangeMethod = 'exchange_underlying' in contract ? 'exchange_underlying' : 'exchange';

        if (getInfo) {
            return {
                address: contractAddress,
                method: exchangeMethod,
                abi: contract[exchangeMethod].fragment,
            };
        }

        if (!estimateGas) await _ensureAllowance.call(this.curve, [this.underlyingCoinAddresses[i]], [_amount], contractAddress);

        const _minRecvAmount = await _swapMinAmount.call(this, i, j, _amount, slippage);
        const value = this.curve.isEth(this.underlyingCoinAddresses[i]) ? _amount : this.curve.parseUnits("0");

        const gas = await contract[exchangeMethod].estimateGas(this.address, i, j, _amount, _minRecvAmount, { ...this.curve.constantOptions, value });
        if (estimateGas) return smartNumber(gas);

        const gasLimit = DIGas(gas) * this.curve.parseUnits("140", 0) / this.curve.parseUnits("100", 0);
        return (await contract[exchangeMethod](this.address, i, j, _amount, _minRecvAmount, { ...this.curve.options, value, gasLimit })).hash
    },

    async swapEstimateGas(this: PoolTemplate, inputCoin: string | number, outputCoin: string | number, amount: number | string): Promise<number> {
        const [i, j, _amount] = await _swapCheck.call(this, inputCoin, outputCoin, amount, true);
        return await swapMetaFactoryMixin._swap.call(this, i, j, _amount, 0.1, true) as number;
    },

    async swap(this: PoolTemplate, inputCoin: string | number, outputCoin: string | number, amount: number | string, slippage?: number): Promise<string> {
        const [i, j, _amount] = await _swapCheck.call(this, inputCoin, outputCoin, amount);
        return await swapMetaFactoryMixin._swap.call(this, i, j, _amount, slippage) as string;
    },

    async getSwapInfo(this: PoolTemplate): Promise<ISwapMethodInfo> {
        return await swapMetaFactoryMixin._swap.call(this, 0, 0, BigInt(0), 0, false, true) as ISwapMethodInfo;
    },
}

export const swapCryptoMetaFactoryMixin = {
    async _swap(this: PoolTemplate, i: number, j: number, _amount: bigint, slippage?: number, estimateGas = false, getInfo = false): Promise<string | number | number[] | ISwapMethodInfo> {
        const contractAddress = this._swapContractAddress();
        const contract = this.curve.contracts[contractAddress].contract;
        const exchangeMethod = 'exchange_underlying' in contract ? 'exchange_underlying' : 'exchange';

        if (getInfo) {
            return {
                address: contractAddress,
                method: exchangeMethod,
                abi: contract[exchangeMethod].fragment,
            };
        }

        if (!estimateGas) await _ensureAllowance.call(this.curve, [this.underlyingCoinAddresses[i]], [_amount], contractAddress);

        const _minRecvAmount = await _swapMinAmount.call(this, i, j, _amount, slippage);
        const value = this.curve.isEth(this.underlyingCoinAddresses[i]) ? _amount : this.curve.parseUnits("0");

        const gas = await contract[exchangeMethod].estimateGas(this.address, i, j, _amount, _minRecvAmount, true, { ...this.curve.constantOptions, value });
        if (estimateGas) return smartNumber(gas);

        const gasLimit = DIGas(gas) * this.curve.parseUnits("140", 0) / this.curve.parseUnits("100", 0);
        return (await contract[exchangeMethod](this.address, i, j, _amount, _minRecvAmount, true, { ...this.curve.options, value, gasLimit })).hash
    },

    async swapEstimateGas(this: PoolTemplate, inputCoin: string | number, outputCoin: string | number, amount: number | string): Promise<number> {
        const [i, j, _amount] = await _swapCheck.call(this, inputCoin, outputCoin, amount, true);
        return await swapCryptoMetaFactoryMixin._swap.call(this, i, j, _amount, 0.1, true) as number;
    },

    async swap(this: PoolTemplate, inputCoin: string | number, outputCoin: string | number, amount: number | string, slippage?: number): Promise<string> {
        const [i, j, _amount] = await _swapCheck.call(this, inputCoin, outputCoin, amount);
        return await swapCryptoMetaFactoryMixin._swap.call(this, i, j, _amount, slippage) as string;
    },

    async getSwapInfo(this: PoolTemplate): Promise<ISwapMethodInfo> {
        return await swapCryptoMetaFactoryMixin._swap.call(this, 0, 0, BigInt(0), 0, false, true) as ISwapMethodInfo;
    },
}

export const swapMixin = {
    async _swap(this: PoolTemplate, i: number, j: number, _amount: bigint, slippage?: number, estimateGas = false, getInfo = false): Promise<string | number | number[] | ISwapMethodInfo> {
        const contractAddress = this._swapContractAddress();
        const contract = this.curve.contracts[contractAddress].contract;
        const exchangeMethod = 'exchange_underlying' in contract ? 'exchange_underlying' : 'exchange';

        if (getInfo) {
            return {
                address: contractAddress,
                method: exchangeMethod,
                abi: contract[exchangeMethod].fragment,
            };
        }

        if (!estimateGas) await _ensureAllowance.call(this.curve, [this.underlyingCoinAddresses[i]], [_amount], contractAddress);

        const _minRecvAmount = await _swapMinAmount.call(this, i, j, _amount, slippage);
        const value = this.curve.isEth(this.underlyingCoinAddresses[i]) ? _amount : this.curve.parseUnits("0");

        const gas = await contract[exchangeMethod].estimateGas(i, j, _amount, _minRecvAmount, { ...this.curve.constantOptions, value });
        if (estimateGas) return smartNumber(gas);
        
        await this.curve.updateFeeData();
        const gasLimit = this.curve.chainId === 137 && this.id === 'ren' ? DIGas(gas) * this.curve.parseUnits("160", 0) / this.curve.parseUnits("100", 0) : mulBy1_3(DIGas(gas));
        return (await contract[exchangeMethod](i, j, _amount, _minRecvAmount, { ...this.curve.options, value, gasLimit })).hash
    },

    async swapEstimateGas(this: PoolTemplate, inputCoin: string | number, outputCoin: string | number, amount: number | string): Promise<number> {
        const [i, j, _amount] = await _swapCheck.call(this, inputCoin, outputCoin, amount, true);
        return await swapMixin._swap.call(this, i, j, _amount, 0.1, true) as number;
    },

    async swap(this: PoolTemplate, inputCoin: string | number, outputCoin: string | number, amount: number | string, slippage?: number): Promise<string> {
        const [i, j, _amount] = await _swapCheck.call(this, inputCoin, outputCoin, amount);
        return await swapMixin._swap.call(this, i, j, _amount, slippage) as string;
    },

    async getSwapInfo(this: PoolTemplate): Promise<ISwapMethodInfo> {
        return await swapMixin._swap.call(this, 0, 0, BigInt(0), 0, false, true) as ISwapMethodInfo;
    },
}