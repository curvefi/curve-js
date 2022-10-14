import { ethers} from "ethers";
import { curve } from "../../curve";
import { PoolTemplate } from "../PoolTemplate";
import { checkNumber } from "../../utils";


// @ts-ignore
export const withdrawImbalanceBonusMixin: PoolTemplate = {
    async withdrawImbalanceBonus(amounts: (number | string)[]): Promise<string> {
        const totalAmount = amounts.map(checkNumber).map(Number).reduce((a, b) => a + b);
        const lpTokenAmount = await this.withdrawImbalanceExpected(amounts);

        const balancedAmounts = await this.withdrawExpected(lpTokenAmount);
        const balancedTotalAmount = balancedAmounts.map(Number).reduce((a, b) => a + b);

        return String((totalAmount - balancedTotalAmount) / Math.max(totalAmount, balancedTotalAmount) * 100);
    },
}

// @ts-ignore
export const withdrawImbalanceWrappedBonusMixin: PoolTemplate = {
    async withdrawImbalanceWrappedBonus(amounts: (number | string)[]): Promise<string> {
        let vp = 1;
        if (this.isMeta) {
            const basePoolAddress = curve.constants.POOLS_DATA[this.basePool].swap_address;
            vp = Number(ethers.utils.formatUnits(await curve.contracts[basePoolAddress].contract.get_virtual_price(curve.constantOptions)));
        }
        const prices = this.wrappedCoins.map((_, i, arr) => i === arr.length - 1 ? vp : 1);

        const totalValue = amounts.map(checkNumber).map(Number).reduce((s, a, i) => s + (a * prices[i]), 0);
        const lpTokenAmount = Number(await this.withdrawImbalanceWrappedExpected(amounts));

        const balancedAmounts = await this.withdrawWrappedExpected(lpTokenAmount);
        const balancedTotalValue = balancedAmounts.map(Number).reduce((s, a, i) => s + (a * prices[i]), 0);

        return String((totalValue - balancedTotalValue) / Math.max(totalValue, balancedTotalValue) * 100);
    },
}

// @ts-ignore
export const withdrawOneCoinBonusMixin: PoolTemplate = {
    async withdrawOneCoinBonus(lpTokenAmount: number | string, coin: string | number): Promise<string> {
        const totalAmount = Number(await this.withdrawOneCoinExpected(lpTokenAmount, coin));
        const balancedAmounts = await this.withdrawExpected(lpTokenAmount);
        const balancedTotalAmount = balancedAmounts.map(Number).reduce((a, b) => a + b);

        return String((totalAmount - balancedTotalAmount) / Math.max(totalAmount, balancedTotalAmount) * 100);
    },
}

// @ts-ignore
export const withdrawOneCoinWrappedBonusMixin: PoolTemplate = {
    async withdrawOneCoinWrappedBonus(lpTokenAmount: number | string, coin: string | number): Promise<string> {
        let vp = 1;
        if (this.isMeta) {
            const basePoolAddress = curve.constants.POOLS_DATA[this.basePool].swap_address;
            vp = Number(ethers.utils.formatUnits(await curve.contracts[basePoolAddress].contract.get_virtual_price(curve.constantOptions)));
        }
        const prices = this.wrappedCoins.map((_, i, arr) => i === arr.length - 1 ? vp : 1);

        const coinAmount = Number(await this.withdrawOneCoinWrappedExpected(lpTokenAmount, coin));
        // @ts-ignore
        const totalValue = coinAmount * prices[this._getCoinIdx(coin, false)];

        const balancedAmounts = await this.withdrawWrappedExpected(lpTokenAmount);
        const balancedTotalValue = balancedAmounts.map(Number).reduce((s, a, i) => s + (a * prices[i]), 0);

        return String((totalValue - balancedTotalValue) / Math.max(totalValue, balancedTotalValue) * 100);
    },
}

// @ts-ignore
export const withdrawOneCoinCryptoBonusMixin: PoolTemplate = {
    async withdrawOneCoinBonus(lpTokenAmount: number | string, coin: string | number): Promise<string> {
        // @ts-ignore
        const prices: number[] = await this._underlyingPrices();
        // @ts-ignore
        const coinPrice = prices[this._getCoinIdx(coin)];

        const totalAmount = Number(await this.withdrawOneCoinExpected(lpTokenAmount, coin));
        const totalAmountUSD = totalAmount * coinPrice;

        const balancedAmounts = await this.withdrawExpected(lpTokenAmount);
        const balancedTotalAmountsUSD = balancedAmounts.reduce((s, b, i) => s + (Number(b) * prices[i]), 0);

        return String((totalAmountUSD -  balancedTotalAmountsUSD) / Math.max(totalAmountUSD, balancedTotalAmountsUSD) * 100)
    },
}

// @ts-ignore
export const withdrawOneCoinWrappedCryptoBonusMixin: PoolTemplate = {
    async withdrawOneCoinWrappedBonus(lpTokenAmount: number | string, coin: string | number): Promise<string> {
        let vp = 1;
        if (this.isMeta) {
            const basePoolAddress = curve.constants.POOLS_DATA[this.basePool].swap_address;
            vp = Number(ethers.utils.formatUnits(await curve.contracts[basePoolAddress].contract.get_virtual_price(curve.constantOptions)));
        }

        // @ts-ignore
        const prices: number[] = (await this._wrappedPrices()).map((p, i, arr) => i === arr.length - 1 ? p * vp : p); // TODO check for gnosis tricrypto
        // @ts-ignore
        const coinPrice = prices[this._getCoinIdx(coin, false)];

        const totalAmount = Number(await this.withdrawOneCoinWrappedExpected(lpTokenAmount, coin));
        const totalAmountUSD = totalAmount * coinPrice;

        const balancedAmounts = await this.withdrawWrappedExpected(lpTokenAmount);
        const balancedTotalAmountsUSD = balancedAmounts.reduce((s, b, i) => s + (Number(b) * prices[i]), 0);

        return String((totalAmountUSD -  balancedTotalAmountsUSD) / Math.max(totalAmountUSD, balancedTotalAmountsUSD) * 100)
    },
}
