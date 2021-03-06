import { Contract, ethers } from "ethers";
import { Contract as MulticallContract } from "ethcall";
import { IDict, IPoolData, ICurve } from "../interfaces";
import ERC20ABI from "../constants/abis/ERC20.json";
import cryptoFactorySwapABI from "../constants/abis/factory-crypto/factory-crypto-pool-2.json";
import factoryGaugeABI from "../constants/abis/gauge_factory.json";
import { NATIVE_TOKENS, NATIVE_TOKEN_ADDRESS } from "./constants";


const deepFlatten = (arr: any[]): any[] => [].concat(...arr.map((v) => (Array.isArray(v) ? deepFlatten(v) : v)));

async function getCryptoFactoryIdsAndSwapAddresses(this: ICurve): Promise<[string[], string[]]> {
    const factoryContract = this.contracts[this.constants.ALIASES.crypto_factory].contract;
    const factoryMulticallContract = this.contracts[this.constants.ALIASES.crypto_factory].multicallContract;

    const poolCount = Number(ethers.utils.formatUnits(await factoryContract.pool_count(this.constantOptions), 0));
    const calls = [];
    for (let i = 0; i < poolCount; i++) {
        calls.push(factoryMulticallContract.pool_list(i));
    }

    let factories: { id: string, address: string}[] = (await this.multicallProvider.all(calls) as string[]).map(
        (addr, i) => ({ id: `factory-crypto-${i}`, address: addr.toLowerCase()})
    );

    const swapAddresses = Object.values(this.constants.POOLS_DATA as IDict<IPoolData>).map((pool: IPoolData) => pool.swap_address.toLowerCase());
    factories = factories.filter((f) => !swapAddresses.includes(f.address));

    return [factories.map((f) => f.id), factories.map((f) => f.address)]
}

function setCryptoFactorySwapContracts(this: ICurve, factorySwapAddresses: string[]): void {
    factorySwapAddresses.forEach((addr) => {
        this.contracts[addr] = {
            contract: new Contract(addr, cryptoFactorySwapABI, this.signer || this.provider),
            multicallContract: new MulticallContract(addr, cryptoFactorySwapABI),
        }
    });
}

async function getCryptoFactoryTokenAddresses(this: ICurve, factorySwapAddresses: string[]): Promise<string[]> {
    const factoryMulticallContract = await this.contracts[this.constants.ALIASES.crypto_factory].multicallContract;

    const calls = [];
    for (const addr of factorySwapAddresses) {
        calls.push(factoryMulticallContract.get_token(addr));
    }

    return (await this.multicallProvider.all(calls) as string[]).map((addr) => addr.toLowerCase());
}

function setCryptoFactoryTokenContracts(this: ICurve, factoryTokenAddresses: string[]): void {
    factoryTokenAddresses.forEach((addr) => {
        this.contracts[addr] = {
            contract: new Contract(addr, ERC20ABI, this.signer || this.provider),
            multicallContract: new MulticallContract(addr, ERC20ABI),
        }
    });
}

async function getCryptoFactoryGaugeAddresses(this: ICurve, factorySwapAddresses: string[]): Promise<string[]> {
    const factoryMulticallContract = await this.contracts[this.constants.ALIASES.crypto_factory].multicallContract;

    const calls = [];
    for (const addr of factorySwapAddresses) {
        calls.push(factoryMulticallContract.get_gauge(addr));
    }

    return (await this.multicallProvider.all(calls) as string[]).map((addr) => addr.toLowerCase());
}

function setCryptoFactoryGaugeContracts(this: ICurve, factoryGaugeAddresses: string[]): void {
    factoryGaugeAddresses.filter((addr) => addr !== ethers.constants.AddressZero).forEach((addr, i) => {
        this.contracts[addr] = {
            contract: new Contract(addr, factoryGaugeABI, this.signer || this.provider),
            multicallContract: new MulticallContract(addr, factoryGaugeABI),
        }
    });
}

async function getCryptoFactorySymbolsAndNames(this: ICurve, factoryTokenAddresses: string[]): Promise<[string[], string[]]> {
    const calls = [];
    for (const addr of factoryTokenAddresses) {
        calls.push(this.contracts[addr].multicallContract.symbol(), this.contracts[addr].multicallContract.name());
    }

    const res = (await this.multicallProvider.all(calls) as string[]);

    const symbols: string[] = [];
    const names: string[] = [];
    for (let i = 0; i < factoryTokenAddresses.length; i++) {
        symbols.push(res[2 * i]);
        names.push(res[(2 * i) + 1]);
    }

    return [symbols, names]
}

async function getCryptoFactoryCoinAddresses(this: ICurve, factorySwapAddresses: string[]): Promise<string[][]> {
    const factoryMulticallContract = await this.contracts[this.constants.ALIASES.crypto_factory].multicallContract;

    const calls = [];
    for (const addr of factorySwapAddresses) {
        calls.push(factoryMulticallContract.get_coins(addr));
    }

    return (await this.multicallProvider.all(calls) as string[][]).map((addresses) => addresses.map((addr) => addr.toLowerCase()));
}

function setCryptoFactoryCoinsContracts(this: ICurve, coinAddresses: string[][]): void {
    const flattenedCoinAddresses = Array.from(new Set(deepFlatten(coinAddresses)));
    for (const addr of flattenedCoinAddresses) {
        if (addr in this.contracts) continue;

        this.contracts[addr] = {
            contract: new Contract(addr, ERC20ABI, this.signer || this.provider),
            multicallContract: new MulticallContract(addr, ERC20ABI),
        }
    }
}

async function getCryptoFactoryUnderlyingCoinAddresses(this: ICurve, coinAddresses: string[][]): Promise<string[][]> {
    return coinAddresses.map((coins: string[]) => coins.map((c) => c === NATIVE_TOKENS[this.chainId].wrappedAddress ? NATIVE_TOKEN_ADDRESS : c));
}

function getExistingCoinAddressNameDict(this: ICurve): IDict<string> {
    const dict: IDict<string> = {}
    for (const poolData of Object.values(this.constants.POOLS_DATA as IDict<IPoolData>)) {
        poolData.wrapped_coin_addresses.forEach((addr, i) => {
            if (!(addr.toLowerCase() in dict)) {
                dict[addr.toLowerCase()] = poolData.wrapped_coins[i]
            }
        });

        poolData.underlying_coin_addresses.forEach((addr, i) => {
            if (!(addr.toLowerCase() in dict)) {
                dict[addr.toLowerCase()] = poolData.underlying_coins[i]
            }
        });
    }

    if (this.chainId === 1) dict[NATIVE_TOKEN_ADDRESS] = "ETH"
    if (this.chainId === 10) dict[NATIVE_TOKEN_ADDRESS] = "ETH"
    if (this.chainId === 137) dict[NATIVE_TOKEN_ADDRESS] = "MATIC"
    if (this.chainId === 250) dict[NATIVE_TOKEN_ADDRESS] = "FTM"
    if (this.chainId === 43114) dict[NATIVE_TOKEN_ADDRESS] = "AVAX"
    if (this.chainId === 42161) dict[NATIVE_TOKEN_ADDRESS] = "ETH"

    return dict
}

async function getCoinAddressNameDict(
    this: ICurve,
    coinAddresses: string[][],
    existingCoinAddrNameDict: IDict<string>
): Promise<IDict<string>> {
    const flattenedCoinAddresses = Array.from(new Set(deepFlatten(coinAddresses)));
    const newCoinAddresses = [];
    const coinAddrNamesDict: IDict<string> = {};

    for (const addr of flattenedCoinAddresses) {
        if (addr in existingCoinAddrNameDict) {
            coinAddrNamesDict[addr] = existingCoinAddrNameDict[addr];
        } else if (addr === "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2") {
            coinAddrNamesDict[addr] = "MKR";
        } else {
            newCoinAddresses.push(addr);
        }
    }

    const calls = newCoinAddresses.map((addr) => {
        return this.contracts[addr].multicallContract.symbol();
    });

    const names = await this.multicallProvider.all(calls) as string[];

    newCoinAddresses.forEach((addr, i) => {
        coinAddrNamesDict[addr] = names[i];
    });

    coinAddrNamesDict[NATIVE_TOKEN_ADDRESS] = NATIVE_TOKENS[this.chainId].symbol;

    return coinAddrNamesDict
}

async function getCoinAddressDecimalsDict(
    this: ICurve,
    coinAddresses: string[][],
    existingCoinAddressDecimalsDict: IDict<number>
): Promise<IDict<number>> {
    const flattenedCoinAddresses = Array.from(new Set(deepFlatten(coinAddresses)));
    const newCoinAddresses = [];
    const coinAddressDecimalsDict: IDict<number> = {};

    for (const addr of flattenedCoinAddresses) {
        if (addr in existingCoinAddressDecimalsDict) {
            coinAddressDecimalsDict[addr] = existingCoinAddressDecimalsDict[addr];
        } else {
            newCoinAddresses.push(addr);
        }
    }

    const calls = newCoinAddresses.map((addr) => {
        return this.contracts[addr].multicallContract.decimals();
    });

    const decimals = (await this.multicallProvider.all(calls) as ethers.BigNumber[]).map((_d) => Number(ethers.utils.formatUnits(_d, 0)));

    newCoinAddresses.forEach((addr, i) => {
        coinAddressDecimalsDict[addr] = decimals[i];
    });

    coinAddressDecimalsDict[NATIVE_TOKEN_ADDRESS] = 18

    return coinAddressDecimalsDict
}


export async function getCryptoFactoryPoolData(this: ICurve): Promise<IDict<IPoolData>> {
    const [poolIds, swapAddresses] = await getCryptoFactoryIdsAndSwapAddresses.call(this);
    setCryptoFactorySwapContracts.call(this, swapAddresses);
    const tokenAddresses = await getCryptoFactoryTokenAddresses.call(this, swapAddresses);
    setCryptoFactoryTokenContracts.call(this, tokenAddresses);
    const gaugeAddresses = await getCryptoFactoryGaugeAddresses.call(this, swapAddresses);
    setCryptoFactoryGaugeContracts.call(this, gaugeAddresses);
    const [poolSymbols, poolNames] = await getCryptoFactorySymbolsAndNames.call(this, tokenAddresses);
    const coinAddresses = await getCryptoFactoryCoinAddresses.call(this, swapAddresses);
    setCryptoFactoryCoinsContracts.call(this, coinAddresses);
    const underlyingCoinAddresses = await getCryptoFactoryUnderlyingCoinAddresses.call(this, coinAddresses);
    const existingCoinAddressNameDict = getExistingCoinAddressNameDict.call(this);
    const coinAddressNameDict = await getCoinAddressNameDict.call(this, coinAddresses, existingCoinAddressNameDict);
    const coinAddressDecimalsDict = await getCoinAddressDecimalsDict.call(this, coinAddresses, this.constants.DECIMALS);

    const CRYPTO_FACTORY_POOLS_DATA: IDict<IPoolData> = {};
    for (let i = 0; i < poolIds.length; i++) {
        CRYPTO_FACTORY_POOLS_DATA[poolIds[i]] = {
            name: poolNames[i].split(": ")[1].trim(),
            full_name: poolNames[i],
            symbol: poolSymbols[i],
            reference_asset: "CRYPTO",
            swap_address: swapAddresses[i],
            token_address: tokenAddresses[i],
            gauge_address: gaugeAddresses[i],
            is_crypto: true,
            is_factory: true,
            underlying_coins: underlyingCoinAddresses[i].map((addr) => coinAddressNameDict[addr]),
            wrapped_coins: coinAddresses[i].map((addr) => coinAddressNameDict[addr]),
            underlying_coin_addresses: underlyingCoinAddresses[i],
            wrapped_coin_addresses: coinAddresses[i],
            underlying_decimals: underlyingCoinAddresses[i].map((addr) => coinAddressDecimalsDict[addr]),
            wrapped_decimals: coinAddresses[i].map((addr) => coinAddressDecimalsDict[addr]),
            swap_abi: cryptoFactorySwapABI,
            gauge_abi: factoryGaugeABI,
        };
    }

    return CRYPTO_FACTORY_POOLS_DATA
}