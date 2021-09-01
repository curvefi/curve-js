import { ethers } from "ethers";
import { Networkish } from "@ethersproject/networks";
import {
    Pool,
    getBestPoolAndOutput,
    exchangeExpected,
    exchangeEstimateGas,
    exchange,
    crossAssetExchangeAvailable,
    crossAssetExchangeOutputAndSlippage,
    crossAssetExchangeExpected,
    crossAssetExchangeEstimateGas,
    crossAssetExchange,
} from "./pools";
import { curve as _curve } from "./curve";
import {
    getCrv,
    getLockedAmountAndUnlockTime,
    getVeCrv,
    getVeCrvPct,
    createLockEstimateGas,
    createLock,
    increaseAmountEstimateGas,
    increaseAmount,
    increaseUnlockTimeEstimateGas,
    increaseUnlockTime,
    withdrawLockedCrvEstimateGas,
    withdrawLockedCrv,
} from "./boosting";
import { getBalances, getAllowance, hasAllowance, ensureAllowanceEstimateGas, ensureAllowance } from "./utils";

async function init (
    providerType: 'JsonRpc' | 'Web3' | 'Infura',
    providerSettings: { url?: string, privateKey?: string } | { externalProvider: ethers.providers.ExternalProvider } | { network?: Networkish, apiKey?: string },
    options: { gasPrice?: number, chainId?: number } = {}
): Promise<void> {
    await _curve.init(providerType, providerSettings, options);
    // @ts-ignore
    this.signerAddress = _curve.signerAddress;
}

function setGasPrice (gasPrice: number): void {
    _curve.setGasPrice(gasPrice);
}

const curve = {
    init,
    setGasPrice,
    signerAddress: '',
    Pool,
    getBalances,
    getAllowance,
    hasAllowance,
    ensureAllowance,
    getBestPoolAndOutput,
    exchangeExpected,
    exchange,
    crossAssetExchangeAvailable,
    crossAssetExchangeOutputAndSlippage,
    crossAssetExchangeExpected,
    crossAssetExchange,
    estimateGas: {
        ensureAllowance: ensureAllowanceEstimateGas,
        exchange: exchangeEstimateGas,
        crossAssetExchange: crossAssetExchangeEstimateGas,
    },
    boosting: {
        getCrv,
        getLockedAmountAndUnlockTime,
        getVeCrv,
        getVeCrvPct,
        createLock,
        increaseAmount,
        increaseUnlockTime,
        withdrawLockedCrv,
        estimateGas: {
            createLock: createLockEstimateGas,
            increaseAmount: increaseAmountEstimateGas,
            increaseUnlockTime: increaseUnlockTimeEstimateGas,
            withdrawLockedCrv: withdrawLockedCrvEstimateGas,
        },
    },
}

export default curve;
