import { curve } from "./curve.js";
import { Contract } from "ethers";
import { _getAllGauges, _getDaoProposalList, _getDaoProposal } from './external-api.js';
import {
    _getAddress,
    DIGas, ensureAllowance, ensureAllowanceEstimateGas, hasAllowance,
    mulBy1_3,
    parseUnits,
    smartNumber,
    toBN,
    BN,
} from './utils.js';
import {
    IGaugeUserVote,
    IVotingGauge,
    IDaoProposalListItem,
    IDaoProposalUserListItem,
    IDaoProposal,
    IDict,
    TVoteType,
} from './interfaces';
import feeDistributorViewABI from "./constants/abis/fee_distributor_view.json" assert { type: 'json' };


// ----------------- Refactored boosting stuff -----------------

export const crvSupplyStats = async (): Promise<{ circulating: string, locked: string, total: string, veCrv: string, averageLockTime: string }> => {
    if (curve.chainId !== 1) throw Error("Ethereum-only method")
    const crvContract = curve.contracts[curve.constants.ALIASES.crv].multicallContract;
    const veContract = curve.contracts[curve.constants.ALIASES.voting_escrow].multicallContract;
    const csContract = curve.contracts[curve.constants.ALIASES.circulating_supply].multicallContract;
    const [_circulating, _locked, _veCrv] = await curve.multicallProvider.all([
        csContract.circulating_supply(),
        crvContract.balanceOf(curve.constants.ALIASES.voting_escrow),
        veContract.totalSupply(),
    ]) as [bigint, bigint, bigint];

    return {
        circulating: curve.formatUnits(_circulating),
        locked: curve.formatUnits(_locked),
        total: curve.formatUnits(_circulating + _locked),
        veCrv: curve.formatUnits(_veCrv),
        averageLockTime: toBN(_veCrv).div(toBN(_locked)).times(4).toFixed(4), // years
    }
}

export const userCrv = async (address = ""): Promise<string> => {
    if (curve.chainId !== 1) throw Error("Ethereum-only method")
    address = _getAddress(address);
    const _balance: bigint = await curve.contracts[curve.constants.ALIASES.crv].contract.balanceOf(address);

    return curve.formatUnits(_balance)
}

export const userVeCrv = async (address = ""): Promise<{ veCrv: string, veCrvPct: string, lockedCrv: string, unlockTime: number }> => {
    if (curve.chainId !== 1) throw Error("Ethereum-only method")
    address = _getAddress(address);
    const contract = curve.contracts[curve.constants.ALIASES.voting_escrow].multicallContract;
    const [_veCrv, _veCrvTotal, _locked] = await curve.multicallProvider.all([
        contract.balanceOf(address),
        contract.totalSupply(),
        contract.locked(address),
    ]) as [bigint, bigint, bigint[]];
    const _lockedCrv = (_locked as bigint[])[0];
    const _unlockTime = (_locked as bigint[])[1];

    return {
        veCrv: curve.formatUnits(_veCrv),
        veCrvPct: toBN(_veCrv).div(toBN(_veCrvTotal)).times(100).toString(),
        lockedCrv: curve.formatUnits(_lockedCrv),
        unlockTime: Number(curve.formatUnits(_unlockTime, 0)) * 1000,
    }
}

export const crvLockIsApproved = async (amount: number | string): Promise<boolean> => {
    if (curve.chainId !== 1) throw Error("Ethereum-only method")
    return await hasAllowance([curve.constants.ALIASES.crv], [amount], curve.signerAddress, curve.constants.ALIASES.voting_escrow);
}

export const crvLockApproveEstimateGas = async (amount: number | string): Promise<number | number[]> => {
    if (curve.chainId !== 1) throw Error("Ethereum-only method")
    return await ensureAllowanceEstimateGas([curve.constants.ALIASES.crv], [amount], curve.constants.ALIASES.voting_escrow, false);
}

export const crvLockApprove = async (amount: number | string): Promise<string[]> => {
    if (curve.chainId !== 1) throw Error("Ethereum-only method")
    return await ensureAllowance([curve.constants.ALIASES.crv], [amount], curve.constants.ALIASES.voting_escrow, false);
}

export const calcCrvUnlockTime = (days: number | string, start: number | string = Date.now()): number => {
    const week = 86400 * 7;
    const now = Number(start) / 1000;
    const unlockTime = now + (86400 * Number(days));

    return Math.floor(unlockTime / week) * week * 1000;
}

const _createCrvLock = async (amount: number | string, days: number, estimateGas: boolean): Promise<string | number | number[]> => {
    if (curve.chainId !== 1) throw Error("Ethereum-only method")
    const crvBalance = await userCrv();
    if (BN(crvBalance).lt(amount)) throw Error(`Not enough CRV. Wallet balance: ${crvBalance}, required: ${amount}`);
    if (!(await crvLockIsApproved(amount))) throw Error("Token allowance is needed to estimate gas")

    const _amount = parseUnits(amount);
    const unlockTime = Math.floor(Date.now() / 1000) + (days * 86400);
    const contract = curve.contracts[curve.constants.ALIASES.voting_escrow].contract;
    const gas = await contract.create_lock.estimateGas(_amount, unlockTime, curve.constantOptions);
    if (estimateGas) return smartNumber(gas);

    await curve.updateFeeData();
    const gasLimit = mulBy1_3(DIGas(gas));
    return (await contract.create_lock(_amount, unlockTime, { ...curve.options, gasLimit })).hash;
}

export const createCrvLockEstimateGas = async (amount: number | string, days: number | string): Promise<number | number[]> => {
    return await _createCrvLock(amount, Number(days), true) as number | number[];
}

export const createCrvLock = async (amount: number | string, days: number | string): Promise<string> => {
    return await _createCrvLock(amount, Number(days), false) as string;
}

const _increaseCrvLockedAmount = async (amount: number | string, estimateGas: boolean): Promise<string | number | number[]> => {
    if (curve.chainId !== 1) throw Error("Ethereum-only method")
    const crvBalance = await userCrv();
    if (BN(crvBalance).lt(amount)) throw Error(`Not enough CRV. Wallet balance: ${crvBalance}, required: ${amount}`);
    if (!(await crvLockIsApproved(amount))) throw Error("Token allowance is needed to estimate gas")

    const _amount = parseUnits(amount);
    const contract = curve.contracts[curve.constants.ALIASES.voting_escrow].contract;
    const gas = await contract.increase_amount.estimateGas(_amount, curve.constantOptions);
    if (estimateGas) return smartNumber(gas);

    await curve.updateFeeData();
    const gasLimit = mulBy1_3(DIGas(gas));
    return (await contract.increase_amount(_amount, { ...curve.options, gasLimit })).hash;
}

export const increaseCrvLockedAmountEstimateGas = async (amount: number | string): Promise<number | number[]> => {
    return await _increaseCrvLockedAmount(amount, true) as number | number[];
}

export const increaseCrvLockedAmount = async (amount: number | string): Promise<string> => {
    return await _increaseCrvLockedAmount(amount, false) as string;
}

const _increaseCrvUnlockTime = async (days: number, estimateGas: boolean): Promise<string | number | number[]> => {
    if (curve.chainId !== 1) throw Error("Ethereum-only method")
    const { unlockTime } = await userVeCrv();
    const newUnlockTime = Math.floor(unlockTime / 1000) + (days * 86400);
    const contract = curve.contracts[curve.constants.ALIASES.voting_escrow].contract;
    const gas = await contract.increase_unlock_time.estimateGas(newUnlockTime, curve.constantOptions);
    if (estimateGas) return smartNumber(gas);

    await curve.updateFeeData();
    const gasLimit = mulBy1_3(DIGas(gas));
    return (await contract.increase_unlock_time(newUnlockTime, { ...curve.options, gasLimit })).hash;
}

export const increaseCrvUnlockTimeEstimateGas = async (days: number | string): Promise<number | number[]> => {
    return await _increaseCrvUnlockTime(Number(days), true) as number | number[];
}

export const increaseCrvUnlockTime = async (days: number | string): Promise<string> => {
    return await _increaseCrvUnlockTime(Number(days), false) as string;
}

const _withdrawLockedCrv = async (estimateGas: boolean): Promise<string | number | number[]> => {
    if (curve.chainId !== 1) throw Error("Ethereum-only method");
    const { unlockTime } = await userVeCrv();
    if (unlockTime > Date.now()) throw Error("The lock haven't expired yet")
    const contract = curve.contracts[curve.constants.ALIASES.voting_escrow].contract;
    const gas = await contract.withdraw.estimateGas(curve.constantOptions);
    if (estimateGas) return smartNumber(gas);

    await curve.updateFeeData();
    const gasLimit = mulBy1_3(DIGas(gas));
    return (await contract.withdraw({ ...curve.options, gasLimit })).hash;
}

export const withdrawLockedCrvEstimateGas = async (): Promise<number | number[]> => {
    return await _withdrawLockedCrv(true) as number | number[];
}

export const withdrawLockedCrv = async (): Promise<string> => {
    return await _withdrawLockedCrv(false) as string;
}

export const claimableFees = async (address = ""): Promise<string> => {
    address = _getAddress(address);
    const contract = new Contract(curve.constants.ALIASES.fee_distributor, feeDistributorViewABI, curve.provider)
    return curve.formatUnits(await contract.claim(address, curve.constantOptions));
}

const _claimFees = async (address: string, estimateGas: boolean): Promise<string | number | number[]> => {
    address = _getAddress(address);
    const contract = curve.contracts[curve.constants.ALIASES.fee_distributor].contract;
    const gas = await contract.claim.estimateGas(address, curve.constantOptions);
    if (estimateGas) return smartNumber(gas);

    await curve.updateFeeData();
    const gasLimit = mulBy1_3(DIGas(gas));
    return (await contract.claim(address, { ...curve.options, gasLimit })).hash;
}

export const claimFeesEstimateGas = async (address = ""): Promise<number | number[]> => {
    return await _claimFees(address,true) as number | number[];
}

export const claimFees = async (address = ""): Promise<string> => {
    return await _claimFees(address,false) as string;
}


// ----------------- Gauge weights -----------------

const _extractNetworkFromPoolUrl = (poolUrl: string): string => {
    if (!poolUrl) return "unknown";
    return poolUrl.split("/")[4]
}

export const getVotingGaugeList = async (): Promise<IVotingGauge[]> => {
    if (curve.chainId !== 1) throw Error("Ethereum-only method")
    const gaugeData = Object.values(await _getAllGauges());
    const res = [];
    for (let i = 0; i < gaugeData.length; i++) {
        if ((gaugeData[i].is_killed || gaugeData[i].hasNoCrv) && Number(gaugeData[i].gauge_controller.gauge_relative_weight) === 0) continue;
        res.push({
            poolUrl: gaugeData[i].poolUrls.swap[0],
            network: _extractNetworkFromPoolUrl(gaugeData[i].poolUrls.swap[0]),
            gaugeAddress: gaugeData[i].gauge,
            poolAddress: gaugeData[i].swap,
            lpTokenAddress: gaugeData[i].swap_token,
            poolName: gaugeData[i].shortName,
            totalVeCrv: curve.formatUnits(gaugeData[i].gauge_controller.get_gauge_weight, 18),
            relativeWeight: curve.formatUnits(gaugeData[i].gauge_controller.gauge_relative_weight, 16),
            isKilled: gaugeData[i].is_killed ?? false,
        });
    }

    return res
}

export const userGaugeVotes = async (address = ""): Promise<{ gauges: IGaugeUserVote[], powerUsed: string, veCrvUsed: string } > => {
    if (curve.chainId !== 1) throw Error("Ethereum-only method")
    address = _getAddress(address);
    const gcMulticallContract = curve.contracts[curve.constants.ALIASES.gauge_controller].multicallContract;
    const veMulticallContract = curve.contracts[curve.constants.ALIASES.voting_escrow]. multicallContract;

    const gaugeData = Object.values(await _getAllGauges());
    const calls: any[] = [veMulticallContract.balanceOf(address)];
    for (const d of gaugeData) {
        calls.push(gcMulticallContract.vote_user_slopes(address, d.gauge));
    }
    const [veCrvBalance, ...votes] = await curve.multicallProvider.all(calls) as [bigint, bigint[]];

    const res: { gauges: IGaugeUserVote[], powerUsed: string, veCrvUsed: string } = { gauges: [], powerUsed: "0.0", veCrvUsed: "0.0" };
    let powerUsed = BigInt(0);
    let veCrvUsed = BigInt(0);
    for (let i = 0; i < votes.length; i++) {
        if (votes[i][1] === BigInt(0)) continue;
        let dt = votes[i][2] - BigInt(Math.floor(Date.now() / 1000));
        if (dt < BigInt(0)) dt = BigInt(0);
        res.gauges.push({
            userPower: curve.formatUnits(votes[i][1], 2),
            userVeCrv: curve.formatUnits(votes[i][0] * dt, 18),
            userFutureVeCrv: curve.formatUnits(veCrvBalance * votes[i][1] / BigInt(10000), 18),
            expired: dt === BigInt(0),
            gaugeData: {
                poolUrl: gaugeData[i].poolUrls.swap[0],
                network: _extractNetworkFromPoolUrl(gaugeData[i].poolUrls.swap[0]),
                gaugeAddress: gaugeData[i].gauge,
                poolAddress: gaugeData[i].swap,
                lpTokenAddress: gaugeData[i].swap_token,
                poolName: gaugeData[i].shortName,
                totalVeCrv: curve.formatUnits(gaugeData[i].gauge_controller.get_gauge_weight, 18),
                relativeWeight: curve.formatUnits(gaugeData[i].gauge_controller.gauge_relative_weight, 16),
                isKilled: gaugeData[i].is_killed ?? false,
            },
        });
        powerUsed += votes[i][1];
        veCrvUsed += votes[i][0] * dt;
    }
    res.powerUsed = curve.formatUnits(powerUsed, 2);
    res.veCrvUsed = curve.formatUnits(veCrvUsed.toString(), 18);

    return res
}

export const voteForGaugeNextTime = async (gauge: string): Promise<number> => {
    if (curve.chainId !== 1) throw Error("Ethereum-only method")
    const _lastVote: bigint = await curve.contracts[curve.constants.ALIASES.gauge_controller].contract.last_user_vote(curve.signerAddress, gauge, curve.constantOptions);

    return (Number(_lastVote) + (10 * 86400)) * 1000;
}

const _voteForGauge = async (gauge: string, power: number | string, estimateGas: boolean): Promise<string | number | number[]> => {
    if (curve.chainId !== 1) throw Error("Ethereum-only method")
    const gcContract = curve.contracts[curve.constants.ALIASES.gauge_controller].contract;
    const gcMulticallContract = curve.contracts[curve.constants.ALIASES.gauge_controller].multicallContract;
    const _power = parseUnits(power, 2);
    const [_powerUsed, _vote_slopes] = await curve.multicallProvider.all([
        gcMulticallContract.vote_user_power(curve.signerAddress),
        gcMulticallContract.vote_user_slopes(curve.signerAddress, gauge),
    ]) as [bigint, bigint[]];
    const _freePower = BigInt(10000) - _powerUsed;
    if (_power > _freePower + _vote_slopes[1]) throw Error(`User have only ${curve.formatUnits(_freePower, 2)} % free power. Trying to use ${curve.formatUnits(_power, 2)}`);
    const nextVoteTime = await voteForGaugeNextTime(gauge);
    if (Date.now() < nextVoteTime) throw Error(`User can't change vote for this gauge earlier than ${new Date(nextVoteTime)}`);

    const gas = await gcContract.vote_for_gauge_weights.estimateGas(gauge, _power, curve.constantOptions);
    if (estimateGas) return smartNumber(gas);

    await curve.updateFeeData();
    const gasLimit = mulBy1_3(DIGas(gas));
    return (await gcContract.vote_for_gauge_weights(gauge, _power, { ...curve.options, gasLimit })).hash;
}

export const voteForGaugeEstimateGas = async (gauge: string, power: number | string): Promise<number | number[]> => {
    return await _voteForGauge(gauge, power, true) as number | number[];
}

export const voteForGauge = async (gauge: string, power: number | string): Promise<string> => {
    return await _voteForGauge(gauge, power, false) as string;
}


// ----------------- Proposals -----------------

export const getProposalList = async (): Promise<IDaoProposalListItem[]> => {
    return await _getDaoProposalList();
}

export const getProposal = async (type: "PARAMETER" | "OWNERSHIP", id: number): Promise<IDaoProposal> => {
    return await _getDaoProposal(type, id);
}

export const userProposalVotes = async (address = ""): Promise<IDaoProposalUserListItem[]> => {
    if (curve.chainId !== 1) throw Error("Ethereum-only method")
    address = _getAddress(address);
    const proposalList = await _getDaoProposalList();
    const calls = [];
    for (const proposal of proposalList) {
        if (proposal.voteType == "PARAMETER") {
            calls.push(curve.contracts[curve.constants.ALIASES.voting_parameter].multicallContract.getVoterState(proposal.voteId, address));
        } else {
            calls.push(curve.contracts[curve.constants.ALIASES.voting_ownership].multicallContract.getVoterState(proposal.voteId, address));
        }
    }
    const userState: number[] = (await curve.multicallProvider.all(calls)).map(Number);

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

const _voteForProposal = async (type: TVoteType, id: number, support: boolean, estimateGas: boolean): Promise<string | number | number[]> => {
    if (curve.chainId !== 1) throw Error("Ethereum-only method")
    const contractAddress = type === "PARAMETER" ? curve.constants.ALIASES.voting_parameter : curve.constants.ALIASES.voting_ownership;
    const contract = curve.contracts[contractAddress].contract;
    const yesPct = support ? BigInt(10**18) : BigInt(0);
    const noPct = BigInt(10**18) - yesPct;
    const gas = await contract.votePct.estimateGas(id, yesPct, noPct, true, curve.constantOptions);
    if (estimateGas) return smartNumber(gas);

    await curve.updateFeeData();
    const gasLimit = mulBy1_3(DIGas(gas));
    return (await contract.votePct(id, yesPct, noPct, false, { ...curve.options, gasLimit })).hash;
}

export const voteForProposalEstimateGas = async (type: TVoteType, id: number, support: boolean): Promise<number | number[]> => {
    return await _voteForProposal(type, id, support, true) as number | number[];
}

export const voteForProposal = async (type: TVoteType, id: number, support: boolean): Promise<string> => {
    return await _voteForProposal(type, id, support, false) as string;
}

const _executeVote = async (type: TVoteType, id: number, estimateGas = false): Promise<string | number | number[]> => {
    if (curve.chainId !== 1) throw Error("Ethereum-only method")
    const contractAddress = type === "PARAMETER" ? curve.constants.ALIASES.voting_parameter : curve.constants.ALIASES.voting_ownership;
    const contract = curve.contracts[contractAddress].contract;
    const gas = await contract.executeVote.estimateGas(id, curve.constantOptions);
    if (estimateGas) return smartNumber(gas);

    await curve.updateFeeData();
    const gasLimit = mulBy1_3(DIGas(gas));
    return (await contract.executeVote(id, { ...curve.options, gasLimit })).hash;
}

export const executeVoteEstimateGas = async (type: TVoteType, id: number): Promise<number | number[]> => {
    return await _executeVote(type, id, true) as number | number[];
}

export const executeVote = async (type:TVoteType, id: number): Promise<string> => {
    return await _executeVote(type, id, false) as string;
}

export const isCanVoteExecute = async (type: TVoteType, id: number): Promise<boolean> => {
    if (curve.chainId !== 1) throw Error("Ethereum-only method")
    const contractAddress = type === "PARAMETER" ? curve.constants.ALIASES.voting_parameter : curve.constants.ALIASES.voting_ownership;
    const contract = curve.contracts[contractAddress].contract;

    return await contract.canExecute(id, { ...curve.options });
}
