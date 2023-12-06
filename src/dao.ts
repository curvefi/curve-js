import { _getAllGauges } from './external-api.js';
import { _getAddress } from './utils.js';
import { IGaugeUserVote, IVotingGauge } from './interfaces';
import { curve } from "./curve.js";


const _extractNetworkFromPoolUrl = (poolUrl: string): string => {
    if (!poolUrl) return "unknown";
    return poolUrl.split("/")[4]
}

export const userVotes = async (address = ""): Promise<{ gauges: IGaugeUserVote[], powerUsed: string, veCrvUsed: string } > => {
    if (curve.chainId !== 1) throw Error("Ethereum-only method")
    address = _getAddress(address);
    const multicallContract = curve.contracts[curve.constants.ALIASES.gauge_controller].multicallContract;

    const gaugeData = Object.values(await _getAllGauges());
    const calls: any[] = [];
    for (const d of gaugeData) {
        calls.push(multicallContract.vote_user_slopes(address, d.gauge));
    }
    const votes: bigint[][] = await curve.multicallProvider.all(calls);

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

