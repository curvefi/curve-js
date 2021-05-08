import { ethers } from "ethers";
import { ensureAllowance, getDecimals } from './utils';
import { curve, ALIASES } from "./curve";


export const createLock = async (amount: string, days: number): Promise<string> => {
    const amountBN = ethers.utils.parseUnits(amount, await getDecimals(ALIASES.crv));
    const unlockTime = Math.floor(Date.now() / 1000) + (days * 86400);
    await ensureAllowance([ALIASES.crv], [amountBN], ALIASES.voting_escrow);

    return (await curve.contracts[ALIASES.voting_escrow].contract.create_lock(amountBN, unlockTime)).hash
}

export const getLockedAmountAndUnlockTime = async (address: string): Promise<{ lockedAmount: string, unlockTime: number }> => {
    let [lockedAmount, unlockTime] = await curve.contracts[ALIASES.voting_escrow].contract.locked(address);
    lockedAmount = ethers.utils.formatUnits(lockedAmount, await getDecimals(ALIASES.crv));
    unlockTime = Number(ethers.utils.formatUnits(unlockTime, 0)) * 1000;
    return { lockedAmount, unlockTime }
}
