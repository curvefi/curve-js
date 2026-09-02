import {IChainId} from "../interfaces";

export interface IVolumeNetworks {
    getVolumes: IChainId[];
}

export const volumeNetworks: IVolumeNetworks = {
    getVolumes: [1,10,56,100,137,252,999,8453,42161],
}