import {IChainId} from "../interfaces";

export interface IRewardNetworks {
    tokenApyLiteChainExceptions: IChainId[];
    tokenApyDisabledChains: IChainId[];
}

export const rewardNetworks: IRewardNetworks = {
    tokenApyLiteChainExceptions: [146, 167000], // Sonic, Taiko
    tokenApyDisabledChains: [1313161554], // Aurora
}
