import {IChainId} from "../interfaces";

export interface IVolumeNetworks {
    getVolumes: IChainId[];
    getSubgraphData: IChainId[];
    getFactoryAPYs: IChainId[];
}

export const volumeNetworks: IVolumeNetworks = {
    getVolumes: [1,137,8453, 42161],
    getSubgraphData: [10,100,250,1284,42220,43114,1313161554],
    getFactoryAPYs: [56,196,252,324,2222],
}