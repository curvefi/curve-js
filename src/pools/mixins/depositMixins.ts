import {PoolTemplate} from "../PoolTemplate";
import {_ensureAllowance, getEthIndex, hasAllowance} from "../../utils";
import {curve} from "../../curve";
import {ethers} from "ethers";

// @ts-ignore
async function _depositCheck(this: PoolTemplate, amounts: string[], estimateGas = false): Promise<ethers.BigNumber[]> {
    if (amounts.length !== this.underlyingCoinAddresses.length) {
        throw Error(`${this.name} pool has ${this.underlyingCoinAddresses.length} coins (amounts provided for ${amounts.length})`);
    }

    const balances = Object.values(await this.underlyingCoinBalances());
    for (let i = 0; i < balances.length; i++) {
        if (Number(balances[i]) < Number(amounts[i])) {
            throw Error(`Not enough ${this.underlyingCoins[i]}. Actual: ${balances[i]}, required: ${amounts[i]}`);
        }
    }

    if (!(await hasAllowance(this.underlyingCoinAddresses, amounts, curve.signerAddress, this.zap || this.swap)) && estimateGas) {
        throw Error("Token allowance is needed to estimate gas")
    }

    return amounts.map((amount: string, i: number) => ethers.utils.parseUnits(amount, this.underlyingDecimals[i]));
}

// @ts-ignore
export const depositLendingOrCryptoWithZapMixin: PoolTemplate = {
    // @ts-ignore
    async _deposit(_amounts: ethers.BigNumber[], estimateGas = false): Promise<string | number> {
        if (!estimateGas) await _ensureAllowance(this.underlyingCoinAddresses, _amounts, this.zap as string);

        // @ts-ignore
        const _minMintAmount = (await this._calcLpTokenAmount(_amounts)).mul(99).div(100);
        const ethIndex = getEthIndex(this.underlyingCoinAddresses);
        const value = _amounts[ethIndex] || ethers.BigNumber.from(0);
        const contract = curve.contracts[this.zap as string].contract;

        const gas = await contract.estimateGas.add_liquidity(_amounts, _minMintAmount, { ...curve.constantOptions, value });
        if (estimateGas) return gas.toNumber();

        const gasLimit = gas.mul(130).div(100);
        return (await contract.add_liquidity(_amounts, _minMintAmount, { ...curve.options, gasLimit, value })).hash;
    },

    async depositEstimateGas(amounts: string[]): Promise<number> {
        // @ts-ignore
        const _amounts = await _depositCheck.call(this, amounts, true);

        // @ts-ignore
        return await this._deposit(_amounts, true);
    },

    async deposit(amounts: string[]): Promise<string> {
        // @ts-ignore
        const _amounts = await _depositCheck.call(this, amounts);

        // @ts-ignore
        return await this._deposit(_amounts);
    },
}

// @ts-ignore
export const depositLendingOrCryptoMixin: PoolTemplate = {
    // @ts-ignore
    async _deposit(_amounts: ethers.BigNumber[], estimateGas = false): Promise<string | number> {
        if (!estimateGas) await _ensureAllowance(this.underlyingCoinAddresses, _amounts, this.swap);

        // @ts-ignore
        const _minMintAmount = (await this._calcLpTokenAmount(_amounts)).mul(99).div(100);
        const ethIndex = getEthIndex(this.underlyingCoinAddresses);
        const value = _amounts[ethIndex] || ethers.BigNumber.from(0);
        const contract = curve.contracts[this.swap].contract;

        const gas = await contract.estimateGas.add_liquidity(_amounts, _minMintAmount, true, { ...curve.constantOptions, value });
        if (estimateGas) return gas.toNumber();

        const gasLimit = gas.mul(130).div(100);
        return (await contract.add_liquidity(_amounts, _minMintAmount, true, { ...curve.options, gasLimit, value })).hash;
    },

    async depositEstimateGas(amounts: string[]): Promise<number> {
        // @ts-ignore
        const _amounts = await _depositCheck.call(this, amounts, true);

        // @ts-ignore
        return await this._deposit(_amounts, true);
    },

    async deposit(amounts: string[]): Promise<string> {
        // @ts-ignore
        const _amounts = await _depositCheck.call(this, amounts);

        // @ts-ignore
        return await this._deposit(_amounts);
    },
}

// @ts-ignore
export const depositMetaMixin: PoolTemplate = {
    // @ts-ignore
    async _deposit(_amounts: ethers.BigNumber[], estimateGas = false): Promise<string | number> {
        if (!estimateGas) await _ensureAllowance(this.underlyingCoinAddresses, _amounts, this.zap as string);

        // @ts-ignore
        const _minMintAmount = (await this._calcLpTokenAmount(_amounts)).mul(99).div(100);
        const ethIndex = getEthIndex(this.underlyingCoinAddresses)
        const value = _amounts[ethIndex] || ethers.BigNumber.from(0);
        const contract = curve.contracts[this.zap as string].contract;

        if (this.isMetaFactory) {
            const gas = await contract.estimateGas.add_liquidity(this.swap, _amounts, _minMintAmount, { ...curve.constantOptions, value });
            if (estimateGas) return gas.toNumber();

            const gasLimit = gas.mul(130).div(100);
            return (await contract.add_liquidity(this.swap, _amounts, _minMintAmount, { ...curve.options, gasLimit, value })).hash;
        }

        const gas = await contract.estimateGas.add_liquidity(_amounts, _minMintAmount, { ...curve.constantOptions, value });
        if (estimateGas) return gas.toNumber();

        const gasLimit = gas.mul(130).div(100);
        return (await contract.add_liquidity(_amounts, _minMintAmount, { ...curve.options, gasLimit, value })).hash;
    },

    async depositEstimateGas(amounts: string[]): Promise<number> {
        // @ts-ignore
        const _amounts = await _depositCheck.call(this, amounts, true);

        // @ts-ignore
        return await this._deposit(_amounts, true);
    },

    async deposit(amounts: string[]): Promise<string> {
        // @ts-ignore
        const _amounts = await _depositCheck.call(this, amounts);

        // @ts-ignore
        return await this._deposit(_amounts);
    },
}

// @ts-ignore
export const depositPlainMixin: PoolTemplate = {
    // @ts-ignore
    async _deposit(_amounts: ethers.BigNumber[], estimateGas = false): Promise<string | number> {
        if (!estimateGas) await _ensureAllowance(this.coinAddresses, _amounts, this.swap);

        // @ts-ignore
        const _minMintAmount = (await this._calcLpTokenAmount(_amounts, true, false)).mul(99).div(100);
        const ethIndex = getEthIndex(this.coinAddresses);
        const value = _amounts[ethIndex] || ethers.BigNumber.from(0);
        const contract = curve.contracts[this.swap].contract;

        const gas = await contract.estimateGas.add_liquidity(_amounts, _minMintAmount, { ...curve.constantOptions, value });
        if (estimateGas) return gas.toNumber();

        const gasLimit = gas.mul(130).div(100);
        return (await contract.add_liquidity(_amounts, _minMintAmount, { ...curve.options, gasLimit, value })).hash;
    },

    async depositEstimateGas(amounts: string[]): Promise<number> {
        // @ts-ignore
        const _amounts = await _depositCheck.call(this, amounts, true);

        // @ts-ignore
        return await this._deposit(_amounts, true);
    },

    async deposit(amounts: string[]): Promise<string> {
        // @ts-ignore
        const _amounts = await _depositCheck.call(this, amounts);

        // @ts-ignore
        return await this._deposit(_amounts);
    },
}