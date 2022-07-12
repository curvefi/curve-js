import { ethers} from "ethers";
import { curve } from "../../curve";
import { PoolTemplate } from "../PoolTemplate";
import { checkNumber } from "../../utils";


// @ts-ignore
export const depositBonusMixin: PoolTemplate = {
    async depositBonus(amounts: (number | string)[]): Promise<string> {
        const totalAmount = amounts.map(checkNumber).map(Number).reduce((a, b) => a + b);
        const expected = Number(await this.depositExpected(amounts));

        // @ts-ignore
        const poolBalances: number[] = (await this.stats.underlyingBalances()).map(Number);
        const poolTotalBalance: number = poolBalances.reduce((a,b) => a + b);
        const poolBalancesRatios: number[] = poolBalances.map((b) => b / poolTotalBalance);

        const balancedAmounts = poolBalancesRatios.map((r) => r * totalAmount);
        const balancedExpected = Number(await this.depositExpected(balancedAmounts));

        return String((expected - balancedExpected) / expected * 100)
    },
}

// @ts-ignore
export const depositWrappedBonusMixin: PoolTemplate = {
    async depositWrappedBonus(amounts: (number | string)[]): Promise<string> {
        let vp = 1;
        if (this.isMeta) {
            const basePoolAddress = curve.constants.POOLS_DATA[this.basePool].swap_address;
            vp = Number(ethers.utils.formatUnits(await curve.contracts[basePoolAddress].contract.get_virtual_price(curve.constantOptions)));
        }
        const prices = this.wrappedCoins.map((_, i, arr) => i === arr.length - 1 ? vp : 1);
        const totalValue = amounts.map(checkNumber).map(Number).reduce((s, a, i) => s + (a * prices[i]), 0);
        const expected = Number(await this.depositWrappedExpected(amounts));

        // @ts-ignore
        const poolBalances: number[] = (await this.stats.wrappedBalances()).map(Number);
        const poolValues = poolBalances.map((b, i) => b * prices[i]);
        const poolTotalValue = poolValues.reduce((a,b) => a + b);
        const poolRatios = poolValues.map((b) => b / poolTotalValue);

        const balancedValues = poolRatios.map((r) => r * totalValue);
        const balancedAmounts = balancedValues.map((a, i) => a / prices[i]);
        const balancedExpected = Number(await this.depositWrappedExpected(balancedAmounts));

        return String((expected - balancedExpected) / expected * 100)
    },
}

// @ts-ignore
export const depositBonusCryptoMixin: PoolTemplate = {
    async depositBonus(amounts: (number | string)[]): Promise<string> {
        // @ts-ignore
        const prices = await this._underlyingPrices();
        const totalAmountUSD = amounts.map(checkNumber).map(Number).reduce((s, a, i) => s + (a * prices[i]), 0);
        const expected = Number(await this.depositExpected(amounts));

        // @ts-ignore
        const poolBalances = (await this.stats.underlyingBalances()).map(Number);
        const poolBalancesUSD = poolBalances.map((b, i) => b * prices[i]);
        const poolTotalBalance = poolBalancesUSD.reduce((a,b) => a + b);
        const poolBalancesRatios = poolBalancesUSD.map((b) => b / poolTotalBalance);

        const balancedAmountsUSD = poolBalancesRatios.map((r) => r * totalAmountUSD);
        const balancedAmounts = balancedAmountsUSD.map((a, i) => a / prices[i]);

        const balancedExpected = Number(await this.depositExpected(balancedAmounts));

        return String((expected - balancedExpected) / expected * 100)
    },
}

// @ts-ignore
export const depositWrappedBonusCryptoMixin: PoolTemplate = {
    async depositWrappedBonus(amounts: string[]): Promise<string> {
        // @ts-ignore
        let prices = await this._wrappedPrices();
        let vp = 1;
        if (this.isMeta) {
            const basePoolAddress = curve.constants.POOLS_DATA[this.basePool].swap_address;
            vp = Number(ethers.utils.formatUnits(await curve.contracts[basePoolAddress].contract.get_virtual_price(curve.constantOptions)));
        }
        prices = prices.map((p, i) => i === prices.length - 1 ? p * vp : p);

        const totalAmountUSD = amounts.map(checkNumber).map(Number).reduce((s, a, i) => s + (a * prices[i]), 0);
        const expected = Number(await this.depositWrappedExpected(amounts));

        // @ts-ignore
        const poolBalances = (await this.stats.wrappedBalances()).map(Number);
        const poolBalancesUSD = poolBalances.map((b, i) => b * prices[i]);
        const poolTotalBalance = poolBalancesUSD.reduce((a,b) => a + b);
        const poolBalancesRatios = poolBalancesUSD.map((b) => b / poolTotalBalance);

        const balancedAmountsUSD = poolBalancesRatios.map((r) => r * totalAmountUSD);
        const balancedAmounts = balancedAmountsUSD.map((a, i) => a / prices[i]);

        const balancedExpected = Number(await this.depositWrappedExpected(balancedAmounts));

        return String((expected - balancedExpected) / expected * 100)

    },
}