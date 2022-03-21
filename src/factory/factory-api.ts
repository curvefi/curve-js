import axios from 'axios';
import {Contract, ethers} from "ethers";
import { Contract as MulticallContract } from "ethcall";
import { DictInterface, PoolDataInterface, ICurve, IPoolDataFromApi, REFERENCE_ASSET } from "../interfaces";
import factoryGaugeABI from "../constants/abis/json/gauge_factory.json";
import factoryDepositABI from "../constants/abis/json/factoryPools/deposit.json";
import ERC20ABI from "../constants/abis/json/ERC20.json";
import MetaUsdZapPolygonABI from "../constants/abis/json/factory-v2/DepositZapMetaUsdPolygon.json";
import MetaBtcZapPolygonABI from "../constants/abis/json/factory-v2/DepositZapMetaBtcPolygon.json";
import {
    implementationABIDictEthereum,
    implementationABIDictPolygon,
    basePoolAddressCoinsDictEthereum,
    basePoolAddressCoinsDictPolygon,
    implementationBasePoolAddressDictEthereum,
    implementationBasePoolAddressDictPolygon,
    basePoolAddressCoinAddressesDictEthereum,
    basePoolAddressCoinAddressesDictPolygon,
    basePoolAddressNameDictEthereum,
    basePoolAddressNameDictPolygon,
    basePoolAddressDecimalsDictEthereum,
    basePoolAddressDecimalsDictPolygon,
    basePoolAddressZapDictEthereum,
    basePoolAddressZapDictPolygon,
} from "./constants";

function setFactorySwapContracts(this: ICurve, rawPoolList: IPoolDataFromApi[]): void {
    const implementationABIDict = this.chainId === 137 ? implementationABIDictPolygon : implementationABIDictEthereum;
    rawPoolList.forEach((pool) => {
        const addr = pool.address.toLowerCase();
        this.contracts[addr] = {
            contract: new Contract(addr, implementationABIDict[pool.implementationAddress], this.signer || this.provider),
            multicallContract: new MulticallContract(addr, implementationABIDict[pool.implementationAddress]),
        }
        this.constants.LP_TOKENS.push(addr);
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
            this.constants.GAUGES.push(addr);
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

            this.constants.DECIMALS_LOWER_CASE[addr] = Number(coin.decimals);
        }
    }
}

function setFactoryZapContracts(this: ICurve): void {
    if (this.chainId === 137) {
        const metaUsdZapAddress = "0x5ab5C56B9db92Ba45a0B46a207286cD83C15C939".toLowerCase();
        this.contracts[metaUsdZapAddress] = {
            contract: new Contract(metaUsdZapAddress, MetaUsdZapPolygonABI, this.signer || this.provider),
            multicallContract: new MulticallContract(metaUsdZapAddress, MetaUsdZapPolygonABI),
        };
        const metaBtcZapAddress = "0xE2e6DC1708337A6e59f227921db08F21e3394723".toLowerCase();
        this.contracts[metaBtcZapAddress] = {
            contract: new Contract(metaBtcZapAddress, MetaBtcZapPolygonABI, this.signer || this.provider),
            multicallContract: new MulticallContract(metaBtcZapAddress, MetaBtcZapPolygonABI),
        };
    } else {
        const metaSBtcZapAddress = "0x7abdbaf29929e7f8621b757d2a7c04d78d633834".toLowerCase();
        this.contracts[metaSBtcZapAddress] = {
            contract: new Contract(metaSBtcZapAddress, factoryDepositABI, this.signer || this.provider),
            multicallContract: new MulticallContract(metaSBtcZapAddress, factoryDepositABI),
        };
    }
}

export async function getFactoryPoolsDataFromApi(this: ICurve): Promise<DictInterface<PoolDataInterface>> {
    const network = this.chainId === 137 ? "polygon" : "ethereum";
    const url = `https://api.curve.fi/api/getPools/${network}/factory`;
    const response = await axios.get(url);
    const rawPoolList: IPoolDataFromApi[] = response.data.data.poolData;
    setFactorySwapContracts.call(this, rawPoolList);
    setFactoryGaugeContracts.call(this, rawPoolList);
    setFactoryCoinsContracts.call(this, rawPoolList);
    setFactoryZapContracts.call(this);

    const implementationABIDict = this.chainId === 137 ? implementationABIDictPolygon : implementationABIDictEthereum;
    const implementationBasePoolAddressDict = this.chainId === 137 ? implementationBasePoolAddressDictPolygon : implementationBasePoolAddressDictEthereum;
    const basePoolAddressCoinsDict = this.chainId === 137 ? basePoolAddressCoinsDictPolygon : basePoolAddressCoinsDictEthereum;
    const basePoolAddressNameDict = this.chainId === 137 ? basePoolAddressNameDictPolygon : basePoolAddressNameDictEthereum;
    const basePoolAddressCoinAddressesDict = this.chainId === 137 ? basePoolAddressCoinAddressesDictPolygon : basePoolAddressCoinAddressesDictEthereum;
    const basePoolAddressDecimalsDict = this.chainId === 137 ? basePoolAddressDecimalsDictPolygon : basePoolAddressDecimalsDictEthereum;
    const basePoolAddressZapDict = this.chainId === 137 ? basePoolAddressZapDictPolygon : basePoolAddressZapDictEthereum;

    const FACTORY_POOLS_DATA: DictInterface<PoolDataInterface> = {};
    rawPoolList.forEach((pool) => {
        const coinAddresses = pool.coins.map((c) => c.address.toLowerCase());
        const coinNames = pool.coins.map((c) => c.symbol);
        const coinDecimals = pool.coins.map((c) => Number(c.decimals));

        if (pool.implementation.startsWith("meta")) {
            const basePoolAddress = implementationBasePoolAddressDict[pool.implementationAddress];
            const basePoolCoinNames = basePoolAddressCoinsDict[basePoolAddress];
            const basePoolCoinAddresses = basePoolAddressCoinAddressesDict[basePoolAddress];
            const basePoolDecimals = basePoolAddressDecimalsDict[basePoolAddress];
            const basePoolZap = basePoolAddressZapDict[basePoolAddress];

            FACTORY_POOLS_DATA[pool.id] = {
                name: pool.name.split(": ")[1].trim(),
                full_name: pool.name,
                symbol: pool.symbol,
                reference_asset: pool.assetTypeName.toUpperCase() as REFERENCE_ASSET,
                N_COINS: coinAddresses.length,
                underlying_decimals: coinDecimals,
                decimals: coinDecimals,
                use_lending: coinAddresses.map(() => false),
                is_plain: coinAddresses.map(() => true),
                swap_address: pool.address.toLowerCase(),
                token_address: pool.address.toLowerCase(),
                gauge_address: pool.gaugeAddress ? pool.gaugeAddress.toLowerCase() : ethers.constants.AddressZero,
                underlying_coins: [coinNames[0], ...basePoolCoinNames],
                coins: coinNames,
                underlying_coin_addresses: coinAddresses,
                coin_addresses: coinAddresses,
                swap_abi: implementationABIDict[pool.implementationAddress],
                gauge_abi: factoryGaugeABI,
                is_factory: true,
                is_meta_factory: true,
                is_meta: true,
                base_pool: basePoolAddressNameDict[basePoolAddress],
                meta_coin_addresses: basePoolCoinAddresses,
                meta_coin_decimals: [coinDecimals[0], ...basePoolDecimals],
                deposit_address: basePoolZap,
                deposit_abi: factoryDepositABI,
            };
        } else {
            FACTORY_POOLS_DATA[pool.id] = {
                name: pool.name.split(": ")[1].trim(),
                full_name: pool.name,
                symbol: pool.symbol,
                reference_asset: pool.assetTypeName.toUpperCase() as REFERENCE_ASSET,
                N_COINS: coinAddresses.length,
                underlying_decimals: coinDecimals,
                decimals: coinDecimals,
                use_lending: coinAddresses.map(() => false),
                is_plain: coinAddresses.map(() => true),
                swap_address: pool.address.toLowerCase(),
                token_address: pool.address.toLowerCase(),
                gauge_address: pool.gaugeAddress ? pool.gaugeAddress.toLowerCase() : ethers.constants.AddressZero,
                underlying_coins: coinNames,
                coins: coinNames,
                underlying_coin_addresses: coinAddresses,
                coin_addresses: coinAddresses,
                swap_abi: implementationABIDict[pool.implementationAddress],
                gauge_abi: factoryGaugeABI,
                is_factory: true,
                is_plain_factory: true,
            };
        }
    })

    return FACTORY_POOLS_DATA
}
