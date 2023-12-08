import { _getAllGauges } from './external-api.js';
import { _getAddress, DIGas, mulBy1_3, parseUnits, smartNumber } from './utils.js';
import { IGaugeUserVote, IVotingGauge } from './interfaces';
import { curve } from "./curve.js";


const _extractNetworkFromPoolUrl = (poolUrl: string): string => {
    if (!poolUrl) return "unknown";
    return poolUrl.split("/")[4]
}

export const userVotes = async (address = ""): Promise<{ gauges: IGaugeUserVote[], powerUsed: string, veCrvUsed: string } > => {
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

export const userVeCrv = async (address = ""): Promise<string> => {
    if (curve.chainId !== 1) throw Error("Ethereum-only method")
    address = _getAddress(address);
    const veContract = curve.contracts[curve.constants.ALIASES.voting_escrow].contract;

    return curve.formatUnits(await veContract.balanceOf(address))
}

export const getVotingGauges = async (): Promise<IVotingGauge[]> => {
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

export const voteForGaugeNextTime = async (gauge: string): Promise<number> => {
    const _lastVote: bigint = await curve.contracts[curve.constants.ALIASES.gauge_controller].contract.last_user_vote(curve.signerAddress, gauge, curve.constantOptions);
    return (Number(_lastVote) + (10 * 86400)) * 1000;
}

const _voteForGauge = async (gauge: string, power: number | string, estimateGas: boolean): Promise<string | number | number[]> => {
    const gaugeControllerContract = curve.contracts[curve.constants.ALIASES.gauge_controller].contract;
    const _power = parseUnits(power, 2);
    const _powerUsed = await gaugeControllerContract.vote_user_power(curve.signerAddress, curve.constantOptions);
    const _freePower = BigInt(10000) - _powerUsed;
    if (_power > _freePower) throw Error(`User have only ${curve.formatUnits(_freePower, 2)} % free power. Trying to use ${curve.formatUnits(_power, 2)}`);
    const nextVoteTime = await voteForGaugeNextTime(gauge);
    if (Date.now() < nextVoteTime) throw Error(`User can't change vote for this gauge earlier than ${new Date(nextVoteTime)}`);

    const gas = await gaugeControllerContract.vote_for_gauge_weights.estimateGas(gauge, _power, curve.constantOptions);
    if (estimateGas) return smartNumber(gas);

    const gasLimit = mulBy1_3(DIGas(gas));
    return (await gaugeControllerContract.vote_for_gauge_weights(gauge, _power, { ...curve.options, gasLimit })).hash;
}

export const voteForGaugeEstimateGas = async (gauge: string, power: number | string): Promise<number | number[]> => {
    return await _voteForGauge(gauge, power, true) as number | number[];
}

export const voteForGauge = async (gauge: string, power: number | string): Promise<number | number[]> => {
    return await _voteForGauge(gauge, power, false) as number | number[];
}
