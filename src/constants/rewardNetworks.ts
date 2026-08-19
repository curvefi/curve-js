import {IChainId} from "../interfaces";

export interface IRewardNetworks {
    tokenApyLiteChainExceptions: IChainId[];
    tokenApyDisabledChains: IChainId[];
}

export const rewardNetworks: IRewardNetworks = {
    tokenApyLiteChainExceptions: [146, 167000, 42793], // Sonic, Taiko, Etherlink
    tokenApyDisabledChains: [1313161554], // Aurora
};
