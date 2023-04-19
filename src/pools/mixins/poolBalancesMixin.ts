import { ethers } from "ethers";
import { curve } from "../../curve";
import { _calcExpectedAmounts, _calcExpectedUnderlyingAmountsMeta } from "./common";
import { PoolTemplate } from "../PoolTemplate";


// @ts-ignore
export const poolBalancesMetaMixin: PoolTemplate = {
    async statsUnderlyingBalances(): Promise<string[]> {
        const swapContract = curve.contracts[this.address].multicallContract;
        const contractCalls = this.wrappedCoins.map((_, i) => swapContract.balances(i));
        const _poolWrappedBalances: ethers.BigNumber[] = await curve.multicallProvider.all(contractCalls);
        const [_poolMetaCoinBalance] = _poolWrappedBalances.splice(this.metaCoinIdx, 1);
        const _poolUnderlyingBalances = _poolWrappedBalances;
        const basePool = new PoolTemplate(this.basePool);
        const _basePoolExpectedAmounts = basePool.isMeta ?
            await _calcExpectedUnderlyingAmountsMeta.call(basePool, _poolMetaCoinBalance) :
            await _calcExpectedAmounts.call(basePool, _poolMetaCoinBalance);
        _poolUnderlyingBalances.splice(this.metaCoinIdx, 0, ..._basePoolExpectedAmounts);

        return  _poolUnderlyingBalances.map((_b: ethers.BigNumber, i: number) => ethers.utils.formatUnits(_b, this.underlyingDecimals[i]))
    },
}

// @ts-ignore
export const poolBalancesLendingMixin: PoolTemplate = {
    async statsUnderlyingBalances(): Promise<string[]> {
        const swapContract = curve.contracts[this.address].multicallContract;
        const contractCalls = this.wrappedCoins.map((_, i) => swapContract.balances(i));
        const _poolWrappedBalances: ethers.BigNumber[] = await curve.multicallProvider.all(contractCalls);

        // @ts-ignore
        const _rates: ethers.BigNumber[] = await this._getRates();
        const _poolUnderlyingBalances = _poolWrappedBalances.map(
            (_b: ethers.BigNumber, i: number) => _b.mul(_rates[i]).div(ethers.BigNumber.from(10).pow(18)));

        return  _poolUnderlyingBalances.map((_b: ethers.BigNumber, i: number) => ethers.utils.formatUnits(_b, this.underlyingDecimals[i]))
    },
}