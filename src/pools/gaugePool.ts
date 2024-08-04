import {IDict} from '../interfaces';
import {curve} from "../curve.js";
import {DIGas, ensureAllowance, ensureAllowanceEstimateGas, hasAllowance, mulBy1_3, smartNumber} from "../utils.js";

export interface IGaugePool {
    address: string;
    poolName: string;
    gaugeManager(): Promise<string>;
    gaugeDistributors(): Promise<IDict<string>>;
    gaugeVersion(): Promise<string | null>;
    /* DEPOSIT REWARD */
    addReward(rewardToken: string, distributor: string): Promise<string>,
    isDepositRewardAvailable(): Promise<boolean>;
    depositRewardIsApproved(rewardToken: string, amount: number | string): Promise<boolean>
    depositReward(rewardToken: string, amount: string | number, epoch: number): Promise<string>
    depositRewardApprove(rewardToken: string, amount: number | string): Promise<string[]>

    estimateGas: {
        addReward(rewardToken: string, distributor: string): Promise<number | number[]>,
        depositReward(rewardToken: string, amount: string | number, epoch: number): Promise<number | number[]>,
        depositRewardApprove(rewardToken: string, amount: number | string): Promise<number | number[]>,
    };
}

export class GaugePool implements IGaugePool {
    address: string;
    poolName: string;
    estimateGas;

    constructor(address: string, poolName: string) {
        this.address = address;
        this.poolName = poolName;
        this.estimateGas = {
            addReward: this.addRewardEstimateGas.bind(this),
            depositRewardApprove: this.depositRewardApproveEstimateGas.bind(this),
            depositReward: this.depositRewardEstimateGas.bind(this),
        }
    }


    public async gaugeManager(): Promise<string> {
        if(!this.address || this.address === curve.constants.ZERO_ADDRESS) {
            return curve.constants.ZERO_ADDRESS;
        } else {
            try {
                return await curve.contracts[this.address].contract.manager();
            } catch (e) {
                return curve.constants.ZERO_ADDRESS;
            }
        }
    }

    public async gaugeDistributors(): Promise<IDict<string>> {
        const gaugeContract = await curve.contracts[this.address].contract;
        const gaugeMulticallContract = await curve.contracts[this.address].multicallContract;

        const rewardCount = Number(curve.formatUnits(await gaugeContract.reward_count(curve.constantOptions), 0));

        let calls = [];
        for (let i = 0; i < rewardCount; i++) {
            calls.push(gaugeMulticallContract.reward_tokens(i));
        }

        const rewardTokens = await curve.multicallProvider.all(calls) as string[]

        calls = [];

        for (let i = 0; i < rewardCount; i++) {
            calls.push(gaugeMulticallContract.reward_data(rewardTokens[i]));
        }

        const rewardData: Array<{distributor: string}> = await curve.multicallProvider.all(calls)

        const gaugeDistributors: IDict<string> = {};
        for (let i = 0; i < rewardCount; i++) {
            gaugeDistributors[rewardTokens[i]] = <string>rewardData[i].distributor;
        }

        return gaugeDistributors;
    }

    public async gaugeVersion(): Promise<string | null> {
        if(!this.address || this.address === curve.constants.ZERO_ADDRESS) {
            return null;
        } else {
            try {
                return await curve.contracts[this.address].contract.version();
            } catch (e) {
                return null;
            }
        }
    }

    private async _addReward(_reward_token: string, _distributor: string, estimateGas = false): Promise<string | number | number[]> {
        if(this.address !== curve.constants.ZERO_ADDRESS && this.address) {
            const gas = await curve.contracts[this.address].contract.add_reward.estimateGas(_reward_token, _distributor, { ...curve.constantOptions });
            if (estimateGas) return smartNumber(gas);

            const gasLimit = mulBy1_3(DIGas(gas));

            return (await curve.contracts[this.address].contract.add_reward(_reward_token, _distributor, { ...curve.options, gasLimit })).hash;
        }

        throw Error(`Pool ${this.poolName} does not have gauge`)
    }

    private async addRewardEstimateGas(rewardToken: string, distributor: string): Promise<number | number[]> {
        // @ts-ignore
        return await this._addReward(rewardToken, distributor, true);
    }

    public async addReward(rewardToken: string, distributor: string): Promise<string> {
        // @ts-ignore
        return await this._addReward(rewardToken, distributor);
    }

    public async isDepositRewardAvailable(): Promise<boolean> {
        const versionsWithDepositReward = ['v6.1.0']
        const version = await this.gaugeVersion()

        return version ? versionsWithDepositReward.includes(version) : Boolean(version);
    }

    public async depositRewardIsApproved(rewardToken: string, amount: number | string): Promise<boolean> {
        return await hasAllowance([rewardToken], [amount], curve.signerAddress, this.address);
    }

    private async depositRewardApproveEstimateGas(rewardToken: string, amount: number | string): Promise<number | number[]> {
        return await ensureAllowanceEstimateGas([rewardToken], [amount], this.address);
    }

    public async depositRewardApprove(rewardToken: string, amount: number | string): Promise<string[]> {
        return await ensureAllowance([rewardToken], [amount], this.address);
    }

    private async _depositReward(rewardToken: string, amount: string | number, epoch: number, estimateGas = false): Promise<string | number | number[]> {
        if (!estimateGas) await ensureAllowance([rewardToken], [amount], this.address);

        const contract = curve.contracts[this.address].contract;

        const gas = await contract.deposit_reward_token.estimateGas(rewardToken,amount, epoch, { ...curve.constantOptions });
        if (estimateGas) return smartNumber(gas);

        const gasLimit = mulBy1_3(DIGas(gas));
        return (await contract.deposit_reward_token(rewardToken, amount, epoch, { ...curve.options, gasLimit})).hash;
    }

    async depositRewardEstimateGas(rewardToken: string, amount: string | number, epoch: number): Promise<number | number[]> {

        // @ts-ignore
        return await this._depositReward(rewardToken, amount, epoch, true);
    }

    public async depositReward(rewardToken: string, amount: string | number, epoch: number): Promise<string> {

        // @ts-ignore
        return await this._depositReward(rewardToken, amount, epoch);
    }
}

