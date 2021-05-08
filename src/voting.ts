import { ethers, Contract } from "ethers";
import votingEscrowABI from './constants/abis/json/votingescrow.json';
import { ensureAllowance, getDecimals, ALIASES } from './utils';
import { curve } from "./curve";


export const createLock = async (amount: string, days: number): Promise<string> => {
    const amountBN = ethers.utils.parseUnits(amount, await getDecimals(ALIASES.crv));
    const unlockTime = Math.floor(Date.now() / 1000) + (days * 86400);
    await ensureAllowance([ALIASES.crv], [amountBN], ALIASES.voting_escrow);

    const votingEscrowContract = new Contract(ALIASES.voting_escrow, votingEscrowABI, curve.signer);
    return (await votingEscrowContract.create_lock(amountBN, unlockTime)).hash
}

export const getLockedAmountAndUnlockTime = async (address: string): Promise<{ lockedAmount: string, unlockTime: number }> => {
    const votingEscrowContract = new Contract(ALIASES.voting_escrow, votingEscrowABI, curve.signer);
    let [lockedAmount, unlockTime] = await votingEscrowContract.locked(address);
    lockedAmount = ethers.utils.formatUnits(lockedAmount, await getDecimals(ALIASES.crv));
    unlockTime = Number(ethers.utils.formatUnits(unlockTime, 0)) * 1000;
    return { lockedAmount, unlockTime }
}
