import { ethers } from "ethers";
import { Networkish } from "@ethersproject/networks";
import { Pool, getBestPoolAndOutput, exchangeExpected, exchange, crossAssetExchangeAvailable, crossAssetExchangeOutputAndSlippage, crossAssetExchangeExpected, crossAssetExchange } from "./pools";
import { curve as _curve } from "./curve";
import { getCrv, getLockedAmountAndUnlockTime, getVeCrv, getVeCrvPct, createLock, increaseAmount, increaseUnlockTime, withdrawLockedCrv } from "./boosting";
import { getBalances, getAllowance, hasAllowance, ensureAllowance } from "./utils";

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
