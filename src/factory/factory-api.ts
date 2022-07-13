import axios from 'axios';
import { Contract, ethers } from "ethers";
import { Contract as MulticallContract } from "ethcall";
import { IDict, IPoolData, ICurve, IPoolDataFromApi, REFERENCE_ASSET } from "../interfaces";
import factoryGaugeABI from "../constants/abis/gauge_factory.json";
import factoryDepositABI from "../constants/abis/factoryPools/deposit.json";
import ERC20ABI from "../constants/abis/ERC20.json";
import cryptoFactorySwapABI from "../constants/abis/factory-crypto/factory-crypto-pool-2.json";
import { FACTORY_CONSTANTS, NATIVE_TOKEN_ADDRESS, NATIVE_TOKENS } from "./constants";
import { setFactoryZapContracts } from "./common";


function setFactorySwapContracts(this: ICurve, rawPoolList: IPoolDataFromApi[], isCrypto: boolean): void {
    if (isCrypto) {
        rawPoolList.forEach((pool) => {
            const addr = pool.address.toLowerCase();
            this.contracts[addr] = {
                contract: new Contract(addr, cryptoFactorySwapABI, this.signer || this.provider),
                multicallContract: new MulticallContract(addr, cryptoFactorySwapABI),
            }
        });
    } else {
        const implementationABIDict = FACTORY_CONSTANTS[this.chainId].implementationABIDict;
        rawPoolList.forEach((pool) => {
            const addr = pool.address.toLowerCase();
            this.contracts[addr] = {
                contract: new Contract(addr, implementationABIDict[pool.implementationAddress], this.signer || this.provider),
                multicallContract: new MulticallContract(addr, implementationABIDict[pool.implementationAddress]),
            }
        });
    }
}

function setCryptoFactoryTokenContracts(this: ICurve, rawPoolList: IPoolDataFromApi[]): void {
    rawPoolList.forEach((pool) => {
        const addr = (pool.lpTokenAddress as string).toLowerCase();
        this.contracts[addr] = {
            contract: new Contract(addr, ERC20ABI, this.signer || this.provider),
            multicallContract: new MulticallContract(addr, ERC20ABI),
        }
    });
}

function setFactoryGaugeContracts(this: ICurve, rawPoolList: IPoolDataFromApi[]): void {
    rawPoolList.forEach((pool)  => {
        if (pool.gaugeAddress) {
            const addr = pool.gaugeAddress.toLowerCase();
            this.contracts[addr] = {
                contract: new Contract(addr, factoryGaugeABI, this.signer || this.provider),
                multicallContract: new MulticallContract(addr, factoryGaugeABI),
            }
        }
    });
}

function setFactoryCoinsContracts(this: ICurve, rawPoolList: IPoolDataFromApi[]): void {
    for (const pool of rawPoolList) {
        for (const coin of pool.coins) {
            const addr = coin.address.toLowerCase();
            if (addr in this.contracts) continue;

            this.contracts[addr] = {
                contract: new Contract(addr, ERC20ABI, this.signer || this.provider),
                multicallContract: new MulticallContract(addr, ERC20ABI),
            }
        }
    }
}

function setFactoryRewardCoinsContracts(this: ICurve, rawPoolList: IPoolDataFromApi[]): void {
    for (const pool of rawPoolList) {
        for (const rewardCoin of pool.gaugeRewards ?? []) {
            const addr = rewardCoin.tokenAddress.toLowerCase();
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
    const url = `https://api.curve.fi/api/getPools/${network}/${factoryType}`;
    const response = await axios.get(url);
    let rawPoolList: IPoolDataFromApi[] = response.data.data.poolData;
    // Filter duplications
    const mainAddresses = Object.values(this.constants.POOLS_DATA).map((pool: IPoolData) => pool.swap_address.toLowerCase());
    rawPoolList = rawPoolList.filter((p) => !mainAddresses.includes(p.address.toLowerCase()));

    setFactorySwapContracts.call(this, rawPoolList, isCrypto);
    if (isCrypto) setCryptoFactoryTokenContracts.call(this, rawPoolList);
    setFactoryGaugeContracts.call(this, rawPoolList);
    setFactoryCoinsContracts.call(this, rawPoolList);
    setFactoryRewardCoinsContracts.call(this, rawPoolList);
    if (!isCrypto) setFactoryZapContracts.call(this);

    const FACTORY_POOLS_DATA: IDict<IPoolData> = {};
    rawPoolList.forEach((pool) => {
        const coinAddresses = pool.coins.map((c) => c.address.toLowerCase());
        const coinNames = pool.coins.map((c) => c.symbol);
        const coinDecimals = pool.coins.map((c) => Number(c.decimals));
        const nativeToken = NATIVE_TOKENS[this.chainId];

        if (isCrypto) {
            const cryptoCoinNames = pool.coins.map((c) => c.symbol === nativeToken.symbol ? nativeToken.wrappedSymbol : c.symbol);
            const underlyingCoinNames = pool.coins.map((c) => c.symbol === nativeToken.wrappedSymbol ? nativeToken.symbol : c.symbol);
            const underlyingCoinAddresses = coinAddresses.map((addr) => addr === nativeToken.wrappedAddress ? NATIVE_TOKEN_ADDRESS : addr);

            FACTORY_POOLS_DATA[pool.id] = {
                name: pool.name.split(": ")[1].trim(),
                full_name: pool.name,
                symbol: pool.symbol,
                reference_asset: "CRYPTO",
                swap_address: pool.address.toLowerCase(),
                token_address: (pool.lpTokenAddress as string).toLowerCase(),
                gauge_address: pool.gaugeAddress ? pool.gaugeAddress.toLowerCase() : ethers.constants.AddressZero,
                is_crypto: true,
                is_factory: true,
                underlying_coins: underlyingCoinNames,
                wrapped_coins: cryptoCoinNames,
                underlying_coin_addresses: underlyingCoinAddresses,
                wrapped_coin_addresses: coinAddresses,
                underlying_decimals: coinDecimals,
                wrapped_decimals: coinDecimals,
                swap_abi: cryptoFactorySwapABI,
                gauge_abi: factoryGaugeABI,
            };
        } else if (pool.implementation.startsWith("meta")) {
            const implementationABIDict = FACTORY_CONSTANTS[this.chainId].implementationABIDict;
            const implementationBasePoolIdDict = FACTORY_CONSTANTS[this.chainId].implementationBasePoolIdDict;
            const basePoolIds = Object.values(implementationBasePoolIdDict).filter((poolId, i, arr) => arr.indexOf(poolId) === i);
            // @ts-ignore
            const basePoolIdCoinsDict = Object.fromEntries(basePoolIds.map(
                (poolId) => [poolId, this.constants.POOLS_DATA[poolId].underlying_coins]));
            // @ts-ignore
            const basePoolIdCoinAddressesDict = Object.fromEntries(basePoolIds.map(
                (poolId) => [poolId, this.constants.POOLS_DATA[poolId].underlying_coin_addresses]));
            // @ts-ignore
            const basePoolIdDecimalsDict = Object.fromEntries(basePoolIds.map(
                (poolId) => [poolId, this.constants.POOLS_DATA[poolId].underlying_decimals]));
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
                swap_address: pool.address.toLowerCase(),
                token_address: pool.address.toLowerCase(),
                gauge_address: pool.gaugeAddress ? pool.gaugeAddress.toLowerCase() : ethers.constants.AddressZero,
                deposit_address: basePoolZap,
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
                gauge_abi: factoryGaugeABI,
                deposit_abi: factoryDepositABI,
            };
        } else {
            const implementationABIDict = FACTORY_CONSTANTS[this.chainId].implementationABIDict;

            FACTORY_POOLS_DATA[pool.id] = {
                name: pool.name.split(": ")[1].trim(),
                full_name: pool.name,
                symbol: pool.symbol,
                reference_asset: pool.assetTypeName.toUpperCase() as REFERENCE_ASSET,
                swap_address: pool.address.toLowerCase(),
                token_address: pool.address.toLowerCase(),
                gauge_address: pool.gaugeAddress ? pool.gaugeAddress.toLowerCase() : ethers.constants.AddressZero,
                is_plain: true,
                is_factory: true,
                underlying_coins: coinNames,
                wrapped_coins: coinNames,
                underlying_coin_addresses: coinAddresses,
                wrapped_coin_addresses: coinAddresses,
                underlying_decimals: coinDecimals,
                wrapped_decimals: coinDecimals,
                swap_abi: implementationABIDict[pool.implementationAddress],
                gauge_abi: factoryGaugeABI,
            };
        }
    })

    return FACTORY_POOLS_DATA
}