import { ethers, Networkish } from "ethers";
import { PoolTemplate, getPool } from "./pools/index.js";
import {
    getUserPoolListByLiquidity,
    getUserPoolListByClaimable,
    getUserPoolList,
    getUserLiquidityUSD,
    getUserClaimable,
} from "./pools/utils.js";
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
} from "./router.js";
import { curve as _curve } from "./curve.js";
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
} from "./boosting.js";
import {
    getBalances,
    getAllowance,
    hasAllowance,
    ensureAllowanceEstimateGas,
    ensureAllowance,
    getUsdRate,
    getTVL,
    getCoinsData,
    getVolume,
} from "./utils.js";
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
} from './factory/deploy.js';

async function init (
    providerType: 'JsonRpc' | 'Web3' | 'Infura' | 'Alchemy',
    providerSettings: { url?: string, privateKey?: string } | { externalProvider: ethers.Eip1193Provider } | { network?: Networkish, apiKey?: string },
    options: { gasPrice?: number, maxFeePerGas?: number, maxPriorityFeePerGas?: number, chainId?: number } = {}
): Promise<void> {
    await _curve.init(providerType, providerSettings, options);
    // @ts-ignore
    this.signerAddress = _curve.signerAddress;
    // @ts-ignore
    this.chainId = _curve.chainId;
}

function setCustomFeeData (customFeeData: { gasPrice?: number, maxFeePerGas?: number, maxPriorityFeePerGas?: number }): void {
    _curve.setCustomFeeData(customFeeData);
}

const curve = {
    init,
    chainId: 0,
    signerAddress: '',
    setCustomFeeData,
    getPoolList: _curve.getPoolList,
    getMainPoolList: _curve.getMainPoolList,
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
    getVolume,
    factory: {
        fetchPools: _curve.fetchFactoryPools,
        fetchNewPools: _curve.fetchNewFactoryPools,
        getPoolList: _curve.getFactoryPoolList,
        deployPlainPool: deployStablePlainPool,
        deployMetaPool: deployStableMetaPool,
        deployGauge: async (poolAddress: string): Promise<ethers.ContractTransactionResponse> => deployGauge(poolAddress, false),
        getDeployedPlainPoolAddress: getDeployedStablePlainPoolAddress,
        getDeployedMetaPoolAddress: getDeployedStableMetaPoolAddress,
        getDeployedGaugeAddress: getDeployedGaugeAddress,
        fetchRecentlyDeployedPool: _curve.fetchRecentlyDeployedFactoryPool,
        estimateGas: {
            deployPlainPool: deployStablePlainPoolEstimateGas,
            deployMetaPool: deployStableMetaPoolEstimateGas,
            deployGauge: async (poolAddress: string): Promise<number> => deployGaugeEstimateGas(poolAddress, false),
        },
    },
    crvUSDFactory: {
        fetchPools: _curve.fetchCrvusdFactoryPools,
        getPoolList: _curve.getCrvusdFactoryPoolList,
    },
    cryptoFactory: {
        fetchPools: _curve.fetchCryptoFactoryPools,
        fetchNewPools: _curve.fetchNewCryptoFactoryPools,
        getPoolList: _curve.getCryptoFactoryPoolList,
        deployPool: deployCryptoPool,
        deployGauge: async (poolAddress: string): Promise<ethers.ContractTransactionResponse> => deployGauge(poolAddress, true),
        getDeployed: getDeployedStablePlainPoolAddress,
        getDeployedPoolAddress: getDeployedCryptoPoolAddress,
        getDeployedGaugeAddress: getDeployedGaugeAddress,
        fetchRecentlyDeployedPool: _curve.fetchRecentlyDeployedCryptoFactoryPool,
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
