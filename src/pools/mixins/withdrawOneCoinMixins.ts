import {PoolTemplate} from "../PoolTemplate.js";
import {_ensureAllowance, DIGas, fromBN, hasAllowance, mulBy1_3, parseUnits, smartNumber, toBN} from '../../utils.js';

async function _withdrawOneCoinCheck(this: PoolTemplate, lpTokenAmount: number | string, coin: string | number, estimateGas = false):
    Promise<[bigint, number]>
{
    const lpTokenBalance = (await this.wallet.lpTokenBalances())['lpToken'];
    if (Number(lpTokenBalance) < Number(lpTokenAmount)) {
        throw Error(`Not enough LP tokens. Actual: ${lpTokenBalance}, required: ${lpTokenAmount}`);
    }

    if (estimateGas && this.zap && !(await hasAllowance.call(this.curve, [this.lpToken], [lpTokenAmount], this.curve.signerAddress, this.zap))) {
        throw Error("Token allowance is needed to estimate gas");
    }

    if (!estimateGas) await this.curve.updateFeeData();

    const i = this._getCoinIdx(coin);
    const _lpTokenAmount = parseUnits(lpTokenAmount);

    return [_lpTokenAmount, i];
}

async function _withdrawOneCoinMinAmount(this: PoolTemplate, _lpTokenAmount: bigint, i: number, slippage = 0.5): Promise<bigint> {
    const _expectedLpTokenAmount = await this._withdrawOneCoinExpected(_lpTokenAmount, i);
    const minAmountBN = toBN(_expectedLpTokenAmount).times(100 - slippage).div(100);
    return fromBN(minAmountBN);
}

export const withdrawOneCoinMetaFactoryMixin = {
    async _withdrawOneCoin(this: PoolTemplate, _lpTokenAmount: bigint, i: number, slippage?: number, estimateGas = false): Promise<string | number | number[]> {
        if (!estimateGas) await _ensureAllowance.bind(this.curve, [this.lpToken], [_lpTokenAmount], this.zap as string);

        const _minAmount = await _withdrawOneCoinMinAmount.call(this, _lpTokenAmount, i, slippage);
        const  contract = this.curve.contracts[this.zap as string].contract;

        const gas = await contract.remove_liquidity_one_coin.estimateGas(this.address, _lpTokenAmount, i, _minAmount, this.curve.constantOptions);
        if (estimateGas) return smartNumber(gas)
        
        const gasLimit = mulBy1_3(DIGas(gas));
        return (await contract.remove_liquidity_one_coin(this.address, _lpTokenAmount, i, _minAmount, { ...this.curve.options, gasLimit })).hash
    },

    async withdrawOneCoinEstimateGas(this: PoolTemplate, lpTokenAmount: number | string, coin: string | number): Promise<number | number[]> {
        const [_lpTokenAmount, i] = await _withdrawOneCoinCheck.call(this, lpTokenAmount, coin, true);
        return await withdrawOneCoinMetaFactoryMixin._withdrawOneCoin.call(this, _lpTokenAmount, i, 0.1, true) as number | number[];
    },

    async withdrawOneCoin(this: PoolTemplate, lpTokenAmount: number | string, coin: string | number, slippage?: number): Promise<string> {
        const [_lpTokenAmount, i] = await _withdrawOneCoinCheck.call(this, lpTokenAmount, coin);
        return await withdrawOneCoinMetaFactoryMixin._withdrawOneCoin.call(this, _lpTokenAmount, i, slippage) as string;
    },
}

export const withdrawOneCoinCryptoMetaFactoryMixin = {
    async _withdrawOneCoin(this: PoolTemplate, _lpTokenAmount: bigint, i: number, slippage?: number, estimateGas = false): Promise<string | number | number[]> {
        if (!estimateGas) await _ensureAllowance.bind(this.curve, [this.lpToken], [_lpTokenAmount], this.zap as string);

        const _minAmount = await _withdrawOneCoinMinAmount.call(this, _lpTokenAmount, i, slippage);
        const  contract = this.curve.contracts[this.zap as string].contract;

        const gas = await contract.remove_liquidity_one_coin.estimateGas(this.address, _lpTokenAmount, i, _minAmount, true, this.curve.constantOptions);
        if (estimateGas) return smartNumber(gas)
        
        const gasLimit = mulBy1_3(DIGas(gas));
        return (await contract.remove_liquidity_one_coin(this.address, _lpTokenAmount, i, _minAmount, true, { ...this.curve.options, gasLimit })).hash
    },

    async withdrawOneCoinEstimateGas(this: PoolTemplate, lpTokenAmount: number | string, coin: string | number): Promise<number | number[]> {
        const [_lpTokenAmount, i] = await _withdrawOneCoinCheck.call(this, lpTokenAmount, coin, true);
        return await withdrawOneCoinCryptoMetaFactoryMixin._withdrawOneCoin.call(this, _lpTokenAmount, i, 0.1, true) as number | number[];
    },

    async withdrawOneCoin(this: PoolTemplate, lpTokenAmount: number | string, coin: string | number, slippage?: number): Promise<string> {
        const [_lpTokenAmount, i] = await _withdrawOneCoinCheck.call(this, lpTokenAmount, coin);
        return await withdrawOneCoinCryptoMetaFactoryMixin._withdrawOneCoin.call(this, _lpTokenAmount, i, slippage) as string;
    },
}

export const withdrawOneCoinZapMixin = {
    async _withdrawOneCoin(this: PoolTemplate, _lpTokenAmount: bigint, i: number, slippage?: number, estimateGas = false): Promise<string | number | number[]> {
        if (!estimateGas) await _ensureAllowance.bind(this.curve, [this.lpToken], [_lpTokenAmount], this.zap as string);

        const _minAmount = await _withdrawOneCoinMinAmount.call(this, _lpTokenAmount, i, slippage);
        const  contract = this.curve.contracts[this.zap as string].contract;

        const args: any[] = [_lpTokenAmount, i, _minAmount];
        if (`remove_liquidity_one_coin(uint256,uint256,uint256,bool)` in contract) args.push(true);
        const gas = await contract.remove_liquidity_one_coin.estimateGas(...args, this.curve.constantOptions);
        if (estimateGas) return smartNumber(gas);

        const gasLimit = mulBy1_3(DIGas(gas));
        return (await contract.remove_liquidity_one_coin(...args, { ...this.curve.options, gasLimit })).hash
    },

    async withdrawOneCoinEstimateGas(this: PoolTemplate, lpTokenAmount: number | string, coin: string | number): Promise<number | number[]> {
        const [_lpTokenAmount, i] = await _withdrawOneCoinCheck.call(this, lpTokenAmount, coin, true);
        return await withdrawOneCoinZapMixin._withdrawOneCoin.call(this, _lpTokenAmount, i, 0.1, true) as number | number[];
    },

    async withdrawOneCoin(this: PoolTemplate, lpTokenAmount: number | string, coin: string | number, slippage?: number): Promise<string> {
        const [_lpTokenAmount, i] = await _withdrawOneCoinCheck.call(this, lpTokenAmount, coin);
        return await withdrawOneCoinZapMixin._withdrawOneCoin.call(this, _lpTokenAmount, i, slippage) as string;
    },
}

export const withdrawOneCoinLendingOrCryptoMixin = {
    async _withdrawOneCoin(this: PoolTemplate, _lpTokenAmount: bigint, i: number, slippage?: number, estimateGas = false): Promise<string | number | number[]> {
        const _minAmount = await _withdrawOneCoinMinAmount.call(this, _lpTokenAmount, i, slippage);
        const  contract = this.curve.contracts[this.address].contract;

        const gas = await contract.remove_liquidity_one_coin.estimateGas(_lpTokenAmount, i, _minAmount, true, this.curve.constantOptions);
        if (estimateGas) return smartNumber(gas);

        const gasLimit = this.curve.chainId === 137 && this.id === 'ren' ? DIGas(gas) * this.curve.parseUnits("160", 0) / this.curve.parseUnits("100", 0) : mulBy1_3(DIGas(gas));
        return (await contract.remove_liquidity_one_coin(_lpTokenAmount, i, _minAmount, true, { ...this.curve.options, gasLimit })).hash
    },

    async withdrawOneCoinEstimateGas(this: PoolTemplate, lpTokenAmount: number | string, coin: string | number): Promise<number | number[]> {
        const [_lpTokenAmount, i] = await _withdrawOneCoinCheck.call(this, lpTokenAmount, coin, true);
        return await withdrawOneCoinLendingOrCryptoMixin._withdrawOneCoin.call(this, _lpTokenAmount, i, 0.1, true) as number | number[];
    },

    async withdrawOneCoin(this: PoolTemplate, lpTokenAmount: number | string, coin: string | number, slippage?: number): Promise<string> {
        const [_lpTokenAmount, i] = await _withdrawOneCoinCheck.call(this, lpTokenAmount, coin);
        return await withdrawOneCoinLendingOrCryptoMixin._withdrawOneCoin.call(this, _lpTokenAmount, i, slippage) as string;
    },
}

export const withdrawOneCoinPlainMixin = {
    async _withdrawOneCoin(this: PoolTemplate, _lpTokenAmount: bigint, i: number, slippage?: number, estimateGas = false): Promise<string | number | number[]> {
        const _minAmount = await _withdrawOneCoinMinAmount.call(this, _lpTokenAmount, i, slippage);
        const  contract = this.curve.contracts[this.address].contract;

        const gas = await contract.remove_liquidity_one_coin.estimateGas(_lpTokenAmount, i, _minAmount, this.curve.constantOptions);
        if (estimateGas) return smartNumber(gas);

        const gasLimit = mulBy1_3(DIGas(gas));
        return (await contract.remove_liquidity_one_coin(_lpTokenAmount, i, _minAmount, { ...this.curve.options, gasLimit })).hash
    },

    async withdrawOneCoinEstimateGas(this: PoolTemplate, lpTokenAmount: number | string, coin: string | number): Promise<number | number[]> {
        const [_lpTokenAmount, i] = await _withdrawOneCoinCheck.call(this, lpTokenAmount, coin, true);
        return await withdrawOneCoinPlainMixin._withdrawOneCoin.call(this, _lpTokenAmount, i, 0.1, true) as number | number[];
    },

    async withdrawOneCoin(this: PoolTemplate, lpTokenAmount: number | string, coin: string | number, slippage?: number): Promise<string> {
        const [_lpTokenAmount, i] = await _withdrawOneCoinCheck.call(this, lpTokenAmount, coin);
        return await withdrawOneCoinPlainMixin._withdrawOneCoin.call(this, _lpTokenAmount, i, slippage) as string;
    },
}