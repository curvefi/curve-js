import { ethers, Contract, BigNumber } from "ethers";
import { Provider as MulticallProvider, Contract as MulticallContract } from 'ethers-multicall';
import ERC20Abi from './constants/abis/json/ERC20.json';
import cERC20Abi from './constants/abis/json/cERC20.json';
import votingEscrowABI from './constants/abis/json/votingescrow.json';
import { poolsData } from './constants/abis/abis-ethereum';
import { ensureAllowance, getDecimals, ALIASES } from './utils';
import {CoinInterface, DictInterface, PoolDataInterface} from './interfaces';

// TODO move to init function
const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545/');
const multicallProvider = new MulticallProvider(provider);
const signer = provider.getSigner();

export const createLock = async (amount: string, days: number): Promise<string> => {
    const amountBN = ethers.utils.parseUnits(amount, await getDecimals(ALIASES.crv));
    const unlockTime = Math.floor(Date.now() / 1000) + (days * 86400);
    await ensureAllowance([ALIASES.crv], [amountBN], ALIASES.voting_escrow);

    const votingEscrowContract = new Contract(ALIASES.voting_escrow, votingEscrowABI, signer);
    return (await votingEscrowContract.create_lock(amountBN, unlockTime)).hash
}

export const getLockedAmountAndUnlockTime = async (address: string): Promise<{ lockedAmount: string, unlockTime: number }> => {
    const votingEscrowContract = new Contract(ALIASES.voting_escrow, votingEscrowABI, signer);
    let [lockedAmount, unlockTime] = await votingEscrowContract.locked(address);
    lockedAmount = ethers.utils.formatUnits(lockedAmount, await getDecimals(ALIASES.crv));
    unlockTime = Number(ethers.utils.formatUnits(unlockTime, 0)) * 1000;
    return { lockedAmount, unlockTime }
}
