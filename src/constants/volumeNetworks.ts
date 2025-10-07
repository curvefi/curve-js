import {IChainId} from "../interfaces";

export interface IVolumeNetworks {
    getVolumes: IChainId[];
    getSubgraphData: IChainId[];
    getFactoryAPYs: IChainId[];
}

export const volumeNetworks: IVolumeNetworks = {
    getVolumes: [1,10,56,100,137,250,252,999,8453,42161,146],
    getSubgraphData: [43114],
    getFactoryAPYs: [196,324,1284,2222,5000,42220,1313161554],
}