import { ethers } from "ethers";
import { type Curve } from "./curve.js";
import {
    ensureAllowance,
    ensureAllowanceEstimateGas,
    hasAllowance,
    parseUnits,
    DIGas,
    smartNumber,
} from "./utils.js";
import { NETWORK_CONSTANTS } from "./constants/network_constants.js";

const CRVUSD_DECIMALS = 18;

const _bridgeCostCache: { [key: string]: bigint } = {};

export interface IFastBridgeNetwork {
    chainId: number;
    name: string;
    fastBridgeAddress: string;
    crvUsdAddress: string;
}

async function _allowedToBridge(this: Curve): Promise<{ _min: bigint, _max: bigint }> {
    if (!this.constants.ALIASES.fast_bridge) {
        throw new Error("FastBridge is not available on this network");
    }

    const contract = this.contracts[this.constants.ALIASES.fast_bridge].contract;
    const result = await contract.allowed_to_bridge(this.constantOptions);
    
    return {
        _min: result[0],
        _max: result[1],
    };
}

export async function allowedToBridge(this: Curve): Promise<{ min: number, max: number }> {
    const { _min, _max } = await _allowedToBridge.call(this);

    return {
        min: Number(this.formatUnits(_min, CRVUSD_DECIMALS)),
        max: Number(this.formatUnits(_max, CRVUSD_DECIMALS)),
    };
}

async function _bridgeCost(this: Curve): Promise<bigint> {
    if (!this.constants.ALIASES.fast_bridge) {
        throw new Error("FastBridge is not available on this network");
    }

    const contract = this.contracts[this.constants.ALIASES.fast_bridge].contract;
    return await contract.cost(this.constantOptions);
}

export async function bridgeCost(this: Curve): Promise<number> {
    const _cost = await _bridgeCost.call(this);

    const key = `${this.chainId}`;
    _bridgeCostCache[key] = _cost;
    return Number(this.formatUnits(_cost, 18));
}

export async function bridgeIsApproved(this: Curve, amount: number | string): Promise<boolean> {
    const crvUsdAddress = this.constants.ALIASES.crvusd;
    if (!crvUsdAddress) {
        throw new Error("crvUSD is not available on this network");
    }

    return await hasAllowance.call(this, [crvUsdAddress], [amount], this.signerAddress, this.constants.ALIASES.fast_bridge);
}

export async function bridgeApproveEstimateGas(this: Curve, amount: number | string): Promise<number | number[]> {
    const crvUsdAddress = this.constants.ALIASES.crvusd;
    if (!crvUsdAddress) {
        throw new Error("crvUSD is not available on this network");
    }

    return await ensureAllowanceEstimateGas.call(this, [crvUsdAddress], [amount], this.constants.ALIASES.fast_bridge);
}

export async function bridgeApprove(this: Curve, amount: number | string): Promise<string[]> {
    const crvUsdAddress = this.constants.ALIASES.crvusd;
    if (!crvUsdAddress) {
        throw new Error("crvUSD is not available on this network");
    }

    return await ensureAllowance.call(this, [crvUsdAddress], [amount], this.constants.ALIASES.fast_bridge);
}

async function _bridge(this: Curve, amount: number | string, address?: string, estimateGas = false): Promise<string | number | number[] | ethers.ContractTransactionResponse> {
    if (!this.constants.ALIASES.fast_bridge) {
        throw new Error("FastBridge is not available on this network");
    }

    const crvUsdAddress = this.constants.ALIASES.crvusd;
    if (!crvUsdAddress) {
        throw new Error("crvUSD is not available on this network");
    }

    const _amount = parseUnits(amount, CRVUSD_DECIMALS);

    const { _min, _max } = await _allowedToBridge.call(this);
    if (_amount < _min || _amount > _max) {
        throw new Error(`Amount must be between ${this.formatUnits(_min, CRVUSD_DECIMALS)} and ${this.formatUnits(_max, CRVUSD_DECIMALS)}`);
    }

    const key = `${this.chainId}`;
    const _cost = _bridgeCostCache[key];
    if (_cost === undefined) {
        throw new Error("You must call bridgeCost() first to get the bridge cost");
    }

    const to = address || this.signerAddress;
    const contract = this.contracts[this.constants.ALIASES.fast_bridge].contract;

    if (!estimateGas) await bridgeApprove.call(this, amount);

    const gas = await contract.bridge.estimateGas(
        crvUsdAddress,
        to,
        _amount,
        _amount,
        { ...this.constantOptions, value: _cost }
    );

    if (estimateGas) return smartNumber(gas);

    await this.updateFeeData();
    const gasLimit = DIGas(gas) * this.parseUnits("160", 0) / this.parseUnits("100", 0);

    return await contract.bridge(
        crvUsdAddress,
        to,
        _amount,
        _amount,
        { ...this.options, value: _cost, gasLimit }
    );
}

export async function bridgeEstimateGas(this: Curve, amount: number | string, address?: string): Promise<number | number[]> {
    return await _bridge.call(this, amount, address, true) as number | number[];
}

export async function bridge(this: Curve, amount: number | string, address?: string): Promise<ethers.ContractTransactionResponse> {
    return await _bridge.call(this, amount, address, false) as ethers.ContractTransactionResponse;
}

export function getSupportedNetworks(): IFastBridgeNetwork[] {
    const networks: IFastBridgeNetwork[] = [];
    
    for (const [chainIdStr, config] of Object.entries(NETWORK_CONSTANTS)) {
        const chainId = Number(chainIdStr);
        if (config.ALIASES?.fast_bridge && config.ALIASES?.crvusd) {
            networks.push({
                chainId,
                name: config.NAME,
                fastBridgeAddress: config.ALIASES.fast_bridge,
                crvUsdAddress: config.ALIASES.crvusd,
            });
        }
    }
    
    return networks;
}
