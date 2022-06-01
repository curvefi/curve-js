import {PoolTemplate} from "../PoolTemplate";
import {_ensureAllowance, fromBN, getEthIndex, hasAllowance, toBN} from "../../utils";
import {curve} from "../../curve";
import {ethers} from "ethers";

async function _depositWrappedCheck(this: PoolTemplate, amounts: string[], estimateGas = false): Promise<ethers.BigNumber[]> {
    if (this.isFake) {
        throw Error(`depositWrappedExpected method doesn't exist for pool ${this.name} (id: ${this.name})`);
    }

    if (amounts.length !== this.coinAddresses.length) {
        throw Error(`${this.name} pool has ${this.coinAddresses.length} coins (amounts provided for ${amounts.length})`);
    }

    const balances = Object.values(await this.wallet.coinBalances());
    for (let i = 0; i < balances.length; i++) {
        if (Number(balances[i]) < Number(amounts[i])) {
            throw Error(`Not enough ${this.coins[i]}. Actual: ${balances[i]}, required: ${amounts[i]}`);
        }
    }

    if (!(await hasAllowance(this.coinAddresses, amounts, curve.signerAddress, this.poolAddress)) && estimateGas) {
        throw Error("Token allowance is needed to estimate gas")
    }

    return  amounts.map((amount: string, i: number) => ethers.utils.parseUnits(amount, this.decimals[i]));
}

async function _depositWrappedMinAmount(this: PoolTemplate, _amounts: ethers.BigNumber[], maxSlippage = 0.005): Promise<ethers.BigNumber> {
    // @ts-ignore
    const _expectedLpTokenAmount = await this._calcLpTokenAmount(_amounts, true, false);
    const minAmountBN = toBN(_expectedLpTokenAmount).times(1 - maxSlippage);

    return fromBN(minAmountBN);
}

// @ts-ignore
export const depositWrapped2argsMixin: PoolTemplate = {
    // @ts-ignore
    async _depositWrapped(_amounts: ethers.BigNumber[], maxSlippage?: number, estimateGas = false): Promise<string | number> {
        if (!estimateGas) await _ensureAllowance(this.coinAddresses, _amounts, this.poolAddress);

        // @ts-ignore
        const _minMintAmount = await _depositWrappedMinAmount.call(this, _amounts, maxSlippage);
        const ethIndex = getEthIndex(this.coinAddresses);
        const value = _amounts[ethIndex] || ethers.BigNumber.from(0);
        const contract = curve.contracts[this.poolAddress].contract;

        const gas = await contract.estimateGas.add_liquidity(_amounts, _minMintAmount, { ...curve.constantOptions, value });
        if (estimateGas) return gas.toNumber();

        const gasLimit = gas.mul(130).div(100);
        return (await contract.add_liquidity(_amounts, _minMintAmount, { ...curve.options, gasLimit, value })).hash;
    },

    async depositWrappedEstimateGas(amounts: string[]): Promise<number> {
        // @ts-ignore
        const _amounts = await _depositWrappedCheck.call(this, amounts, true);

        // @ts-ignore
        return await this._depositWrapped(_amounts, 0.1, true);
    },

    async depositWrapped(amounts: string[], maxSlippage?: number): Promise<string> {
        // @ts-ignore
        const _amounts = await _depositWrappedCheck.call(this, amounts);

        // @ts-ignore
        return await this._depositWrapped(_amounts, maxSlippage);
    },
}


// @ts-ignore
export const depositWrapped3argsMixin: PoolTemplate = {
    // @ts-ignore
    async _depositWrapped(_amounts: ethers.BigNumber[], maxSlippage?: number, estimateGas = false): Promise<string | number> {
        if (!estimateGas) await _ensureAllowance(this.coinAddresses, _amounts, this.poolAddress);

        // @ts-ignore
        const _minMintAmount = await _depositWrappedMinAmount.call(this, _amounts, maxSlippage);
        const ethIndex = getEthIndex(this.coinAddresses);
        const value = _amounts[ethIndex] || ethers.BigNumber.from(0);
        const contract = curve.contracts[this.poolAddress].contract;

        const gas = await contract.estimateGas.add_liquidity(_amounts, _minMintAmount, false, { ...curve.constantOptions, value });
        if (estimateGas) return gas.toNumber();

        const gasLimit = gas.mul(130).div(100);
        return (await contract.add_liquidity(_amounts, _minMintAmount, false, { ...curve.options, gasLimit, value })).hash;
    },

    async depositWrappedEstimateGas(amounts: string[]): Promise<number> {
        // @ts-ignore
        const _amounts = await _depositWrappedCheck.call(this, amounts, true);

        // @ts-ignore
        return await this._depositWrapped(_amounts, 0.1, true);
    },

    async depositWrapped(amounts: string[], maxSlippage?: number): Promise<string> {
        // @ts-ignore
        const _amounts = await _depositWrappedCheck.call(this, amounts);

        // @ts-ignore
        return await this._depositWrapped(_amounts, maxSlippage);
    },
}
