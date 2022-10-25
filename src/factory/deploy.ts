import { curve } from "../curve";
import { parseUnits } from "../utils";
import {ethers} from "ethers";

// ------- STABLE POOLS -------

const _deployStablePlainPool = async (
    name: string,
    symbol: string,
    coins: string[],
    A: number,
    fee: number, // %
    assetType: 0 | 1 | 2 | 3,
    implementationIdx: 0 | 1 | 2 | 3,
    estimateGas: boolean
): Promise<ethers.ContractTransaction | number> => {
    if (name.length > 32) throw Error("Max name length = 32");
    if (symbol.length > 10) throw Error("Max symbol length = 10");
    if (![2, 3, 4].includes(coins.length)) throw Error("Invalid number of coins. Must be 2, 3 or 4");
    if (fee < 0.04) throw Error("Fee must be >= 0.04%");
    if (fee > 1) throw Error("Fee must be <= 1%");
    if (![0, 1, 2, 3].includes(assetType)) throw Error("Invalid assetType. Must be one of: 0 = USD, 1 = ETH, 2 = BTC, 3 = Other");
    if (![0, 1, 2, 3].includes(implementationIdx)) throw Error("Invalid implementationIdx. Must be one 0, 1, 2 or 3");

    const _A = parseUnits(A, 0);
    const _fee = parseUnits(0.04, 8);
    const _coins = coins.concat(Array(4 - coins.length).fill(ethers.constants.AddressZero));
    const contract = curve.contracts[curve.constants.ALIASES.factory].contract;

    const gas = await contract.estimateGas.deploy_plain_pool(name, symbol, _coins, _A, _fee, assetType, implementationIdx, curve.constantOptions);
    if (estimateGas) return gas.toNumber();

    const gasLimit = gas.mul(130).div(100);
    await curve.updateFeeData();
    return await contract.deploy_plain_pool(name, symbol, _coins, _A, _fee, assetType, implementationIdx, { ...curve.options, gasLimit });
}

export const deployStablePlainPoolEstimateGas = async (
    name: string,
    symbol: string,
    coins: string[],
    A: number,
    fee: number, // %
    assetType: 0 | 1 | 2 | 3,
    implementationIdx: 0 | 1 | 2 | 3
): Promise<number> => {
    return await _deployStablePlainPool(name, symbol, coins, A, fee, assetType, implementationIdx, true) as number;
}

export const deployStablePlainPool = async (
    name: string,
    symbol: string,
    coins: string[],
    A: number,
    fee: number, // %
    assetType: 0 | 1 | 2 | 3,
    implementationIdx: 0 | 1 | 2 | 3
): Promise<ethers.ContractTransaction> => {
    return await _deployStablePlainPool(name, symbol, coins, A, fee, assetType, implementationIdx, false) as ethers.ContractTransaction;
}

const _deployStableMetaPool = async (
    basePool: string,
    name: string,
    symbol: string,
    coin: string,
    A: number,
    fee: number, // %
    implementationIdx: 0 | 1,
    estimateGas: boolean
): Promise<ethers.ContractTransaction | number> => {
    if (name.length > 32) throw Error("Max name length = 32");
    if (symbol.length > 10) throw Error("Max symbol length = 10");
    if (fee < 0.04) throw Error("Fee must be >= 0.04%");
    if (fee > 1) throw Error("Fee must be <= 1%");
    if (![0, 1].includes(implementationIdx)) throw Error("Invalid implementationIdx. Must be one 0 or 1");

    const _A = parseUnits(A, 0);
    const _fee = parseUnits(0.04, 8);

    const contract = curve.contracts[curve.constants.ALIASES.factory].contract;
    const gas = await contract.estimateGas.deploy_metapool(basePool, name, symbol, coin, _A, _fee, implementationIdx, curve.constantOptions);
    if (estimateGas) return gas.toNumber();

    const gasLimit = gas.mul(130).div(100);
    await curve.updateFeeData();
    return await contract.deploy_metapool(basePool, name, symbol, coin, _A, _fee, implementationIdx, { ...curve.options, gasLimit });
}

export const deployStableMetaPoolEstimateGas = async (
    basePool: string,
    name: string,
    symbol: string,
    coin: string,
    A: number,
    fee: number, // %
    implementationIdx: 0 | 1
): Promise<number> => {
    return await _deployStableMetaPool(basePool, name, symbol, coin, A, fee, implementationIdx, true) as number;
}

export const deployStableMetaPool = async (
    basePool: string,
    name: string,
    symbol: string,
    coin: string,
    A: number,
    fee: number, // %
    implementationIdx: 0 | 1
): Promise<ethers.ContractTransaction> => {
    return await _deployStableMetaPool(basePool, name, symbol, coin, A, fee, implementationIdx, false) as ethers.ContractTransaction;
}

const _deployStableGauge = async (pool: string, estimateGas: boolean): Promise<ethers.ContractTransaction | number> => {
    const contract = curve.contracts[curve.constants.ALIASES.factory].contract;
    const gas = await contract.estimateGas.deploy_gauge(pool, curve.constantOptions);
    if (estimateGas) return gas.toNumber();

    const gasLimit = gas.mul(130).div(100);
    await curve.updateFeeData();
    return await contract.deploy_gauge(pool, { ...curve.options, gasLimit });
}

export const deployStableGaugeEstimateGas = async (pool: string): Promise<number> => await _deployStableGauge(pool, true) as number;

export const deployStableGauge = async (pool: string): Promise<ethers.ContractTransaction> => await _deployStableGauge(pool, false) as ethers.ContractTransaction;


// ------- CRYPTO POOLS -------
