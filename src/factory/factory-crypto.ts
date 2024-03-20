import { IDict, IPoolData, ICurve } from "../interfaces";
import { curve } from "../curve.js";
import ERC20ABI from "../constants/abis/ERC20.json" assert { type: 'json' };
import cryptoFactorySwapABI from "../constants/abis/factory-crypto/factory-crypto-pool-2.json" assert { type: 'json' };
import factoryGaugeABI from "../constants/abis/gauge_factory.json" assert { type: 'json' };
import gaugeChildABI from "../constants/abis/gauge_child.json" assert { type: 'json' };
import { setFactoryZapContracts } from "./common.js";
import { CRYPTO_FACTORY_CONSTANTS } from "./constants-crypto.js";


const deepFlatten = (arr: any[]): any[] => [].concat(...arr.map((v) => (Array.isArray(v) ? deepFlatten(v) : v)));

async function getRecentlyCreatedCryptoPoolId(this: ICurve, swapAddress: string): Promise<string> {
    const factoryContract = this.contracts[this.constants.ALIASES.crypto_factory].contract;

    const poolCount = Number(curve.formatUnits(await factoryContract.pool_count(this.constantOptions), 0));
    for (let i = 1; i <= poolCount; i++) {
        const address: string = await factoryContract.pool_list(poolCount - i);
        if (address.toLowerCase() === swapAddress.toLowerCase()) return `factory-crypto-${poolCount - i}`
    }

    throw Error("Unknown pool")
}

async function getCryptoFactoryIdsAndSwapAddresses(this: ICurve, fromIdx = 0): Promise<[string[], string[]]> {
    const factoryContract = this.contracts[this.constants.ALIASES.crypto_factory].contract;
    const factoryMulticallContract = this.contracts[this.constants.ALIASES.crypto_factory].multicallContract;

    const poolCount = Number(curve.formatUnits(await factoryContract.pool_count(this.constantOptions), 0));
    const calls = [];
    for (let i = fromIdx; i < poolCount; i++) {
        calls.push(factoryMulticallContract.pool_list(i));
    }
    if (calls.length === 0) return [[], []];

    let factories: { id: string, address: string}[] = (await this.multicallProvider.all(calls) as string[]).map(
        (addr, i) => ({ id: `factory-crypto-${fromIdx + i}`, address: addr.toLowerCase()})
    );

    const swapAddresses = Object.values(this.constants.POOLS_DATA as IDict<IPoolData>).map((pool: IPoolData) => pool.swap_address.toLowerCase());
    factories = factories.filter((f) => !swapAddresses.includes(f.address));

    return [factories.map((f) => f.id), factories.map((f) => f.address)]
}

function _handleCoinAddresses(this: ICurve, coinAddresses: string[][]): string[][] {
    return coinAddresses.map(
        (addresses) => addresses.map(
            (addr) => this.chainId === 137 && addr === "0x0000000000000000000000000000000000001010" ? this.constants.NATIVE_TOKEN.wrappedAddress : addr.toLowerCase()
        ));
}

async function _getLpTokenMap(this: ICurve,factorySwapAddresses: string[]): Promise<Record<string, string>> {
    const factoryMulticallContract = this.contracts[this.constants.ALIASES.crypto_factory].multicallContract;

    const LpTokenMap: Record<string, string> = {}
    const getLpTokenCalls = []
    for(const addr of factorySwapAddresses) {
        getLpTokenCalls.push(factoryMulticallContract.get_token(addr));
    }
    const lpTokens = await this.multicallProvider.all(getLpTokenCalls);

    lpTokens.forEach((item, index) => {
        if (typeof item === "string") {
            LpTokenMap[factorySwapAddresses[index]] = item
        } else {
            throw Error("Lp token is not string")
        }
    })
    return LpTokenMap
}

async function getPoolsData(this: ICurve, factorySwapAddresses: string[]): Promise<[string[], string[], string[][]]> {
    const factoryMulticallContract = this.contracts[this.constants.ALIASES.crypto_factory].multicallContract;
    const isfactoryGaugeNull = this.constants.ALIASES.gauge_factory === '0x0000000000000000000000000000000000000000'

    const calls = [];

    if(this.chainId === 1) {
        for (const addr of factorySwapAddresses) {
            calls.push(factoryMulticallContract.get_token(addr));
            calls.push(factoryMulticallContract.get_gauge(addr));
            calls.push(factoryMulticallContract.get_coins(addr));
        }

    } else {
        const factoryMulticallGaugeContract = this.contracts[this.constants.ALIASES.gauge_factory].multicallContract

        const LpTokenMap = await _getLpTokenMap.call(this, factorySwapAddresses)

        for (const addr of factorySwapAddresses) {
            calls.push(factoryMulticallContract.get_token(addr));
            if(!isfactoryGaugeNull) {
                calls.push(factoryMulticallGaugeContract.get_gauge_from_lp_token(LpTokenMap[addr]))
            }
            calls.push(factoryMulticallContract.get_coins(addr));
        }
    }

    const res = await this.multicallProvider.all(calls);

    if(isfactoryGaugeNull) {
        const tokenAddresses = (res.filter((a, i) => i % 3 == 0) as string[]).map((a) => a.toLowerCase());
        const coinAddresses = _handleCoinAddresses.call(this, res.filter((a, i) => i % 3 == 1) as string[][]);
        const gaugeAddresses = Array.from(Array(factorySwapAddresses.length)).map(() => '0x0000000000000000000000000000000000000000')

        return [tokenAddresses, gaugeAddresses, coinAddresses]
    } else {
        const tokenAddresses = (res.filter((a, i) => i % 3 == 0) as string[]).map((a) => a.toLowerCase());
        const gaugeAddresses = (res.filter((a, i) => i % 3 == 1) as string[]).map((a) => a.toLowerCase());
        const coinAddresses = _handleCoinAddresses.call(this, res.filter((a, i) => i % 3 == 2) as string[][]);

        return [tokenAddresses, gaugeAddresses, coinAddresses]
    }
}

function setCryptoFactorySwapContracts(this: ICurve, factorySwapAddresses: string[]): void {
    factorySwapAddresses.forEach((addr) => {
        this.setContract(addr, cryptoFactorySwapABI);
    });
}

function setCryptoFactoryTokenContracts(this: ICurve, factoryTokenAddresses: string[]): void {
    factoryTokenAddresses.forEach((addr) => {
        this.setContract(addr, ERC20ABI);
    });
}

function setCryptoFactoryGaugeContracts(this: ICurve, factoryGaugeAddresses: string[]): void {
    factoryGaugeAddresses.filter((addr) => addr !== curve.constants.ZERO_ADDRESS).forEach((addr, i) => {
        this.setContract(addr, this.chainId === 1 ? factoryGaugeABI : gaugeChildABI);
    });
}

function setCryptoFactoryCoinsContracts(this: ICurve, coinAddresses: string[][]): void {
    const flattenedCoinAddresses = Array.from(new Set(deepFlatten(coinAddresses)));
    for (const addr of flattenedCoinAddresses) {
        if (addr in this.contracts) continue;
        this.setContract(addr, ERC20ABI);
    }
}

function getCryptoFactoryUnderlyingCoinAddresses(this: ICurve, coinAddresses: string[][]): string[][] {
    return [...coinAddresses.map((coins: string[]) => coins.map((c) => c === this.constants.NATIVE_TOKEN.wrappedAddress ? this.constants.NATIVE_TOKEN.address : c))];
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
    tokenAddresses: string[],
    coinAddresses: string[][],
    existingCoinAddrNameDict: IDict<string>,
    existingCoinAddrDecimalsDict: IDict<number>
): Promise<[string[], string[], IDict<string>, IDict<number>]> {
    const flattenedCoinAddresses = Array.from(new Set(deepFlatten(coinAddresses)));
    const newCoinAddresses = [];
    const coinAddrNamesDict: IDict<string> = {};
    const coinAddrDecimalsDict: IDict<number> = {};

    for (const addr of flattenedCoinAddresses) {
        if (addr in existingCoinAddrNameDict) {
            coinAddrNamesDict[addr] = existingCoinAddrNameDict[addr];
            coinAddrDecimalsDict[addr] = existingCoinAddrDecimalsDict[addr];
        } else if (addr === "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2") {
            coinAddrNamesDict[addr] = "MKR";
            coinAddrDecimalsDict[addr] = 18;
        } else {
            newCoinAddresses.push(addr);
        }
    }

    const calls = [];
    for (const addr of tokenAddresses) {
        calls.push(this.contracts[addr].multicallContract.symbol());
        calls.push(this.contracts[addr].multicallContract.name());
    }

    for (const addr of newCoinAddresses) {
        calls.push(this.contracts[addr].multicallContract.symbol());
        calls.push(this.contracts[addr].multicallContract.decimals());
    }

    const res = await this.multicallProvider.all(calls);

    const res1 = res.slice(0, tokenAddresses.length * 2);
    const tokenSymbols = res1.filter((a, i) => i % 2 == 0) as string[];
    const tokenNames = res1.filter((a, i) => i % 2 == 1) as string[];

    const res2 = res.slice(tokenAddresses.length * 2);
    const symbols = res2.filter((a, i) => i % 2 == 0) as string[];
    const decimals = (res2.filter((a, i) => i % 2 == 1) as bigint[]).map((_d) => Number(curve.formatUnits(_d, 0)));

    newCoinAddresses.forEach((addr, i) => {
        coinAddrNamesDict[addr] = symbols[i];
        coinAddrDecimalsDict[addr] = decimals[i];
    });

    coinAddrNamesDict[this.constants.NATIVE_TOKEN.address] = this.constants.NATIVE_TOKEN.symbol;
    coinAddrDecimalsDict[this.constants.NATIVE_TOKEN.address] = 18;

    return [tokenSymbols, tokenNames, coinAddrNamesDict, coinAddrDecimalsDict]
}

export async function getCryptoFactoryPoolData(this: ICurve, fromIdx = 0, swapAddress?: string): Promise<IDict<IPoolData>> {
    const [poolIds, swapAddresses] = swapAddress ?
        [[await getRecentlyCreatedCryptoPoolId.call(this, swapAddress)], [swapAddress.toLowerCase()]]
        : await getCryptoFactoryIdsAndSwapAddresses.call(this, fromIdx);
    if (poolIds.length === 0) return {};

    const [tokenAddresses, gaugeAddresses, coinAddresses] = await getPoolsData.call(this, swapAddresses);
    setCryptoFactorySwapContracts.call(this, swapAddresses);
    setCryptoFactoryTokenContracts.call(this, tokenAddresses);
    setCryptoFactoryGaugeContracts.call(this, gaugeAddresses);
    setCryptoFactoryCoinsContracts.call(this, coinAddresses);
    setFactoryZapContracts.call(this, true);
    const underlyingCoinAddresses = getCryptoFactoryUnderlyingCoinAddresses.call(this, coinAddresses);
    const existingCoinAddressNameDict = getExistingCoinAddressNameDict.call(this);
    const [poolSymbols, poolNames, coinAddressNameDict, coinAddressDecimalsDict] =
        await getCoinsData.call(this, tokenAddresses, coinAddresses, existingCoinAddressNameDict, this.constants.DECIMALS);

    const CRYPTO_FACTORY_POOLS_DATA: IDict<IPoolData> = {};
    for (let i = 0; i < poolIds.length; i++) {
        const lpTokenBasePoolIdDict = CRYPTO_FACTORY_CONSTANTS[this.chainId].lpTokenBasePoolIdDict;
        const basePoolIdZapDict = CRYPTO_FACTORY_CONSTANTS[this.chainId].basePoolIdZapDict;
        const basePoolId = lpTokenBasePoolIdDict[coinAddresses[i][1].toLowerCase()];

        if (basePoolId) {  // isMeta
            const allPoolsData = {...this.constants.POOLS_DATA, ...CRYPTO_FACTORY_POOLS_DATA};
            const basePoolCoinNames = [...allPoolsData[basePoolId].underlying_coins];
            const basePoolCoinAddresses = [...allPoolsData[basePoolId].underlying_coin_addresses];
            const basePoolDecimals = [...allPoolsData[basePoolId].underlying_decimals];
            const basePoolZap = basePoolIdZapDict[basePoolId];

            this.constants.BASE_POOLS[basePoolId] = this.constants.BASE_POOLS[basePoolId] ? this.constants.BASE_POOLS[basePoolId] + 1: 1;

            CRYPTO_FACTORY_POOLS_DATA[poolIds[i]] = {
                name: poolNames[i].split(": ")[1].trim(),
                full_name: poolNames[i],
                symbol: poolSymbols[i],
                reference_asset: "CRYPTO",
                swap_address: swapAddresses[i],
                token_address: tokenAddresses[i],
                gauge_address: gaugeAddresses[i],
                deposit_address: basePoolZap.address,
                is_meta: true,
                is_crypto: true,
                is_factory: true,
                base_pool: basePoolId,
                underlying_coins: [coinAddressNameDict[underlyingCoinAddresses[i][0]], ...basePoolCoinNames],
                wrapped_coins: [...coinAddresses[i].map((addr) => coinAddressNameDict[addr])],
                underlying_coin_addresses: [underlyingCoinAddresses[i][0], ...basePoolCoinAddresses],
                wrapped_coin_addresses: coinAddresses[i],
                underlying_decimals: [coinAddressDecimalsDict[underlyingCoinAddresses[i][0]], ...basePoolDecimals],
                wrapped_decimals: [...coinAddresses[i].map((addr) => coinAddressDecimalsDict[addr])],
                swap_abi: cryptoFactorySwapABI,
                gauge_abi: this.chainId === 1 ? factoryGaugeABI : gaugeChildABI,
                deposit_abi: basePoolZap.ABI,
            };
        } else {
            CRYPTO_FACTORY_POOLS_DATA[poolIds[i]] = {
                name: poolNames[i].split(": ")[1].trim(),
                full_name: poolNames[i],
                symbol: poolSymbols[i],
                reference_asset: "CRYPTO",
                swap_address: swapAddresses[i],
                token_address: tokenAddresses[i],
                gauge_address: gaugeAddresses[i],
                is_crypto: true,
                is_plain: underlyingCoinAddresses[i].toString() === coinAddresses[i].toString(),  // WETH/ETH - NOT Plain
                is_factory: true,
                underlying_coins: [...underlyingCoinAddresses[i].map((addr) => coinAddressNameDict[addr])],
                wrapped_coins: [...coinAddresses[i].map((addr) => coinAddressNameDict[addr])],
                underlying_coin_addresses: underlyingCoinAddresses[i],
                wrapped_coin_addresses: coinAddresses[i],
                underlying_decimals: [...underlyingCoinAddresses[i].map((addr) => coinAddressDecimalsDict[addr])],
                wrapped_decimals: [...coinAddresses[i].map((addr) => coinAddressDecimalsDict[addr])],
                swap_abi: cryptoFactorySwapABI,
                gauge_abi: this.chainId === 1 ? factoryGaugeABI : gaugeChildABI,
            };
        }
    }

    return CRYPTO_FACTORY_POOLS_DATA
}