import {Contract, ethers, EventLog, Typed} from "ethers";
import {Curve} from "../curve.js";
import {NETWORK_CONSTANTS} from "../constants/network_constants.js";
import {getPool} from "../pools/index.js";
import {BN, DIGas, getPoolIdBySwapAddress, mulBy1_3, parseUnits, smartNumber} from '../utils.js';
import CurveLpTokenV5ABI from "../constants/abis/curve_lp_token_v5.json" with {type: "json"};
import Plain2ETHOracleABIABI from "../constants/abis/factory-v2/Plain2ETHOracle.json" with {type: "json"};
import {TwoCryptoImplementation} from "../constants/twoCryptoImplementations.js";

// ------- STABLE PLAIN POOLS -------


async function _deployStablePlainPool(
    this: Curve,
    name: string,
    symbol: string,
    coins: string[],
    A: number | string,
    fee: number | string, // %
    assetType: 0 | 1 | 2 | 3, // 0 = USD, 1 = ETH, 2 = BTC, 3 = Other
    implementationIdx: 0 | 1 | 2 | 3 | 4 | 5,
    emaTime: number, // seconds
    oracleAddress: string,
    methodName: string,
    estimateGas: boolean
): Promise<ethers.ContractTransactionResponse | number | number[]> {
    if (name.length > 32) throw Error("Max name length = 32");
    if (symbol.length > 10) throw Error("Max symbol length = 10");
    if (![2, 3, 4].includes(coins.length)) throw Error("Invalid number of coins. Must be 2, 3 or 4");
    if (BN(fee).lt(0.04)) throw Error(`fee must be >= 0.04%. Passed fee = ${fee}`);
    if (BN(fee).gt(1)) throw Error(`fee must be <= 1%. Passed fee = ${fee}`);
    if (![0, 1, 2, 3].includes(assetType)) throw Error("Invalid assetType. Must be one of: 0 = USD, 1 = ETH, 2 = BTC, 3 = Other");
    if (this.chainId !== 1 || coins.length > 2) {
        if (![0, 1, 2, 3].includes(implementationIdx)) throw Error("Invalid implementationIdx. Must be one 0, 1, 2 or 3");
    } else {
        if (![0, 1, 2, 3, 4, 5].includes(implementationIdx)) throw Error("Invalid implementationIdx. Must be one 0, 1, 2, 3, 4 or 5");
    }
    if (emaTime <= 0) throw Error(`emaTime must be > 0. Passed emaTime = ${emaTime}`);

    const _A = parseUnits(A, 0);
    const _fee = parseUnits(fee, 8);
    const _coins = coins.concat(Array(4 - coins.length).fill(this.constants.ZERO_ADDRESS));

    const useProxy = (this.chainId === 1 && coins.length === 2 && implementationIdx === 4 && emaTime !== 600) ||
        (this.chainId === 1 && coins.length === 2 && implementationIdx === 5 && emaTime !== 600) ||
        ((this.chainId === 42161 || this.chainId == 10) && coins.length === 2 && implementationIdx === 0 && emaTime !== 600);
    const setOracle = ((this.chainId === 42161 || this.chainId == 10) && coins.length === 2 && implementationIdx === 2);

    const contractAddress = (useProxy || setOracle) ? this.constants.ALIASES.factory_admin : this.constants.ALIASES.factory;
    const contract = this.contracts[contractAddress].contract;
    const args = [name, symbol, _coins, _A, _fee, assetType, implementationIdx];
    if (useProxy || setOracle) args.push(parseUnits(Math.floor(emaTime / Math.log(2)), 0));
    if (setOracle) {
        const methodId = methodName === "0x00000000" ? "0x00000000" : ethers.id(methodName).substring(0, 10);
        args.push(methodId, oracleAddress);
    }
    const methodToCall = setOracle ? "deploy_plain_pool_and_set_oracle" : "deploy_plain_pool";
    const gas = await contract[methodToCall].estimateGas(...args, this.constantOptions);
    if (estimateGas) return smartNumber(gas);

    const gasLimit = mulBy1_3(DIGas(gas));
    await this.updateFeeData();
    return await contract[methodToCall](...args, {...this.options, gasLimit});
}

export async function deployStablePlainPoolEstimateGas(
    this: Curve,
    name: string,
    symbol: string,
    coins: string[],
    A: number | string,
    fee: number | string, // %
    assetType: 0 | 1 | 2 | 3, // 0 = USD, 1 = ETH, 2 = BTC, 3 = Other
    implementationIdx: 0 | 1 | 2 | 3 | 4 | 5,
    emaTime = 600, // seconds
    oracleAddress = this.constants.ZERO_ADDRESS,
    methodName = "0x00000000"
): Promise<number> {
    return await _deployStablePlainPool.call(this, name, symbol, coins, A, fee, assetType, implementationIdx, emaTime, oracleAddress, methodName, true) as number;
}

export async function deployStablePlainPool(
    this: Curve,
    name: string,
    symbol: string,
    coins: string[],
    A: number | string,
    fee: number | string, // %
    assetType: 0 | 1 | 2 | 3, // 0 = USD, 1 = ETH, 2 = BTC, 3 = Other
    implementationIdx: 0 | 1 | 2 | 3 | 4 | 5,
    emaTime = 600, // seconds
    oracleAddress = this.constants.ZERO_ADDRESS,
    methodName = "0x00000000"
): Promise<ethers.ContractTransactionResponse> {
    return await _deployStablePlainPool.call(this, name, symbol, coins, A, fee, assetType, implementationIdx, emaTime, oracleAddress, methodName, false) as ethers.ContractTransactionResponse;
}

async function _deployStableNgPlainPool(
    this: Curve,
    name: string,
    symbol: string,
    coins: string[],
    A: number | string,
    fee: number | string, // %
    offpegFeeMultiplier: number | string,
    assetTypes: Array<0 | 1 | 2 | 3>, // 0 = Standard, 1 = Oracle, 2 = Rebasing, 3 = ERC4626
    implementationIdx: 0,
    emaTime = 866, // seconds
    oracleAddresses: string[],
    methodNames: string[],
    estimateGas: boolean
): Promise<ethers.ContractTransactionResponse | number | number[]> {
    if (name.length > 32) throw Error("Max name length = 32");
    if (symbol.length > 10) throw Error("Max symbol length = 10");
    if (coins.length < 1) throw Error("Invalid number of coins. Must be more than 1");
    if (coins.length > 9) throw Error("Invalid number of coins. Must be less than 9");
    if (BN(fee).gt(1)) throw Error(`fee must be <= 1%. Passed fee = ${fee}`);

    let _oracleAddresses: string[];
    if (oracleAddresses.length === 0) {
        _oracleAddresses = new Array(coins.length).fill(this.constants.ZERO_ADDRESS);
    } else {
        _oracleAddresses = oracleAddresses;
    }

    let _methodNames: string[];
    if (methodNames.length === 0) {
        _methodNames = new Array(coins.length).fill("0x00000000");
    } else {
        _methodNames = methodNames;
    }

    if (coins.length !== assetTypes.length) throw Error("Invalid length of assetTypes. Must be same coins length");
    if (coins.length !== _oracleAddresses.length) throw Error("Invalid length of oracleAddresses. Must be same coins length");
    if (coins.length !== _methodNames.length) throw Error("Invalid length of methodNames. Must be same coins length");
    assetTypes.forEach((item, index) => {
        if (![0, 1, 2, 3].includes(item)) throw Error(`Invalid assetType. Must be one of: 0 = Standard, 1 = Oracle, 2 = Rebasing, 3 = ERC4626 for assetTypes[${index}]`);
    })
    if (![0].includes(implementationIdx)) throw Error("Invalid implementationIdx. Must be 0");
    if (emaTime <= 0) throw Error(`emaTime must be > 0. Passed emaTime = ${emaTime}`);

    const _A = parseUnits(A, 0);
    const _fee = parseUnits(fee, 8);
    const _offpegFeeMultiplier = parseUnits(offpegFeeMultiplier, 10);
    const _coins = coins;

    const contractAddress = this.constants.ALIASES.stable_ng_factory;
    const contract = this.contracts[contractAddress].contract;

    const methodIds: string[] = [];

    _methodNames.forEach((item) => {
        if (item === '0x00000000' || item === '') {
            methodIds.push('0x00000000')
        } else {
            methodIds.push(ethers.id(item).substring(0, 10))
        }
    })

    const args = [name, symbol, _coins, _A, _fee, _offpegFeeMultiplier, emaTime, implementationIdx, assetTypes, methodIds, _oracleAddresses];
    const gas = await contract.deploy_plain_pool.estimateGas(...args, this.constantOptions);
    if (estimateGas) return smartNumber(gas);

    const gasLimit = mulBy1_3(DIGas(gas));
    await this.updateFeeData();
    return await contract.deploy_plain_pool(...args, {...this.options, gasLimit});
}

export async function deployStableNgPlainPoolEstimateGas(
    this: Curve,
    name: string,
    symbol: string,
    coins: string[],
    A: number | string,
    fee: number | string, // %
    offpegFeeMultiplier: number | string,
    assetTypes: Array<0 | 1 | 2 | 3>, // 0 = Standard, 1 = Oracle, 2 = Rebasing, 3 = ERC4626
    implementationIdx: 0,
    emaTime: number, // seconds
    oracleAddresses: string[],
    methodNames: string[]
): Promise<number> {
    return await _deployStableNgPlainPool.call(this, name, symbol, coins, A, fee, offpegFeeMultiplier, assetTypes, implementationIdx, emaTime, oracleAddresses, methodNames, true) as number;
}

export async function deployStableNgPlainPool(
    this: Curve,
    name: string,
    symbol: string,
    coins: string[],
    A: number | string,
    fee: number | string, // %
    offpegFeeMultiplier: number | string,
    assetTypes: Array<0 | 1 | 2 | 3>, // 0 = Standard, 1 = Oracle, 2 = Rebasing, 3 = ERC4626
    implementationIdx: 0,
    emaTime: number, // seconds
    oracleAddresses: string[],
    methodNames: string[]
): Promise<ethers.ContractTransactionResponse> {
    return await _deployStableNgPlainPool.call(this, name, symbol, coins, A, fee, offpegFeeMultiplier, assetTypes, implementationIdx, emaTime, oracleAddresses, methodNames, false) as ethers.ContractTransactionResponse;
}


export async function getDeployedStablePlainPoolAddress(this: Curve, tx: ethers.ContractTransactionResponse): Promise<string> {
    const txInfo = await tx.wait();
    if (!txInfo) throw Error("Can't get tx info");
    return txInfo.logs[0].address.toLowerCase();
}

export async function _setOracle(this: Curve, poolAddress: string, oracleAddress: string, methodName: string, estimateGas: boolean): Promise<ethers.ContractTransactionResponse | number> {
    this.setContract(poolAddress, Plain2ETHOracleABIABI);
    const poolContract = this.contracts[poolAddress].contract;
    const methodId = methodName === "0x00000000" ? "0x00000000" : ethers.id(methodName).substring(0, 10);
    const _gas = await poolContract.set_oracle.estimateGas(methodId, oracleAddress, this.constantOptions);
    if (estimateGas) return Number(_gas);

    const gasLimit = mulBy1_3(_gas);
    await this.updateFeeData();
    return await poolContract.set_oracle(methodId, oracleAddress, {...this.options, gasLimit});
}

export async function setOracleEstimateGas(this: Curve, poolAddress: string, oracleAddress = this.constants.ZERO_ADDRESS, methodName = "0x00000000"): Promise<number> {
    return await _setOracle.call(this, poolAddress, oracleAddress, methodName, true) as number;
}

export async function setOracle(this: Curve, poolAddress: string, oracleAddress = this.constants.ZERO_ADDRESS, methodName = "0x00000000"): Promise<ethers.ContractTransactionResponse> {
    return await _setOracle.call(this, poolAddress, oracleAddress, methodName, false) as ethers.ContractTransactionResponse;
}

// ------- STABLE META POOLS -------

async function _deployStableMetaPool(
    this: Curve,
    basePool: string,
    name: string,
    symbol: string,
    coin: string,
    A: number | string,
    fee: number | string, // %
    implementationIdx: 0 | 1,
    estimateGas: boolean
): Promise<ethers.ContractTransactionResponse | number | number[]> {
    if (name.length > 32) throw Error("Max name length = 32");
    if (symbol.length > 10) throw Error("Max symbol length = 10");
    if (BN(fee).lt(0.04)) throw Error(`fee must be >= 0.04%. Passed fee = ${fee}`);
    if (BN(fee).gt(1)) throw Error(`fee must be <= 1%. Passed fee = ${fee}`);
    if (![0, 1].includes(implementationIdx)) throw Error("Invalid implementationIdx. Must be one 0 or 1");

    const _A = parseUnits(A, 0);
    const _fee = parseUnits(fee, 8);

    const contract = this.contracts[this.constants.ALIASES.factory].contract;
    const gas = await contract.deploy_metapool.estimateGas(basePool, name, symbol, coin, _A, _fee, implementationIdx, this.constantOptions);
    if (estimateGas) return smartNumber(gas);

    const gasLimit = mulBy1_3(DIGas(gas));
    await this.updateFeeData();
    return await contract.deploy_metapool(basePool, name, symbol, coin, _A, _fee, implementationIdx, {
        ...this.options,
        gasLimit,
    });
}

export async function deployStableMetaPoolEstimateGas(
    this: Curve,
    basePool: string,
    name: string,
    symbol: string,
    coin: string,
    A: number | string,
    fee: number | string, // %
    implementationIdx: 0 | 1
): Promise<number> {
    return await _deployStableMetaPool.call(this, basePool, name, symbol, coin, A, fee, implementationIdx, true) as number;
}

export async function deployStableMetaPool(
    this: Curve,
    basePool: string,
    name: string,
    symbol: string,
    coin: string,
    A: number | string,
    fee: number | string, // %
    implementationIdx: 0 | 1
): Promise<ethers.ContractTransactionResponse> {
    return await _deployStableMetaPool.call(this, basePool, name, symbol, coin, A, fee, implementationIdx, false) as ethers.ContractTransactionResponse;
}

async function _deployStableNgMetaPool(
    this: Curve,
    basePool: string,
    name: string,
    symbol: string,
    coin: string,
    A: number | string,
    fee: number | string, // %
    offpegFeeMultiplier: number | string,
    assetType: 0 | 1 | 2 | 3, // 0 = Standard, 1 = Oracle, 2 = Rebasing, 3 = ERC4626
    emaTime = 866, // seconds
    implementationIdx = 0,
    methodName = "0x00000000",
    oracleAddress = this.constants.ZERO_ADDRESS,
    estimateGas: boolean
): Promise<ethers.ContractTransactionResponse | number | number[]> {
    if (name.length > 32) throw Error("Max name length = 32");
    if (symbol.length > 10) throw Error("Max symbol length = 10");
    if (BN(fee).gt(1)) throw Error(`fee must be <= 1%. Passed fee = ${fee}`);
    if (![0, 1].includes(implementationIdx)) throw Error("Invalid implementationIdx. Must be one 0 or 1");

    const _A = parseUnits(A, 0);
    const _fee = parseUnits(fee, 8);
    const _offpegFeeMultiplier = parseUnits(offpegFeeMultiplier, 10);

    const methodId = methodName === "0x00000000" ? "0x00000000" : ethers.id(methodName).substring(0, 10);

    const contract = this.contracts[this.constants.ALIASES.stable_ng_factory].contract;

    const gas = await contract.deploy_metapool.estimateGas(basePool, name, symbol, coin, _A, _fee, _offpegFeeMultiplier, emaTime, implementationIdx, assetType, methodId, oracleAddress, this.constantOptions);
    if (estimateGas) return smartNumber(gas);

    const gasLimit = mulBy1_3(DIGas(gas));
    await this.updateFeeData();
    return await contract.deploy_metapool(basePool, name, symbol, coin, _A, _fee, _offpegFeeMultiplier, emaTime, implementationIdx, assetType, methodId, oracleAddress, {
        ...this.options,
        gasLimit,
    });
}

export async function deployStableNgMetaPoolEstimateGas(
    this: Curve,
    basePool: string,
    name: string,
    symbol: string,
    coin: string,
    A: number | string,
    fee: number | string, // %
    offpegFeeMultiplier: number | string,
    assetType: 0 | 1 | 2 | 3, // 0 = Standard, 1 = Oracle, 2 = Rebasing, 3 = ERC4626
    emaTime: number, // seconds
    implementationIdx: 0,
    methodName: string,
    oracleAddress: string
): Promise<number> {
    return await _deployStableNgMetaPool.call(this, basePool, name, symbol, coin, A, fee, offpegFeeMultiplier, assetType, emaTime, implementationIdx, methodName, oracleAddress, true) as number;
}

export async function deployStableNgMetaPool(
    this: Curve,
    basePool: string,
    name: string,
    symbol: string,
    coin: string,
    A: number | string,
    fee: number | string, // %
    offpegFeeMultiplier: number | string,
    emaTime: number, // seconds
    implementationIdx: 0,
    assetType: 0 | 1 | 2 | 3, // 0 = Standard, 1 = Oracle, 2 = Rebasing, 3 = ERC4626
    methodName: string,
    oracleAddress: string
): Promise<ethers.ContractTransactionResponse> {
    return await _deployStableNgMetaPool.call(this, basePool, name, symbol, coin, A, fee, offpegFeeMultiplier, assetType, emaTime, implementationIdx, methodName, oracleAddress, false) as ethers.ContractTransactionResponse;
}

export async function getDeployedStableMetaPoolAddress(this: Curve, tx: ethers.ContractTransactionResponse): Promise<string> {
    const txInfo = await tx.wait();
    if (!txInfo) throw Error("Can't get tx info");
    for (let i = txInfo.logs.length - 1; i > -1; i--) {
        if ("args" in txInfo.logs[i]) {
            const basePoolId = getPoolIdBySwapAddress.call(this, (txInfo.logs[i] as ethers.EventLog).args[1]);
            const basePool = getPool.call(this, basePoolId);
            return txInfo.logs[basePool.underlyingCoins.length].address.toLowerCase();
        }
    }
    throw Error("Can't get deployed metapool address");
}


// ------- CRYPTO POOLS -------


async function _deployCryptoPool(
    this: Curve,
    name: string,
    symbol: string,
    coins: string[],
    A: number | string,
    gamma: number | string,
    midFee: number | string, // %
    outFee: number | string, // %
    allowedExtraProfit: number | string,
    feeGamma: number | string,
    adjustmentStep: number | string,
    maHalfTime: number, // Seconds
    initialPrice: number | string,
    estimateGas: boolean
): Promise<ethers.ContractTransactionResponse | number | number[]> {
    if (name.length > 32) throw Error("Max name length = 32");
    if (symbol.length > 10) throw Error("Max symbol length = 10");
    if (coins.length !== 2) throw Error("Invalid number of coins. Must be 2");
    if (coins[0] === coins[1]) throw Error("Coins must be different");
    if (BN(A).lt(4000)) throw Error(`A must be >= 4000. Passed A = ${A}`);
    if (BN(A).gt(4 * (10 ** 9))) throw Error(`A must be <= 4 * 10 ** 9. Passed A = ${A}`);
    if (BN(gamma).lt(1e-8)) throw Error(`gamma must be >= 1e-8. Passed gamma = ${gamma}`);
    if (BN(gamma).gt(0.02)) throw Error(`gamma must be <= 0.02. Passed gamma = ${gamma}`);
    if (BN(midFee).lt(0.005)) throw Error(`midFee must be >= 0.005. Passed midFee = ${midFee}`);
    if (BN(midFee).gt(100)) throw Error(`midFee must be <= 100. Passed midFee = ${midFee}`);
    if (BN(outFee).lt(BN(midFee))) throw Error(`outFee must be >= midFee. Passed outFee = ${outFee} < midFee = ${midFee}`);
    if (BN(outFee).gt(100)) throw Error(`outFee must be <= 100. Passed outFee = ${outFee}`);
    if (BN(allowedExtraProfit).lt(0)) throw Error(`allowedExtraProfit must be >= 0. Passed allowedExtraProfit = ${allowedExtraProfit}`);
    if (BN(allowedExtraProfit).gt(0.01)) throw Error(`allowedExtraProfit must be <= 0.01. Passed allowedExtraProfit = ${allowedExtraProfit}`);
    if (BN(feeGamma).lt(0)) throw Error(`feeGamma must be >= 0. Passed feeGamma = ${feeGamma}`);
    if (BN(feeGamma).gt(1)) throw Error(`feeGamma must be <= 1. Passed feeGamma = ${feeGamma}`);
    if (BN(adjustmentStep).lt(0)) throw Error(`adjustmentStep must be >= 0. Passed adjustmentStep=${adjustmentStep}`);
    if (BN(adjustmentStep).gt(1)) throw Error(`adjustmentStep must be <= 1. Passed adjustmentStep=${adjustmentStep}`);
    if (BN(maHalfTime).lt(0)) throw Error(`maHalfTime must be >= 0. Passed maHalfTime=${maHalfTime}`);
    if (BN(maHalfTime).gt(604800)) throw Error(`maHalfTime must be <= 604800. Passed maHalfTime=${maHalfTime}`);
    if (BN(initialPrice).lt(1e-12)) throw Error(`initialPrice must be >= 1e-12. Passed initialPrice=${initialPrice}`);
    if (BN(initialPrice).gt(1e12)) throw Error(`initialPrice must be <= 1e12. Passed initialPrice=${initialPrice}`);

    const _A = parseUnits(A, 0);
    const _gamma = parseUnits(gamma);
    const _midFee = parseUnits(midFee, 8);
    const _outFee = parseUnits(outFee, 8);
    const _allowedExtraProfit = parseUnits(allowedExtraProfit);
    const _feeGamma = parseUnits(feeGamma);
    const _adjustmentStep = parseUnits(adjustmentStep);
    const _maHalfTime = parseUnits(maHalfTime, 0);
    const _initialPrice = parseUnits(initialPrice);
    const contract = this.contracts[this.constants.ALIASES.crypto_factory].contract;

    const gas = await contract.deploy_pool.estimateGas(
        name,
        symbol,
        coins,
        _A,
        _gamma,
        _midFee,
        _outFee,
        _allowedExtraProfit,
        _feeGamma,
        _adjustmentStep,
        5000000000,
        _maHalfTime,
        _initialPrice,
        this.constantOptions
    );
    if (estimateGas) return smartNumber(gas);

    const gasLimit = mulBy1_3(DIGas(gas));
    await this.updateFeeData();
    return await contract.deploy_pool(
        name,
        symbol,
        coins,
        _A,
        _gamma,
        _midFee,
        _outFee,
        _allowedExtraProfit,
        _feeGamma,
        _adjustmentStep,
        5000000000, // 50%
        _maHalfTime,
        _initialPrice,
        {...this.options, gasLimit}
    );
}

export async function deployCryptoPoolEstimateGas(
    this: Curve,
    name: string,
    symbol: string,
    coins: string[],
    A: number | string,
    gamma: number | string,
    midFee: number | string, // %
    outFee: number | string, // %
    allowedExtraProfit: number | string,
    feeGamma: number | string,
    adjustmentStep: number | string,
    maHalfTime: number, // Seconds
    initialPrice: number | string
): Promise<number> {
    return await _deployCryptoPool.call(
        this,
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

export async function deployCryptoPool(
    this: Curve,
    name: string,
    symbol: string,
    coins: string[],
    A: number | string,
    gamma: number | string,
    midFee: number | string, // %
    outFee: number | string, // %
    allowedExtraProfit: number | string,
    feeGamma: number | string,
    adjustmentStep: number | string,
    maHalfTime: number, // Seconds
    initialPrice: number | string
): Promise<ethers.ContractTransactionResponse> {
    return await _deployCryptoPool.call(
        this,
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
    ) as ethers.ContractTransactionResponse
}

export async function getDeployedCryptoPoolAddress(this: Curve, tx: ethers.ContractTransactionResponse): Promise<string> {
    const txInfo = await tx.wait();
    if (!txInfo) throw Error("Can't get tx info")
    const lpTokenAddress = txInfo.logs[0].address;
    const contract = new Contract(lpTokenAddress, CurveLpTokenV5ABI, this.provider)
    return (await contract.minter(this.constantOptions) as string).toLowerCase();
}

// ------- TWOCRYPTO POOLS -------

async function _deployTwocryptoPool(
    this: Curve,
    name: string,
    symbol: string,
    coins: string[],
    A: number | string,
    gamma: number | string,
    midFee: number | string, // %
    outFee: number | string, // %
    allowedExtraProfit: number | string,
    feeGamma: number | string,
    adjustmentStep: number | string,
    maHalfTime: number, // Seconds
    initialPrice: number | string,
    implementationIdx: TwoCryptoImplementation,
    estimateGas: boolean
): Promise<ethers.ContractTransactionResponse | number | number[]> {
    if (name.length > 32) throw Error("Max name length = 32");
    if (symbol.length > 10) throw Error("Max symbol length = 10");
    if (coins.length !== 2) throw Error("Invalid number of coins. Must be 2");
    if (coins[0] === coins[1]) throw Error("Coins must be different");
    if (BN(A).lt(4000)) throw Error(`A must be >= 4000. Passed A = ${A}`);
    if (BN(A).gt(4 * (10 ** 9))) throw Error(`A must be <= 4 * 10 ** 9. Passed A = ${A}`);
    const MIN_GAMMA = BN((10 ** 10) / (10 ** 18));
    const MAX_GAMMA = BN(199 * (10 ** 15) / (10 ** 18));
    if (BN(gamma).lt(MIN_GAMMA)) throw Error(`gamma must be >= ${MIN_GAMMA}. Passed gamma = ${gamma}`);
    if (BN(gamma).gt(MAX_GAMMA)) throw Error(`gamma must be <= ${MAX_GAMMA}. Passed gamma = ${gamma}`);
    if (BN(midFee).lt(0.005)) throw Error(`midFee must be >= 0.005. Passed midFee = ${midFee}`);
    if (BN(midFee).gt(100)) throw Error(`midFee must be <= 100. Passed midFee = ${midFee}`);
    if (BN(outFee).lt(BN(midFee))) throw Error(`outFee must be >= midFee. Passed outFee = ${outFee} < midFee = ${midFee}`);
    if (BN(outFee).gt(100)) throw Error(`outFee must be <= 100. Passed outFee = ${outFee}`);
    if (BN(allowedExtraProfit).lt(0)) throw Error(`allowedExtraProfit must be >= 0. Passed allowedExtraProfit = ${allowedExtraProfit}`);
    if (BN(allowedExtraProfit).gt(0.01)) throw Error(`allowedExtraProfit must be <= 0.01. Passed allowedExtraProfit = ${allowedExtraProfit}`);
    if (BN(feeGamma).lt(0)) throw Error(`feeGamma must be >= 0. Passed feeGamma = ${feeGamma}`);
    if (BN(feeGamma).gt(1)) throw Error(`feeGamma must be <= 1. Passed feeGamma = ${feeGamma}`);
    if (BN(adjustmentStep).lt(0)) throw Error(`adjustmentStep must be >= 0. Passed adjustmentStep=${adjustmentStep}`);
    if (BN(adjustmentStep).gt(1)) throw Error(`adjustmentStep must be <= 1. Passed adjustmentStep=${adjustmentStep}`);
    if (BN(maHalfTime).lt(0)) throw Error(`maHalfTime must be >= 0. Passed maHalfTime=${maHalfTime}`);
    if (BN(maHalfTime).gt(604800)) throw Error(`maHalfTime must be <= 604800. Passed maHalfTime=${maHalfTime}`);
    if (BN(initialPrice).lt(1e-12)) throw Error(`initialPrice must be >= 1e-12. Passed initialPrice=${initialPrice}`);
    if (BN(initialPrice).gt(1e12)) throw Error(`initialPrice must be <= 1e12. Passed initialPrice=${initialPrice}`);

    const _A = parseUnits(A, 0);
    const _gamma = parseUnits(gamma);
    const _midFee = parseUnits(midFee, 8);
    const _outFee = parseUnits(outFee, 8);
    const _allowedExtraProfit = parseUnits(allowedExtraProfit);
    const _feeGamma = parseUnits(feeGamma);
    const _adjustmentStep = parseUnits(adjustmentStep);
    const _maHalfTime = parseUnits(maHalfTime, 0);
    const _initialPrice = parseUnits(initialPrice);
    const contract = this.contracts[this.constants.ALIASES.twocrypto_factory].contract;

    const gas = await contract.deploy_pool.estimateGas(
        name,
        symbol,
        coins,
        implementationIdx,
        _A,
        _gamma,
        _midFee,
        _outFee,
        _feeGamma,
        _allowedExtraProfit,
        _adjustmentStep,
        _maHalfTime,
        _initialPrice,
        this.constantOptions
    );
    if (estimateGas) return smartNumber(gas);

    const gasLimit = mulBy1_3(DIGas(gas));
    await this.updateFeeData();
    return await contract.deploy_pool(
        name,
        symbol,
        coins,
        implementationIdx,
        _A,
        _gamma,
        _midFee,
        _outFee,
        _feeGamma,
        _allowedExtraProfit,
        _adjustmentStep,
        _maHalfTime,
        _initialPrice,
        {...this.options, gasLimit}
    );
}

export async function deployTwocryptoPoolEstimateGas(
    this: Curve,
    name: string,
    symbol: string,
    coins: string[],
    A: number | string,
    gamma: number | string,
    midFee: number | string, // %
    outFee: number | string, // %
    allowedExtraProfit: number | string,
    feeGamma: number | string,
    adjustmentStep: number | string,
    maHalfTime: number, // Seconds
    initialPrice: number | string,
    implementationIdx: TwoCryptoImplementation = TwoCryptoImplementation.DEFAULT
): Promise<number> {
    return await _deployTwocryptoPool.call(
        this,
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
        implementationIdx,
        true
    ) as number
}

export async function deployTwocryptoPool(
    this: Curve,
    name: string,
    symbol: string,
    coins: string[],
    A: number | string,
    gamma: number | string,
    midFee: number | string, // %
    outFee: number | string, // %
    allowedExtraProfit: number | string,
    feeGamma: number | string,
    adjustmentStep: number | string,
    maHalfTime: number, // Seconds
    initialPrice: number | string,
    implementationIdx: TwoCryptoImplementation = TwoCryptoImplementation.DEFAULT
): Promise<ethers.ContractTransactionResponse> {
    return await _deployTwocryptoPool.call(
        this,
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
        implementationIdx,
        false
    ) as ethers.ContractTransactionResponse
}

export async function getDeployedTwocryptoPoolAddress(this: Curve, tx: ethers.ContractTransactionResponse): Promise<string> {
    const txInfo = await tx.wait();
    if (!txInfo) throw Error("Can't get tx info");
    for (let i = txInfo.logs.length - 1; i > -1; i--) {
        if ("args" in txInfo.logs[i]) {
            return (txInfo.logs[i] as EventLog).args[0];
        }
    }
    throw Error("Can't get deployed tricrypto pool address");
}


// ------- TRICRYPTO POOLS -------


async function _deployTricryptoPool(
    this: Curve,
    name: string,
    symbol: string,
    coins: string[],
    A: number | string,
    gamma: number | string,
    midFee: number | string, // %
    outFee: number | string, // %
    allowedExtraProfit: number | string,
    feeGamma: number | string,
    adjustmentStep: number | string,
    emaTime: number, // Seconds
    initialPrices: (number | string)[],
    estimateGas: boolean
): Promise<ethers.ContractTransactionResponse | number | number[]> {
    if (name.length > 64) throw Error("Max name length = 64");
    if (symbol.length > 32) throw Error("Max symbol length = 32");
    if (coins.length !== 3) throw Error("Invalid number of coins. Must be 3");
    if (coins[0] === coins[1] || coins[1] === coins[2] || coins[0] === coins[2]) throw Error("Coins must be different");
    if (BN(A).lt(2700)) throw Error(`A must be >= 2700. Passed A = ${A}`);
    if (BN(A).gt(27 * (10 ** 7))) throw Error(`A must be <= 27 * 10 ** 7. Passed A = ${A}`);
    if (BN(gamma).lt(1e-8)) throw Error(`gamma must be >= 1e-8. Passed gamma = ${gamma}`);
    if (BN(gamma).gt(0.05)) throw Error(`gamma must be <= 0.05. Passed gamma = ${gamma}`);
    if (BN(midFee).lt(0)) throw Error(`midFee must be >= 0. Passed midFee = ${midFee}`);
    if (BN(midFee).gt(100)) throw Error(`midFee must be <= 100. Passed midFee = ${midFee}`);
    if (BN(outFee).lt(BN(midFee))) throw Error(`outFee must be >= midFee. Passed outFee = ${outFee} < midFee = ${midFee}`);
    if (BN(outFee).gt(100)) throw Error(`outFee must be <= 100. Passed outFee = ${outFee}`);
    if (BN(allowedExtraProfit).lt(0)) throw Error(`allowedExtraProfit must be >= 0. Passed allowedExtraProfit = ${allowedExtraProfit}`);
    if (BN(allowedExtraProfit).gt(1)) throw Error(`allowedExtraProfit must be <= 1. Passed allowedExtraProfit = ${allowedExtraProfit}`);
    if (BN(feeGamma).lt(0)) throw Error(`feeGamma must be >= 0. Passed feeGamma = ${feeGamma}`);
    if (BN(feeGamma).gt(1)) throw Error(`feeGamma must be <= 1. Passed feeGamma = ${feeGamma}`);
    if (BN(adjustmentStep).lt(0)) throw Error(`adjustmentStep must be >= 0. Passed adjustmentStep=${adjustmentStep}`);
    if (BN(adjustmentStep).gt(1)) throw Error(`adjustmentStep must be <= 1. Passed adjustmentStep=${adjustmentStep}`);
    if (BN(emaTime).lt(60)) throw Error(`maHalfTime must be >= 60. Passed maHalfTime=${emaTime}`);
    if (BN(emaTime).gt(604800)) throw Error(`maHalfTime must be <= 604800. Passed maHalfTime=${emaTime}`);
    if (initialPrices.length !== 2) throw Error("Invalid number of initial prices. Must be 2");
    if (BN(initialPrices[0]).lt(1e-12)) throw Error(`initialPrices[0] must be >= 1e-12. Passed initialPrices[0]=${initialPrices[0]}`);
    if (BN(initialPrices[0]).gt(1e12)) throw Error(`initialPrices[0] must be <= 1e12. Passed initialPrices[0]=${initialPrices[0]}`);
    if (BN(initialPrices[1]).lt(1e-12)) throw Error(`initialPrices[1] must be >= 1e-12. Passed initialPrices[1]=${initialPrices[1]}`);
    if (BN(initialPrices[1]).gt(1e12)) throw Error(`initialPrices[1] must be <= 1e12. Passed initialPrices[1]=${initialPrices[1]}`);

    const _A = parseUnits(A, 0);
    const _gamma = parseUnits(gamma);
    const _midFee = parseUnits(midFee, 8);
    const _outFee = parseUnits(outFee, 8);
    const _allowedExtraProfit = parseUnits(allowedExtraProfit);
    const _feeGamma = parseUnits(feeGamma);
    const _adjustmentStep = parseUnits(adjustmentStep);
    const _emaTime = parseUnits(Math.floor(emaTime / Math.log(2)), 0);
    const _initialPrices = [parseUnits(initialPrices[0]), parseUnits(initialPrices[1])];
    const contract = this.contracts[this.constants.ALIASES.tricrypto_factory].contract;

    const gas = await contract.deploy_pool.estimateGas(
        name,
        symbol,
        coins,
        this.constants.ZERO_ADDRESS,
        this.constants.CRYPTO_FACTORY_CONSTANTS.tricryptoDeployImplementations?.implementationIdx ?? 0,
        _A,
        _gamma,
        _midFee,
        _outFee,
        _feeGamma,
        _allowedExtraProfit,
        _adjustmentStep,
        _emaTime,
        _initialPrices,
        this.constantOptions
    );
    if (estimateGas) return smartNumber(gas);

    const gasLimit = mulBy1_3(DIGas(gas));
    await this.updateFeeData();
    return await contract.deploy_pool(
        name,
        symbol,
        coins,
        this.constants.NATIVE_TOKEN.wrappedAddress,
        this.constants.CRYPTO_FACTORY_CONSTANTS.tricryptoDeployImplementations?.implementationIdx ?? 0,
        _A,
        _gamma,
        _midFee,
        _outFee,
        _feeGamma,
        _allowedExtraProfit,
        _adjustmentStep,
        _emaTime,
        _initialPrices,
        {...this.options, gasLimit}
    );
}

export async function deployTricryptoPoolEstimateGas(
    this: Curve,
    name: string,
    symbol: string,
    coins: string[],
    A: number | string,
    gamma: number | string,
    midFee: number | string, // %
    outFee: number | string, // %
    allowedExtraProfit: number | string,
    feeGamma: number | string,
    adjustmentStep: number | string,
    emaTime: number, // Seconds
    initialPrices: (number | string)[]
): Promise<number> {
    return await _deployTricryptoPool.call(
        this,
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
        emaTime,
        initialPrices,
        true
    ) as number
}

export async function deployTricryptoPool(
    this: Curve,
    name: string,
    symbol: string,
    coins: string[],
    A: number | string,
    gamma: number | string,
    midFee: number | string, // %
    outFee: number | string, // %
    allowedExtraProfit: number | string,
    feeGamma: number | string,
    adjustmentStep: number | string,
    emaTime: number, // Seconds
    initialPrices: (number | string)[]
): Promise<ethers.ContractTransactionResponse> {
    return await _deployTricryptoPool.call(
        this,
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
        emaTime,
        initialPrices,
        false
    ) as ethers.ContractTransactionResponse
}

export async function getDeployedTricryptoPoolAddress(this: Curve, tx: ethers.ContractTransactionResponse): Promise<string> {
    const txInfo = await tx.wait();
    if (!txInfo) throw Error("Can't get tx info");
    for (let i = txInfo.logs.length - 1; i > -1; i--) {
        if ("args" in txInfo.logs[i]) {
            return (txInfo.logs[i] as EventLog).args[0];
        }
    }
    throw Error("Can't get deployed tricrypto pool address");
}


// ------- GAUGE -------

async function _deployGauge(this: Curve, pool: string, factory: string, estimateGas: boolean): Promise<ethers.ContractTransactionResponse | number | number[]> {
    if (this.chainId !== 1) throw Error("There is no deployGauge method on sidechain network");
    const contract = this.contracts[factory].contract;
    const gas = await contract.deploy_gauge.estimateGas(pool, this.constantOptions);
    if (estimateGas) return smartNumber(gas);

    const gasLimit = mulBy1_3(DIGas(gas));
    await this.updateFeeData();
    return await contract.deploy_gauge(pool, {...this.options, gasLimit});
}

async function _deployGaugeSidechain(this: Curve, pool: string, salt: string, estimateGas: boolean): Promise<ethers.ContractTransactionResponse | number | number[]> {
    if (this.chainId === 1) throw Error("There is no deployGaugeSidechain method on ethereum network");
    const contract = this.contracts[this.constants.ALIASES.child_gauge_factory].contract;
    const _salt = ethers.encodeBytes32String(salt)
    const gas = await contract.deploy_gauge.estimateGas(pool, Typed.bytes32(_salt), this.signerAddress, this.constantOptions);
    if (estimateGas) return smartNumber(gas);

    const gasLimit = mulBy1_3(DIGas(gas));
    await this.updateFeeData();
    return await contract.deploy_gauge(pool, Typed.bytes32(_salt), this.signerAddress, {...this.options, gasLimit});
}

async function _deployGaugeMirror(this: Curve, chainId: number, salt: string, estimateGas: boolean): Promise<ethers.ContractTransactionResponse | number | number[]> {
    if (this.chainId !== 1) throw Error("There is no deployGaugeMirror method on sidechain network");
    const rootGaugeFactory = NETWORK_CONSTANTS[this.chainId].ALIASES.root_gauge_factory
    const contract = this.contracts[rootGaugeFactory].contract;
    const _salt = ethers.encodeBytes32String(salt)
    const gas = await contract.deploy_gauge.estimateGas(chainId, Typed.bytes32(_salt), this.constantOptions);
    if (estimateGas) return smartNumber(gas);

    const gasLimit = mulBy1_3(DIGas(gas));
    await this.updateFeeData();
    return await contract.deploy_gauge(chainId,Typed.bytes32(_salt), { ...this.options, gasLimit });
}

export async function deployGaugeEstimateGas(this: Curve, pool: string, factory: string): Promise<number> { return await _deployGauge.call(this, pool, factory, true) as number; }

export async function deployGauge(this: Curve, pool: string, factory: string): Promise<ethers.ContractTransactionResponse> { return await _deployGauge.call(this, pool, factory, false) as ethers.ContractTransactionResponse; }

export async function deployGaugeSidechainEstimateGas(this: Curve, pool: string, salt: string): Promise<number> { return await _deployGaugeSidechain.call(this, pool, salt, true) as number; }

export async function deployGaugeSidechain(this: Curve, pool: string, salt: string): Promise<ethers.ContractTransactionResponse> { return await _deployGaugeSidechain.call(this, pool, salt, false) as ethers.ContractTransactionResponse; }

export async function deployGaugeMirrorEstimateGas(this: Curve, chainId: number, salt: string): Promise<number> { return await _deployGaugeMirror.call(this, chainId, salt, true) as number; }

export async function deployGaugeMirror(this: Curve, chainId: number, salt: string): Promise<ethers.ContractTransactionResponse> { return await _deployGaugeMirror.call(this, chainId, salt, false) as ethers.ContractTransactionResponse; }

export async function getDeployedGaugeAddress(this: Curve, tx: ethers.ContractTransactionResponse): Promise<string> {
    const txInfo = await tx.wait();
    if (!txInfo) throw Error("Can't get tx info");
    const log = txInfo.logs[0] as EventLog;
    return log.args[log.args.length - 1].toLowerCase();
}

export async function getDeployedGaugeMirrorAddressByTx(this: Curve, tx: ethers.ContractTransactionResponse): Promise<string> {
    if(this.chainId !== 1) throw Error("There is no getDeployedGaugeMirrorAddressByTx method on sidechain network");
    const txInfo = await tx.wait();
    if (!txInfo) throw Error("Can't get tx info");
    const log = txInfo.logs[1] as EventLog;
    return log.args[log.args.length - 1].toLowerCase();
}

export async function getDeployedGaugeMirrorAddress(this: Curve, chainId: number): Promise<string> {
    if (this.chainId !== 1) throw Error("There is no getDeployedGaugeMirrorAddress method on sidechain network");
    const rootGaugeFactory = NETWORK_CONSTANTS[this.chainId].ALIASES.root_gauge_factory;
    const contract = this.contracts[rootGaugeFactory].contract;
    const gaugeCount = await contract.get_gauge_count(chainId);
    const currentIndex: number = Number(gaugeCount) - 1;

    return await contract.get_gauge(chainId, currentIndex);
}
