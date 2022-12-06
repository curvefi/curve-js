import { Contract, ethers } from "ethers";
import { Contract as MulticallContract } from "ethcall";
import { IDict, IPoolData, ICurve, REFERENCE_ASSET } from "../interfaces";
import ERC20ABI from "../constants/abis/ERC20.json";
import factoryDepositABI from "../constants/abis/factoryPools/deposit.json";
import factoryGaugeABI from "../constants/abis/gauge_factory.json";
import gaugeChildABI from "../constants/abis/gauge_child.json";
import { setFactoryZapContracts } from "./common";
import { FACTORY_CONSTANTS } from "./constants";

const BLACK_LIST: { [index: number]: any } = {
    137: [
        "0x666dc3b4babfd063faf965bd020024af0dc51b64",
        "0xe4199bc5c5c1f63dba47b56b6db7144c51cf0bf8",
        "0x88c4d6534165510b2e2caf0a130d4f70aa4b6d71",
    ],
}

const deepFlatten = (arr: any[]): any[] => [].concat(...arr.map((v) => (Array.isArray(v) ? deepFlatten(v) : v)));

async function getRecentlyCreatedPoolId(this: ICurve, swapAddress: string): Promise<string> {
    const factoryContract = this.contracts[this.constants.ALIASES.factory].contract;

    const poolCount = Number(ethers.utils.formatUnits(await factoryContract.pool_count(this.constantOptions), 0));
    for (let i = 1; i <= poolCount; i++) {
        const address: string = await factoryContract.pool_list(poolCount - i);
        if (address.toLowerCase() === swapAddress.toLowerCase()) return `factory-v2-${poolCount - i}`
    }

    throw Error("Unknown pool")
}

async function getFactoryIdsAndSwapAddresses(this: ICurve): Promise<[string[], string[]]> {
    const factoryContract = this.contracts[this.constants.ALIASES.factory].contract;
    const factoryMulticallContract = this.contracts[this.constants.ALIASES.factory].multicallContract;

    const poolCount = Number(ethers.utils.formatUnits(await factoryContract.pool_count(this.constantOptions), 0));
    const calls = [];
    for (let i = 0; i < poolCount; i++) {
        calls.push(factoryMulticallContract.pool_list(i));
    }

    let factories: { id: string, address: string}[] = (await this.multicallProvider.all(calls) as string[]).map(
        (addr, i) => ({ id: `factory-v2-${i}`, address: addr.toLowerCase()})
    );
    const swapAddresses = Object.values(this.constants.POOLS_DATA as IDict<IPoolData>).map((pool: IPoolData) => pool.swap_address.toLowerCase());
    const blacklist = BLACK_LIST[this.chainId] ?? [];
    factories = factories.filter((f) => !swapAddresses.includes(f.address) && !blacklist.includes(f.address));

    return [factories.map((f) => f.id), factories.map((f) => f.address)]
}

async function getFactoryImplementations(this: ICurve, factorySwapAddresses: string[]): Promise<any[]> {
    const factoryMulticallContract = await this.contracts[this.constants.ALIASES.factory].multicallContract;

    const calls = [];
    for (const addr of factorySwapAddresses) {
        calls.push(factoryMulticallContract.get_implementation_address(addr));
    }

    return (await this.multicallProvider.all(calls) as string[]).map((a) => a.toLowerCase());
}

function setFactorySwapContracts(this: ICurve, factorySwapAddresses: string[], factorySwapABIs: any[]): void {
    factorySwapAddresses.forEach((addr, i) => {
        this.contracts[addr] = {
            contract: new Contract(addr, factorySwapABIs[i], this.signer || this.provider),
            multicallContract: new MulticallContract(addr, factorySwapABIs[i]),
        }
    });
}

async function getFactoryGaugeAddresses(this: ICurve, factorySwapAddresses: string[]): Promise<string[]> {
    const factoryMulticallContract = await this.contracts[this.constants.ALIASES.factory].multicallContract;

    const calls = [];
    for (const addr of factorySwapAddresses) {
        calls.push(factoryMulticallContract.get_gauge(addr));
    }

    return (await this.multicallProvider.all(calls) as string[]).map((addr) => addr.toLowerCase());
}

function setFactoryGaugeContracts(this: ICurve, factoryGaugeAddresses: string[]): void {
    factoryGaugeAddresses.filter((addr) => addr !== ethers.constants.AddressZero).forEach((addr, i) => {
        this.contracts[addr] = {
            contract: new Contract(addr, this.chainId === 1 ? factoryGaugeABI : gaugeChildABI, this.signer || this.provider),
            multicallContract: new MulticallContract(addr, this.chainId === 1 ? factoryGaugeABI : gaugeChildABI),
        }
    });
}

async function getFactorySymbolsAndNames(this: ICurve, factorySwapAddresses: string[]): Promise<[string[], string[]]> {
    const calls = [];
    for (const addr of factorySwapAddresses) {
        calls.push(this.contracts[addr].multicallContract.symbol(), this.contracts[addr].multicallContract.name());
    }

    const res = (await this.multicallProvider.all(calls) as string[]);

    const symbols: string[] = [];
    const names: string[] = [];
    for (let i = 0; i < factorySwapAddresses.length; i++) {
        symbols.push(res[2 * i]);
        names.push(res[(2 * i) + 1]);
    }

    return [symbols, names]
}

async function getFactoryReferenceAssets(this: ICurve, factorySwapAddresses: string[]): Promise<REFERENCE_ASSET[]> {
    const factoryMulticallContract = await this.contracts[this.constants.ALIASES.factory].multicallContract;

    const calls = [];
    for (const addr of factorySwapAddresses) {
        calls.push(factoryMulticallContract.get_pool_asset_type(addr));
    }

    return (await this.multicallProvider.all(calls) as ethers.BigNumber[]).map((t: ethers.BigNumber) => {
        return {
            0: "USD",
            1: "ETH",
            2: "BTC",
        }[ethers.utils.formatUnits(t, 0)] || "OTHER"
    }) as REFERENCE_ASSET[];
}

async function getFactoryCoinAddresses(this: ICurve, factorySwapAddresses: string[]): Promise<string[][]> {
    const factoryMulticallContract = await this.contracts[this.constants.ALIASES.factory].multicallContract;

    const calls = [];
    for (const addr of factorySwapAddresses) {
        calls.push(factoryMulticallContract.get_coins(addr));
    }

    return (await this.multicallProvider.all(calls) as string[][]).map(
        (addresses) => addresses
            .filter((addr) => addr !== ethers.constants.AddressZero)
            .map((addr) => addr.toLowerCase())
    );
}

function setFactoryCoinsContracts(this: ICurve, coinAddresses: string[][]): void {
    const flattenedCoinAddresses = Array.from(new Set(deepFlatten(coinAddresses)));
    for (const addr of flattenedCoinAddresses) {
        if (addr in this.contracts) continue;

        this.contracts[addr] = {
            contract: new Contract(addr, ERC20ABI, this.signer || this.provider),
            multicallContract: new MulticallContract(addr, ERC20ABI),
        }
    }
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

    dict[this.constants.NATIVE_TOKEN.address] = this.constants.NATIVE_TOKEN.symbol;

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

    return coinAddrNamesDict
}

async function getCoinAddressDecimalsDict(
    this: ICurve,
    coinAddresses: string[][],
    existingCoinAddressDecimalsDict: IDict<number>
): Promise<IDict<number>> {
    const flattenedCoinAddresses = Array.from(new Set(deepFlatten(coinAddresses))).filter((addr) => addr !== this.constants.NATIVE_TOKEN.address);
    const newCoinAddresses = [];
    const coinAddrNamesDict: IDict<number> = {};

    for (const addr of flattenedCoinAddresses) {
        if (addr in existingCoinAddressDecimalsDict) {
            coinAddrNamesDict[addr] = existingCoinAddressDecimalsDict[addr];
        } else {
            newCoinAddresses.push(addr);
        }
    }

    const calls = newCoinAddresses.map((addr) => {
        return this.contracts[addr].multicallContract.decimals();
    });

    const decimals = (await this.multicallProvider.all(calls) as ethers.BigNumber[]).map((_d) => Number(ethers.utils.formatUnits(_d, 0)));

    newCoinAddresses.forEach((addr, i) => {
        coinAddrNamesDict[addr] = decimals[i];
    });

    coinAddrNamesDict[this.constants.NATIVE_TOKEN.address] = 18

    return coinAddrNamesDict
}

async function getFactoryIsMeta(this: ICurve, factorySwapAddresses: string[]): Promise<boolean[]> {
    const factoryMulticallContract = await this.contracts[this.constants.ALIASES.factory].multicallContract;

    const calls = [];
    for (const addr of factorySwapAddresses) {
        calls.push(factoryMulticallContract.is_meta(addr));
    }

    return await this.multicallProvider.all(calls);
}

export async function getFactoryPoolData(this: ICurve, swapAddress?: string): Promise<IDict<IPoolData>> {
    const [poolIds, swapAddresses] = swapAddress ?
        [[await getRecentlyCreatedPoolId.call(this, swapAddress)], [swapAddress.toLowerCase()]]
        : await getFactoryIdsAndSwapAddresses.call(this);
    const implementations = await getFactoryImplementations.call(this, swapAddresses);
    const implementationABIDict = FACTORY_CONSTANTS[this.chainId].implementationABIDict;
    const swapABIs = implementations.map((addr: string) => implementationABIDict[addr]);
    setFactorySwapContracts.call(this, swapAddresses, swapABIs);
    const gaugeAddresses = await getFactoryGaugeAddresses.call(this, swapAddresses);
    setFactoryGaugeContracts.call(this, gaugeAddresses);
    const [poolSymbols, poolNames] = await getFactorySymbolsAndNames.call(this, swapAddresses);
    const referenceAssets = await getFactoryReferenceAssets.call(this, swapAddresses);
    const coinAddresses = await getFactoryCoinAddresses.call(this, swapAddresses);
    setFactoryCoinsContracts.call(this, coinAddresses);
    const existingCoinAddressNameDict = getExistingCoinAddressNameDict.call(this);
    const coinAddressNameDict = await getCoinAddressNameDict.call(this, coinAddresses, existingCoinAddressNameDict);
    const coinAddressDecimalsDict = await getCoinAddressDecimalsDict.call(this, coinAddresses, this.constants.DECIMALS);
    const isMeta = await getFactoryIsMeta.call(this, swapAddresses);
    const implementationBasePoolIdDict = FACTORY_CONSTANTS[this.chainId].implementationBasePoolIdDict;
    const basePoolIds = implementations.map((addr: string) => implementationBasePoolIdDict[addr]);
    setFactoryZapContracts.call(this, false);

    const FACTORY_POOLS_DATA: IDict<IPoolData> = {};
    for (let i = 0; i < poolIds.length; i++) {
        if (!isMeta[i]) {
            FACTORY_POOLS_DATA[poolIds[i]] = {
                name: poolNames[i].split(": ")[1].trim(),
                full_name: poolNames[i],
                symbol: poolSymbols[i],
                reference_asset: referenceAssets[i],
                swap_address: swapAddresses[i],
                token_address: swapAddresses[i],
                gauge_address: gaugeAddresses[i],
                is_plain: true,
                is_factory: true,
                underlying_coins: coinAddresses[i].map((addr) => coinAddressNameDict[addr]),
                wrapped_coins: coinAddresses[i].map((addr) => coinAddressNameDict[addr]),
                underlying_coin_addresses: coinAddresses[i],
                wrapped_coin_addresses: coinAddresses[i],
                underlying_decimals: coinAddresses[i].map((addr) => coinAddressDecimalsDict[addr]),
                wrapped_decimals: coinAddresses[i].map((addr) => coinAddressDecimalsDict[addr]),
                swap_abi: swapABIs[i],
                gauge_abi: this.chainId === 1 ? factoryGaugeABI : gaugeChildABI,
            };
        } else {
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

            FACTORY_POOLS_DATA[poolIds[i]] = {
                name: poolNames[i].split(": ")[1].trim(),
                full_name: poolNames[i],
                symbol: poolSymbols[i],
                reference_asset: referenceAssets[i],
                swap_address: swapAddresses[i],
                token_address: swapAddresses[i],
                gauge_address: gaugeAddresses[i],
                deposit_address: basePoolIdZapDict[basePoolIds[i]].address,
                is_meta: true,
                is_factory: true,
                base_pool: basePoolIds[i],
                underlying_coins: [coinAddressNameDict[coinAddresses[i][0]], ...basePoolIdCoinsDict[basePoolIds[i]]],
                wrapped_coins: coinAddresses[i].map((addr) => coinAddressNameDict[addr]),
                underlying_coin_addresses: [coinAddresses[i][0], ...basePoolIdCoinAddressesDict[basePoolIds[i]]],
                wrapped_coin_addresses: coinAddresses[i],
                underlying_decimals: [coinAddressDecimalsDict[coinAddresses[i][0]], ...basePoolIdDecimalsDict[basePoolIds[i]]],
                wrapped_decimals: coinAddresses[i].map((addr) => coinAddressDecimalsDict[addr]),
                swap_abi: swapABIs[i],
                gauge_abi: this.chainId === 1 ? factoryGaugeABI : gaugeChildABI,
                deposit_abi: factoryDepositABI,
            };
        }
    }

    return FACTORY_POOLS_DATA
}
