import {type Curve} from "../curve.js";
import {PoolTemplate} from "./PoolTemplate.js";
import {poolBalancesLendingMixin, poolBalancesMetaMixin} from "./mixins/poolBalancesMixin.js";
import {
    depositBalancedAmountsCryptoMixin,
    depositBalancedAmountsMixin,
    depositWrappedBalancedAmountsCryptoMixin,
    depositWrappedBalancedAmountsMixin,
} from "./mixins/depositBalancedAmountsMixins.js";
import {
    depositCryptoMetaFactoryMixin,
    depositLendingOrCryptoMixin,
    depositMetaFactoryMixin,
    depositPlainMixin,
    depositZapMixin,
} from "./mixins/depositMixins.js";
import {depositWrapped2argsMixin, depositWrapped3argsMixin} from "./mixins/depositWrappedMixins.js";
import {
    withdrawExpectedLendingOrCryptoMixin,
    withdrawExpectedMetaMixin,
    withdrawExpectedMixin,
    withdrawWrappedExpectedMixin,
} from "./mixins/withdrawExpectedMixins.js";
import {
    withdrawCryptoMetaFactoryMixin,
    withdrawLendingOrCryptoMixin,
    withdrawMetaFactoryMixin,
    withdrawPlainMixin,
    withdrawZapMixin,
} from "./mixins/withdrawMixins.js";
import {withdrawWrapped2argsMixin, withdrawWrapped3argsMixin} from "./mixins/withdrawWrappedMixins.js";
import {
    withdrawImbalanceLendingMixin,
    withdrawImbalanceMetaFactoryMixin,
    withdrawImbalancePlainMixin,
    withdrawImbalanceZapMixin,
} from "./mixins/withdrawImbalanceMixins.js";
import {
    withdrawImbalanceWrapped2argsMixin,
    withdrawImbalanceWrapped3argsMixin,
} from "./mixins/withdrawImbalanceWrappedMixins.js";
import {
    withdrawOneCoinExpected2argsMixin,
    withdrawOneCoinExpected3argsMixin,
    withdrawOneCoinExpectedMetaFactoryMixin,
    withdrawOneCoinExpectedZapMixin,
} from "./mixins/withdrawOneCoinExpectedMixins.js";
import {
    withdrawOneCoinCryptoMetaFactoryMixin,
    withdrawOneCoinLendingOrCryptoMixin,
    withdrawOneCoinMetaFactoryMixin,
    withdrawOneCoinPlainMixin,
    withdrawOneCoinZapMixin,
} from "./mixins/withdrawOneCoinMixins.js";
import {
    withdrawOneCoinWrappedExpected2argsMixin,
    withdrawOneCoinWrappedExpected3argsMixin,
} from "./mixins/withdrawOneCoinWrappedExpectedMixins.js";
import {
    withdrawOneCoinWrappedLendingOrCryptoMixin,
    withdrawOneCoinWrappedMixin,
} from "./mixins/withdrawOneCoinWrappedMixins.js";
import {swapCryptoMetaFactoryMixin, swapMetaFactoryMixin, swapMixin, swapTricrypto2Mixin} from "./mixins/swapMixins.js";
import {
    swapWrappedExpectedAndApproveMixin,
    swapWrappedMixin,
    swapWrappedRequiredMixin,
    swapWrappedTricrypto2Mixin,
} from "./mixins/swapWrappedMixins.js";
import {findAbiSignature, getCountArgsOfMethodByAbi, getPoolIdBySwapAddress} from "../utils.js";
import {StatsPool} from "./subClasses/statsPool.js";


export function getPool(this: Curve, poolIdOrAddress: string): PoolTemplate {
    let poolId: string;

    const _poolIdOrAddress = poolIdOrAddress.toLowerCase()
    
    if (_poolIdOrAddress.startsWith('0x')) {
        poolId = getPoolIdBySwapAddress.call(this, _poolIdOrAddress);
        
        if (!poolId || !this.getPoolsData()[poolId]) {
            throw new Error(`Pool with address ${_poolIdOrAddress} not found`);
        }
    } else {
        poolId = _poolIdOrAddress;
        
        const poolsData = this.getPoolsData();
        if (!poolsData[poolId]) {
            throw new Error(`Pool with id ${_poolIdOrAddress} not found`);
        }
    }
    
    const poolDummy = new PoolTemplate(poolId, this);
    
    class Pool extends PoolTemplate {
        stats: StatsPool;

        constructor(poolId: string, curve: Curve) {
            super(poolId, curve);
            this.stats = new StatsPool(this);
            this.configureStats(poolDummy);
        }

        private configureStats(poolDummy: PoolTemplate) {
            if (poolDummy.isMeta) {
                Object.assign(this.stats, poolBalancesMetaMixin);
            } else if (poolDummy.useLending.reduce((x, y) => x || y)) {
                Object.assign(this.stats, poolBalancesLendingMixin);
            }
        }
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
    } else if (getCountArgsOfMethodByAbi(this.contracts[poolDummy.address].abi, 'add_liquidity') > 2) {
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
    } else if (getCountArgsOfMethodByAbi(this.contracts[poolDummy.address].abi, 'remove_liquidity') > 2) {
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
    } else if (getCountArgsOfMethodByAbi(this.contracts[poolDummy.address].abi, 'remove_liquidity_one_coin') > 3) {
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
    if (findAbiSignature(this.contracts[poolDummy.address].abi, 'exchange', 'uint256,uint256,uint256,uint256,bool') &&
        !(this.chainId === 100 && poolDummy.id === "tricrypto")) { // tricrypto2 (eth), tricrypto (arbitrum), avaxcrypto (avalanche); 100 is xDAI
        Object.assign(Pool.prototype, swapTricrypto2Mixin);
    } else if (poolDummy.isMetaFactory && (getPool.call(this, poolDummy.basePool).isLending || getPool.call(this, poolDummy.basePool).isFake || poolDummy.isCrypto)) {
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
        if (findAbiSignature(this.contracts[poolDummy.address].abi, 'exchange', 'uint256,uint256,uint256,uint256,bool')) { // tricrypto2 (eth), tricrypto (arbitrum)
            Object.assign(Pool.prototype, swapWrappedTricrypto2Mixin);
        } else {
            Object.assign(Pool.prototype, swapWrappedMixin);
        }
    }

    return new Pool(poolId, this);
}