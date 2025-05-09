import { type Curve} from "./curve.js";
import {Contract} from "ethers";
import {_getAllGauges, _getDaoProposal, _getDaoProposalList} from './external-api.js';
import {
    _getAddress,
    BN,
    DIGas,
    ensureAllowance,
    ensureAllowanceEstimateGas,
    hasAllowance,
    mulBy1_3,
    parseUnits,
    smartNumber,
    toBN,
} from './utils.js';
import {
    IDaoProposal,
    IDaoProposalListItem,
    IDaoProposalUserListItem,
    IDict,
    IGaugeUserVote,
    IVotingGauge,
    TVoteType,
} from './interfaces';
import feeDistributorViewABI from "./constants/abis/fee_distributor_view.json" with {type: "json"};


// ----------------- Refactored boosting stuff -----------------

export async function crvSupplyStats(this: Curve): Promise<{
    circulating: string,
    locked: string,
    total: string,
    veCrv: string,
    averageLockTime: string
}> {
    if (this.chainId !== 1) throw Error("Ethereum-only method")
    const crvContract = this.contracts[this.constants.ALIASES.crv].multicallContract;
    const veContract = this.contracts[this.constants.ALIASES.voting_escrow].multicallContract;
    const csContract = this.contracts[this.constants.ALIASES.circulating_supply].multicallContract;
    const [_circulating, _locked, _veCrv] = await this.multicallProvider.all([
        csContract.circulating_supply(),
        crvContract.balanceOf(this.constants.ALIASES.voting_escrow),
        veContract.totalSupply(),
    ]) as [bigint, bigint, bigint];

    return {
        circulating: this.formatUnits(_circulating),
        locked: this.formatUnits(_locked),
        total: this.formatUnits(_circulating + _locked),
        veCrv: this.formatUnits(_veCrv),
        averageLockTime: toBN(_veCrv).div(toBN(_locked)).times(4).toFixed(4), // years
    }
}

export async function userCrv(this: Curve, address = ""): Promise<string> {
    if (this.chainId !== 1) throw Error("Ethereum-only method")
    address = _getAddress.call(this, address);
    const _balance: bigint = await this.contracts[this.constants.ALIASES.crv].contract.balanceOf(address);

    return this.formatUnits(_balance)
}

export async function userVeCrv(this: Curve, address = ""): Promise<{
    veCrv: string,
    veCrvPct: string,
    lockedCrv: string,
    unlockTime: number
}> {
    if (this.chainId !== 1) throw Error("Ethereum-only method")
    address = _getAddress.call(this, address);
    const contract = this.contracts[this.constants.ALIASES.voting_escrow].multicallContract;
    const [_veCrv, _veCrvTotal, _locked] = await this.multicallProvider.all([
        contract.balanceOf(address),
        contract.totalSupply(),
        contract.locked(address),
    ]) as [bigint, bigint, bigint[]];
    const _lockedCrv = (_locked as bigint[])[0];
    const _unlockTime = (_locked as bigint[])[1];

    return {
        veCrv: this.formatUnits(_veCrv),
        veCrvPct: toBN(_veCrv).div(toBN(_veCrvTotal)).times(100).toString(),
        lockedCrv: this.formatUnits(_lockedCrv),
        unlockTime: Number(this.formatUnits(_unlockTime, 0)) * 1000,
    }
}

export async function crvLockIsApproved(this: Curve, amount: number | string): Promise<boolean> {
    if (this.chainId !== 1) throw Error("Ethereum-only method")
    return await hasAllowance.call(this, [this.constants.ALIASES.crv], [amount], this.signerAddress, this.constants.ALIASES.voting_escrow);
}

export async function crvLockApproveEstimateGas(this: Curve, amount: number | string): Promise<number | number[]> {
    if (this.chainId !== 1) throw Error("Ethereum-only method")
    return await ensureAllowanceEstimateGas.call(this, [this.constants.ALIASES.crv], [amount], this.constants.ALIASES.voting_escrow, false);
}

export async function crvLockApprove(this: Curve, amount: number | string): Promise<string[]> {
    if (this.chainId !== 1) throw Error("Ethereum-only method")
    return await ensureAllowance.call(this, [this.constants.ALIASES.crv], [amount], this.constants.ALIASES.voting_escrow, false);
}

export const calcCrvUnlockTime = (days: number | string, start: number | string = Date.now()): number => {
    const week = 86400 * 7;
    const now = Number(start) / 1000;
    const unlockTime = now + (86400 * Number(days));

    return Math.floor(unlockTime / week) * week * 1000;
}

async function _createCrvLock(this: Curve, amount: number | string, days: number, estimateGas: boolean): Promise<string | number | number[]> {
    if (this.chainId !== 1) throw Error("Ethereum-only method")
    const crvBalance = await userCrv.call(this);
    if (BN(crvBalance).lt(amount)) throw Error(`Not enough CRV. Wallet balance: ${crvBalance}, required: ${amount}`);
    if (!(await crvLockIsApproved.call(this, amount))) throw Error("Token allowance is needed to estimate gas")

    const _amount = parseUnits(amount);
    const unlockTime = Math.floor(Date.now() / 1000) + (days * 86400);
    const contract = this.contracts[this.constants.ALIASES.voting_escrow].contract;
    const gas = await contract.create_lock.estimateGas(_amount, unlockTime, this.constantOptions);
    if (estimateGas) return smartNumber(gas);

    await this.updateFeeData();
    const gasLimit = mulBy1_3(DIGas(gas));
    return (await contract.create_lock(_amount, unlockTime, { ...this.options, gasLimit })).hash;
}

export async function createCrvLockEstimateGas(this: Curve, amount: number | string, days: number | string): Promise<number | number[]> {
    return await _createCrvLock.call(this, amount, Number(days), true) as number | number[];
}

export async function createCrvLock(this: Curve, amount: number | string, days: number | string): Promise<string> {
    return await _createCrvLock.call(this, amount, Number(days), false) as string;
}

async function _increaseCrvLockedAmount(this: Curve, amount: number | string, estimateGas: boolean): Promise<string | number | number[]> {
    if (this.chainId !== 1) throw Error("Ethereum-only method")
    const crvBalance = await userCrv.call(this);
    if (BN(crvBalance).lt(amount)) throw Error(`Not enough CRV. Wallet balance: ${crvBalance}, required: ${amount}`);
    if (!(await crvLockIsApproved.call(this, amount))) throw Error("Token allowance is needed to estimate gas")

    const _amount = parseUnits(amount);
    const contract = this.contracts[this.constants.ALIASES.voting_escrow].contract;
    const gas = await contract.increase_amount.estimateGas(_amount, this.constantOptions);
    if (estimateGas) return smartNumber(gas);

    await this.updateFeeData();
    const gasLimit = mulBy1_3(DIGas(gas));
    return (await contract.increase_amount(_amount, { ...this.options, gasLimit })).hash;
}

export async function increaseCrvLockedAmountEstimateGas(this: Curve, amount: number | string): Promise<number | number[]> {
    return await _increaseCrvLockedAmount.call(this, amount, true) as number | number[];
}

export async function increaseCrvLockedAmount(this: Curve, amount: number | string): Promise<string> {
    return await _increaseCrvLockedAmount.call(this, amount, false) as string;
}

async function _increaseCrvUnlockTime(this: Curve, days: number, estimateGas: boolean): Promise<string | number | number[]> {
    if (this.chainId !== 1) throw Error("Ethereum-only method")
    const { unlockTime } = await userVeCrv.call(this);
    const newUnlockTime = Math.floor(unlockTime / 1000) + (days * 86400);
    const contract = this.contracts[this.constants.ALIASES.voting_escrow].contract;
    const gas = await contract.increase_unlock_time.estimateGas(newUnlockTime, this.constantOptions);
    if (estimateGas) return smartNumber(gas);

    await this.updateFeeData();
    const gasLimit = mulBy1_3(DIGas(gas));
    return (await contract.increase_unlock_time(newUnlockTime, { ...this.options, gasLimit })).hash;
}

export async function increaseCrvUnlockTimeEstimateGas(this: Curve, days: number | string): Promise<number | number[]> {
    return await _increaseCrvUnlockTime.call(this, Number(days), true) as number | number[];
}

export async function increaseCrvUnlockTime(this: Curve, days: number | string): Promise<string> {
    return await _increaseCrvUnlockTime.call(this, Number(days), false) as string;
}

async function _withdrawLockedCrv(this: Curve, estimateGas: boolean): Promise<string | number | number[]> {
    if (this.chainId !== 1) throw Error("Ethereum-only method");
    const { unlockTime } = await userVeCrv.call(this);
    if (unlockTime > Date.now()) throw Error("The lock haven't expired yet")
    const contract = this.contracts[this.constants.ALIASES.voting_escrow].contract;
    const gas = await contract.withdraw.estimateGas(this.constantOptions);
    if (estimateGas) return smartNumber(gas);

    await this.updateFeeData();
    const gasLimit = mulBy1_3(DIGas(gas));
    return (await contract.withdraw({ ...this.options, gasLimit })).hash;
}

export async function withdrawLockedCrvEstimateGas(this: Curve): Promise<number | number[]> {
    return await _withdrawLockedCrv.call(this, true) as number | number[];
}

export async function withdrawLockedCrv(this: Curve): Promise<string> {
    return await _withdrawLockedCrv.call(this, false) as string;
}

export async function claimableFees(this: Curve, address = ""): Promise<string> {
    address = _getAddress.call(this, address);
    const contract = new Contract(this.constants.ALIASES.fee_distributor, feeDistributorViewABI, this.provider)
    return this.formatUnits(await contract.claim(address, this.constantOptions));
}

async function _claimFees(this: Curve, address: string, estimateGas: boolean): Promise<string | number | number[]> {
    address = _getAddress.call(this, address);
    const contract = this.contracts[this.constants.ALIASES.fee_distributor].contract;
    const gas = await contract.claim.estimateGas(address, this.constantOptions);
    if (estimateGas) return smartNumber(gas);

    await this.updateFeeData();
    const gasLimit = mulBy1_3(DIGas(gas));
    return (await contract.claim(address, { ...this.options, gasLimit })).hash;
}

export async function claimFeesEstimateGas(this: Curve, address = ""): Promise<number | number[]> {
    return await _claimFees.call(this, address,true) as number | number[];
}

export async function claimFees(this: Curve, address = ""): Promise<string> {
    return await _claimFees.call(this, address,false) as string;
}


// ----------------- Gauge weights -----------------

export async function getVotingGaugeList(this: Curve): Promise<IVotingGauge[]> {
    if (this.chainId !== 1) throw Error("Ethereum-only method")
    const gaugeData = Object.values(await _getAllGauges());
    const res = [];
    for (let i = 0; i < gaugeData.length; i++) {
        if ((gaugeData[i].is_killed || gaugeData[i].hasNoCrv) && Number(gaugeData[i].gauge_controller.gauge_relative_weight) === 0) continue;
        res.push({
            poolUrl: gaugeData[i].poolUrls?.swap[0] || '',
            network: gaugeData[i].blockchainId,
            gaugeAddress: gaugeData[i].gauge,
            poolAddress: gaugeData[i].swap || '',
            lpTokenAddress: gaugeData[i].swap_token || '',
            poolName: gaugeData[i].shortName,
            totalVeCrv: this.formatUnits(gaugeData[i].gauge_controller.get_gauge_weight, 18),
            relativeWeight: this.formatUnits(gaugeData[i].gauge_controller.gauge_relative_weight, 16),
            isKilled: gaugeData[i].is_killed ?? false,
        });
    }

    return res
}

export async function userGaugeVotes(this: Curve, address = ""): Promise<{
    gauges: IGaugeUserVote[],
    powerUsed: string,
    veCrvUsed: string
}> {
    if (this.chainId !== 1) throw Error("Ethereum-only method")
    address = _getAddress.call(this, address);
    const gcMulticallContract = this.contracts[this.constants.ALIASES.gauge_controller].multicallContract;
    const veMulticallContract = this.contracts[this.constants.ALIASES.voting_escrow]. multicallContract;

    const gaugeData = Object.values(await _getAllGauges());
    const calls: any[] = [veMulticallContract.balanceOf(address)];
    for (const d of gaugeData) {
        const gaugeAddress = d.rootGauge ? d.rootGauge : d.gauge;
        calls.push(gcMulticallContract.vote_user_slopes(address, gaugeAddress));
    }
    const [veCrvBalance, ...votes] = await this.multicallProvider.all(calls) as [bigint, bigint[]];

    const res: { gauges: IGaugeUserVote[], powerUsed: string, veCrvUsed: string } = { gauges: [], powerUsed: "0.0", veCrvUsed: "0.0" };
    let powerUsed = BigInt(0);
    let veCrvUsed = BigInt(0);
    for (let i = 0; i < votes.length; i++) {
        if (votes[i][1] === BigInt(0)) continue;
        let dt = votes[i][2] - BigInt(Math.floor(Date.now() / 1000));
        if (dt < BigInt(0)) dt = BigInt(0);
        res.gauges.push({
            userPower: this.formatUnits(votes[i][1], 2),
            userVeCrv: this.formatUnits(votes[i][0] * dt, 18),
            userFutureVeCrv: this.formatUnits(veCrvBalance * votes[i][1] / BigInt(10000), 18),
            expired: dt === BigInt(0),
            gaugeData: {
                poolUrl: gaugeData[i].poolUrls?.swap[0] || '',
                network: gaugeData[i].blockchainId,
                gaugeAddress: gaugeData[i].gauge,
                poolAddress: gaugeData[i].swap || '',
                lpTokenAddress: gaugeData[i].swap_token || '',
                poolName: gaugeData[i].shortName,
                totalVeCrv: this.formatUnits(gaugeData[i].gauge_controller.get_gauge_weight, 18),
                relativeWeight: this.formatUnits(gaugeData[i].gauge_controller.gauge_relative_weight, 16),
                isKilled: gaugeData[i].is_killed ?? false,
            },
        });
        powerUsed += votes[i][1];
        veCrvUsed += votes[i][0] * dt;
    }
    res.powerUsed = this.formatUnits(powerUsed, 2);
    res.veCrvUsed = this.formatUnits(veCrvUsed.toString(), 18);

    return res
}

export async function voteForGaugeNextTime(this: Curve, gauge: string): Promise<number> {
    if (this.chainId !== 1) throw Error("Ethereum-only method")
    const _lastVote: bigint = await this.contracts[this.constants.ALIASES.gauge_controller].contract.last_user_vote(this.signerAddress, gauge, this.constantOptions);

    return (Number(_lastVote) + (10 * 86400)) * 1000;
}

async function _voteForGauge(this: Curve, gauge: string, power: number | string, estimateGas: boolean): Promise<string | number | number[]> {
    if (this.chainId !== 1) throw Error("Ethereum-only method")
    const gcContract = this.contracts[this.constants.ALIASES.gauge_controller].contract;
    const gcMulticallContract = this.contracts[this.constants.ALIASES.gauge_controller].multicallContract;
    const _power = parseUnits(power, 2);
    const [_powerUsed, _vote_slopes] = await this.multicallProvider.all([
        gcMulticallContract.vote_user_power(this.signerAddress),
        gcMulticallContract.vote_user_slopes(this.signerAddress, gauge),
    ]) as [bigint, bigint[]];
    const _freePower = BigInt(10000) - _powerUsed;
    if (_power > _freePower + _vote_slopes[1]) throw Error(`User have only ${this.formatUnits(_freePower, 2)} % free power. Trying to use ${this.formatUnits(_power, 2)}`);
    const nextVoteTime = await voteForGaugeNextTime.call(this, gauge);
    if (Date.now() < nextVoteTime) throw Error(`User can't change vote for this gauge earlier than ${new Date(nextVoteTime)}`);

    const gas = await gcContract.vote_for_gauge_weights.estimateGas(gauge, _power, this.constantOptions);
    if (estimateGas) return smartNumber(gas);

    await this.updateFeeData();
    const gasLimit = mulBy1_3(DIGas(gas));
    return (await gcContract.vote_for_gauge_weights(gauge, _power, { ...this.options, gasLimit })).hash;
}

export async function voteForGaugeEstimateGas(this: Curve, gauge: string, power: number | string): Promise<number | number[]> {
    return await _voteForGauge.call(this, gauge, power, true) as number | number[];
}

export async function voteForGauge(this: Curve, gauge: string, power: number | string): Promise<string> {
    return await _voteForGauge.call(this, gauge, power, false) as string;
}


// ----------------- Proposals -----------------

export async function getProposalList(this: Curve): Promise<IDaoProposalListItem[]> {
    return await _getDaoProposalList();
}

export async function getProposal(this: Curve, type: "PARAMETER" | "OWNERSHIP", id: number): Promise<IDaoProposal> {
    return await _getDaoProposal(type, id);
}

export async function userProposalVotes(this: Curve, address = ""): Promise<IDaoProposalUserListItem[]> {
    if (this.chainId !== 1) throw Error("Ethereum-only method")
    address = _getAddress.call(this, address);
    const proposalList = await _getDaoProposalList();
    const calls = [];
    for (const proposal of proposalList) {
        if (proposal.voteType.toUpperCase() == "PARAMETER") {
            calls.push(this.contracts[this.constants.ALIASES.voting_parameter].multicallContract.getVoterState(proposal.voteId, address));
        } else {
            calls.push(this.contracts[this.constants.ALIASES.voting_ownership].multicallContract.getVoterState(proposal.voteId, address));
        }
    }
    const userState: number[] = (await this.multicallProvider.all(calls)).map(Number);

    const userProposalList: IDaoProposalUserListItem[] = [];
    const voteEnum: IDict<"yes" | "no" | "even"> = {
        1: "yes",
        2: "no",
        3: "even",
    }
    for (let i = 0; i < proposalList.length; i++) {
        if (userState[i] > 0) userProposalList.push({ ...proposalList[i], userVote: voteEnum[userState[i]]});
    }

    return userProposalList
}

async function _voteForProposal(this: Curve, type: TVoteType, id: number, support: boolean, estimateGas: boolean): Promise<string | number | number[]> {
    if (this.chainId !== 1) throw Error("Ethereum-only method")
    const contractAddress = type.toUpperCase() === "PARAMETER" ? this.constants.ALIASES.voting_parameter : this.constants.ALIASES.voting_ownership;
    const contract = this.contracts[contractAddress].contract;
    const yesPct = support ? BigInt(10**18) : BigInt(0);
    const noPct = BigInt(10**18) - yesPct;
    const gas = await contract.votePct.estimateGas(id, yesPct, noPct, true, this.constantOptions);
    if (estimateGas) return smartNumber(gas);

    await this.updateFeeData();
    const gasLimit = mulBy1_3(DIGas(gas));
    return (await contract.votePct(id, yesPct, noPct, false, { ...this.options, gasLimit })).hash;
}

export async function voteForProposalEstimateGas(this: Curve, type: TVoteType, id: number, support: boolean): Promise<number | number[]> {
    return await _voteForProposal.call(this, type, id, support, true) as number | number[];
}

export async function voteForProposal(this: Curve, type: TVoteType, id: number, support: boolean): Promise<string> {
    return await _voteForProposal.call(this, type, id, support, false) as string;
}

async function _executeVote(this: Curve, type: TVoteType, id: number, estimateGas = false): Promise<string | number | number[]> {
    if (this.chainId !== 1) throw Error("Ethereum-only method")
    const contractAddress = type.toUpperCase() === "PARAMETER" ? this.constants.ALIASES.voting_parameter : this.constants.ALIASES.voting_ownership;
    const contract = this.contracts[contractAddress].contract;
    const gas = await contract.executeVote.estimateGas(id, this.constantOptions);
    if (estimateGas) return smartNumber(gas);

    await this.updateFeeData();
    const gasLimit = mulBy1_3(DIGas(gas));
    return (await contract.executeVote(id, { ...this.options, gasLimit })).hash;
}

export async function executeVoteEstimateGas(this: Curve, type: TVoteType, id: number): Promise<number | number[]> {
    return await _executeVote.call(this, type, id, true) as number | number[];
}

export async function executeVote(this: Curve, type: TVoteType, id: number): Promise<string> {
    return await _executeVote.call(this, type, id, false) as string;
}

export async function isCanVoteExecute(this: Curve, type: TVoteType, id: number): Promise<boolean> {
    if (this.chainId !== 1) throw Error("Ethereum-only method")
    const contractAddress = type.toUpperCase() === "PARAMETER" ? this.constants.ALIASES.voting_parameter : this.constants.ALIASES.voting_ownership;
    const contract = this.contracts[contractAddress].contract;

    return await contract.canExecute(id, { ...this.options });
}
