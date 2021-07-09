import { ethers } from "ethers";
import { Pool, getBestPoolAndOutput, exchangeExpected, exchange } from "./pools";
import { curve as _curve } from "./curve";
import { getLockedAmountAndUnlockTime, getVeCRV, getVeCRVPct, createLock, increaseAmount, increaseUnlockTime, withdrawLockedCRV } from "./boosting";

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
    getBestPoolAndOutput,
    exchangeExpected,
    exchange,
    boosting: {
        getLockedAmountAndUnlockTime,
        getVeCRV,
        getVeCRVPct,
        createLock,
        increaseAmount,
        increaseUnlockTime,
        withdrawLockedCRV,
    },
}

export default curve;
