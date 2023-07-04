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
    lastBlockhash,
    checkBlockhash,
    getAnycallBalance,
    topUpAnycall,
    topUpAnycallEstimateGas,
    lastBlockSent,
    blockToSend,
    sendBlockhash,
    sendBlockhashEstimateGas,
    submitProof,
    submitProofEstimateGas,
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
    getDeployedStablePlainPoolAddress,
    setOracle,
    setOracleEstimateGas,
    deployStableMetaPool,
    deployStableMetaPoolEstimateGas,
    getDeployedStableMetaPoolAddress,
    deployCryptoPool,
    deployCryptoPoolEstimateGas,
    getDeployedCryptoPoolAddress,
    deployTricryptoPool,
    deployTricryptoPoolEstimateGas,
    getDeployedTricryptoPoolAddress,
    deployGauge,
    deployGaugeEstimateGas,
    getDeployedGaugeAddress,
} from './factory/deploy.js';

async function init (
    providerType: 'JsonRpc' | 'Web3' | 'Infura' | 'Alchemy',
    providerSettings: { url?: string, privateKey?: string, batchMaxCount? : number } | { externalProvider: ethers.Eip1193Provider } | { network?: Networkish, apiKey?: string },
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
        setOracle,
        deployMetaPool: deployStableMetaPool,
        deployGauge: async (poolAddress: string): Promise<ethers.ContractTransactionResponse> => deployGauge(poolAddress, _curve.constants.ALIASES.factory),
        getDeployedPlainPoolAddress: getDeployedStablePlainPoolAddress,
        getDeployedMetaPoolAddress: getDeployedStableMetaPoolAddress,
        getDeployedGaugeAddress: getDeployedGaugeAddress,
        fetchRecentlyDeployedPool: _curve.fetchRecentlyDeployedFactoryPool,
        gaugeImplementation: (): string => _curve.getGaugeImplementation("factory"),
        estimateGas: {
            deployPlainPool: deployStablePlainPoolEstimateGas,
            setOracle: setOracleEstimateGas,
            deployMetaPool: deployStableMetaPoolEstimateGas,
            deployGauge: async (poolAddress: string): Promise<number> => deployGaugeEstimateGas(poolAddress, _curve.constants.ALIASES.factory),
        },
    },
    crvUSDFactory: {
        fetchPools: _curve.fetchCrvusdFactoryPools,
        getPoolList: _curve.getCrvusdFactoryPoolList,
    },
    EYWAFactory: {
        fetchPools: _curve.fetchEywaFactoryPools,
        getPoolList: _curve.getEywaFactoryPoolList,
    },
    cryptoFactory: {
        fetchPools: _curve.fetchCryptoFactoryPools,
        fetchNewPools: _curve.fetchNewCryptoFactoryPools,
        getPoolList: _curve.getCryptoFactoryPoolList,
        deployPool: deployCryptoPool,
        deployGauge: async (poolAddress: string): Promise<ethers.ContractTransactionResponse> => deployGauge(poolAddress, _curve.constants.ALIASES.crypto_factory),
        getDeployedPoolAddress: getDeployedCryptoPoolAddress,
        getDeployedGaugeAddress: getDeployedGaugeAddress,
        fetchRecentlyDeployedPool: _curve.fetchRecentlyDeployedCryptoFactoryPool,
        gaugeImplementation: (): string => _curve.getGaugeImplementation("factory-crypto"),
        estimateGas: {
            deployPool: deployCryptoPoolEstimateGas,
            deployGauge: async (poolAddress: string): Promise<number> => deployGaugeEstimateGas(poolAddress, _curve.constants.ALIASES.crypto_factory),
        },
    },
    tricryptoFactory: {
        fetchPools: _curve.fetchTricryptoFactoryPools,
        fetchNewPools: _curve.fetchNewTricryptoFactoryPools,
        getPoolList: _curve.getTricryptoFactoryPoolList,
        deployPool: deployTricryptoPool,
        deployGauge: async (poolAddress: string): Promise<ethers.ContractTransactionResponse> => deployGauge(poolAddress, _curve.constants.ALIASES.tricrypto_factory),
        getDeployedPoolAddress: getDeployedTricryptoPoolAddress,
        getDeployedGaugeAddress: getDeployedGaugeAddress,
        fetchRecentlyDeployedPool: _curve.fetchRecentlyDeployedTricryptoFactoryPool,
        gaugeImplementation: (): string => _curve.getGaugeImplementation("factory-tricrypto"),
        estimateGas: {
            deployPool: deployTricryptoPoolEstimateGas,
            deployGauge: async (poolAddress: string): Promise<number> => deployGaugeEstimateGas(poolAddress, _curve.constants.ALIASES.tricrypto_factory),
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
        sidechain: {
            lastBlockhash,
            checkBlockhash,
            getAnycallBalance,
            topUpAnycall,
            lastBlockSent,
            blockToSend,
            sendBlockhash,
            submitProof,
            estimateGas: {
                topUpAnycall: topUpAnycallEstimateGas,
                sendBlockhash: sendBlockhashEstimateGas,
                submitProof: submitProofEstimateGas,
            },
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
