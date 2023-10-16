import { Contract } from "ethers";
import BigNumber from "bignumber.js";
import { curve } from "./curve.js";
import { IDict, IChainId } from "./interfaces";
import feeDistributorViewABI from "./constants/abis/fee_distributor_view.json" assert { type: 'json' };
import {
    _getBalances,
    _prepareAddresses, DIGas,
    ensureAllowance,
    ensureAllowanceEstimateGas,
    hasAllowance,
    mulBy1_3,
    smartNumber
} from "./utils.js";
import { _ensureAllowance, toBN, toStringFromBN, parseUnits } from './utils.js';
import { _generateBoostingProof } from './external-api.js';


export const getCrv = async (...addresses: string[] | string[][]): Promise<IDict<string> | string> => {
    addresses = _prepareAddresses(addresses);
    const rawBalances = (await _getBalances([curve.constants.ALIASES.crv], addresses));

    const balances: IDict<string> = {};
    for (const address of addresses) {
        balances[address] = rawBalances[address].shift() as string;
    }

    return addresses.length === 1 ? balances[addresses[0]] : balances
}

export const getLockedAmountAndUnlockTime = async (...addresses: string[] | string[][]):
    Promise<IDict<{ lockedAmount: string, unlockTime: number }> | { lockedAmount: string, unlockTime: number }> => {
    addresses = _prepareAddresses(addresses);
    const veContract = curve.contracts[curve.constants.ALIASES.voting_escrow].multicallContract;
    const contractCalls = addresses.map((address: string) => veContract.locked(address));

    const response: (string | number)[][] = (await curve.multicallProvider.all(contractCalls) as bigint[][]).map(
        (value: bigint[]) => [curve.formatUnits(value[0]), Number(curve.formatUnits(value[1], 0)) * 1000]);

    const result: IDict<{ lockedAmount: string, unlockTime: number }> = {};
    addresses.forEach((addr: string, i: number) => {
        result[addr] = { lockedAmount: response[i][0] as string, unlockTime: response[i][1] as number};
    });

    return addresses.length === 1 ? result[addresses[0]] : result
}

export const getVeCrv = async (...addresses: string[] | string[][]): Promise<IDict<string> | string> => {
    addresses = _prepareAddresses(addresses);

    const veContract = curve.contracts[curve.constants.ALIASES.voting_escrow].multicallContract;
    const contractCalls = addresses.map((address: string) => veContract.balanceOf(address));
    const response: string[] = (await curve.multicallProvider.all(contractCalls) as bigint[]).map(
        (value: bigint) => curve.formatUnits(value));

    const result: IDict<string> = {};
    addresses.forEach((addr: string, i: number) => {
        result[addr] = response[i];
    });

    return addresses.length === 1 ? result[addresses[0]] : result
}

export const getVeCrvPct = async (...addresses: string[] | string[][]): Promise<IDict<string> | string> => {
    addresses = _prepareAddresses(addresses);

    const veContract = curve.contracts[curve.constants.ALIASES.voting_escrow].multicallContract;
    const contractCalls = [veContract.totalSupply()];
    addresses.forEach((address: string) => {
        contractCalls.push(veContract.balanceOf(address));
    });
    const response: BigNumber[] = (await curve.multicallProvider.all(contractCalls) as bigint[]).map(
        (value: bigint) => toBN(value));

    const [veTotalSupply] = response.splice(0, 1);

    const resultBN: IDict<BigNumber> = {};
    addresses.forEach((acct: string, i: number) => {
        resultBN[acct] = response[i].div(veTotalSupply).times(100);
    });

    const result: IDict<string> = {};
    for (const entry of Object.entries(resultBN)) {
        result[entry[0]] = toStringFromBN(entry[1]);
    }

    return addresses.length === 1 ? result[addresses[0]] : result
}

export const isApproved = async (amount: number | string): Promise<boolean> => {
    return await hasAllowance([curve.constants.ALIASES.crv], [amount], curve.signerAddress, curve.constants.ALIASES.voting_escrow);
}

export const approveEstimateGas = async (amount: number | string): Promise<number> => {
    return await ensureAllowanceEstimateGas([curve.constants.ALIASES.crv], [amount], curve.constants.ALIASES.voting_escrow, false);
}

export const approve = async (amount: number | string): Promise<string[]> => {
    return await ensureAllowance([curve.constants.ALIASES.crv], [amount], curve.constants.ALIASES.voting_escrow, false);
}

export const createLockEstimateGas = async (amount: number | string, days: number): Promise<number> => {
    const crvBalance = await getCrv() as string;

    if (Number(crvBalance) < Number(amount)) {
        throw Error(`Not enough . Actual: ${crvBalance}, required: ${amount}`);
    }

    if (!(await hasAllowance([curve.constants.ALIASES.crv], [amount], curve.signerAddress, curve.constants.ALIASES.voting_escrow))) {
        throw Error("Token allowance is needed to estimate gas")
    }

    const _amount = parseUnits(amount);
    const unlockTime = Math.floor(Date.now() / 1000) + (days * 86400);

    return Number(await curve.contracts[curve.constants.ALIASES.voting_escrow].contract.create_lock.estimateGas(_amount, unlockTime, curve.constantOptions))
}

export const calcUnlockTime = (days: number, start = Date.now()): number => {
    const week = 86400 * 7;
    const now = start / 1000;
    const unlockTime = now + (86400 * days);

    return Math.floor(unlockTime / week) * week * 1000;
}

export const createLock = async (amount: number | string, days: number): Promise<string> => {
    const _amount = parseUnits(amount);
    const unlockTime = Math.floor(Date.now() / 1000) + (86400 * days);
    await _ensureAllowance([curve.constants.ALIASES.crv], [_amount], curve.constants.ALIASES.voting_escrow, false);
    const contract = curve.contracts[curve.constants.ALIASES.voting_escrow].contract;

    await curve.updateFeeData();
    const gasLimit = mulBy1_3(DIGas(await contract.create_lock.estimateGas(_amount, unlockTime, curve.constantOptions)));
    return (await contract.create_lock(_amount, unlockTime, { ...curve.options, gasLimit })).hash
}

export const increaseAmountEstimateGas = async (amount: number | string): Promise<number> => {
    const crvBalance = await getCrv() as string;

    if (Number(crvBalance) < Number(amount)) {
        throw Error(`Not enough. Actual: ${crvBalance}, required: ${amount}`);
    }

    if (!(await hasAllowance([curve.constants.ALIASES.crv], [amount], curve.signerAddress, curve.constants.ALIASES.voting_escrow))) {
        throw Error("Token allowance is needed to estimate gas")
    }

    const _amount = parseUnits(amount);
    const contract = curve.contracts[curve.constants.ALIASES.voting_escrow].contract;

    return Number(await contract.increase_amount.estimateGas(_amount, curve.constantOptions))
}

export const increaseAmount = async (amount: number | string): Promise<string> => {
    const _amount = parseUnits(amount);
    await _ensureAllowance([curve.constants.ALIASES.crv], [_amount], curve.constants.ALIASES.voting_escrow, false);
    const contract = curve.contracts[curve.constants.ALIASES.voting_escrow].contract;

    await curve.updateFeeData();
    const gasLimit = mulBy1_3(DIGas(await contract.increase_amount.estimateGas(_amount, curve.constantOptions)));
    return (await contract.increase_amount(_amount, { ...curve.options, gasLimit })).hash
}

export const increaseUnlockTimeEstimateGas = async (days: number): Promise<number> => {
    const { unlockTime } = await getLockedAmountAndUnlockTime() as { lockedAmount: string, unlockTime: number };
    const newUnlockTime = Math.floor(unlockTime / 1000) + (days * 86400);
    const contract = curve.contracts[curve.constants.ALIASES.voting_escrow].contract;

    return Number(DIGas(await contract.increase_unlock_time.estimateGas(newUnlockTime, curve.constantOptions)))
}

export const increaseUnlockTime = async (days: number): Promise<string> => {
    const { unlockTime } = await getLockedAmountAndUnlockTime() as { lockedAmount: string, unlockTime: number };
    const newUnlockTime = Math.floor(unlockTime / 1000) + (days * 86400);
    const contract = curve.contracts[curve.constants.ALIASES.voting_escrow].contract;

    await curve.updateFeeData();
    const gasLimit = mulBy1_3(DIGas(await contract.increase_unlock_time.estimateGas(newUnlockTime, curve.constantOptions)));
    return (await contract.increase_unlock_time(newUnlockTime, { ...curve.options, gasLimit })).hash
}

export const withdrawLockedCrvEstimateGas = async (): Promise<number> => {
    const contract = curve.contracts[curve.constants.ALIASES.voting_escrow].contract;

    return Number(DIGas(await contract.withdraw.estimateGas(curve.constantOptions)))
}

export const withdrawLockedCrv = async (): Promise<string> => {
    const contract = curve.contracts[curve.constants.ALIASES.voting_escrow].contract;

    await curve.updateFeeData();
    const gasLimit = mulBy1_3(DIGas(await contract.withdraw.estimateGas(curve.constantOptions)));
    return (await contract.withdraw({ ...curve.options, gasLimit })).hash
}

export const claimableFees = async (address = ""): Promise<string> => {
    address = address || curve.signerAddress;
    const contract = new Contract(curve.constants.ALIASES.fee_distributor, feeDistributorViewABI, curve.provider)
    return curve.formatUnits(await contract.claim(address, curve.constantOptions));
}

export const claimFeesEstimateGas = async (address = ""): Promise<number> => {
    address = address || curve.signerAddress;
    const contract = curve.contracts[curve.constants.ALIASES.fee_distributor].contract;

    return Number(DIGas(await contract.claim.estimateGas(address, curve.constantOptions)));
}

export const claimFees = async (address = ""): Promise<string> => {
    address = address || curve.signerAddress;
    const contract = curve.contracts[curve.constants.ALIASES.fee_distributor].contract;

    await curve.updateFeeData();
    const gasLimit = mulBy1_3(DIGas(await contract.claim.estimateGas(address, curve.constantOptions)));
    return (await contract.claim(address, { ...curve.options, gasLimit })).hash
}


//  ------------ SIDECHAIN ------------


export const lastEthBlock = async (): Promise<number> => {
    if (curve.chainId === 1) throw Error("There is no lastBlock method on ethereum network");
    const veOracleContract = curve.contracts[curve.constants.ALIASES.voting_escrow_oracle].contract;

    return Number(await veOracleContract.last_eth_block_number(curve.constantOptions));
}

export const getAnycallBalance = async (): Promise<string> => {
    if (curve.chainId === 1) throw Error("There is no getAnycallBalance method on ethereum network");
    const anycallContract = curve.contracts[curve.constants.ALIASES.anycall].contract;
    const _balance = await anycallContract.executionBudget(curve.constants.ALIASES.voting_escrow_oracle, curve.constantOptions);

    return curve.formatUnits(_balance)
}

const DEFAULT_AMOUNT = (curve.chainId === 42161 || curve.chainId === 10) ? 0.00001 : 0.1;
const _topUpAnycall = async (amount: number | string, estimateGas: boolean): Promise<string | number | number[]> => {
    if (curve.chainId === 1) throw Error("There is no topUpAnycall method on ethereum network");
    const anycallContract = curve.contracts[curve.constants.ALIASES.anycall].contract;
    const value = curve.parseUnits(String(amount));
    const gas = await anycallContract.deposit.estimateGas(curve.constants.ALIASES.voting_escrow_oracle, { ...curve.constantOptions, value});
    if (estimateGas) return smartNumber(gas);

    await curve.updateFeeData();
    const gasLimit = mulBy1_3(DIGas(gas));
    return (await anycallContract.deposit(curve.constants.ALIASES.voting_escrow_oracle, { ...curve.options, gasLimit, value })).hash;
}

export const topUpAnycallEstimateGas = async (amount: number | string = DEFAULT_AMOUNT): Promise<number> => {
    return await _topUpAnycall(amount, true) as number;
}

export const topUpAnycall = async (amount: number | string = DEFAULT_AMOUNT): Promise<string> => {
    return await _topUpAnycall(amount, false) as string;
}

export const lastBlockSent = async (chainId: IChainId): Promise<number> => {
    if (curve.chainId !== 1) throw Error("lastBlockNumberSent method is on ethereum network only");
    const veOracleContract = curve.contracts[curve.constants.ALIASES.voting_escrow_oracle].contract;

    return Number(await veOracleContract.get_last_block_number_sent(chainId, curve.constantOptions));
}

export const blockToSend = async (): Promise<number> => {
    if (curve.chainId !== 1) throw Error("blockToSend method is on ethereum network only");
    return (await curve.provider.getBlockNumber()) - 128;
}

const _sendBlockhash = async (block: number, chainId: IChainId, estimateGas: boolean): Promise<string | number | number[]> => {
    if (curve.chainId !== 1) throw Error("sendBlockhash method is on ethereum network only");
    const veOracleContract = curve.contracts[curve.constants.ALIASES.voting_escrow_oracle].contract;
    const gas = await veOracleContract.send_blockhash.estimateGas(block, chainId, curve.constantOptions);
    if (estimateGas) return smartNumber(gas);

    await curve.updateFeeData();
    const gasLimit = mulBy1_3(DIGas(gas));
    return (await veOracleContract.send_blockhash(block, chainId, { ...curve.options, gasLimit })).hash;
}

export const sendBlockhashEstimateGas = async (block: number, chainId: IChainId): Promise<number> => {
    return await _sendBlockhash(block, chainId, true) as number;
}

export const sendBlockhash = async (block: number, chainId: IChainId): Promise<string> => {
    return await _sendBlockhash(block, chainId, false) as string;
}

const _submitProof = async (block: number, address = curve.signerAddress, estimateGas: boolean): Promise<string | number | number[]> => {
    if (curve.chainId === 1) throw Error("submitProof method is on ethereum network only");
    if (address === "") throw Error("Pass address you want to submit proof for")
    const proof = await _generateBoostingProof(block, address);
    const veOracleContract = curve.contracts[curve.constants.ALIASES.voting_escrow_oracle].contract;
    const gas = await veOracleContract.submit_state.estimateGas(address, "0x" + proof.block_header_rlp, "0x" + proof.proof_rlp, curve.constantOptions);
    if (estimateGas) return smartNumber(gas);

    await curve.updateFeeData();
    const gasLimit = mulBy1_3(DIGas(gas));
    return (await veOracleContract.submit_state(address, "0x" + proof.block_header_rlp, "0x" + proof.proof_rlp, { ...curve.options, gasLimit })).hash;
}

export const submitProofEstimateGas = async (block: number, address = curve.signerAddress): Promise<number> => {
    return await _submitProof(block, address, true) as number;
}

export const submitProof = async (block: number, address = curve.signerAddress): Promise<string> => {
    return await _submitProof(block, address, false) as string;
}
