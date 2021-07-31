import { ethers } from "ethers";
import { Pool, getBestPoolAndOutput, exchangeExpected, exchange, crossAssetExchangeAvailable, crossAssetExchangeOutputAndSlippage, crossAssetExchangeExpected, crossAssetExchange } from "./pools";
import { curve as _curve } from "./curve";
import { getCrv, getLockedAmountAndUnlockTime, getVeCrv, getVeCrvPct, createLock, increaseAmount, increaseUnlockTime, withdrawLockedCrv } from "./boosting";
import { getBalances } from "./utils";

async function init (
    providerType: 'JsonRpc' | 'Web3',
    providerSettings: { url?: string, privateKey?: string } | { externalProvider: ethers.providers.ExternalProvider },
    options: { gasPrice?: number, chainId?: number } = {}
): Promise<void> {
    await _curve.init(providerType, providerSettings, options);
    // @ts-ignore
    this.signerAddress = _curve.signerAddress;
}

const curve = {
    init,
    signerAddress: '',
    Pool,
    getBalances,
    getBestPoolAndOutput,
    exchangeExpected,
    exchange,
    crossAssetExchangeAvailable,
    crossAssetExchangeOutputAndSlippage,
    crossAssetExchangeExpected,
    crossAssetExchange,
    boosting: {
        getCrv,
        getLockedAmountAndUnlockTime,
        getVeCrv,
        getVeCrvPct,
        createLock,
        increaseAmount,
        increaseUnlockTime,
        withdrawLockedCrv,
    },
}

export default curve;
