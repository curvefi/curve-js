import BigNumber from 'bignumber.js';
import { PoolTemplate } from "../PoolTemplate.js";
import { BN } from "../../utils.js";


function _depositBalancedAmounts(poolBalances: string[], walletBalances: string[], decimals: number[]): string[] {
    const poolBalancesBN = poolBalances.map(BN);
    const walletBalancesBN = walletBalances.map(BN);
    const poolTotalLiquidityBN = poolBalancesBN.reduce((a,b) => a.plus(b));
    const poolBalancesRatiosBN = poolBalancesBN.map((b) => b.div(poolTotalLiquidityBN));
    // Cross factors for each wallet balance used as reference to see the
    // max that can be used according to the lowest relative wallet balance
    const balancedAmountsForEachScenarioBN = walletBalancesBN.map((_, i) => (
        walletBalancesBN.map((_, j) => (
            poolBalancesRatiosBN[j].times(walletBalancesBN[i]).div(poolBalancesRatiosBN[i])
        ))
    ));
    const firstCoinBalanceForEachScenarioBN = balancedAmountsForEachScenarioBN.map(([a]) => a);

    // get the scenario with the lowest balances, ignoring scenarios where the wallet balance is zero
    const min = BigNumber.min(...firstCoinBalanceForEachScenarioBN.filter((b) => !b.isZero()));
    const scenarioWithLowestBalancesBN = firstCoinBalanceForEachScenarioBN.map(String).indexOf(min.toString());
    const bestScenario = balancedAmountsForEachScenarioBN[scenarioWithLowestBalancesBN];
    return bestScenario.map((a, i) => walletBalancesBN[i].isZero() ? "0" : a.toFixed(decimals[i]))
}

export const depositBalancedAmountsMixin = {
    async depositBalancedAmounts(this: PoolTemplate): Promise<string[]> {
        const poolBalances = await this.stats.underlyingBalances();
        const walletBalances = Object.values(await this.wallet.underlyingCoinBalances());
        const balancedAmountsBN = (_depositBalancedAmounts(poolBalances, walletBalances, this.underlyingDecimals));

        return balancedAmountsBN.map((b, i) => BigNumber.min(BN(b), BN(walletBalances[i])).toString());
    },
}

export const depositBalancedAmountsCryptoMixin = {
    async depositBalancedAmounts(this: PoolTemplate): Promise<string[]> {
        const poolBalances = await this.stats.underlyingBalances();
        const walletBalances = Object.values(await this.wallet.underlyingCoinBalances());
        const prices = await this._underlyingPrices();
        const poolBalancesUSD = poolBalances.map((b, i) => BN(b).times(prices[i]).toString());
        const walletBalancesUSD = walletBalances.map((b, i) => BN(b).times(prices[i]).toString());
        const balancedAmountsUSD = _depositBalancedAmounts(poolBalancesUSD, walletBalancesUSD, this.underlyingDecimals);

        return balancedAmountsUSD.map((b, i) => BigNumber.min(BN(BN(b).div(prices[i]).toFixed(this.underlyingDecimals[i])), BN(walletBalances[i])).toString());
    },
}

export const depositWrappedBalancedAmountsMixin = {
    async depositWrappedBalancedAmounts(this: PoolTemplate): Promise<string[]> {
        const poolBalances = await this.stats.wrappedBalances();
        const walletBalances = Object.values(await this.wallet.wrappedCoinBalances());
        const balancedAmountsBN = (_depositBalancedAmounts(poolBalances, walletBalances, this.underlyingDecimals));

        return balancedAmountsBN.map((b, i) => BigNumber.min(BN(b), BN(walletBalances[i])).toString());
    },
}

export const depositWrappedBalancedAmountsCryptoMixin = {
    async depositWrappedBalancedAmounts(this: PoolTemplate): Promise<string[]> {
        const poolBalances = (await this.stats.wrappedBalances()).map(Number);
        const walletBalances = Object.values(await this.wallet.wrappedCoinBalances()).map(Number);
        const prices = await this._wrappedPrices();
        const poolBalancesUSD = poolBalances.map((b, i) => BN(b).times(prices[i]).toString());
        const walletBalancesUSD = walletBalances.map((b, i) => BN(b).times(prices[i]).toString());
        const balancedAmountsUSD = _depositBalancedAmounts(poolBalancesUSD, walletBalancesUSD, this.wrappedDecimals);

        return balancedAmountsUSD.map((b, i) => BigNumber.min(BN(BN(b).div(prices[i]).toFixed(this.wrappedDecimals[i])), BN(walletBalances[i])).toString());
    },
}
