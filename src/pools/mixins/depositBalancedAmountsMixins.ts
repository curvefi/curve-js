import BigNumber from 'bignumber.js';
import { PoolTemplate } from "../PoolTemplate";
import { BN } from "../../utils";


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
    const scenarioWithLowestBalancesBN = firstCoinBalanceForEachScenarioBN.map(String).indexOf(BigNumber.min(...firstCoinBalanceForEachScenarioBN).toString());

    return balancedAmountsForEachScenarioBN[scenarioWithLowestBalancesBN].map((a, i) => a.toFixed(decimals[i]))
}

// @ts-ignore
export const depositBalancedAmountsMixin: PoolTemplate = {
    async depositBalancedAmounts(): Promise<string[]> {
        // @ts-ignore
        const poolBalances = await this.stats.underlyingBalances();
        // @ts-ignore
        const walletBalances = Object.values(await this.walletUnderlyingCoinBalances());
        const balancedAmountsBN = (_depositBalancedAmounts(poolBalances, walletBalances, this.underlyingDecimals));

        return balancedAmountsBN.map((b, i) => BigNumber.min(BN(b), BN(walletBalances[i])).toString());
    },
}

// @ts-ignore
export const depositBalancedAmountsCryptoMixin: PoolTemplate = {
    async depositBalancedAmounts(): Promise<string[]> {
        // @ts-ignore
        const poolBalances = await this.stats.underlyingBalances();
        // @ts-ignore
        const walletBalances = Object.values(await this.walletUnderlyingCoinBalances());
        // @ts-ignore
        const prices = await this._underlyingPrices();
        const poolBalancesUSD = poolBalances.map((b, i) => BN(b).times(prices[i]).toString());
        const walletBalancesUSD = walletBalances.map((b, i) => BN(b).times(prices[i]).toString());
        const balancedAmountsUSD = _depositBalancedAmounts(poolBalancesUSD, walletBalancesUSD, this.underlyingDecimals);

        return balancedAmountsUSD.map((b, i) => BigNumber.min(BN(BN(b).div(prices[i]).toFixed(this.underlyingDecimals[i])), BN(walletBalances[i])).toString());
    },
}

// @ts-ignore
export const depositWrappedBalancedAmountsMixin: PoolTemplate = {
    async depositWrappedBalancedAmounts(): Promise<string[]> {
        // @ts-ignore
        const poolBalances = await this.stats.wrappedBalances();
        // @ts-ignore
        const walletBalances = Object.values(await this.walletWrappedCoinBalances());
        const balancedAmountsBN = (_depositBalancedAmounts(poolBalances, walletBalances, this.underlyingDecimals));

        return balancedAmountsBN.map((b, i) => BigNumber.min(BN(b), BN(walletBalances[i])).toString());
    },
}

// @ts-ignore
export const depositWrappedBalancedAmountsCryptoMixin: PoolTemplate = {
    async depositWrappedBalancedAmounts(): Promise<string[]> {
        // @ts-ignore
        const poolBalances = (await this.stats.wrappedBalances()).map(Number);
        // @ts-ignore
        const walletBalances = Object.values(await this.walletWrappedCoinBalances()).map(Number);
        // @ts-ignore
        const prices = await this._wrappedPrices();
        const poolBalancesUSD = poolBalances.map((b, i) => BN(b).times(prices[i]).toString());
        const walletBalancesUSD = walletBalances.map((b, i) => BN(b).times(prices[i]).toString());
        const balancedAmountsUSD = _depositBalancedAmounts(poolBalancesUSD, walletBalancesUSD, this.wrappedDecimals);

        return balancedAmountsUSD.map((b, i) => BigNumber.min(BN(BN(b).div(prices[i]).toFixed(this.wrappedDecimals[i])), BN(walletBalances[i])).toString());
    },
}
