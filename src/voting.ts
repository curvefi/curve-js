import { ethers } from "ethers";
import BigNumber from "bignumber.js";
import { ensureAllowance, _getDecimals, toBN, toStringFromBN } from './utils';
import { curve, ALIASES } from "./curve";
import { DictInterface } from "./interfaces";


export const getLockedAmountAndUnlockTime = async (address: string): Promise<{ lockedAmount: string, unlockTime: number }> => {
    let [lockedAmount, unlockTime] = await curve.contracts[ALIASES.voting_escrow].contract.locked(address);
    lockedAmount = ethers.utils.formatUnits(lockedAmount, await _getDecimals(ALIASES.crv));
    unlockTime = Number(ethers.utils.formatUnits(unlockTime, 0)) * 1000; // ms
    return { lockedAmount, unlockTime }
}

export const getVeCRV = async (...addresses: string[] | string[][]): Promise<DictInterface<string>> => {
    if (addresses.length == 1 && Array.isArray(addresses[0])) addresses = addresses[0];
    addresses = addresses as string[];

    const veContract = curve.contracts[ALIASES.voting_escrow].multicallContract;
    const contractCalls = addresses.map((address: string) => veContract.balanceOf(address));
    const response: string[] = (await curve.multicallProvider.all(contractCalls)).map((value: ethers.BigNumber) => ethers.utils.formatUnits(value));

    const result: DictInterface<string> = {};
    addresses.forEach((addr: string, i: number) => {
        result[addr] = response[i];
    });

    return result
}

export const getVeCRVPct = async (...addresses: string[] | string[][]): Promise<DictInterface<string>> => {
    if (addresses.length == 1 && Array.isArray(addresses[0])) addresses = addresses[0];
    addresses = addresses as string[];

    const veContract = curve.contracts[ALIASES.voting_escrow].multicallContract;
    const contractCalls = [veContract.totalSupply()];
    addresses.forEach((address: string) => {
        contractCalls.push(veContract.balanceOf(address));
    });
    const response: BigNumber[] = (await curve.multicallProvider.all(contractCalls)).map((value: ethers.BigNumber) => toBN(value));

    const [veTotalSupply] = response.splice(0, 1);

    const resultBN: DictInterface<BigNumber> = {};
    addresses.forEach((acct: string, i: number) => {
        resultBN[acct] = response[i].div(veTotalSupply).times(100);
    });

    const result: DictInterface<string> = {};
    for (const entry of Object.entries(resultBN)) {
        result[entry[0]] = toStringFromBN(entry[1]);
    }

    return result
}

export const createLock = async (amount: string, days: number): Promise<string> => {
    const _amount = ethers.utils.parseUnits(amount, await _getDecimals(ALIASES.crv));
    const unlockTime = Math.floor(Date.now() / 1000) + (days * 86400);
    await ensureAllowance([ALIASES.crv], [_amount], ALIASES.voting_escrow);

    return (await curve.contracts[ALIASES.voting_escrow].contract.create_lock(_amount, unlockTime)).hash
}

export const increaseAmount = async (amount: string): Promise<string> => {
    const _amount = ethers.utils.parseUnits(amount, await _getDecimals(ALIASES.crv));
    await ensureAllowance([ALIASES.crv], [_amount], ALIASES.voting_escrow);

    return (await curve.contracts[ALIASES.voting_escrow].contract.increase_amount(_amount)).hash
}

export const increaseUnlockTime = async (days: number): Promise<string> => {
    const address = curve.signerAddress;
    const { unlockTime } = await getLockedAmountAndUnlockTime(address);
    const newUnlockTime = Math.floor(unlockTime / 1000) + (days * 86400);

    return (await curve.contracts[ALIASES.voting_escrow].contract.increase_unlock_time(newUnlockTime)).hash
}

export const withdrawLockedCRV = async (): Promise<string> => {
    return (await curve.contracts[ALIASES.voting_escrow].contract.withdraw()).hash
}
