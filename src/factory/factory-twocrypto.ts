import { IDict, IPoolData, ICurve } from "../interfaces";
import { curve } from "../curve.js";
import ERC20ABI from "../constants/abis/ERC20.json" assert { type: 'json' };
import twocryptoFactorySwapABI from "../constants/abis/factory-twocrypto/factory-twocrypto-pool.json" assert { type: 'json' };
import factoryGaugeABI from "../constants/abis/gauge_factory.json" assert { type: 'json' };
import gaugeChildABI from "../constants/abis/gauge_child.json" assert { type: 'json' };


const deepFlatten = (arr: any[]): any[] => [].concat(...arr.map((v) => (Array.isArray(v) ? deepFlatten(v) : v)));

async function getRecentlyCreatedCryptoPoolId(this: ICurve, swapAddress: string): Promise<string> {
    const factoryContract = this.contracts[this.constants.ALIASES.twocrypto_factory].contract;

    const poolCount = Number(curve.formatUnits(await factoryContract.pool_count(this.constantOptions), 0));
    for (let i = 1; i <= poolCount; i++) {
        const address: string = await factoryContract.pool_list(poolCount - i);
        if (address.toLowerCase() === swapAddress.toLowerCase()) return `factory-twocrypto-${poolCount - i}`
    }

    throw Error("Unknown pool")
}

async function getTwocryptoFactoryIdsAndSwapAddresses(this: ICurve, fromIdx = 0): Promise<[string[], string[]]> {
    const factoryContract = this.contracts[this.constants.ALIASES.twocrypto_factory].contract;
    const factoryMulticallContract = this.contracts[this.constants.ALIASES.twocrypto_factory].multicallContract;

    const poolCount = Number(curve.formatUnits(await factoryContract.pool_count(this.constantOptions), 0));
    const calls = [];
    for (let i = fromIdx; i < poolCount; i++) {
        calls.push(factoryMulticallContract.pool_list(i));
    }
    if (calls.length === 0) return [[], []];

    let factories: { id: string, address: string}[] = (await this.multicallProvider.all(calls) as string[]).map(
        (addr, i) => ({ id: `factory-twocrypto-${fromIdx + i}`, address: addr.toLowerCase()})
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

async function getPoolsData(this: ICurve, factorySwapAddresses: string[]): Promise<[string[], string[][]]> {
    if(this.chainId === 1) {
        const factoryMulticallContract = this.contracts[this.constants.ALIASES.twocrypto_factory].multicallContract;

        const calls = [];
        for (const addr of factorySwapAddresses) {
            calls.push(factoryMulticallContract.get_gauge(addr));
            calls.push(factoryMulticallContract.get_coins(addr));
        }

        const res = await this.multicallProvider.all(calls);
        const gaugeAddresses = (res.filter((a, i) => i % 2 == 0) as string[]).map((a) => a.toLowerCase());
        const coinAddresses = _handleCoinAddresses.call(this, res.filter((a, i) => i % 2 == 1) as string[][]);

        return [gaugeAddresses, coinAddresses]
    } else {
        const factoryMulticallContract = this.contracts[this.constants.ALIASES.twocrypto_factory].multicallContract;
        const isFactoryGaugeNull = this.constants.ALIASES.gauge_factory === '0x0000000000000000000000000000000000000000'
        const factoryMulticallGaugeContract = this.contracts[this.constants.ALIASES.gauge_factory].multicallContract

        const calls = [];

        for (const addr of factorySwapAddresses) {
            if(!isFactoryGaugeNull) {
                calls.push(factoryMulticallGaugeContract.get_gauge_from_lp_token(addr))
            }
            calls.push(factoryMulticallContract.get_coins(addr));
        }

        const res = await this.multicallProvider.all(calls);
        if(!isFactoryGaugeNull) {
            const gaugeAddresses = (res.filter((a, i) => i % 2 == 0) as string[]).map((a) => a.toLowerCase());
            const coinAddresses = _handleCoinAddresses.call(this, res.filter((a, i) => i % 2 == 1) as string[][]);

            return [gaugeAddresses, coinAddresses]
        } else {
            const coinAddresses = _handleCoinAddresses.call(this, res.filter((a, i) => i % 2 == 0) as string[][]);
            const gaugeAddresses = Array.from(Array(factorySwapAddresses.length)).map(() => '0x0000000000000000000000000000000000000000')

            return [gaugeAddresses, coinAddresses]
        }
    }
}

function setTwocryptoFactorySwapContracts(this: ICurve, factorySwapAddresses: string[]): void {
    factorySwapAddresses.forEach((addr) => {
        this.setContract(addr, twocryptoFactorySwapABI);
    });
}

function setTwocryptoFactoryTokenContracts(this: ICurve, factoryTokenAddresses: string[]): void {
    factoryTokenAddresses.forEach((addr) => {
        this.setContract(addr, ERC20ABI);
    });
}

function setTwocryptoFactoryGaugeContracts(this: ICurve, factoryGaugeAddresses: string[]): void {
    factoryGaugeAddresses.filter((addr) => addr !== curve.constants.ZERO_ADDRESS).forEach((addr, i) => {
        this.setContract(addr, this.chainId === 1 ? factoryGaugeABI : gaugeChildABI);
    });
}

function setTwocryptoFactoryCoinsContracts(this: ICurve, coinAddresses: string[][]): void {
    const flattenedCoinAddresses = Array.from(new Set(deepFlatten(coinAddresses)));
    for (const addr of flattenedCoinAddresses) {
        if (addr in this.contracts) continue;
        this.setContract(addr, ERC20ABI);
    }
}

function getTwocryptoFactoryUnderlyingCoinAddresses(this: ICurve, coinAddresses: string[][]): string[][] {
    return [...coinAddresses.map((coins: string[]) => coins.map((c) => c))];
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

export async function getTwocryptoFactoryPoolData(this: ICurve, fromIdx = 0, swapAddress?: string): Promise<IDict<IPoolData>> {
    const [poolIds, swapAddresses] = swapAddress ?
        [[await getRecentlyCreatedCryptoPoolId.call(this, swapAddress)], [swapAddress.toLowerCase()]]
        : await getTwocryptoFactoryIdsAndSwapAddresses.call(this, fromIdx);
    if (poolIds.length === 0) return {};

    const [gaugeAddresses, coinAddresses] = await getPoolsData.call(this, swapAddresses);
    setTwocryptoFactorySwapContracts.call(this, swapAddresses);
    setTwocryptoFactoryGaugeContracts.call(this, gaugeAddresses);
    setTwocryptoFactoryCoinsContracts.call(this, coinAddresses);
    const underlyingCoinAddresses = getTwocryptoFactoryUnderlyingCoinAddresses.call(this, coinAddresses);
    const existingCoinAddressNameDict = getExistingCoinAddressNameDict.call(this);
    const [poolSymbols, poolNames, coinAddressNameDict, coinAddressDecimalsDict] =
        await getCoinsData.call(this, swapAddresses, coinAddresses, existingCoinAddressNameDict, this.constants.DECIMALS);

    const TWOCRYPTO_FACTORY_POOLS_DATA: IDict<IPoolData> = {};
    for (let i = 0; i < poolIds.length; i++) {
        TWOCRYPTO_FACTORY_POOLS_DATA[poolIds[i]] = {
            name: poolNames[i],
            full_name: poolNames[i],
            symbol: poolSymbols[i],
            reference_asset: "CRYPTO",
            swap_address: swapAddresses[i],
            token_address: swapAddresses[i],
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
            swap_abi: twocryptoFactorySwapABI,
            gauge_abi: this.chainId === 1 ? factoryGaugeABI : gaugeChildABI,
        };
    }

    return TWOCRYPTO_FACTORY_POOLS_DATA
}