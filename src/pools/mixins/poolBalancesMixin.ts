import { curve } from "../../curve";
import { ethers } from "ethers";
import { PoolTemplate } from "../PoolTemplate";


// @ts-ignore
export const poolBalancesAtricrypto3Mixin: PoolTemplate = {
    async getPoolBalances(): Promise<string[]> {
        const swapContract = curve.contracts[this.poolAddress].multicallContract;
        const contractCalls = this.coins.map((_, i) => swapContract.balances(i));
        const _poolWrappedBalances: ethers.BigNumber[] = await curve.multicallProvider.all(contractCalls);
        const [_poolMetaCoinBalance, ..._poolNonMetaBalances] = _poolWrappedBalances;

        const basePool = new PoolTemplate(this.basePool);
        // @ts-ignore
        const _basePoolExpectedAmounts = await basePool._calcExpectedAmounts(_poolMetaCoinBalance);
        const _poolUnderlyingBalances = [..._basePoolExpectedAmounts, ..._poolNonMetaBalances];

        return  _poolUnderlyingBalances.map((_b: ethers.BigNumber, i: number) => ethers.utils.formatUnits(_b, this.underlyingDecimals[i]))
    },
}

// @ts-ignore
export const poolBalancesMetaMixin: PoolTemplate = {
    async getPoolBalances(): Promise<string[]> {
        const swapContract = curve.contracts[this.poolAddress].multicallContract;
        const contractCalls = this.coins.map((_, i) => swapContract.balances(i));
        const _poolWrappedBalances: ethers.BigNumber[] = await curve.multicallProvider.all(contractCalls);
        _poolWrappedBalances.unshift(_poolWrappedBalances.pop() as ethers.BigNumber);
        const [_poolMetaCoinBalance, ..._poolNonMetaBalance] = _poolWrappedBalances;

        const basePool = new PoolTemplate(this.basePool);
        // @ts-ignore
        const _basePoolExpectedAmounts = await basePool._calcExpectedAmounts(_poolMetaCoinBalance);
        const _poolUnderlyingBalances = [..._poolNonMetaBalance, ..._basePoolExpectedAmounts];

        return  _poolUnderlyingBalances.map((_b: ethers.BigNumber, i: number) => ethers.utils.formatUnits(_b, this.underlyingDecimals[i]))
    },
}

// @ts-ignore
export const poolBalancesLendingMixin: PoolTemplate = {
    async getPoolBalances(): Promise<string[]> {
        const swapContract = curve.contracts[this.poolAddress].multicallContract;
        const contractCalls = this.coins.map((_, i) => swapContract.balances(i));
        const _poolWrappedBalances: ethers.BigNumber[] = await curve.multicallProvider.all(contractCalls);

        // @ts-ignore
        const _rates: ethers.BigNumber[] = await this._getRates();
        const _poolUnderlyingBalances = _poolWrappedBalances.map(
            (_b: ethers.BigNumber, i: number) => _b.mul(_rates[i]).div(ethers.BigNumber.from(10).pow(18)));

        return  _poolUnderlyingBalances.map((_b: ethers.BigNumber, i: number) => ethers.utils.formatUnits(_b, this.underlyingDecimals[i]))
    },
}