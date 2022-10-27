import { ethers, Contract} from "ethers";
import { curve } from "../curve";
import { parseUnits } from "../utils";
import CurveLpTokenV5ABI from "../constants/abis/curve_lp_token_v5.json";


// ------- STABLE PLAIN POOLS -------


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
    const _fee = parseUnits(fee, 8);
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

export const getDeployedStablePlainPoolAddress = async (tx: ethers.ContractTransaction): Promise<string> => {
    const txInfo = await tx.wait();
    return txInfo.logs[0].address.toLowerCase();
}

// ------- STABLE META POOLS -------

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
    const _fee = parseUnits(fee, 8);

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

export const getDeployedStableMetaPoolAddress = async (tx: ethers.ContractTransaction): Promise<string> => {
    const txInfo = await tx.wait();
    return txInfo.logs[txInfo.logs.length - 3].address.toLowerCase();
}


// ------- CRYPTO POOLS -------


const _deployCryptoPool = async (
    name: string,
    symbol: string,
    coins: string[],
    A: number,
    gamma: number,
    midFee: number, // %
    outFee: number, // %
    allowedExtraProfit: number,
    feeGamma: number,
    adjustmentStep: number,
    maHalfTime: number, // Seconds
    initialPrice: number,
    estimateGas: boolean
): Promise<ethers.ContractTransaction | number> => {
    if (name.length > 32) throw Error("Max name length = 32");
    if (symbol.length > 10) throw Error("Max symbol length = 10");
    if (coins.length !== 2) throw Error("Invalid number of coins. Must be 2");
    if (coins[1] === coins[2]) throw Error("Coins must be different");
    if (A < 4000) throw Error("A must be >= 4000");
    if (A > 4 * (10 ** 9)) throw Error("A must be <= 4 * 10 ** 9");
    if (gamma < 1e-8) throw Error("gamma must be >= 1e-8");
    if (gamma > 0.02) throw Error("gamma must be <= 0.02");
    if (midFee < 0.005) throw Error("midFee must be >= 0.005");
    if (midFee > 100) throw Error("midFee must be <= 100");
    if (outFee < midFee) throw Error("outFee must be >= midFee");
    if (outFee > 100) throw Error("outFee must be <= 100");
    if (allowedExtraProfit < 0) throw Error("allowedExtraProfit must be >= 0");
    if (allowedExtraProfit > 0.01) throw Error("allowedExtraProfit must be <= 0.01");
    if (feeGamma < 0) throw Error("feeGamma must be >= 0");
    if (feeGamma > 1) throw Error("feeGamma must be <= 1");
    if (adjustmentStep < 0) throw Error("adjustmentStep must be >= 0");
    if (adjustmentStep > 1) throw Error("adjustmentStep must be <= 1");
    if (maHalfTime < 0) throw Error("daoFee must be >= 0");
    if (maHalfTime > 604800) throw Error("daoFee must be <= 604800");
    if (initialPrice < 1e-12) throw Error("initialPrice must be >= 1e-12");
    if (initialPrice > 1e12) throw Error("initialPrice must be <= 1e12");

    const _gamma = parseUnits(gamma);
    const _midFee = parseUnits(midFee, 8);
    const _outFee = parseUnits(outFee, 8);
    const _allowedExtraProfit = parseUnits(allowedExtraProfit);
    const _feeGamma = parseUnits(feeGamma);
    const _adjustmentStep = parseUnits(adjustmentStep);
    const _initialPrice = parseUnits(initialPrice);
    const contract = curve.contracts[curve.constants.ALIASES.crypto_factory].contract;

    const gas = await contract.estimateGas.deploy_pool(
        name,
        symbol,
        coins,
        A,
        _gamma,
        _midFee,
        _outFee,
        _allowedExtraProfit,
        _feeGamma,
        _adjustmentStep,
        5000000000,
        maHalfTime,
        _initialPrice,
        curve.constantOptions
    );
    if (estimateGas) return gas.toNumber();

    const gasLimit = gas.mul(130).div(100);
    await curve.updateFeeData();
    return await contract.deploy_pool(
        name,
        symbol,
        coins,
        A,
        _gamma,
        _midFee,
        _outFee,
        _allowedExtraProfit,
        _feeGamma,
        _adjustmentStep,
        5000000000, // 50%
        maHalfTime,
        _initialPrice,
        { ...curve.options, gasLimit }
    );
}

export const deployCryptoPoolEstimateGas = async (
    name: string,
    symbol: string,
    coins: string[],
    A: number,
    gamma: number,
    midFee: number, // %
    outFee: number, // %
    allowedExtraProfit: number,
    feeGamma: number,
    adjustmentStep: number,
    maHalfTime: number, // Seconds
    initialPrice: number
): Promise<number> => {
    return await _deployCryptoPool(
        name,
        symbol,
        coins,
        A,
        gamma,
        midFee,
        outFee,
        allowedExtraProfit,
        feeGamma,
        adjustmentStep,
        maHalfTime,
        initialPrice,
        true
    ) as number
}

export const deployCryptoPool = async (
    name: string,
    symbol: string,
    coins: string[],
    A: number,
    gamma: number,
    midFee: number, // %
    outFee: number, // %
    allowedExtraProfit: number,
    feeGamma: number,
    adjustmentStep: number,
    maHalfTime: number, // Seconds
    initialPrice: number
): Promise<ethers.ContractTransaction> => {
    return await _deployCryptoPool(
        name,
        symbol,
        coins,
        A,
        gamma,
        midFee,
        outFee,
        allowedExtraProfit,
        feeGamma,
        adjustmentStep,
        maHalfTime,
        initialPrice,
        false
    ) as ethers.ContractTransaction
}

export const getDeployedCryptoPoolAddress = async (tx: ethers.ContractTransaction): Promise<string> => {
    const txInfo = await tx.wait();
    const lpTokenAddress = txInfo.logs[0].address;
    const contract = new Contract(lpTokenAddress, CurveLpTokenV5ABI, curve.provider)
    return (await contract.minter(curve.constantOptions) as string).toLowerCase();
}


// ------- GAUGE -------

const _deployGauge = async (pool: string, isCrypto: boolean, estimateGas: boolean): Promise<ethers.ContractTransaction | number> => {
    const contractAddress = isCrypto ? curve.constants.ALIASES.crypto_factory : curve.constants.ALIASES.factory;
    const contract = curve.contracts[contractAddress].contract;
    const gas = await contract.estimateGas.deploy_gauge(pool, curve.constantOptions);
    if (estimateGas) return gas.toNumber();

    const gasLimit = gas.mul(130).div(100);
    await curve.updateFeeData();
    return await contract.deploy_gauge(pool, { ...curve.options, gasLimit });
}

export const deployGaugeEstimateGas = async (pool: string, isCrypto: boolean): Promise<number> => await _deployGauge(pool, isCrypto, true) as number;

export const deployGauge = async (pool: string, isCrypto: boolean): Promise<ethers.ContractTransaction> => await _deployGauge(pool, isCrypto, false) as ethers.ContractTransaction;

export const getDeployedGaugeAddress = async (tx: ethers.ContractTransaction): Promise<string> => {
    const txInfo: ethers.ContractReceipt = await tx.wait();
    // @ts-ignore
    return txInfo.events[0].args[txInfo.events[0].args.length - 1].toLowerCase();
}
