import { Contract } from "ethers";
import { Contract as MulticallContract } from "ethcall";
import { curve } from "../curve.js";
import { IDict, IPoolData, ICurve, IPoolDataFromApi, REFERENCE_ASSET } from "../interfaces";
import factoryGaugeABI from "../constants/abis/gauge_factory.json" assert { type: 'json' };
import gaugeChildABI from "../constants/abis/gauge_child.json" assert { type: 'json' };
import ERC20ABI from "../constants/abis/ERC20.json" assert { type: 'json' };
import cryptoFactorySwapABI from "../constants/abis/factory-crypto/factory-crypto-pool-2.json" assert { type: 'json' };
import { FACTORY_CONSTANTS } from "./constants.js";
import { CRYPTO_FACTORY_CONSTANTS } from "./constants-crypto.js";
import { setFactoryZapContracts } from "./common.js";
import { _getPoolsFromApi } from "../external-api.js";

export const lowerCasePoolDataAddresses = (poolsData: IPoolDataFromApi[]): IPoolDataFromApi[] => {
    for (const poolData of poolsData) {
        poolData.address = poolData.address.toLowerCase();
        if (poolData.lpTokenAddress) poolData.lpTokenAddress = poolData.lpTokenAddress.toLowerCase();
        if (poolData.gaugeAddress) poolData.gaugeAddress = poolData.gaugeAddress.toLowerCase();
        poolData.implementationAddress = poolData.implementationAddress.toLowerCase();
        for (const coin of poolData.coins) {
            coin.address = coin.address.toLowerCase();
        }
        for (const reward of poolData.gaugeRewards ?? []) {
            reward.gaugeAddress = reward.gaugeAddress.toLowerCase();
            reward.tokenAddress = reward.tokenAddress.toLowerCase();
        }
    }

    return poolsData
}

function setFactorySwapContracts(this: ICurve, rawPoolList: IPoolDataFromApi[], isCrypto: boolean): void {
    if (isCrypto) {
        rawPoolList.forEach((pool) => {
            const addr = pool.address;
            this.contracts[addr] = {
                contract: new Contract(addr, cryptoFactorySwapABI, this.signer || this.provider),
                multicallContract: new MulticallContract(addr, cryptoFactorySwapABI),
            }
        });
    } else {
        const implementationABIDict = FACTORY_CONSTANTS[this.chainId].implementationABIDict;
        rawPoolList.forEach((pool) => {
            const addr = pool.address;
            this.contracts[addr] = {
                contract: new Contract(addr, implementationABIDict[pool.implementationAddress], this.signer || this.provider),
                multicallContract: new MulticallContract(addr, implementationABIDict[pool.implementationAddress]),
            }
        });
    }
}

function setCryptoFactoryTokenContracts(this: ICurve, rawPoolList: IPoolDataFromApi[]): void {
    rawPoolList.forEach((pool) => {
        const addr = pool.lpTokenAddress as string;
        this.contracts[addr] = {
            contract: new Contract(addr, ERC20ABI, this.signer || this.provider),
            multicallContract: new MulticallContract(addr, ERC20ABI),
        }
    });
}

function setFactoryGaugeContracts(this: ICurve, rawPoolList: IPoolDataFromApi[]): void {
    rawPoolList.forEach((pool)  => {
        if (pool.gaugeAddress) {
            const addr = pool.gaugeAddress;
            this.contracts[addr] = {
                contract: new Contract(addr, this.chainId === 1 ? factoryGaugeABI : gaugeChildABI, this.signer || this.provider),
                multicallContract: new MulticallContract(addr, this.chainId === 1 ? factoryGaugeABI : gaugeChildABI),
            }
        }
    });
}

function setFactoryCoinsContracts(this: ICurve, rawPoolList: IPoolDataFromApi[]): void {
    for (const pool of rawPoolList) {
        for (const coin of pool.coins) {
            const addr = coin.address;
            if (addr in this.contracts) continue;

            this.contracts[addr] = {
                contract: new Contract(addr, ERC20ABI, this.signer || this.provider),
                multicallContract: new MulticallContract(addr, ERC20ABI),
            }
        }
    }
}

export async function getFactoryPoolsDataFromApi(this: ICurve, isCrypto: boolean): Promise<IDict<IPoolData>> {
    const network = this.constants.NETWORK_NAME;
    const factoryType = isCrypto ? "factory-crypto" : "factory";
    let rawPoolList: IPoolDataFromApi[] = lowerCasePoolDataAddresses((await _getPoolsFromApi(network, factoryType)).poolData);
    if (!isCrypto) {
        rawPoolList = rawPoolList.filter((p) => p.implementationAddress in FACTORY_CONSTANTS[this.chainId].implementationABIDict);
    }
    // Filter duplications
    const mainAddresses = Object.values(this.constants.POOLS_DATA).map((pool: IPoolData) => pool.swap_address);
    rawPoolList = rawPoolList.filter((p) => !mainAddresses.includes(p.address));

    setFactorySwapContracts.call(this, rawPoolList, isCrypto);
    if (isCrypto) setCryptoFactoryTokenContracts.call(this, rawPoolList);
    setFactoryGaugeContracts.call(this, rawPoolList);
    setFactoryCoinsContracts.call(this, rawPoolList);
    setFactoryZapContracts.call(this, isCrypto);

    const FACTORY_POOLS_DATA: IDict<IPoolData> = {};
    rawPoolList.forEach((pool) => {
        const nativeToken = this.constants.NATIVE_TOKEN;
        let coinAddresses = pool.coins.map((c) => c.address);
        if (this.chainId === 137) {
            coinAddresses = coinAddresses.map((a) => a === "0x0000000000000000000000000000000000001010" ? nativeToken.wrappedAddress : a);
        }
        const coinNames = pool.coins.map((c) => c.symbol);
        const coinDecimals = pool.coins.map((c) => Number(c.decimals));

        if (isCrypto) {
            const wrappedCoinNames = pool.coins.map((c) => c.symbol === nativeToken.symbol ? nativeToken.wrappedSymbol : c.symbol);
            const underlyingCoinNames = pool.coins.map((c) => c.symbol === nativeToken.wrappedSymbol ? nativeToken.symbol : c.symbol);
            const underlyingCoinAddresses = coinAddresses.map((addr) => addr === nativeToken.wrappedAddress ? nativeToken.address : addr);
            const isPlain = !coinAddresses.includes(nativeToken.wrappedAddress);
            const lpTokenBasePoolIdDict = CRYPTO_FACTORY_CONSTANTS[this.chainId].lpTokenBasePoolIdDict;
            const basePoolIdZapDict = CRYPTO_FACTORY_CONSTANTS[this.chainId].basePoolIdZapDict;
            const basePoolId = lpTokenBasePoolIdDict[coinAddresses[1]];

            if (basePoolId) {  // isMeta
                const allPoolsData = {...this.constants.POOLS_DATA, ...FACTORY_POOLS_DATA};
                const basePoolCoinNames = [...allPoolsData[basePoolId].underlying_coins];
                const basePoolCoinAddresses = [...allPoolsData[basePoolId].underlying_coin_addresses];
                const basePoolDecimals = [...allPoolsData[basePoolId].underlying_decimals];
                const basePoolZap = basePoolIdZapDict[basePoolId];

                FACTORY_POOLS_DATA[pool.id] = {
                    name: pool.name.split(": ")[1].trim(),
                    full_name: pool.name,
                    symbol: pool.symbol,
                    reference_asset: "CRYPTO",
                    swap_address: pool.address,
                    token_address: pool.lpTokenAddress as string,
                    gauge_address: pool.gaugeAddress ? pool.gaugeAddress : curve.constants.ZERO_ADDRESS,
                    deposit_address: basePoolZap.address,
                    is_meta: true,
                    is_crypto: true,
                    is_factory: true,
                    base_pool: basePoolId,
                    underlying_coins: [underlyingCoinNames[0], ...basePoolCoinNames],
                    wrapped_coins: wrappedCoinNames,
                    underlying_coin_addresses: [underlyingCoinAddresses[0], ...basePoolCoinAddresses],
                    wrapped_coin_addresses: coinAddresses,
                    underlying_decimals: [coinDecimals[0], ...basePoolDecimals],
                    wrapped_decimals: coinDecimals,
                    swap_abi: cryptoFactorySwapABI,
                    gauge_abi: this.chainId === 1 ? factoryGaugeABI : gaugeChildABI,
                    deposit_abi: basePoolZap.ABI,
                    in_api: true,
                };
            } else {
                FACTORY_POOLS_DATA[pool.id] = {
                    name: pool.name.split(": ")[1].trim(),
                    full_name: pool.name,
                    symbol: pool.symbol,
                    reference_asset: "CRYPTO",
                    swap_address: pool.address,
                    token_address: pool.lpTokenAddress as string,
                    gauge_address: pool.gaugeAddress ? pool.gaugeAddress : curve.constants.ZERO_ADDRESS,
                    is_crypto: true,
                    is_plain: isPlain,
                    is_factory: true,
                    underlying_coins: underlyingCoinNames,
                    wrapped_coins: wrappedCoinNames,
                    underlying_coin_addresses: underlyingCoinAddresses,
                    wrapped_coin_addresses: coinAddresses,
                    underlying_decimals: coinDecimals,
                    wrapped_decimals: coinDecimals,
                    swap_abi: cryptoFactorySwapABI,
                    gauge_abi: this.chainId === 1 ? factoryGaugeABI : gaugeChildABI,
                    in_api: true,
                };
            }
        } else if (pool.implementation.includes("meta")) {
            const implementationABIDict = FACTORY_CONSTANTS[this.chainId].implementationABIDict;
            const implementationBasePoolIdDict = FACTORY_CONSTANTS[this.chainId].implementationBasePoolIdDict;
            const basePoolIds = Object.values(implementationBasePoolIdDict).filter((poolId, i, arr) => arr.indexOf(poolId) === i);
            const allPoolsData = {...this.constants.POOLS_DATA, ...FACTORY_POOLS_DATA};
            // @ts-ignore
            const basePoolIdCoinsDict = Object.fromEntries(basePoolIds.map(
                (poolId) => [poolId, allPoolsData[poolId]?.underlying_coins]));
            // @ts-ignore
            const basePoolIdCoinAddressesDict = Object.fromEntries(basePoolIds.map(
                (poolId) => [poolId, allPoolsData[poolId]?.underlying_coin_addresses]));
            // @ts-ignore
            const basePoolIdDecimalsDict = Object.fromEntries(basePoolIds.map(
                (poolId) => [poolId, allPoolsData[poolId]?.underlying_decimals]));
            const basePoolIdZapDict = FACTORY_CONSTANTS[this.chainId].basePoolIdZapDict;

            const basePoolId = implementationBasePoolIdDict[pool.implementationAddress];
            const basePoolCoinNames = basePoolIdCoinsDict[basePoolId];
            const basePoolCoinAddresses = basePoolIdCoinAddressesDict[basePoolId];
            const basePoolDecimals = basePoolIdDecimalsDict[basePoolId];
            const basePoolZap = basePoolIdZapDict[basePoolId];

            FACTORY_POOLS_DATA[pool.id] = {
                name: pool.name.split(": ")[1].trim(),
                full_name: pool.name,
                symbol: pool.symbol,
                reference_asset: pool.assetTypeName.toUpperCase() as REFERENCE_ASSET,
                swap_address: pool.address,
                token_address: pool.address,
                gauge_address: pool.gaugeAddress ? pool.gaugeAddress : curve.constants.ZERO_ADDRESS,
                deposit_address: basePoolZap.address,
                implementation_address: pool.implementationAddress, // Only for testing
                is_meta: true,
                is_factory: true,
                base_pool: basePoolId,
                underlying_coins: [coinNames[0], ...basePoolCoinNames],
                wrapped_coins: coinNames,
                underlying_coin_addresses: [coinAddresses[0], ...basePoolCoinAddresses],
                wrapped_coin_addresses: coinAddresses,
                underlying_decimals: [coinDecimals[0], ...basePoolDecimals],
                wrapped_decimals: coinDecimals,
                swap_abi: implementationABIDict[pool.implementationAddress],
                gauge_abi: this.chainId === 1 ? factoryGaugeABI : gaugeChildABI,
                deposit_abi: basePoolZap.ABI,
                in_api: true,
            };
        } else {
            const implementationABIDict = FACTORY_CONSTANTS[this.chainId].implementationABIDict;

            FACTORY_POOLS_DATA[pool.id] = {
                name: pool.name.split(": ")[1].trim(),
                full_name: pool.name,
                symbol: pool.symbol,
                reference_asset: pool.assetTypeName.toUpperCase() as REFERENCE_ASSET,
                swap_address: pool.address,
                token_address: pool.address,
                gauge_address: pool.gaugeAddress ? pool.gaugeAddress : curve.constants.ZERO_ADDRESS,
                implementation_address: pool.implementationAddress, // Only for testing
                is_plain: true,
                is_factory: true,
                underlying_coins: coinNames,
                wrapped_coins: coinNames,
                underlying_coin_addresses: coinAddresses,
                wrapped_coin_addresses: coinAddresses,
                underlying_decimals: coinDecimals,
                wrapped_decimals: coinDecimals,
                swap_abi: implementationABIDict[pool.implementationAddress],
                gauge_abi: this.chainId === 1 ? factoryGaugeABI : gaugeChildABI,
                in_api: true,
            };
        }
    })

    return FACTORY_POOLS_DATA
}