import { curve } from "../curve.js";
import { PoolTemplate } from "./PoolTemplate.js";
import { poolBalancesMetaMixin, poolBalancesLendingMixin } from "./mixins/poolBalancesMixin.js";
import { depositBalancedAmountsMixin, depositBalancedAmountsCryptoMixin, depositWrappedBalancedAmountsMixin, depositWrappedBalancedAmountsCryptoMixin } from "./mixins/depositBalancedAmountsMixins.js";
import { depositMetaFactoryMixin, depositCryptoMetaFactoryMixin, depositZapMixin, depositLendingOrCryptoMixin, depositPlainMixin } from "./mixins/depositMixins.js";
import { depositWrapped2argsMixin, depositWrapped3argsMixin } from "./mixins/depositWrappedMixins.js";
import { withdrawExpectedMixin, withdrawExpectedLendingOrCryptoMixin, withdrawExpectedMetaMixin, withdrawWrappedExpectedMixin } from "./mixins/withdrawExpectedMixins.js";
import { withdrawMetaFactoryMixin, withdrawCryptoMetaFactoryMixin, withdrawZapMixin, withdrawLendingOrCryptoMixin, withdrawPlainMixin } from "./mixins/withdrawMixins.js";
import { withdrawWrapped2argsMixin, withdrawWrapped3argsMixin } from "./mixins/withdrawWrappedMixins.js";
import { withdrawImbalanceMetaFactoryMixin, withdrawImbalanceZapMixin, withdrawImbalanceLendingMixin, withdrawImbalancePlainMixin } from "./mixins/withdrawImbalanceMixins.js";
import { withdrawImbalanceWrapped2argsMixin, withdrawImbalanceWrapped3argsMixin } from "./mixins/withdrawImbalanceWrappedMixins.js";
import { withdrawOneCoinExpectedMetaFactoryMixin, withdrawOneCoinExpectedZapMixin, withdrawOneCoinExpected3argsMixin, withdrawOneCoinExpected2argsMixin } from "./mixins/withdrawOneCoinExpectedMixins.js";
import { withdrawOneCoinMetaFactoryMixin, withdrawOneCoinCryptoMetaFactoryMixin, withdrawOneCoinZapMixin, withdrawOneCoinLendingOrCryptoMixin, withdrawOneCoinPlainMixin } from "./mixins/withdrawOneCoinMixins.js";
import { withdrawOneCoinWrappedExpected2argsMixin, withdrawOneCoinWrappedExpected3argsMixin } from "./mixins/withdrawOneCoinWrappedExpectedMixins.js";
import { withdrawOneCoinWrappedLendingOrCryptoMixin, withdrawOneCoinWrappedMixin } from "./mixins/withdrawOneCoinWrappedMixins.js";
import { swapTricrypto2Mixin, swapMetaFactoryMixin, swapCryptoMetaFactoryMixin, swapMixin } from "./mixins/swapMixins.js";
import {
    swapWrappedExpectedAndApproveMixin,
    swapWrappedTricrypto2Mixin,
    swapWrappedMixin,
    swapWrappedRequiredMixin,
} from "./mixins/swapWrappedMixins.js";
import { getCountArgsOfMethodByAbi, findAbiSignature } from "../utils.js";


export const getPool = (poolId: string): PoolTemplate => {
    const poolDummy = new PoolTemplate(poolId);
    class Pool extends PoolTemplate {}

    // statsBalances
    if (poolDummy.isMeta) {
        Object.assign(Pool.prototype, poolBalancesMetaMixin);
    } else if (poolDummy.useLending.reduce((x, y) => x || y)) {
        Object.assign(Pool.prototype, poolBalancesLendingMixin);
    }

    // depositBalancedAmounts
    if (poolDummy.isCrypto) {
        Object.assign(Pool.prototype, depositBalancedAmountsCryptoMixin);
    } else {
        Object.assign(Pool.prototype, depositBalancedAmountsMixin);
    }

    // depositWrappedBalancedAmounts
    if (!poolDummy.isPlain && !poolDummy.isFake) {
        if (poolDummy.isCrypto) {
            Object.assign(Pool.prototype, depositWrappedBalancedAmountsCryptoMixin);
        } else {
            Object.assign(Pool.prototype, depositWrappedBalancedAmountsMixin);
        }
    }

    // deposit and depositEstimateGas
    if (poolDummy.isMetaFactory) {
        if (poolDummy.isCrypto) {
            Object.assign(Pool.prototype, depositCryptoMetaFactoryMixin);
        } else {
            Object.assign(Pool.prototype, depositMetaFactoryMixin);
        }
    } else if (poolDummy.zap && poolId !== 'susd') {
        Object.assign(Pool.prototype, depositZapMixin);
    } else if (getCountArgsOfMethodByAbi(curve.contracts[poolDummy.address].abi, 'add_liquidity') > 2) {
        Object.assign(Pool.prototype, depositLendingOrCryptoMixin);
    } else {
        Object.assign(Pool.prototype, depositPlainMixin);
    }

    // depositWrapped and depositWrappedEstimateGas
    if (!poolDummy.isPlain && !poolDummy.isFake) {
        if (((poolDummy.isLending || poolDummy.isCrypto) && !poolDummy.zap) || (poolDummy.isCrypto && poolDummy.isMetaFactory)) {
            Object.assign(Pool.prototype, depositWrapped3argsMixin);
        } else {
            Object.assign(Pool.prototype, depositWrapped2argsMixin);
        }
    }

    // withdrawExpected
    if (poolDummy.isMeta) {
        Object.assign(Pool.prototype, withdrawExpectedMetaMixin);
    } else if (poolDummy.isLending || (poolDummy.isCrypto && !poolDummy.isPlain)) {
        Object.assign(Pool.prototype, withdrawExpectedLendingOrCryptoMixin);
    } else {
        Object.assign(Pool.prototype, withdrawExpectedMixin);
    }

    // withdraw and withdrawEstimateGas
    if (poolDummy.isMetaFactory) {
        if (poolDummy.isCrypto) {
            Object.assign(Pool.prototype, withdrawCryptoMetaFactoryMixin);
        } else {
            Object.assign(Pool.prototype, withdrawMetaFactoryMixin);
        }
    } else if (poolDummy.zap && poolId !== 'susd') {
        Object.assign(Pool.prototype, withdrawZapMixin);
    } else if (getCountArgsOfMethodByAbi(curve.contracts[poolDummy.address].abi, 'remove_liquidity') > 2) {
        Object.assign(Pool.prototype, withdrawLendingOrCryptoMixin);
    } else {
        Object.assign(Pool.prototype, withdrawPlainMixin);
    }

    // withdrawWrapped and withdrawWrappedEstimateGas
    if (!poolDummy.isPlain && !poolDummy.isFake) {
        if (((poolDummy.isLending || poolDummy.isCrypto) && !poolDummy.zap) || (poolDummy.isCrypto && poolDummy.isMetaFactory)) {
            Object.assign(Pool.prototype, withdrawWrapped3argsMixin);
            Object.assign(Pool.prototype, withdrawWrappedExpectedMixin);
        } else {
            Object.assign(Pool.prototype, withdrawWrapped2argsMixin);
            Object.assign(Pool.prototype, withdrawWrappedExpectedMixin);
        }
    }

    // withdrawImbalance and withdrawImbalanceEstimateGas
    if (!poolDummy.isCrypto) {
        if (poolDummy.isMetaFactory) {
            Object.assign(Pool.prototype, withdrawImbalanceMetaFactoryMixin);
        } else if (poolDummy.zap && poolId !== 'susd') {
            Object.assign(Pool.prototype, withdrawImbalanceZapMixin);
        } else if (poolDummy.isLending) {
            Object.assign(Pool.prototype, withdrawImbalanceLendingMixin);
        } else {
            Object.assign(Pool.prototype, withdrawImbalancePlainMixin);
        }
    }

    // withdrawImbalanceWrapped and withdrawImbalanceWrappedEstimateGas
    if (!poolDummy.isCrypto) {
        if (poolDummy.isLending && !poolDummy.zap) {
            Object.assign(Pool.prototype, withdrawImbalanceWrapped3argsMixin);
        } else if (!poolDummy.isPlain && !poolDummy.isFake) {
            Object.assign(Pool.prototype, withdrawImbalanceWrapped2argsMixin);
        }
    }

    // withdrawOneCoinExpected
    if (poolDummy.isMetaFactory) {
        Object.assign(Pool.prototype, withdrawOneCoinExpectedMetaFactoryMixin);
    } else if ((!poolDummy.isCrypto && poolDummy.zap) || poolDummy.isMeta) { // including susd
        Object.assign(Pool.prototype, withdrawOneCoinExpectedZapMixin);
    } else if (poolId === 'ib') {
        Object.assign(Pool.prototype, withdrawOneCoinExpected3argsMixin);
    } else {
        Object.assign(Pool.prototype, withdrawOneCoinExpected2argsMixin);
    }

    // withdrawOneCoin and withdrawOneCoinEstimateGas
    if (poolDummy.isMetaFactory) {
        if (poolDummy.isCrypto) {
            Object.assign(Pool.prototype, withdrawOneCoinCryptoMetaFactoryMixin);
        } else {
            Object.assign(Pool.prototype, withdrawOneCoinMetaFactoryMixin);
        }
    } else if (poolDummy.zap) { // including susd
        Object.assign(Pool.prototype, withdrawOneCoinZapMixin);
    } else if (getCountArgsOfMethodByAbi(curve.contracts[poolDummy.address].abi, 'remove_liquidity_one_coin') > 3) {
        Object.assign(Pool.prototype, withdrawOneCoinLendingOrCryptoMixin);
    } else {
        Object.assign(Pool.prototype, withdrawOneCoinPlainMixin);
    }

    // withdrawOneCoinWrappedExpected
    if (!poolDummy.isPlain && !poolDummy.isFake && !(poolDummy.isLending && poolDummy.zap)) {
        if (poolId === "ib") {
            Object.assign(Pool.prototype, withdrawOneCoinWrappedExpected3argsMixin);
        } else {
            Object.assign(Pool.prototype, withdrawOneCoinWrappedExpected2argsMixin);
        }
    }

    // withdrawOneCoinWrapped and withdrawOneCoinWrappedEstimateGas
    if (!poolDummy.isPlain && !poolDummy.isFake && !(poolDummy.isLending && poolDummy.zap)) {
        if (((poolDummy.isLending || poolDummy.isCrypto) && !poolDummy.zap) || (poolDummy.isCrypto && poolDummy.isMetaFactory)) {
            Object.assign(Pool.prototype, withdrawOneCoinWrappedLendingOrCryptoMixin);
        } else {
            Object.assign(Pool.prototype, withdrawOneCoinWrappedMixin);
        }
    }

    // swap and swapEstimateGas
    if (findAbiSignature(curve.contracts[poolDummy.address].abi, 'exchange', 'uint256,uint256,uint256,uint256,bool') &&
        !(curve.chainId === 100 && poolDummy.id === "tricrypto")) { // tricrypto2 (eth), tricrypto (arbitrum), avaxcrypto (avalanche); 100 is xDAI
        Object.assign(Pool.prototype, swapTricrypto2Mixin);
    } else if (poolDummy.isMetaFactory && (getPool(poolDummy.basePool).isLending || getPool(poolDummy.basePool).isFake || poolDummy.isCrypto)) {
        if (poolDummy.isCrypto) {
            Object.assign(Pool.prototype, swapCryptoMetaFactoryMixin);
        } else {
            Object.assign(Pool.prototype, swapMetaFactoryMixin);
        }
    } else {
        Object.assign(Pool.prototype, swapMixin);
    }

    // swapWrapped and swapWrappedEstimateGas
    if (!poolDummy.isPlain && !poolDummy.isFake) {
        Object.assign(Pool.prototype, swapWrappedExpectedAndApproveMixin);
        Object.assign(Pool.prototype, swapWrappedRequiredMixin);
        if (findAbiSignature(curve.contracts[poolDummy.address].abi, 'exchange', 'uint256,uint256,uint256,uint256,bool')) { // tricrypto2 (eth), tricrypto (arbitrum)
            Object.assign(Pool.prototype, swapWrappedTricrypto2Mixin);
        } else {
            Object.assign(Pool.prototype, swapWrappedMixin);
        }
    }

    return new Pool(poolId);
}