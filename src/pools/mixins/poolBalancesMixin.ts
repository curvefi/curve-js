import { curve } from "../../curve.js";
import { PoolTemplate } from "../PoolTemplate.js";
import { _calcExpectedAmounts, _calcExpectedUnderlyingAmountsMeta } from "./common.js";
import {IStatsPool} from "../subClasses/statsPool";


// @ts-ignore
export const poolBalancesMetaMixin: IStatsPool = {
    async underlyingBalances(): Promise<string[]> {
        const swapContract = curve.contracts[this.pool.address].multicallContract;
        const contractCalls = this.pool.wrappedCoins.map((_, i) => swapContract.balances(i));
        const _poolWrappedBalances: bigint[] = await curve.multicallProvider.all(contractCalls);
        const [_poolMetaCoinBalance] = _poolWrappedBalances.splice(this.pool.metaCoinIdx, 1);
        const _poolUnderlyingBalances = _poolWrappedBalances;
        const basePool = new PoolTemplate(this.pool.basePool);
        const _basePoolExpectedAmounts = basePool.isMeta ?
            await _calcExpectedUnderlyingAmountsMeta.call(basePool, _poolMetaCoinBalance) :
            await _calcExpectedAmounts.call(basePool, _poolMetaCoinBalance);
        _poolUnderlyingBalances.splice(this.pool.metaCoinIdx, 0, ..._basePoolExpectedAmounts);

        return  _poolUnderlyingBalances.map((_b: bigint, i: number) => curve.formatUnits(_b, this.pool.underlyingDecimals[i]))
    },
}

// @ts-ignore
export const poolBalancesLendingMixin: IStatsPool = {
    async underlyingBalances(): Promise<string[]> {
        const swapContract = curve.contracts[this.pool.address].multicallContract;
        const contractCalls = this.pool.wrappedCoins.map((_, i) => swapContract.balances(i));
        const _poolWrappedBalances: bigint[] = await curve.multicallProvider.all(contractCalls);

        // @ts-ignore
        const _rates: bigint[] = await this.pool._getRates();
        const _poolUnderlyingBalances = _poolWrappedBalances.map(
            (_b: bigint, i: number) => _b * _rates[i] / curve.parseUnits(String(10**18), 0));

        return  _poolUnderlyingBalances.map((_b: bigint, i: number) => curve.formatUnits(_b, this.pool.underlyingDecimals[i]))
    },
}
