import { ethers } from "ethers";
import { Provider as MulticallProvider} from 'ethers-multicall';


class Curve {
    provider: ethers.providers.JsonRpcProvider;
    multicallProvider: MulticallProvider;
    signer: ethers.providers.JsonRpcSigner;

    constructor() {
        this.provider = new ethers.providers.JsonRpcProvider('http://localhost:8545/');
        this.signer = this.provider.getSigner();
        this.multicallProvider = new MulticallProvider(this.provider);
    }

    async init(): Promise<void> {
        await this.multicallProvider.init();
    }
}

export const curve = new Curve();

Object.freeze(curve);
Object.preventExtensions(curve);
