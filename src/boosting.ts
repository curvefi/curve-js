import {Contract} from "ethers";
import BigNumber from "bignumber.js";
import {type Curve} from "./curve.js";
import {IChainId, IDict} from "./interfaces";
import feeDistributorViewABI from "./constants/abis/fee_distributor_view.json" with {type: "json"};
import feeDistributorCrvUSDViewABI from "./constants/abis/fee_distributor_crvusd_view.json" with {type: "json"};
import {
    _ensureAllowance,
    _getBalances,
    _prepareAddresses,
    DIGas,
    ensureAllowance,
    ensureAllowanceEstimateGas,
    hasAllowance,
    mulBy1_3,
    parseUnits,
    smartNumber,
    toBN,
    toStringFromBN,
} from "./utils.js";
import {_generateBoostingProof} from './external-api.js';

export async function getCrv(this: Curve, ...addresses: string[] | string[][]): Promise<IDict<string> | string> {
    addresses = _prepareAddresses.call(this, addresses);
    const rawBalances = (await _getBalances.call(this, [this.constants.ALIASES.crv], addresses));

    const balances: IDict<string> = {};
    for (const address of addresses) {
        balances[address] = rawBalances[address].shift() as string;
    }

    return addresses.length === 1 ? balances[addresses[0]] : balances
}

export async function getLockedAmountAndUnlockTime(this: Curve, ...addresses: string[] | string[][]):
    Promise<IDict<{ lockedAmount: string, unlockTime: number }> | { lockedAmount: string, unlockTime: number }> {
    addresses = _prepareAddresses.call(this, addresses);
    const veContract = this.contracts[this.constants.ALIASES.voting_escrow].multicallContract;
    const contractCalls = addresses.map((address: string) => veContract.locked(address));

    const response: (string | number)[][] = (await this.multicallProvider.all(contractCalls) as bigint[][]).map(
        (value: bigint[]) => [this.formatUnits(value[0]), Number(this.formatUnits(value[1], 0)) * 1000]);

    const result: IDict<{ lockedAmount: string, unlockTime: number }> = {};
    addresses.forEach((addr: string, i: number) => {
        result[addr] = {lockedAmount: response[i][0] as string, unlockTime: response[i][1] as number};
    });

    return addresses.length === 1 ? result[addresses[0]] : result
}

export async function getVeCrv(this: Curve, ...addresses: string[] | string[][]): Promise<IDict<string> | string> {
    addresses = _prepareAddresses.call(this, addresses);

    const veContract = this.contracts[this.constants.ALIASES.voting_escrow].multicallContract;
    const contractCalls = addresses.map((address: string) => veContract.balanceOf(address));
    const response: string[] = (await this.multicallProvider.all(contractCalls) as bigint[]).map(
        (value: bigint) => this.formatUnits(value));

    const result: IDict<string> = {};
    addresses.forEach((addr: string, i: number) => {
        result[addr] = response[i];
    });

    return addresses.length === 1 ? result[addresses[0]] : result
}

export async function getVeCrvPct(this: Curve, ...addresses: string[] | string[][]): Promise<IDict<string> | string> {
    addresses = _prepareAddresses.call(this, addresses);

    const veContract = this.contracts[this.constants.ALIASES.voting_escrow].multicallContract;
    const contractCalls = [veContract.totalSupply()];
    addresses.forEach((address: string) => {
        contractCalls.push(veContract.balanceOf(address));
    });
    const response: BigNumber[] = (await this.multicallProvider.all(contractCalls) as bigint[]).map(
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

export async function isApproved(this: Curve, amount: number | string): Promise<boolean> {
    return await hasAllowance.call(this, [this.constants.ALIASES.crv], [amount], this.signerAddress, this.constants.ALIASES.voting_escrow);
}

export async function approveEstimateGas(this: Curve, amount: number | string): Promise<number | number[]> {
    return await ensureAllowanceEstimateGas.call(this, [this.constants.ALIASES.crv], [amount], this.constants.ALIASES.voting_escrow, false);
}

export async function approve(this: Curve, amount: number | string): Promise<string[]> {
    return await ensureAllowance.call(this, [this.constants.ALIASES.crv], [amount], this.constants.ALIASES.voting_escrow, false);
}

export async function createLockEstimateGas(this: Curve, amount: number | string, days: number): Promise<number> {
    const crvBalance = await getCrv.call(this) as string;

    if (Number(crvBalance) < Number(amount)) {
        throw Error(`Not enough . Actual: ${crvBalance}, required: ${amount}`);
    }

    if (!(await hasAllowance.call(this, [this.constants.ALIASES.crv], [amount], this.signerAddress, this.constants.ALIASES.voting_escrow))) {
        throw Error("Token allowance is needed to estimate gas")
    }

    const _amount = parseUnits(amount);
    const unlockTime = Math.floor(Date.now() / 1000) + (days * 86400);

    return Number(await this.contracts[this.constants.ALIASES.voting_escrow].contract.create_lock.estimateGas(_amount, unlockTime, this.constantOptions))
}

export const calcUnlockTime = (days: number, start = Date.now()): number => {
    const week = 86400 * 7;
    const now = start / 1000;
    const unlockTime = now + (86400 * days);

    return Math.floor(unlockTime / week) * week * 1000;
}

export async function createLock(this: Curve, amount: number | string, days: number): Promise<string> {
    const _amount = parseUnits(amount);
    const unlockTime = Math.floor(Date.now() / 1000) + (86400 * days);
    await _ensureAllowance.call(this, [this.constants.ALIASES.crv], [_amount], this.constants.ALIASES.voting_escrow, false);
    const contract = this.contracts[this.constants.ALIASES.voting_escrow].contract;

    await this.updateFeeData();
    const gasLimit = mulBy1_3(DIGas(await contract.create_lock.estimateGas(_amount, unlockTime, this.constantOptions)));
    return (await contract.create_lock(_amount, unlockTime, { ...this.options, gasLimit })).hash
}

export async function increaseAmountEstimateGas(this: Curve, amount: number | string): Promise<number> {
    const crvBalance = await getCrv.call(this) as string;

    if (Number(crvBalance) < Number(amount)) {
        throw Error(`Not enough. Actual: ${crvBalance}, required: ${amount}`);
    }

    if (!(await hasAllowance.call(this, [this.constants.ALIASES.crv], [amount], this.signerAddress, this.constants.ALIASES.voting_escrow))) {
        throw Error("Token allowance is needed to estimate gas")
    }

    const _amount = parseUnits(amount);
    const contract = this.contracts[this.constants.ALIASES.voting_escrow].contract;

    return Number(await contract.increase_amount.estimateGas(_amount, this.constantOptions))
}

export async function increaseAmount(this: Curve, amount: number | string): Promise<string> {
    const _amount = parseUnits(amount);
    await _ensureAllowance.call(this, [this.constants.ALIASES.crv], [_amount], this.constants.ALIASES.voting_escrow, false);
    const contract = this.contracts[this.constants.ALIASES.voting_escrow].contract;

    await this.updateFeeData();
    const gasLimit = mulBy1_3(DIGas(await contract.increase_amount.estimateGas(_amount, this.constantOptions)));
    return (await contract.increase_amount(_amount, { ...this.options, gasLimit })).hash
}

export async function increaseUnlockTimeEstimateGas(this: Curve, days: number): Promise<number> {
    const {unlockTime} = await getLockedAmountAndUnlockTime.call(this) as { lockedAmount: string, unlockTime: number };
    const newUnlockTime = Math.floor(unlockTime / 1000) + (days * 86400);
    const contract = this.contracts[this.constants.ALIASES.voting_escrow].contract;

    return Number(DIGas(await contract.increase_unlock_time.estimateGas(newUnlockTime, this.constantOptions)))
}

export async function increaseUnlockTime(this: Curve, days: number): Promise<string> {
    const {unlockTime} = await getLockedAmountAndUnlockTime.call(this) as { lockedAmount: string, unlockTime: number };
    const newUnlockTime = Math.floor(unlockTime / 1000) + (days * 86400);
    const contract = this.contracts[this.constants.ALIASES.voting_escrow].contract;

    await this.updateFeeData();
    const gasLimit = mulBy1_3(DIGas(await contract.increase_unlock_time.estimateGas(newUnlockTime, this.constantOptions)));
    return (await contract.increase_unlock_time(newUnlockTime, {...this.options, gasLimit})).hash
}

export async function withdrawLockedCrvEstimateGas(this: Curve): Promise<number> {
    const contract = this.contracts[this.constants.ALIASES.voting_escrow].contract;

    return Number(DIGas(await contract.withdraw.estimateGas(this.constantOptions)))
}

export async function withdrawLockedCrv(this: Curve): Promise<string> {
    const contract = this.contracts[this.constants.ALIASES.voting_escrow].contract;

    await this.updateFeeData();
    const gasLimit = mulBy1_3(DIGas(await contract.withdraw.estimateGas(this.constantOptions)));
    return (await contract.withdraw({ ...this.options, gasLimit })).hash
}

export async function claimableFees(this: Curve, address = ""): Promise<string> {
    address = address || this.signerAddress;
    const contract = new Contract(this.constants.ALIASES.fee_distributor, feeDistributorViewABI, this.provider)
    return this.formatUnits(await contract.claim(address, this.constantOptions));
}

export async function claimFeesEstimateGas(this: Curve, address = ""): Promise<number> {
    address = address || this.signerAddress;
    const contract = this.contracts[this.constants.ALIASES.fee_distributor].contract;

    return Number(DIGas(await contract.claim.estimateGas(address, this.constantOptions)));
}

export async function claimFees(this: Curve, address = ""): Promise<string> {
    if(this.chainId !== 1) {
        throw Error('This method is only available for the network with chainId 1');
    }

    address = address || this.signerAddress;
    const contract = this.contracts[this.constants.ALIASES.fee_distributor].contract;

    await this.updateFeeData();
    const gasLimit = mulBy1_3(DIGas(await contract.claim.estimateGas(address, this.constantOptions)));
    return (await contract.claim(address, { ...this.options, gasLimit })).hash
}

export async function claimableFeesCrvUSD(this: Curve, address = ""): Promise<string> {
    if(this.chainId !== 1) {
        throw Error('This method is only available for the network with chainId 1');
    }

    address = address || this.signerAddress;
    const contract = new Contract(this.constants.ALIASES.fee_distributor_crvusd, feeDistributorCrvUSDViewABI, this.provider)
    return this.formatUnits(await contract.claim(address, this.constantOptions));
}

export async function claimFeesCrvUSDEstimateGas(this: Curve, address = ""): Promise<number> {
    if(this.chainId !== 1) {
        throw Error('This method is only available for the network with chainId 1');
    }

    address = address || this.signerAddress;
    const contract = this.contracts[this.constants.ALIASES.fee_distributor_crvusd].contract;

    return Number(DIGas(await contract.claim.estimateGas(address, this.constantOptions)));
}

export async function claimFeesCrvUSD(this: Curve, address = ""): Promise<string> {
    address = address || this.signerAddress;
    const contract = this.contracts[this.constants.ALIASES.fee_distributor_crvusd].contract;

    await this.updateFeeData();
    const gasLimit = mulBy1_3(DIGas(await contract.claim.estimateGas(address, this.constantOptions)));

    return (await contract.claim(address, { ...this.options, gasLimit })).hash
}


//  ------------ SIDECHAIN ------------


export async function lastEthBlock(this: Curve): Promise<number> {
    if (this.chainId === 1) throw Error("There is no lastBlock method on ethereum network");
    const veOracleContract = this.contracts[this.constants.ALIASES.voting_escrow_oracle].contract;

    return Number(await veOracleContract.last_eth_block_number(this.constantOptions));
}

export async function getAnycallBalance(this: Curve): Promise<string> {
    if (this.chainId === 1) throw Error("There is no getAnycallBalance method on ethereum network");
    const anycallContract = this.contracts[this.constants.ALIASES.anycall].contract;
    const _balance = await anycallContract.executionBudget(this.constants.ALIASES.voting_escrow_oracle, this.constantOptions);
    return this.formatUnits(_balance)
}

function defaultAmount(this: Curve) {
    return (this.chainId === 42161 || this.chainId === 10) ? 0.00001 : 0.1;
}

async function _topUpAnycall(this: Curve, amount: number | string, estimateGas: boolean): Promise<string | number | number[]> {
    if (this.chainId === 1) throw Error("There is no topUpAnycall method on ethereum network");
    const anycallContract = this.contracts[this.constants.ALIASES.anycall].contract;
    const value = this.parseUnits(String(amount));
    const gas = await anycallContract.deposit.estimateGas(this.constants.ALIASES.voting_escrow_oracle, { ...this.constantOptions, value});
    if (estimateGas) return smartNumber(gas);

    await this.updateFeeData();
    const gasLimit = mulBy1_3(DIGas(gas));
    return (await anycallContract.deposit(this.constants.ALIASES.voting_escrow_oracle, { ...this.options, gasLimit, value })).hash;
}

export async function topUpAnycallEstimateGas(this: Curve, amount: number | string = defaultAmount.call(this)): Promise<number> {
    return await _topUpAnycall.call(this, amount, true) as number;
}

export async function topUpAnycall(this: Curve, amount: number | string = defaultAmount.call(this)): Promise<string> {
    return await _topUpAnycall.call(this, amount, false) as string;
}

export async function lastBlockSent(this: Curve, chainId: IChainId): Promise<number> {
    if (this.chainId !== 1) throw Error("lastBlockNumberSent method is on ethereum network only");
    const veOracleContract = this.contracts[this.constants.ALIASES.voting_escrow_oracle].contract;

    return Number(await veOracleContract.get_last_block_number_sent(chainId, this.constantOptions));
}

export async function blockToSend(this: Curve): Promise<number> {
    if (this.chainId !== 1) throw Error("blockToSend method is on ethereum network only");
    return (await this.provider.getBlockNumber()) - 128;
}

async function _sendBlockhash(this: Curve, block: number, chainId: IChainId, estimateGas: boolean): Promise<string | number | number[]> {
    if (this.chainId !== 1) throw Error("sendBlockhash method is on ethereum network only");
    const veOracleContract = this.contracts[this.constants.ALIASES.voting_escrow_oracle].contract;
    const gas = await veOracleContract.send_blockhash.estimateGas(block, chainId, this.constantOptions);
    if (estimateGas) return smartNumber(gas);

    await this.updateFeeData();
    const gasLimit = mulBy1_3(DIGas(gas));
    return (await veOracleContract.send_blockhash(block, chainId, { ...this.options, gasLimit })).hash;
}

export async function sendBlockhashEstimateGas(this: Curve, block: number, chainId: IChainId): Promise<number> {
    return await _sendBlockhash.call(this, block, chainId, true) as number;
}

export async function sendBlockhash(this: Curve, block: number, chainId: IChainId): Promise<string> {
    return await _sendBlockhash.call(this, block, chainId, false) as string;
}

async function _submitProof(this: Curve, block: number, address = this.signerAddress, estimateGas: boolean): Promise<string | number | number[]> {
    if (this.chainId === 1) throw Error("submitProof method is on ethereum network only");
    if (address === "") throw Error("Pass address you want to submit proof for")
    const proof = await _generateBoostingProof(block, address);
    const veOracleContract = this.contracts[this.constants.ALIASES.voting_escrow_oracle].contract;
    const gas = await veOracleContract.submit_state.estimateGas(address, "0x" + proof.block_header_rlp, "0x" + proof.proof_rlp, this.constantOptions);
    if (estimateGas) return smartNumber(gas);

    await this.updateFeeData();
    const gasLimit = mulBy1_3(DIGas(gas));
    return (await veOracleContract.submit_state(address, "0x" + proof.block_header_rlp, "0x" + proof.proof_rlp, { ...this.options, gasLimit })).hash;
}

export async function submitProofEstimateGas(this: Curve, block: number, address = this.signerAddress): Promise<number> {
    return await _submitProof.call(this, block, address, true) as number;
}

export async function submitProof(this: Curve, block: number, address = this.signerAddress): Promise<string> {
    return await _submitProof.call(this, block, address, false) as string;
}
