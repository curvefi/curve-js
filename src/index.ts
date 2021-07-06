import { ethers } from "ethers";
import { Pool, getBestPoolAndOutput, exchange } from "./pools";
import { curve as _curve } from "./curve";
import { getLockedAmountAndUnlockTime, getVeCRV, getVeCRVPct, createLock, increaseAmount, increaseUnlockTime, withdrawLockedCRV } from "./voting";

const init = async (
    providerType: 'JsonRpc' | 'Web3',
    providerSettings: { url?: string, privateKey?: string } | { externalProvider: ethers.providers.ExternalProvider },
    options: { gasPrice?: number } = {}
): Promise<void> => {
    await _curve.init(providerType, providerSettings, options);
}

const curve = {
    init,
    Pool,
    getBestPoolAndOutput,
    exchange,
    voting: {
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
