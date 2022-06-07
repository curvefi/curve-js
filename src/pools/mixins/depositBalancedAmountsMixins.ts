import { PoolTemplate } from "../PoolTemplate";


function _depositBalancedAmounts(poolBalances: number[], walletBalances: number[], decimals: number[]): string[] {
    const poolTotalLiquidity = poolBalances.reduce((a,b) => a + b);
    const poolBalancesRatios = poolBalances.map((b) => b / poolTotalLiquidity);
    // Cross factors for each wallet balance used as reference to see the
    // max that can be used according to the lowest relative wallet balance
    const balancedAmountsForEachScenario = walletBalances.map((_, i) => (
        walletBalances.map((_, j) => (
            poolBalancesRatios[j] * walletBalances[i] / poolBalancesRatios[i]
        ))
    ));
    const firstCoinBalanceForEachScenario = balancedAmountsForEachScenario.map(([a]) => a);
    const scenarioWithLowestBalances = firstCoinBalanceForEachScenario.indexOf(Math.min(...firstCoinBalanceForEachScenario));

    return balancedAmountsForEachScenario[scenarioWithLowestBalances].map((a, i) => a.toFixed(decimals[i]))
}

// @ts-ignore
export const depositBalancedAmountsMixin: PoolTemplate = {
    async depositBalancedAmounts(): Promise<string[]> {
        // @ts-ignore
        const poolBalances = (await this.getPoolBalances()).map(Number);
        // @ts-ignore
        const walletBalances = Object.values(await this.walletUnderlyingCoinBalances()).map(Number);

        return _depositBalancedAmounts(poolBalances, walletBalances, this.underlyingDecimals)
    },
}

// @ts-ignore
export const depositBalancedAmountsCryptoMixin: PoolTemplate = {
    async depositBalancedAmounts(): Promise<string[]> {
        // @ts-ignore
        const poolBalances = (await this.getPoolBalances()).map(Number);
        // @ts-ignore
        const walletBalances = Object.values(await this.walletUnderlyingCoinBalances()).map(Number);
        // @ts-ignore
        const prices = await this._underlyingPrices();
        const poolBalancesUSD = poolBalances.map((b, i) => b * prices[i]);
        const walletBalancesUSD = walletBalances.map((b, i) => b * prices[i]);
        // @ts-ignore
        const balancedAmountsUSD = _depositBalancedAmounts(poolBalancesUSD, walletBalancesUSD, this.underlyingDecimals);

        // @ts-ignore
        return balancedAmountsUSD.map((b, i) => String(Math.min(Number(b) / prices[i], poolBalances[i])));
    },
}

// @ts-ignore
export const depositWrappedBalancedAmountsMixin: PoolTemplate = {
    async depositWrappedBalancedAmounts(): Promise<string[]> {
        // @ts-ignore
        const poolBalances = (await this.getPoolWrappedBalances()).map(Number);
        // @ts-ignore
        const walletBalances = Object.values(await this.walletCoinBalances()).map(Number);

        return _depositBalancedAmounts(poolBalances, walletBalances, this.decimals)
    },
}

// @ts-ignore
export const depositWrappedBalancedAmountsCryptoMixin: PoolTemplate = {
    async depositWrappedBalancedAmounts(): Promise<string[]> {
        // @ts-ignore
        const poolBalances = (await this.getPoolWrappedBalances()).map(Number);
        // @ts-ignore
        const walletBalances = Object.values(await this.walletCoinBalances()).map(Number);
        // @ts-ignore
        const prices = await this._wrappedPrices();
        const poolBalancesUSD = poolBalances.map((b, i) => b * prices[i]);
        const walletBalancesUSD = walletBalances.map((b, i) => b * prices[i]);
        // @ts-ignore
        const balancedAmountsUSD = _depositBalancedAmounts(poolBalancesUSD, walletBalancesUSD, this.decimals);

        return balancedAmountsUSD.map((b, i) => String(Math.min(Number(b) / prices[i], poolBalances[i])));
    },
}
