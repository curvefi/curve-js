import { ethers } from "ethers";
import { Networkish } from "@ethersproject/networks";
import { PoolTemplate, getPool } from "./pools";
import {
    getPoolList,
    getFactoryPoolList,
    getCryptoFactoryPoolList,
    getUserPoolListByLiquidity,
    getUserPoolListByClaimable,
    getUserPoolList,
    getUserLiquidityUSD,
    getUserClaimable,
} from "./pools/utils";
import {
    getBestRouteAndOutput,
    swapExpected,
    swapPriceImpact,
    swapIsApproved,
    swapApproveEstimateGas,
    swapApprove,
    swapEstimateGas,
    swap,
    getSwappedAmount,
} from "./router";
import { curve as _curve } from "./curve";
import {
    getCrv,
    getLockedAmountAndUnlockTime,
    getVeCrv,
    getVeCrvPct,
    calcUnlockTime,
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
    getCoinsData,
    getVolumeData,
} from "./utils";
import {
    deployStablePlainPool,
    deployStablePlainPoolEstimateGas,
    deployStableMetaPool,
    deployStableMetaPoolEstimateGas,
    deployCryptoPool,
    deployCryptoPoolEstimateGas,
    deployGauge,
    deployGaugeEstimateGas,
    getDeployedStablePlainPoolAddress,
    getDeployedStableMetaPoolAddress,
    getDeployedCryptoPoolAddress,
    getDeployedGaugeAddress,
} from './factory/deploy';

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

async function fetchRecentlyDeployedFactoryPool(poolAddress: string): Promise<string> {
    return await _curve.fetchRecentlyDeployedFactoryPool(poolAddress);
}

async function fetchRecentlyDeployedCryptoFactoryPool(poolAddress: string): Promise<string> {
    return await _curve.fetchRecentlyDeployedCryptoFactoryPool(poolAddress);
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
    getPoolList,
    getFactoryPoolList,
    getCryptoFactoryPoolList,
    getUserPoolListByLiquidity,
    getUserPoolListByClaimable,
    getUserPoolList,
    getUserLiquidityUSD,
    getUserClaimable,
    PoolTemplate,
    getPool,
    getUsdRate,
    getTVL,
    getBalances,
    getAllowance,
    hasAllowance,
    ensureAllowance,
    getCoinsData,
    getVolumeData,
    factory: {
        deployPlainPool: deployStablePlainPool,
        deployMetaPool: deployStableMetaPool,
        deployGauge: async (poolAddress: string): Promise<ethers.ContractTransaction> => deployGauge(poolAddress, false),
        getDeployedPlainPoolAddress: getDeployedStablePlainPoolAddress,
        getDeployedMetaPoolAddress: getDeployedStableMetaPoolAddress,
        getDeployedGaugeAddress: getDeployedGaugeAddress,
        fetchRecentlyDeployedPool: fetchRecentlyDeployedFactoryPool,
        estimateGas: {
            deployPlainPool: deployStablePlainPoolEstimateGas,
            deployMetaPool: deployStableMetaPoolEstimateGas,
            deployGauge: async (poolAddress: string): Promise<number> => deployGaugeEstimateGas(poolAddress, false),
        },
    },
    cryptoFactory: {
        deployPool: deployCryptoPool,
        deployGauge: async (poolAddress: string): Promise<ethers.ContractTransaction> => deployGauge(poolAddress, true),
        getDeployed: getDeployedStablePlainPoolAddress,
        getDeployedPoolAddress: getDeployedCryptoPoolAddress,
        getDeployedGaugeAddress: getDeployedGaugeAddress,
        fetchRecentlyDeployedPool: fetchRecentlyDeployedCryptoFactoryPool,
        estimateGas: {
            deployPool: deployCryptoPoolEstimateGas,
            deployGauge: async (poolAddress: string): Promise<number> => deployGaugeEstimateGas(poolAddress, true),
        },
    },
    estimateGas: {
        ensureAllowance: ensureAllowanceEstimateGas,
    },
    boosting: {
        getCrv,
        getLockedAmountAndUnlockTime,
        getVeCrv,
        getVeCrvPct,
        calcUnlockTime,
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
        getSwappedAmount,
        estimateGas: {
            approve: swapApproveEstimateGas,
            swap: swapEstimateGas,
        },
    },
}

export default curve;
