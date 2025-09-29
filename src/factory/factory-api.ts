import {ICurve, IDict, IFactoryPoolType, IPoolData, IPoolDataFromApi} from "../interfaces";
import factoryGaugeABI from "../constants/abis/gauge_factory.json" with {type: "json"};
import gaugeChildABI from "../constants/abis/gauge_child.json" with {type: "json"};
import ERC20ABI from "../constants/abis/ERC20.json" with {type: "json"};
import cryptoFactorySwapABI from "../constants/abis/factory-crypto/factory-crypto-pool-2.json" with {type: "json"};
import twocryptoFactorySwapABI
    from "../constants/abis/factory-twocrypto/factory-twocrypto-pool.json" with {type: "json"};
import ybTwocryptoPoolABI from "../constants/abis/factory-twocrypto/yb-twocrypto-pool.json" with {type: "json"};
import tricryptoFactorySwapABI
    from "../constants/abis/factory-tricrypto/factory-tricrypto-pool.json" with {type: "json"};
import tricryptoFactoryEthDisabledSwapABI
    from "../constants/abis/factory-tricrypto/factory-tricrypto-pool-eth-disabled.json" with {type: "json"};
import {getPoolIdByAddress, setFactoryZapContracts} from "./common.js";
import {_getPoolsFromApi} from "../cached.js";
import {assetTypeNameHandler, getPoolName, isStableNgPool} from "../utils.js";
import StableNgBasePoolZapABI from "../constants/abis/stable-ng-base-pool-zap.json" with {type: "json"};
import MetaStableSwapNGABI from "../constants/abis/factory-stable-ng/meta-stableswap-ng.json" with {type: "json"};
import PlainStableSwapNGABI from "../constants/abis/factory-stable-ng/plain-stableswap-ng.json" with {type: "json"};
import {type Curve} from "../curve";
import { isYBPool } from "../constants/ybPools.js";

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

function getSwapAbiByFactoryType(this: ICurve, factoryType: IFactoryPoolType, pool: IPoolDataFromApi) {
    const isETHEnabled = pool.implementationAddress === this.constants.CRYPTO_FACTORY_CONSTANTS.tricryptoDeployImplementations?.amm_native_transfers_enabled;
    
    if (factoryType === "factory-twocrypto" && isYBPool(pool.address)) {
        return ybTwocryptoPoolABI;
    }
    
    const map: Record<string, any> = {
        "factory-crypto": cryptoFactorySwapABI,
        "factory-twocrypto": twocryptoFactorySwapABI,
        "factory-tricrypto": isETHEnabled ? tricryptoFactorySwapABI : tricryptoFactoryEthDisabledSwapABI,
    }

    return map[factoryType];
}

function setFactorySwapContracts(this: ICurve, rawPoolList: IPoolDataFromApi[], swapABIs: any, factoryType: IFactoryPoolType): void {
    if (["factory-crypto", "factory-twocrypto", "factory-tricrypto"].includes(factoryType)) {
        rawPoolList.forEach((pool) => {
            this.setContract(pool.address, getSwapAbiByFactoryType.call(this, factoryType, pool));
        });
    } else {
        rawPoolList.forEach((pool, i) => {
            this.setContract(pool.address, swapABIs[i]);
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

export async function getFactoryPoolsDataFromApi(this: Curve, factoryType: IFactoryPoolType): Promise<IDict<IPoolData>> {
    const network = this.constants.NETWORK_NAME;
    const is_ng = ["factory-stable-ng", "factory-twocrypto", "factory-tricrypto"].includes(factoryType);
    const isCrypto = ["factory-crypto", "factory-twocrypto", "factory-tricrypto"].includes(factoryType);

    const implementationABIDict = this.constants.STABLE_FACTORY_CONSTANTS.implementationABIDict ?? {};
    let rawPoolList: IPoolDataFromApi[] = lowerCasePoolDataAddresses((await _getPoolsFromApi(network, factoryType, this.isLiteChain)).poolData);
    if (!isCrypto) rawPoolList = rawPoolList.filter((p) => is_ng || p.implementationAddress in implementationABIDict);
    // Filter duplications
    const mainAddresses = Object.values(this.constants.POOLS_DATA).map((pool: IPoolData) => pool.swap_address);
    rawPoolList = rawPoolList.filter((p) => !mainAddresses.includes(p.address));

    const swapABIs = isCrypto ? [] : rawPoolList.map((pool: IPoolDataFromApi) => is_ng ?
        (pool.isMetaPool ? MetaStableSwapNGABI : PlainStableSwapNGABI) :
        implementationABIDict[pool.implementationAddress]);
    setFactorySwapContracts.call(this, rawPoolList, swapABIs, factoryType);
    if (factoryType === "factory-crypto") setCryptoFactoryTokenContracts.call(this, rawPoolList);
    setFactoryGaugeContracts.call(this, rawPoolList);
    setFactoryCoinsContracts.call(this, rawPoolList);
    setFactoryZapContracts.call(this, isCrypto);

    const FACTORY_POOLS_DATA: IDict<IPoolData> = {};
    rawPoolList.forEach((pool, i) => {
        const nativeToken = this.constants.NATIVE_TOKEN;
        const isETHEnabled = pool.implementationAddress === this.constants.CRYPTO_FACTORY_CONSTANTS.tricryptoDeployImplementations?.amm_native_transfers_enabled;
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
            const lpTokenBasePoolIdDict = this.constants.CRYPTO_FACTORY_CONSTANTS.lpTokenBasePoolIdDict ?? {};
            const basePoolIdZapDict = this.constants.CRYPTO_FACTORY_CONSTANTS.basePoolIdZapDict ?? {};
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
                    gauge_address: pool.gaugeAddress ? pool.gaugeAddress : this.constants.ZERO_ADDRESS,
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
                    is_ng,
                };
            } else {
                FACTORY_POOLS_DATA[pool.id] = {
                    name: factoryType === "factory-tricrypto" ? pool.name : getPoolName(pool.name),
                    full_name: pool.name,
                    symbol: pool.symbol,
                    reference_asset: "CRYPTO",
                    swap_address: pool.address,
                    token_address: pool.lpTokenAddress as string,
                    gauge_address: pool.gaugeAddress ? pool.gaugeAddress : this.constants.ZERO_ADDRESS,
                    is_crypto: true,
                    is_plain: isPlain,
                    is_factory: true,
                    underlying_coins: underlyingCoinNames,
                    wrapped_coins: wrappedCoinNames,
                    underlying_coin_addresses: underlyingCoinAddresses,
                    wrapped_coin_addresses: coinAddresses,
                    underlying_decimals: coinDecimals,
                    wrapped_decimals: coinDecimals,
                    swap_abi: getSwapAbiByFactoryType.call(this, factoryType, pool),
                    gauge_abi: this.chainId === 1 ? factoryGaugeABI : gaugeChildABI,
                    in_api: true,
                    is_ng,
                };
            }
        } else if (pool.isMetaPool) {
            const allPoolsData = {...this.constants.POOLS_DATA, ...FACTORY_POOLS_DATA};
            const basePoolId = getPoolIdByAddress.call(this, rawPoolList, pool.basePoolAddress as string);
            this.constants.BASE_POOLS[basePoolId] = this.constants.BASE_POOLS[basePoolId] ? this.constants.BASE_POOLS[basePoolId] + 1: 1;

            const basePoolCoinNames = allPoolsData[basePoolId]?.underlying_coins;
            const basePoolCoinAddresses = allPoolsData[basePoolId]?.underlying_coin_addresses;
            const basePoolDecimals = allPoolsData[basePoolId]?.underlying_decimals;

            const basePoolIdZapDict = this.constants.STABLE_FACTORY_CONSTANTS.basePoolIdZapDict ?? {};

            let deposit_address = this.constants.STABLE_FACTORY_CONSTANTS.stableNgBasePoolZap ?? this.constants.ZERO_ADDRESS;
            let deposit_abi = StableNgBasePoolZapABI;
            if (isStableNgPool(basePoolId)) {
                this.setContract(deposit_address, StableNgBasePoolZapABI);
            } else {
                deposit_address = basePoolIdZapDict[basePoolId].address;
                deposit_abi = basePoolIdZapDict[basePoolId].ABI;
            }

            FACTORY_POOLS_DATA[pool.id] = {
                name: getPoolName(pool.name),
                full_name: pool.name,
                symbol: pool.symbol,
                reference_asset: assetTypeNameHandler(pool.assetTypeName),
                swap_address: pool.address,
                token_address: pool.address,
                gauge_address: pool.gaugeAddress ? pool.gaugeAddress : this.constants.ZERO_ADDRESS,
                deposit_address,
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
                swap_abi: swapABIs[i],
                gauge_abi: this.chainId === 1 ? factoryGaugeABI : gaugeChildABI,
                deposit_abi,
                in_api: true,
                is_ng,
            };
        } else {
            FACTORY_POOLS_DATA[pool.id] = {
                name: getPoolName(pool.name),
                full_name: pool.name,
                symbol: pool.symbol,
                reference_asset: assetTypeNameHandler(pool.assetTypeName),
                swap_address: pool.address,
                token_address: pool.address,
                gauge_address: pool.gaugeAddress ? pool.gaugeAddress : this.constants.ZERO_ADDRESS,
                implementation_address: pool.implementationAddress, // Only for testing
                is_plain: true,
                is_factory: true,
                underlying_coins: coinNames,
                wrapped_coins: coinNames,
                underlying_coin_addresses: coinAddresses,
                wrapped_coin_addresses: coinAddresses,
                underlying_decimals: coinDecimals,
                wrapped_decimals: coinDecimals,
                swap_abi: swapABIs[i],
                gauge_abi: this.chainId === 1 ? factoryGaugeABI : gaugeChildABI,
                in_api: true,
                is_ng,
            };
        }
    })

    return FACTORY_POOLS_DATA
}