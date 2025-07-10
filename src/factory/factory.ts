import {Contract as MulticallContract} from "@curvefi/ethcall";
import {ICurve, IDict, IPoolData, IPoolDataShort, REFERENCE_ASSET} from "../interfaces";
import ERC20ABI from "../constants/abis/ERC20.json" with {type: "json"};
import PlainStableSwapNGABI from "../constants/abis/factory-stable-ng/plain-stableswap-ng.json" with {type: "json"};
import MetaStableSwapNGABI from "../constants/abis/factory-stable-ng/meta-stableswap-ng.json" with {type: "json"};
import factoryGaugeABI from "../constants/abis/gauge_factory.json" with {type: "json"};
import gaugeChildABI from "../constants/abis/gauge_child.json" with {type: "json"};
import StableNgBasePoolZapABI from "../constants/abis/stable-ng-base-pool-zap.json" with {type: "json"};
import {getPoolIdByAddress, setFactoryZapContracts} from "./common.js";
import {getPoolName, isStableNgPool} from "../utils.js";
import {formatUnits} from "../constants/utils.js";
import {Curve} from "../curve.js";

export const BLACK_LIST: { [index: number]: any } = {
    1: [
        "0x066b6e1e93fa7dcd3f0eb7f8bac7d5a747ce0bf9",
        "0xc61557c5d177bd7dc889a3b621eec333e168f68a",
    ],
    137: [
        "0x666dc3b4babfd063faf965bd020024af0dc51b64",
        "0xe4199bc5c5c1f63dba47b56b6db7144c51cf0bf8",
        "0x88c4d6534165510b2e2caf0a130d4f70aa4b6d71",
    ],
    42161: [
        "0xd7bb79aee866672419999a0496d99c54741d67b5",
    ],
}

const deepFlatten = (arr: any[]): any[] => [].concat(...arr.map((v) => (Array.isArray(v) ? deepFlatten(v) : v)));

export async function getBasePools(this: Curve, factoryAddress: string, rawSwapAddresses: string[], tmpPools: IPoolDataShort[]): Promise<{ids: string[], addresses: string[]}> {
    const factoryMulticallContract = this.contracts[factoryAddress].multicallContract;

    const calls = [];
    for (const addr of rawSwapAddresses) {
        calls.push(factoryMulticallContract.get_base_pool(addr));
    }

    const result: string[] = await this.multicallProvider.all(calls);

    const basePoolIds: string[] = [];
    const basePoolAddresses: string[] = [];

    result.forEach((item: string) => {
        if(item !== '0x0000000000000000000000000000000000000000') {
            basePoolIds.push(getPoolIdByAddress.call(this, tmpPools, item))
            basePoolAddresses.push(item)
        } else {
            basePoolIds.push('')
            basePoolAddresses.push(item)
        }
    })

    return {
        ids: basePoolIds,
        addresses: basePoolAddresses,
    };
}

async function getRecentlyCreatedPoolId(this: ICurve, swapAddress: string, factoryAddress: string): Promise<string> {
    const factoryContract = this.contracts[factoryAddress].contract;

    const prefix = factoryAddress === this.constants.ALIASES.factory? 'factory-v2' : 'factory-stable-ng'

    const poolCount = Number(this.formatUnits(await factoryContract.pool_count(this.constantOptions), 0));
    for (let i = 1; i <= poolCount; i++) {
        const address: string = await factoryContract.pool_list(poolCount - i);
        if (address.toLowerCase() === swapAddress.toLowerCase()) return `${prefix}-${poolCount - i}`
    }

    throw Error("Unknown pool")
}

async function getFactoryIdsAndSwapAddresses(this: ICurve, fromIdx = 0, factoryAddress: string): Promise<[string[], string[]]> {
    const factoryContract = this.contracts[factoryAddress].contract;
    const factoryMulticallContract = this.contracts[factoryAddress].multicallContract;

    const poolCount = Number(this.formatUnits(await factoryContract.pool_count(this.constantOptions), 0));

    const calls = [];
    for (let i = fromIdx; i < poolCount; i++) {
        calls.push(factoryMulticallContract.pool_list(i));
    }
    if (calls.length === 0) return [[], []];

    const prefix = factoryAddress === this.constants.ALIASES.factory ? "factory-v2-" :
        factoryAddress === this.constants.ALIASES.crvusd_factory ? "factory-crvusd-" :
        factoryAddress === this.constants.ALIASES.stable_ng_factory ? "factory-stable-ng-" : "factory-eywa-";
    let factories: { id: string, address: string}[] = (await this.multicallProvider.all(calls) as string[]).map(
        (addr, i) => ({ id: prefix + (fromIdx + i), address: addr.toLowerCase()})
    );
    const swapAddresses = Object.values(this.constants.POOLS_DATA as IDict<IPoolData>).map((pool: IPoolData) => pool.swap_address.toLowerCase());
    const blacklist = BLACK_LIST[this.chainId] ?? [];
    factories = factories.filter((f) => !swapAddresses.includes(f.address) && !blacklist.includes(f.address));

    return [factories.map((f) => f.id), factories.map((f) => f.address)]
}

function _handleReferenceAssets(referenceAssets: bigint[]): REFERENCE_ASSET[] {
    return referenceAssets.map((t: bigint) => {
        return {
            0: "USD",
            1: "ETH",
            2: "BTC",
        }[formatUnits(t, 0)] || "OTHER"
    }) as REFERENCE_ASSET[];
}

function _handleCoinAddresses(this: ICurve, coinAddresses: string[][]): string[][] {
    return coinAddresses.map(
        (addresses) => addresses
            .filter((addr) => addr !== this.constants.ZERO_ADDRESS)
            .map((addr) => this.chainId === 137 && addr === "0x0000000000000000000000000000000000001010" ? this.constants.NATIVE_TOKEN.address : addr.toLowerCase())
    );
}

async function getPoolsData(this: ICurve, factorySwapAddresses: string[], factoryAddress: string): Promise<[string[], string[], string[], REFERENCE_ASSET[], string[], string[], boolean[], string[][]]> {
    const factoryMulticallContract = this.contracts[factoryAddress].multicallContract;
    const isChildGaugeFactoryNull = this.chainId !== 1 && this.constants.ALIASES.child_gauge_factory === this.constants.ZERO_ADDRESS;
    const isChildGaugeFactoryOldNull = !("child_gauge_factory_old" in this.constants.ALIASES);
    const isStableNgFactory = factoryAddress === this.constants.ALIASES['stable_ng_factory'];

    const calls = [];
    for (const addr of factorySwapAddresses) {
        const tempSwapContract = new MulticallContract(addr, ERC20ABI);

        calls.push(factoryMulticallContract.get_implementation_address(addr));

        if(this.chainId === 1) {
            calls.push(factoryMulticallContract.get_gauge(addr));
        } else {
            if(!isChildGaugeFactoryNull) {
                calls.push(this.contracts[this.constants.ALIASES.child_gauge_factory].multicallContract.get_gauge_from_lp_token(addr));
            }
            if(!isChildGaugeFactoryOldNull) {
                calls.push(this.contracts[this.constants.ALIASES.child_gauge_factory_old].multicallContract.get_gauge_from_lp_token(addr));
            }
        }

        if (!isStableNgFactory) calls.push(factoryMulticallContract.get_pool_asset_type(addr));

        calls.push(tempSwapContract.symbol());
        calls.push(tempSwapContract.name());
        calls.push(factoryMulticallContract.is_meta(addr));
        calls.push(factoryMulticallContract.get_coins(addr));
    }

    const res = await this.multicallProvider.all(calls);

    if(isChildGaugeFactoryNull || isChildGaugeFactoryOldNull || isStableNgFactory) {
        for(let index = 0; index < res.length; index++) {
            if(isChildGaugeFactoryNull && index % 8 == 1) res.splice(index, 0 , this.constants.ZERO_ADDRESS);
            if(isChildGaugeFactoryOldNull && index % 8 == 2) res.splice(index, 0 , this.constants.ZERO_ADDRESS);
            if(isStableNgFactory && index % 8 == 3) res.splice(index, 0 , -1);
        }
    }

    const implememntationAddresses = (res.filter((a, i) => i % 8 == 0) as string[]).map((a) => a.toLowerCase());
    const gaugeAddresses = (res.filter((a, i) => i % 8 == 1) as string[]).map((a) => a.toLowerCase());
    const oldGaugeAddresses = (res.filter((a, i) => i % 8 == 2) as string[]).map((a) => a.toLowerCase());
    const referenceAssets = _handleReferenceAssets(res.filter((a, i) => i % 8 == 3) as bigint[]);
    const symbols = res.filter((a, i) => i % 8 == 4) as string[];
    const names = res.filter((a, i) => i % 8 == 5) as string[];
    const isMeta = res.filter((a, i) => i % 8 == 6) as boolean[];
    const coinAddresses = _handleCoinAddresses.call(this, res.filter((a, i) => i % 8 == 7) as string[][]);

    return [implememntationAddresses, gaugeAddresses, oldGaugeAddresses, referenceAssets, symbols, names, isMeta, coinAddresses]
}

function setFactorySwapContracts(this: ICurve, factorySwapAddresses: string[], factorySwapABIs: any[]): void {
    factorySwapAddresses.forEach((addr, i) => {
        this.setContract(addr, factorySwapABIs[i]);
    });
}

function setFactoryGaugeContracts(this: ICurve, factoryGaugeAddresses: string[]): void {
    factoryGaugeAddresses.filter((addr) => addr !== this.constants.ZERO_ADDRESS).forEach((addr) => {
        this.setContract(addr, this.chainId === 1 ? factoryGaugeABI : gaugeChildABI);
    });
}

function setFactoryCoinsContracts(this: ICurve, coinAddresses: string[][]): void {
    const flattenedCoinAddresses = Array.from(new Set(deepFlatten(coinAddresses)));
    for (const addr of flattenedCoinAddresses) {
        if (addr in this.contracts) continue;
        this.setContract(addr, ERC20ABI);
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

async function getCoinsData(
    this: ICurve,
    coinAddresses: string[][],
    existingCoinAddrNameDict: IDict<string>,
    existingCoinAddrDecimalsDict: IDict<number>
): Promise<[IDict<string>, IDict<number>]> {
    const flattenedCoinAddresses = Array.from(new Set(deepFlatten(coinAddresses)));
    const newCoinAddresses = [];
    const coinAddrNamesDict: IDict<string> = {};
    const coinAddrDecimalsDict: IDict<number> = {};

    for (const addr of flattenedCoinAddresses) {
        if (addr in existingCoinAddrNameDict) {
            coinAddrNamesDict[addr] = existingCoinAddrNameDict[addr];
            coinAddrDecimalsDict[addr] = existingCoinAddrDecimalsDict[addr];
        } else {
            newCoinAddresses.push(addr);
        }
    }

    const calls = [];
    for (const addr of newCoinAddresses) {
        calls.push(this.contracts[addr].multicallContract.symbol());
        calls.push(this.contracts[addr].multicallContract.decimals());
    }

    const res = await this.multicallProvider.all(calls);
    const symbols = res.filter((a, i) => i % 2 == 0) as string[];
    const decimals = (res.filter((a, i) => i % 2 == 1) as bigint[]).map((_d) => Number(this.formatUnits(_d, 0)));

    newCoinAddresses.forEach((addr, i) => {
        coinAddrNamesDict[addr] = symbols[i];
        coinAddrDecimalsDict[addr] = decimals[i];
    });

    return [coinAddrNamesDict, coinAddrDecimalsDict]
}


export async function getFactoryPoolData(this: Curve, fromIdx = 0, swapAddress?: string, factoryAddress = this.constants.ALIASES.factory): Promise<IDict<IPoolData>> {
    const [rawPoolIds, rawSwapAddresses] = swapAddress ?
        [[await getRecentlyCreatedPoolId.call(this, swapAddress, factoryAddress)], [swapAddress.toLowerCase()]]
        : await getFactoryIdsAndSwapAddresses.call(this, fromIdx, factoryAddress);
    if (rawPoolIds.length === 0) return {};

    const is_ng = factoryAddress === this.constants.ALIASES.stable_ng_factory;
    const [rawImplementations, rawGauges, rawOldGauges, rawReferenceAssets, rawPoolSymbols, rawPoolNames, rawIsMeta, rawCoinAddresses] =
        await getPoolsData.call(this, rawSwapAddresses, factoryAddress);
    const poolIds: string[] = [];
    const swapAddresses: string[] = [];
    const implementations: string[] = [];
    const gaugeAddresses: string[] = [];
    const referenceAssets: REFERENCE_ASSET[] = [];
    const poolSymbols: string[] = [];
    const poolNames: string[] = [];
    const isMeta: boolean[] = [];
    const coinAddresses: string[][] = [];
    const implementationABIDict = this.constants.STABLE_FACTORY_CONSTANTS.implementationABIDict ?? {};
    for (let i = 0; i < rawPoolIds.length; i++) {
        if (is_ng || (rawImplementations[i] in implementationABIDict)) {
            poolIds.push(rawPoolIds[i]);
            swapAddresses.push(rawSwapAddresses[i]);
            implementations.push(rawImplementations[i]);
            gaugeAddresses.push(rawGauges[i] !== this.constants.ZERO_ADDRESS ? rawGauges[i] : rawOldGauges[i]);
            referenceAssets.push(rawReferenceAssets[i]);
            poolSymbols.push(rawPoolSymbols[i]);
            poolNames.push(rawPoolNames[i]);
            isMeta.push(rawIsMeta[i]);
            coinAddresses.push(rawCoinAddresses[i]);
        }
    }
    const swapABIs = implementations.map((addr: string, i: number) => is_ng ?
        (isMeta[i] ? MetaStableSwapNGABI : PlainStableSwapNGABI) :
        implementationABIDict[addr]);
    setFactorySwapContracts.call(this, swapAddresses, swapABIs);
    setFactoryGaugeContracts.call(this, gaugeAddresses);
    setFactoryCoinsContracts.call(this, coinAddresses);
    setFactoryZapContracts.call(this, false);
    const [coinAddressNameDict, coinAddressDecimalsDict] =
        await getCoinsData.call(this, coinAddresses, getExistingCoinAddressNameDict.call(this), this.constants.DECIMALS);

    const tmpPools: IPoolDataShort[] = [];
    poolIds.forEach((item, index) => {
        tmpPools.push({
            id: item,
            address: swapAddresses[index],
        })
    })

    const basePools = await getBasePools.call(this, factoryAddress, swapAddresses, tmpPools);

    const FACTORY_POOLS_DATA: IDict<IPoolData> = {};
    for (let i = 0; i < poolIds.length; i++) {
        if (!isMeta[i]) {
            FACTORY_POOLS_DATA[poolIds[i]] = {
                name: getPoolName(poolNames[i]),
                full_name: poolNames[i],
                symbol: poolSymbols[i],
                reference_asset: referenceAssets[i],
                swap_address: swapAddresses[i],
                token_address: swapAddresses[i],
                gauge_address: gaugeAddresses[i],
                implementation_address: implementations[i], // Only for testing
                is_plain: true,
                is_factory: true,
                underlying_coins: [...coinAddresses[i].map((addr) => coinAddressNameDict[addr])],
                wrapped_coins: [...coinAddresses[i].map((addr) => coinAddressNameDict[addr])],
                underlying_coin_addresses: coinAddresses[i],
                wrapped_coin_addresses: coinAddresses[i],
                underlying_decimals: [...coinAddresses[i].map((addr) => coinAddressDecimalsDict[addr])],
                wrapped_decimals: [...coinAddresses[i].map((addr) => coinAddressDecimalsDict[addr])],
                swap_abi: swapABIs[i],
                gauge_abi: this.chainId === 1 ? factoryGaugeABI : gaugeChildABI,
                is_ng,
            };
        } else {
            const allPoolsData = {...this.constants.POOLS_DATA, ...this.constants.FACTORY_POOLS_DATA, ...this.constants.STABLE_NG_FACTORY_POOLS_DATA, ...FACTORY_POOLS_DATA};
            const basePoolIdCoinsDict = Object.fromEntries(basePools.ids.map(
                (poolId) => [poolId, allPoolsData[poolId]?.underlying_coins]));
            const basePoolIdCoinAddressesDict = Object.fromEntries(basePools.ids.map(
                (poolId) => [poolId, allPoolsData[poolId]?.underlying_coin_addresses]));
            const basePoolIdDecimalsDict = Object.fromEntries(basePools.ids.map(
                (poolId) => [poolId, allPoolsData[poolId]?.underlying_decimals]));
            const basePoolIdZapDict = this.constants.STABLE_FACTORY_CONSTANTS.basePoolIdZapDict ?? {};

            this.constants.BASE_POOLS[basePools.ids[i]] = this.constants.BASE_POOLS[basePools.ids[i]] ? this.constants.BASE_POOLS[basePools.ids[i]] + 1: 1;

            let deposit_address = this.constants.STABLE_FACTORY_CONSTANTS.stableNgBasePoolZap ?? this.constants.ZERO_ADDRESS;
            let deposit_abi = StableNgBasePoolZapABI;
            if (isStableNgPool(basePools.ids[i])) {
                this.setContract(deposit_address, StableNgBasePoolZapABI);
            } else {
                deposit_address = basePoolIdZapDict[basePools.ids[i]].address;
                deposit_abi = basePoolIdZapDict[basePools.ids[i]].ABI;
            }

            FACTORY_POOLS_DATA[poolIds[i]] = {
                name: getPoolName(poolNames[i]),
                full_name: poolNames[i],
                symbol: poolSymbols[i],
                reference_asset: referenceAssets[i],
                swap_address: swapAddresses[i],
                token_address: swapAddresses[i],
                gauge_address: gaugeAddresses[i],
                deposit_address,
                implementation_address: implementations[i], // Only for testing
                is_meta: true,
                is_factory: true,
                base_pool: basePools.ids[i],
                underlying_coins: [coinAddressNameDict[coinAddresses[i][0]], ...basePoolIdCoinsDict[basePools.ids[i]]],
                wrapped_coins: [...coinAddresses[i].map((addr) => coinAddressNameDict[addr])],
                underlying_coin_addresses: [coinAddresses[i][0], ...basePoolIdCoinAddressesDict[basePools.ids[i]]],
                wrapped_coin_addresses: coinAddresses[i],
                underlying_decimals: [coinAddressDecimalsDict[coinAddresses[i][0]], ...basePoolIdDecimalsDict[basePools.ids[i]]],
                wrapped_decimals: [...coinAddresses[i].map((addr) => coinAddressDecimalsDict[addr])],
                swap_abi: swapABIs[i],
                gauge_abi: this.chainId === 1 ? factoryGaugeABI : gaugeChildABI,
                deposit_abi,
                is_ng,
            };
        }
    }

    return FACTORY_POOLS_DATA
}
