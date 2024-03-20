import { curve } from "../curve.js";
import { IDict, IFactoryPoolType, IPoolData, ICurve, IPoolDataFromApi } from "../interfaces";
import factoryGaugeABI from "../constants/abis/gauge_factory.json" assert { type: 'json' };
import gaugeChildABI from "../constants/abis/gauge_child.json" assert { type: 'json' };
import ERC20ABI from "../constants/abis/ERC20.json" assert { type: 'json' };
import cryptoFactorySwapABI from "../constants/abis/factory-crypto/factory-crypto-pool-2.json" assert { type: 'json' };
import twocryptoFactorySwapABI from "../constants/abis/factory-twocrypto/factory-twocrypto-pool.json" assert { type: 'json' };
import tricryptoFactorySwapABI from "../constants/abis/factory-tricrypto/factory-tricrypto-pool.json" assert { type: 'json' };
import tricryptoFactoryEthDisabledSwapABI from "../constants/abis/factory-tricrypto/factory-tricrypto-pool-eth-disabled.json" assert { type: 'json' };
import { FACTORY_CONSTANTS } from "./constants.js";
import { CRYPTO_FACTORY_CONSTANTS } from "./constants-crypto.js";
import { getPoolIdByAddress, setFactoryZapContracts } from "./common.js";
import { _getPoolsFromApi } from "../external-api.js";
import {assetTypeNameHandler, getPoolName, isStableNgPool} from "../utils.js";
import {tricryptoDeployImplementations} from "../constants/tricryptoDeployImplementations.js";

export const lowerCasePoolDataAddresses = (poolsData: IPoolDataFromApi[]): IPoolDataFromApi[] => {
    for (const poolData of poolsData) {
        poolData.address = poolData.address.toLowerCase();
        if (poolData.lpTokenAddress) poolData.lpTokenAddress = poolData.lpTokenAddress.toLowerCase();
        if (poolData.gaugeAddress) poolData.gaugeAddress = poolData.gaugeAddress.toLowerCase();
        if (poolData.implementationAddress) poolData.implementationAddress = poolData.implementationAddress.toLowerCase();
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

function setFactorySwapContracts(this: ICurve, rawPoolList: IPoolDataFromApi[], factoryType: IFactoryPoolType): void {
    if (factoryType === "factory-crypto") {
        rawPoolList.forEach((pool) => {
            this.setContract(pool.address, cryptoFactorySwapABI);
        });
    } else if (factoryType === "factory-twocrypto") {
        rawPoolList.forEach((pool) => {
            this.setContract(pool.address, twocryptoFactorySwapABI);
        });
    } else if (factoryType === "factory-tricrypto") {
        rawPoolList.forEach((pool) => {
            if(pool.implementationAddress === tricryptoDeployImplementations[curve.chainId].amm_native_transfers_disabled) {
                this.setContract(pool.address, tricryptoFactoryEthDisabledSwapABI);
            } else {
                this.setContract(pool.address, tricryptoFactorySwapABI);
            }
        });
    } else {
        const implementationABIDict = FACTORY_CONSTANTS[this.chainId].implementationABIDict;
        rawPoolList.forEach((pool) => {
            this.setContract(pool.address, implementationABIDict[pool.implementationAddress]);
        });
    }
}

function setCryptoFactoryTokenContracts(this: ICurve, rawPoolList: IPoolDataFromApi[]): void {
    rawPoolList.forEach((pool) => {
        this.setContract(pool.lpTokenAddress as string, ERC20ABI);
    });
}

function setFactoryGaugeContracts(this: ICurve, rawPoolList: IPoolDataFromApi[]): void {
    rawPoolList.forEach((pool)  => {
        if (pool.gaugeAddress) {
            this.setContract(pool.gaugeAddress, this.chainId === 1 ? factoryGaugeABI : gaugeChildABI);
        }
    });
}

function setFactoryCoinsContracts(this: ICurve, rawPoolList: IPoolDataFromApi[]): void {
    for (const pool of rawPoolList) {
        for (const coin of pool.coins) {
            if (coin.address in this.contracts) continue;
            this.setContract(coin.address, ERC20ABI);
        }
    }
}

const getSwapAbiByFactoryType = (factoryType: IFactoryPoolType, pool: IPoolDataFromApi) => {
    const isETHDisabled = pool.implementationAddress === tricryptoDeployImplementations[curve.chainId].amm_native_transfers_disabled
    const map: Record<string, any> = {
        "factory-crypto": cryptoFactorySwapABI,
        "factory-twocrypto": twocryptoFactorySwapABI,
        "facroty-tricrypto": isETHDisabled ? tricryptoFactoryEthDisabledSwapABI : tricryptoFactorySwapABI,
    }
    
    return map[factoryType];
}

export async function getFactoryPoolsDataFromApi(this: ICurve, factoryType: IFactoryPoolType): Promise<IDict<IPoolData>> {
    const network = this.constants.NETWORK_NAME;
    const isCrypto = factoryType === "factory-crypto" || factoryType === "factory-twocrypto" || factoryType === "factory-tricrypto";
    let rawPoolList: IPoolDataFromApi[] = lowerCasePoolDataAddresses((await _getPoolsFromApi(network, factoryType)).poolData);
    if (!isCrypto) {
        rawPoolList = rawPoolList.filter((p) => p.implementationAddress in FACTORY_CONSTANTS[this.chainId].implementationABIDict);
    }
    // Filter duplications
    const mainAddresses = Object.values(this.constants.POOLS_DATA).map((pool: IPoolData) => pool.swap_address);
    rawPoolList = rawPoolList.filter((p) => !mainAddresses.includes(p.address));

    setFactorySwapContracts.call(this, rawPoolList, factoryType);
    if (factoryType === "factory-crypto") setCryptoFactoryTokenContracts.call(this, rawPoolList);
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
            const underlyingCoinNames = pool.coins.map((c) => {
                if(factoryType === 'factory-twocrypto') {
                    return c.symbol;
                } else if (factoryType === 'factory-tricrypto') {
                    const isETHEnabled = pool.implementationAddress === tricryptoDeployImplementations[curve.chainId].amm_native_transfers_enabled;
                    if(isETHEnabled) {
                        return c.symbol === nativeToken.wrappedSymbol ? nativeToken.symbol : c.symbol;
                    } else {
                        return c.symbol;
                    }
                } else {
                    return c.symbol === nativeToken.wrappedSymbol ? nativeToken.symbol : c.symbol;
                }
            });
            const underlyingCoinAddresses = coinAddresses.map((addr) => {
                if(factoryType === 'factory-twocrypto') {
                    return addr;
                } else if (factoryType === 'factory-tricrypto') {
                    const isETHEnabled = pool.implementationAddress === tricryptoDeployImplementations[curve.chainId].amm_native_transfers_enabled;
                    if(isETHEnabled) {
                        return addr === nativeToken.wrappedAddress ? nativeToken.address : addr;
                    } else {
                        return addr;
                    }
                } else {
                    return addr === nativeToken.wrappedAddress ? nativeToken.address : addr;
                }
            });
            const isPlain = underlyingCoinNames.toString() === wrappedCoinNames.toString();
            const lpTokenBasePoolIdDict = CRYPTO_FACTORY_CONSTANTS[this.chainId].lpTokenBasePoolIdDict;
            const basePoolIdZapDict = CRYPTO_FACTORY_CONSTANTS[this.chainId].basePoolIdZapDict;
            const basePoolId = lpTokenBasePoolIdDict[coinAddresses[1]];

            if (factoryType !== "factory-tricrypto" && factoryType !== "factory-twocrypto" && basePoolId) {  // isMeta
                const allPoolsData = {...this.constants.POOLS_DATA, ...FACTORY_POOLS_DATA};
                const basePoolCoinNames = [...allPoolsData[basePoolId].underlying_coins];
                const basePoolCoinAddresses = [...allPoolsData[basePoolId].underlying_coin_addresses];
                const basePoolDecimals = [...allPoolsData[basePoolId].underlying_decimals];
                const basePoolZap = basePoolIdZapDict[basePoolId];

                this.constants.BASE_POOLS[basePoolId] = this.constants.BASE_POOLS[basePoolId] ? this.constants.BASE_POOLS[basePoolId] + 1: 1;

                FACTORY_POOLS_DATA[pool.id] = {
                    name: getPoolName(pool.name),
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
                    is_stable_ng: false,
                };
            } else {
                FACTORY_POOLS_DATA[pool.id] = {
                    name: factoryType === "factory-tricrypto" ? pool.name : getPoolName(pool.name),
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
                    swap_abi: getSwapAbiByFactoryType(factoryType, pool),
                    gauge_abi: this.chainId === 1 ? factoryGaugeABI : gaugeChildABI,
                    in_api: true,
                    is_stable_ng: false,
                };
            }
        } else if (pool.isMetaPool) {
            const implementationABIDict = FACTORY_CONSTANTS[this.chainId].implementationABIDict;
            const allPoolsData = {...this.constants.POOLS_DATA, ...FACTORY_POOLS_DATA};
            const basePoolId = getPoolIdByAddress(rawPoolList, pool.basePoolAddress as string);
            this.constants.BASE_POOLS[basePoolId] = this.constants.BASE_POOLS[basePoolId] ? this.constants.BASE_POOLS[basePoolId] + 1: 1;

            const basePoolCoinNames = allPoolsData[basePoolId]?.underlying_coins;
            const basePoolCoinAddresses = allPoolsData[basePoolId]?.underlying_coin_addresses;
            const basePoolDecimals = allPoolsData[basePoolId]?.underlying_decimals;

            const basePoolIdZapDict = FACTORY_CONSTANTS[this.chainId].basePoolIdZapDict;

            const basePoolZap = isStableNgPool(basePoolId) ? FACTORY_CONSTANTS[this.chainId].stableNgBasePoolZap : basePoolIdZapDict[basePoolId];

            if(isStableNgPool(basePoolId)) {
                this.setContract(FACTORY_CONSTANTS[this.chainId].stableNgBasePoolZap.address, FACTORY_CONSTANTS[this.chainId].stableNgBasePoolZap.ABI);
            }

            FACTORY_POOLS_DATA[pool.id] = {
                name: getPoolName(pool.name),
                full_name: pool.name,
                symbol: pool.symbol,
                reference_asset: assetTypeNameHandler(pool.assetTypeName),
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
                is_stable_ng: factoryType === 'factory-stable-ng',
            };
        } else {
            const implementationABIDict = FACTORY_CONSTANTS[this.chainId].implementationABIDict;
            FACTORY_POOLS_DATA[pool.id] = {
                name: getPoolName(pool.name),
                full_name: pool.name,
                symbol: pool.symbol,
                reference_asset: assetTypeNameHandler(pool.assetTypeName),
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
                is_stable_ng: factoryType === 'factory-stable-ng',
            };
        }
    })

    return FACTORY_POOLS_DATA
}