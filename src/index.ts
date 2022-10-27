import { ethers } from "ethers";
import { Networkish } from "@ethersproject/networks";
import { PoolTemplate, getPool } from "./pools";
import { getPoolList, getFactoryPoolList, getCryptoFactoryPoolList, getUserPoolList, getUserLiquidityUSD } from "./pools/utils";
import {
    getBestRouteAndOutput,
    swapExpected,
    swapPriceImpact,
    swapIsApproved,
    swapApproveEstimateGas,
    swapApprove,
    swapEstimateGas,
    swap,
} from "./router";
import { curve as _curve } from "./curve";
import {
    getCrv,
    getLockedAmountAndUnlockTime,
    getVeCrv,
    getVeCrvPct,
    createLockEstimateGas,
    createLock,
    isApproved,
    approveEstimateGas,
    approve,
    increaseAmountEstimateGas,
    increaseAmount,
    increaseUnlockTimeEstimateGas,
    increaseUnlockTime,
    withdrawLockedCrvEstimateGas,
    withdrawLockedCrv,
    claimableFees,
    claimFeesEstimateGas,
    claimFees,
} from "./boosting";
import {
    getBalances,
    getAllowance,
    hasAllowance,
    ensureAllowanceEstimateGas,
    ensureAllowance,
    getUsdRate,
    getTVL,
} from "./utils";

async function init (
    providerType: 'JsonRpc' | 'Web3' | 'Infura' | 'Alchemy',
    providerSettings: { url?: string, privateKey?: string } | { externalProvider: ethers.providers.ExternalProvider } | { network?: Networkish, apiKey?: string },
    options: { gasPrice?: number, maxFeePerGas?: number, maxPriorityFeePerGas?: number, chainId?: number } = {}
): Promise<void> {
    await _curve.init(providerType, providerSettings, options);
    // @ts-ignore
    this.signerAddress = _curve.signerAddress;
    // @ts-ignore
    this.chainId = _curve.chainId;
}

async function fetchFactoryPools(useApi = true): Promise<void> {
    await _curve.fetchFactoryPools(useApi);
}

async function fetchCryptoFactoryPools(useApi = true): Promise<void> {
    await _curve.fetchCryptoFactoryPools(useApi);
}

async function fetchRecentlyCreatedFactoryPool(poolAddress: string): Promise<string> {
    return await _curve.fetchRecentlyCreatedFactoryPool(poolAddress);
}

async function fetchRecentlyCreatedCryptoFactoryPool(poolAddress: string): Promise<string> {
    return await _curve.fetchRecentlyCreatedCryptoFactoryPool(poolAddress);
}

function setCustomFeeData (customFeeData: { gasPrice?: number, maxFeePerGas?: number, maxPriorityFeePerGas?: number }): void {
    _curve.setCustomFeeData(customFeeData);
}

const curve = {
    init,
    chainId: 0,
    signerAddress: '',
    setCustomFeeData,
    fetchFactoryPools,
    fetchCryptoFactoryPools,
    fetchRecentlyCreatedFactoryPool,
    fetchRecentlyCreatedCryptoFactoryPool,
    getPoolList,
    getFactoryPoolList,
    getCryptoFactoryPoolList,
    getUserPoolList,
    getUserLiquidityUSD,
    PoolTemplate,
    getPool,
    getUsdRate,
    getTVL,
    getBalances,
    getAllowance,
    hasAllowance,
    ensureAllowance,
    estimateGas: {
        ensureAllowance: ensureAllowanceEstimateGas,
    },
    boosting: {
        getCrv,
        getLockedAmountAndUnlockTime,
        getVeCrv,
        getVeCrvPct,
        isApproved,
        approve,
        createLock,
        increaseAmount,
        increaseUnlockTime,
        withdrawLockedCrv,
        claimableFees,
        claimFees,
        estimateGas: {
            approve: approveEstimateGas,
            createLock: createLockEstimateGas,
            increaseAmount: increaseAmountEstimateGas,
            increaseUnlockTime: increaseUnlockTimeEstimateGas,
            withdrawLockedCrv: withdrawLockedCrvEstimateGas,
            claimFees: claimFeesEstimateGas,
        },
    },
    router: {
        getBestRouteAndOutput,
        expected: swapExpected,
        priceImpact: swapPriceImpact,
        isApproved: swapIsApproved,
        approve: swapApprove,
        swap,
        estimateGas: {
            approve: swapApproveEstimateGas,
            swap: swapEstimateGas,
        },
    },
}

export default curve;
