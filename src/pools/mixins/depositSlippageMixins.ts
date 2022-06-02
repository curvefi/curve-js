import { PoolTemplate } from "../PoolTemplate";
import { checkNumber } from "../../utils";


// @ts-ignore
export const depositSlippageMixin: PoolTemplate = {
    async depositSlippage(amounts: (number | string)[]): Promise<string> {
        const totalAmount = amounts.map(checkNumber).map(Number).reduce((a, b) => a + b);
        const expected = Number(await this.depositExpected(amounts));

        // @ts-ignore
        const poolBalances: number[] = (await this.getPoolBalances()).map(Number);
        const poolTotalBalance: number = poolBalances.reduce((a,b) => a + b);
        const poolBalancesRatios: number[] = poolBalances.map((b) => b / poolTotalBalance);

        const balancedAmounts = poolBalancesRatios.map((r) => r * totalAmount);
        const balancedExpected = Number(await this.depositExpected(balancedAmounts));

        return String((balancedExpected - expected) / balancedExpected)
    },
}

// @ts-ignore
export const depositWrappedSlippageMixin: PoolTemplate = {
    async depositWrappedSlippage(amounts: (number | string)[]): Promise<string> {
        const totalAmount = amounts.map(checkNumber).map(Number).reduce((a, b) => a + b);
        const expected = Number(await this.depositWrappedExpected(amounts));

        // @ts-ignore
        const poolBalances: number[] = (await this.getPoolWrappedBalances()).map(Number);
        const poolTotalBalance: number = poolBalances.reduce((a,b) => a + b);
        const poolBalancesRatios: number[] = poolBalances.map((b) => b / poolTotalBalance);

        const balancedAmounts = poolBalancesRatios.map((r) => r * totalAmount);
        const balancedExpected = Number(await this.depositWrappedExpected(balancedAmounts));

        return String((balancedExpected - expected) / balancedExpected)
    },
}

// @ts-ignore
export const depositSlippageCryptoMixin: PoolTemplate = {
    async depositSlippage(amounts: (number | string)[]): Promise<string> {
        // @ts-ignore
        const prices = await this._underlyingPrices();
        const totalAmountUSD = amounts.map(checkNumber).map(Number).reduce((s, a, i) => s + (a * prices[i]), 0);
        const expected = Number(await this.depositExpected(amounts));

        // @ts-ignore
        const poolBalances = (await this.getPoolBalances()).map(Number);
        const poolBalancesUSD = poolBalances.map((b, i) => b * prices[i]);
        const poolTotalBalance = poolBalancesUSD.reduce((a,b) => a + b);
        const poolBalancesRatios = poolBalancesUSD.map((b) => b / poolTotalBalance);

        const balancedAmountsUSD = poolBalancesRatios.map((r) => r * totalAmountUSD);
        const balancedAmounts = balancedAmountsUSD.map((a, i) => a / prices[i]);

        const balancedExpected = Number(await this.depositExpected(balancedAmounts));

        return String((balancedExpected - expected) / balancedExpected)
    },
}

// @ts-ignore
export const depositWrappedSlippageCryptoMixin: PoolTemplate = {
    async depositWrappedSlippage(amounts: string[]): Promise<string> {
        // @ts-ignore
        const prices = await this._wrappedPrices();
        const totalAmountUSD = amounts.map(checkNumber).map(Number).reduce((s, a, i) => s + (a * prices[i]), 0);
        const expected = Number(await this.depositWrappedExpected(amounts));

        // @ts-ignore
        const poolBalances = (await this.getPoolWrappedBalances()).map(Number);
        const poolBalancesUSD = poolBalances.map((b, i) => b * prices[i]);
        const poolTotalBalance = poolBalancesUSD.reduce((a,b) => a + b);
        const poolBalancesRatios = poolBalancesUSD.map((b) => b / poolTotalBalance);

        const balancedAmountsUSD = poolBalancesRatios.map((r) => r * totalAmountUSD);
        const balancedAmounts = balancedAmountsUSD.map((a, i) => a / prices[i]);

        const balancedExpected = Number(await this.depositWrappedExpected(balancedAmounts));

        return String((balancedExpected - expected) / balancedExpected)

    },
}