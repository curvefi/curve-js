import { PoolTemplate } from "../PoolTemplate";
import {hasAllowance} from "../../utils";
import {curve} from "../../curve";
import {ethers} from "ethers";


// @ts-ignore
export const depositSlippageMixin: PoolTemplate = {
    async depositSlippage(amounts: string[]): Promise<string> {
        const totalAmount = amounts.reduce((s, a) => s + Number(a), 0);
        const expected = Number(await this.depositExpected(amounts));

        // @ts-ignore
        const poolBalances: number[] = (await this.getPoolBalances()).map(Number);
        const poolTotalBalance: number = poolBalances.reduce((a,b) => a + b);
        const poolBalancesRatios: number[] = poolBalances.map((b) => b / poolTotalBalance);

        const balancedAmounts: string[] = poolBalancesRatios.map((r) => String(r * totalAmount));
        const balancedExpected = Number(await this.depositExpected(balancedAmounts));

        return String((balancedExpected - expected) / balancedExpected)
    },
}

// @ts-ignore
export const depositWrappedSlippageMixin: PoolTemplate = {
    async depositWrappedSlippage(amounts: string[]): Promise<string> {
        const totalAmount = amounts.reduce((s, a) => s + Number(a), 0);
        const expected = Number(await this.depositWrappedExpected(amounts));

        // @ts-ignore
        const poolBalances: number[] = (await this.getPoolWrappedBalances()).map(Number);
        const poolTotalBalance: number = poolBalances.reduce((a,b) => a + b);
        const poolBalancesRatios: number[] = poolBalances.map((b) => b / poolTotalBalance);

        const balancedAmounts: string[] = poolBalancesRatios.map((r) => String(r * totalAmount));
        const balancedExpected = Number(await this.depositWrappedExpected(balancedAmounts));

        return String((balancedExpected - expected) / balancedExpected)
    },
}

// @ts-ignore
export const depositSlippageCryptoMixin: PoolTemplate = {
    async depositSlippage(amounts: string[]): Promise<string> {
        // @ts-ignore
        const prices = await this._underlyingPrices();
        const totalAmountUSD = amounts.reduce((s, a, i) => s + (Number(a) * prices[i]), 0);
        const expected = Number(await this.depositExpected(amounts));

        // @ts-ignore
        const poolBalances: number[] = (await this.getPoolBalances()).map(Number);
        const poolBalancesUSD = poolBalances.map((b, i) => Number(b) * prices[i]);
        const poolTotalBalance: number = poolBalancesUSD.reduce((a,b) => a + b);
        const poolBalancesRatios: number[] = poolBalancesUSD.map((b) => b / poolTotalBalance);

        const balancedAmountsUSD: number[] = poolBalancesRatios.map((r) => r * totalAmountUSD);
        const balancedAmounts: string[] = balancedAmountsUSD.map((a, i) => String(a / prices[i]));

        const balancedExpected = Number(await this.depositExpected(balancedAmounts));

        return String((balancedExpected - expected) / balancedExpected)
    },
}

// @ts-ignore
export const depositWrappedSlippageCryptoMixin: PoolTemplate = {
    async depositWrappedSlippage(amounts: string[]): Promise<string> {
        // @ts-ignore
        const prices = await this._wrappedPrices();
        const totalAmountUSD = amounts.reduce((s, a, i) => s + (Number(a) * prices[i]), 0);
        const expected = Number(await this.depositWrappedExpected(amounts));

        // @ts-ignore
        const poolBalances: number[] = (await this.getPoolWrappedBalances()).map(Number);
        const poolBalancesUSD = poolBalances.map((b, i) => Number(b) * prices[i]);
        const poolTotalBalance: number = poolBalancesUSD.reduce((a,b) => a + b);
        const poolBalancesRatios: number[] = poolBalancesUSD.map((b) => b / poolTotalBalance);

        const balancedAmountsUSD: number[] = poolBalancesRatios.map((r) => r * totalAmountUSD);
        const balancedAmounts: string[] = balancedAmountsUSD.map((a, i) => String(a / prices[i]));

        const balancedExpected = Number(await this.depositWrappedExpected(balancedAmounts));

        return String((balancedExpected - expected) / balancedExpected)

    },
}
