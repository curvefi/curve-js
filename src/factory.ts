import { Contract, ethers } from "ethers";
import {Contract as MulticallContract, Provider as MulticallProvider} from "ethcall";
import { DictInterface, PoolDataInterface } from "./interfaces";
import ERC20ABI from "./constants/abis/json/ERC20.json";
import factorySwapABI from "./constants/abis/json/factoryPools/swap.json";
import factoryDepositABI from "./constants/abis/json/factoryPools/deposit.json";
import factoryGaugeABI from "./constants/abis/json/gauge_factory.json";
import MetaUSDABI from "./constants/abis/json/factory-v2/MetaUSD.json";
import MetaUSDBalancesABI from "./constants/abis/json/factory-v2/MetaUSDBalances.json";
import MetaBTCABI from "./constants/abis/json/factory-v2/MetaBTC.json";
import MetaBTCBalancesABI from "./constants/abis/json/factory-v2/MetaBTCBalances.json";
import MetaBTCRenABI from "./constants/abis/json/factory-v2/MetaBTCRen.json";
import MetaBTCRenBalancesABI from "./constants/abis/json/factory-v2/MetaBTCBalancesRen.json";
import Plain2BasicABI from "./constants/abis/json/factory-v2/Plain2Basic.json";
import Plain2BalancesABI from "./constants/abis/json/factory-v2/Plain2Balances.json";
import Plain2ETHABI from "./constants/abis/json/factory-v2/Plain2ETH.json";
import Plain2OptimizedABI from "./constants/abis/json/factory-v2/Plain2Optimized.json";
import Plain3BasicABI from "./constants/abis/json/factory-v2/Plain3Basic.json";
import Plain3BalancesABI from "./constants/abis/json/factory-v2/Plain3Balances.json";
import Plain3ETHABI from "./constants/abis/json/factory-v2/Plain3ETH.json";
import Plain3OptimizedABI from "./constants/abis/json/factory-v2/Plain3Optimized.json";
import Plain4BasicABI from "./constants/abis/json/factory-v2/Plain4Basic.json";
import Plain4BalancesABI from "./constants/abis/json/factory-v2/Plain4Balances.json";
import Plain4ETHABI from "./constants/abis/json/factory-v2/Plain4ETH.json";
import Plain4OptimizedABI from "./constants/abis/json/factory-v2/Plain4Optimized.json";
import {DECIMALS_LOWER_CASE} from "./curve";


const implementationABIDict: DictInterface<any> = {
    "0x5F890841f657d90E081bAbdB532A05996Af79Fe6": factorySwapABI,

    "0x213be373FDff327658139C7df330817DAD2d5bBE": MetaUSDABI,
    "0x55Aa9BF126bCABF0bDC17Fa9E39Ec9239e1ce7A9": MetaUSDBalancesABI,

    "0xC6A8466d128Fbfd34AdA64a9FFFce325D57C9a52": MetaBTCABI,
    "0xc4C78b08fA0c3d0a312605634461A88184Ecd630": MetaBTCBalancesABI,

    "0xECAaecd9d2193900b424774133B1f51ae0F29d9E": MetaBTCRenABI,
    "0x40fD58D44cFE63E8517c9Bb3ac98676838Ea56A8": MetaBTCRenBalancesABI,

    "0x6523Ac15EC152Cb70a334230F6c5d62C5Bd963f1": Plain2BasicABI,
    "0x24D937143d3F5cF04c72bA112735151A8CAE2262": Plain2BalancesABI,
    "0x6326DEbBAa15bCFE603d831e7D75f4fc10d9B43E": Plain2ETHABI,
    "0x4A4d7868390EF5CaC51cDA262888f34bD3025C3F": Plain2OptimizedABI,

    "0x9B52F13DF69D79Ec5aAB6D1aCe3157d29B409cC3": Plain3BasicABI,
    "0x50b085f2e5958C4A87baf93A8AB79F6bec068494": Plain3BalancesABI,
    "0x8c1aB78601c259E1B43F19816923609dC7d7de9B": Plain3ETHABI,
    "0xE5F4b89E0A16578B3e0e7581327BDb4C712E44De": Plain3OptimizedABI,

    "0x5Bd47eA4494e0F8DE6e3Ca10F1c05F55b72466B8": Plain4BasicABI,
    "0xd35B58386705CE75CE6d09842E38E9BE9CDe5bF6": Plain4BalancesABI,
    "0x88855cdF2b0A8413D470B86952E726684de915be": Plain4ETHABI,
    "0xaD4753D045D3Aed5C1a6606dFb6a7D7AD67C1Ad7": Plain4OptimizedABI,
}

const basePoolAddressNameDict: DictInterface<string> = {
    "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7": "3pool",
    "0x7fC77b5c7614E1533320Ea6DDc2Eb61fa00A9714": "sbtc",
    "0x93054188d876f558f4a66B2EF1d97d16eDf0895B": "ren",
}

const basePoolAddressCoinsDict: DictInterface<string[]> = {
    "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7": ['DAI', 'USDC', 'USDT'],     // 3pool
    "0x7fC77b5c7614E1533320Ea6DDc2Eb61fa00A9714": ['renBTC', 'WBTC', 'sBTC'],  // sbtc
    "0x93054188d876f558f4a66B2EF1d97d16eDf0895B": ['renBTC', 'WBTC'],          // ren
}

const basePoolAddressCoinAddressesDict: DictInterface<string[]> = {
    "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7": [  // 3pool
        '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    ].map((addr) => addr.toLowerCase()),

    "0x7fC77b5c7614E1533320Ea6DDc2Eb61fa00A9714": [  // sbtc
        '0xEB4C2781e4ebA804CE9a9803C67d0893436bB27D',
        '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
        '0xfE18be6b3Bd88A2D2A7f928d00292E7a9963CfC6',
    ].map((addr) => addr.toLowerCase()),

    "0x93054188d876f558f4a66B2EF1d97d16eDf0895B": [  // ren
        '0xEB4C2781e4ebA804CE9a9803C67d0893436bB27D',
        '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    ].map((addr) => addr.toLowerCase()),
}

const basePoolAddressDecimalsDict: DictInterface<number[]> = {
    "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7": [18, 6, 6],  // 3pool
    "0x7fC77b5c7614E1533320Ea6DDc2Eb61fa00A9714": [8, 8, 18],  // sbtc
    "0x93054188d876f558f4a66B2EF1d97d16eDf0895B": [8, 8],      // ren
}

const basePoolAddressZapDict: DictInterface<string> = {
    "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7": "0xA79828DF1850E8a3A3064576f380D90aECDD3359".toLowerCase(),  // 3pool
    "0x7fC77b5c7614E1533320Ea6DDc2Eb61fa00A9714": "0x7abdbaf29929e7f8621b757d2a7c04d78d633834".toLowerCase(),  // sbtc
    "0x93054188d876f558f4a66B2EF1d97d16eDf0895B": "0x7abdbaf29929e7f8621b757d2a7c04d78d633834".toLowerCase(),  // ren TODO CHECK!!!
}

interface CurveInterface {
    provider: ethers.providers.Web3Provider | ethers.providers.JsonRpcProvider,
    multicallProvider: MulticallProvider,
    signer: ethers.Signer,
    signerAddress: string,
    chainId: number,
    contracts: { [index: string]: { contract: Contract, multicallContract: MulticallContract } },
    feeData: { gasPrice?: number, maxFeePerGas?: number, maxPriorityFeePerGas?: number },
    constantOptions: { gasLimit: number },
    options: { gasPrice?: number | ethers.BigNumber, maxFeePerGas?: number | ethers.BigNumber, maxPriorityFeePerGas?: number | ethers.BigNumber },
    constants: DictInterface<any>;
}

const deepFlatten = (arr: any[]): any[] => [].concat(...arr.map((v) => (Array.isArray(v) ? deepFlatten(v) : v)));

async function getFactorySwapAddresses(this: CurveInterface): Promise<string[]> {
    const factoryContract = this.contracts[this.constants.ALIASES.factory].contract;
    const factoryMulticallContract = this.contracts[this.constants.ALIASES.factory].multicallContract;

    const poolCount = Number(ethers.utils.formatUnits(await factoryContract.pool_count(this.constantOptions), 0));
    const calls = [];
    for (let i = 0; i < poolCount; i++) {
        calls.push(factoryMulticallContract.pool_list(i));
    }

    const factorySwapAddresses: string[] = (await this.multicallProvider.all(calls) as string[]).map((addr) => addr.toLowerCase());
    const swapAddresses = Object.values(this.constants.POOLS_DATA as PoolDataInterface).map((pool: PoolDataInterface) => pool.swap_address.toLowerCase());

    return factorySwapAddresses.filter((addr) => !swapAddresses.includes(addr));
}

async function getFactorySwapABIs(this: CurveInterface, factorySwapAddresses: string[]): Promise<any[]> {
    const factoryMulticallContract = await this.contracts[this.constants.ALIASES.factory].multicallContract;

    const calls = [];
    for (const addr of factorySwapAddresses) {
        calls.push(factoryMulticallContract.get_implementation_address(addr));
    }
    const implementationAddresses: string[] = await this.multicallProvider.all(calls);

    return implementationAddresses.map((addr: string) => implementationABIDict[addr]);
}

function setFactorySwapContracts(this: CurveInterface, factorySwapAddresses: string[], factorySwapABIs: any[]): void {
    factorySwapAddresses.forEach((addr, i) => {
        this.contracts[addr] = {
            contract: new Contract(addr, factorySwapABIs[i], this.signer || this.provider),
            multicallContract: new MulticallContract(addr, factorySwapABIs[i]),
        }
    });
}

async function getFactoryGaugeAddresses(this: CurveInterface, factorySwapAddresses: string[]): Promise<string[]> {
    const factoryMulticallContract = await this.contracts[this.constants.ALIASES.factory].multicallContract;

    const calls = [];
    for (const addr of factorySwapAddresses) {
        calls.push(factoryMulticallContract.get_gauge(addr));
    }

    return (await this.multicallProvider.all(calls) as string[]).map((addr) => addr.toLowerCase());
}

function setFactoryGaugeContracts(this: CurveInterface, factoryGaugeAddresses: string[]): void {
    factoryGaugeAddresses.filter((addr) => addr !== ethers.constants.AddressZero).forEach((addr, i) => {
        this.contracts[addr] = {
            contract: new Contract(addr, factoryGaugeABI, this.signer || this.provider),
            multicallContract: new MulticallContract(addr, factoryGaugeABI),
        }
    });
}


async function getFactoryPoolNames(this: CurveInterface, factorySwapAddresses: string[]): Promise<string[]> {
    const calls = [];
    for (const addr of factorySwapAddresses) {
        calls.push(this.contracts[addr].multicallContract.symbol());
    }

    return (await this.multicallProvider.all(calls) as string[]).map((name) => name.slice(0, -2));
}

async function getFactoryReferenceAssets(this: CurveInterface, factorySwapAddresses: string[]): Promise<('USD' | 'ETH' | 'BTC' | 'OTHER')[]> {
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
    }) as ('USD' | 'ETH' | 'BTC' | 'OTHER')[];
}

async function getFactoryCoinAddresses(this: CurveInterface, factorySwapAddresses: string[]): Promise<string[][]> {
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

function setFactoryCoinsContracts(this: CurveInterface, coinAddresses: string[][]): void {
    const flattenedCoinAddresses = Array.from(new Set(deepFlatten(coinAddresses)));
    for (const addr of flattenedCoinAddresses) {
        if (addr in this.contracts) continue;

        this.contracts[addr] = {
            contract: new Contract(addr, ERC20ABI, this.signer || this.provider),
            multicallContract: new MulticallContract(addr, ERC20ABI),
        }
    }
}

function getExistingCoinAddressNameDict(poolsData: DictInterface<PoolDataInterface>): DictInterface<string> {
    const dict: DictInterface<string> = {}
    for (const poolData of Object.values(poolsData)) {
        poolData.coin_addresses.forEach((addr, i) => {
            if (!(addr.toLowerCase() in dict)) {
                dict[addr.toLowerCase()] = poolData.coins[i]
            }
        });

        poolData.underlying_coin_addresses.forEach((addr, i) => {
            if (!(addr.toLowerCase() in dict)) {
                dict[addr.toLowerCase()] = poolData.underlying_coins[i]
            }
        });
    }

    return dict
}

async function getCoinAddressNameDict(
    this: CurveInterface,
    coinAddresses: string[][],
    existingCoinAddrNameDict: DictInterface<string>
): Promise<DictInterface<string>> {
    const flattenedCoinAddresses = Array.from(new Set(deepFlatten(coinAddresses)));
    const newCoinAddresses = [];
    const coinAddrNamesDict: DictInterface<string> = {};

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
    this: CurveInterface,
    coinAddresses: string[][],
    existingCoinAddressDecimalsDict: DictInterface<number>
): Promise<DictInterface<number>> {
    const flattenedCoinAddresses = Array.from(new Set(deepFlatten(coinAddresses)));
    const newCoinAddresses = [];
    const coinAddrNamesDict: DictInterface<number> = {};

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
        existingCoinAddressDecimalsDict[addr] = decimals[i];  // Add to DECIMALS_LOWER_CASE TODO move to another place
    });

    return coinAddrNamesDict
}

async function getFactoryIsMeta(this: CurveInterface, factorySwapAddresses: string[]): Promise<boolean[]> {
    const factoryMulticallContract = await this.contracts[this.constants.ALIASES.factory].multicallContract;

    const calls = [];
    for (const addr of factorySwapAddresses) {
        calls.push(factoryMulticallContract.is_meta(addr));
    }

    return await this.multicallProvider.all(calls);
}

async function getFactoryBasePoolAddresses(this: CurveInterface, factorySwapAddresses: string[]): Promise<string[]> {
    const factoryMulticallContract = await this.contracts[this.constants.ALIASES.factory].multicallContract;

    const calls = [];
    for (const addr of factorySwapAddresses) {
        calls.push(factoryMulticallContract.get_base_pool(addr));
    }

    return await this.multicallProvider.all(calls);
}

export async function getFactoryPoolData(this: CurveInterface): Promise<DictInterface<PoolDataInterface>> {
    const swapAddresses = await getFactorySwapAddresses.call(this);
    const swapABIs = await getFactorySwapABIs.call(this, swapAddresses);
    setFactorySwapContracts.call(this, swapAddresses, swapABIs);
    this.constants.LP_TOKENS.push(...swapAddresses); // TODO move to another place
    const gaugeAddresses = await getFactoryGaugeAddresses.call(this, swapAddresses);
    setFactoryGaugeContracts.call(this, gaugeAddresses);
    this.constants.GAUGES.push(...gaugeAddresses.filter((addr) => addr !== ethers.constants.AddressZero));  // TODO move to another place
    const poolNames = await getFactoryPoolNames.call(this, swapAddresses);
    const referenceAssets = await getFactoryReferenceAssets.call(this, swapAddresses);
    const coinAddresses = await getFactoryCoinAddresses.call(this, swapAddresses);
    setFactoryCoinsContracts.call(this, coinAddresses);
    const existingCoinAddressNameDict = getExistingCoinAddressNameDict(this.constants.POOLS_DATA);
    const coinAddressNameDict = await getCoinAddressNameDict.call(this, coinAddresses, existingCoinAddressNameDict);
    const coinAddressDecimalsDict = await getCoinAddressDecimalsDict.call(this, coinAddresses, this.constants.DECIMALS_LOWER_CASE);
    const isMeta = await getFactoryIsMeta.call(this, swapAddresses);
    const basePoolAddresses = await getFactoryBasePoolAddresses.call(this, swapAddresses);

    const FACTORY_POOLS_DATA: DictInterface<PoolDataInterface> = {};
    for (let i = 0; i < poolNames.length; i++) {
        if (!isMeta[i]) {
            FACTORY_POOLS_DATA[poolNames[i]] = {
                reference_asset: referenceAssets[i],
                N_COINS: coinAddresses[i].length,
                underlying_decimals: coinAddresses[i].map((addr) => coinAddressDecimalsDict[addr]),
                decimals: coinAddresses[i].map((addr) => coinAddressDecimalsDict[addr]),
                use_lending: coinAddresses[i].map(() => false),
                is_plain: coinAddresses[i].map(() => true),
                swap_address: swapAddresses[i],
                token_address: swapAddresses[i],
                gauge_address: gaugeAddresses[i],
                underlying_coins: coinAddresses[i].map((addr) => coinAddressNameDict[addr]),
                coins: coinAddresses[i].map((addr) => coinAddressNameDict[addr]),
                underlying_coin_addresses: coinAddresses[i],
                coin_addresses: coinAddresses[i],
                swap_abi: swapABIs[i],
                gauge_abi: factoryGaugeABI,
                is_factory: true,
                is_plain_factory: true,
            };
        } else {
            FACTORY_POOLS_DATA[poolNames[i]] = {
                reference_asset: referenceAssets[i],
                N_COINS: coinAddresses[i].length,
                underlying_decimals: coinAddresses[i].map((addr) => coinAddressDecimalsDict[addr]),
                decimals: coinAddresses[i].map((addr) => coinAddressDecimalsDict[addr]),
                use_lending: coinAddresses[i].map(() => false),
                is_plain: coinAddresses[i].map(() => true),
                swap_address: swapAddresses[i],
                token_address: swapAddresses[i],
                gauge_address: gaugeAddresses[i],
                underlying_coins: [coinAddressNameDict[coinAddresses[i][0]], ...basePoolAddressCoinsDict[basePoolAddresses[i]]],
                coins: coinAddresses[i].map((addr) => coinAddressNameDict[addr]),
                underlying_coin_addresses: coinAddresses[i],
                coin_addresses: coinAddresses[i],
                swap_abi: swapABIs[i],
                gauge_abi: factoryGaugeABI,
                is_factory: true,
                is_meta_factory: true,
                is_meta: true,
                base_pool: basePoolAddressNameDict[basePoolAddresses[i]],
                meta_coin_addresses: basePoolAddressCoinAddressesDict[basePoolAddresses[i]],
                meta_coin_decimals: [coinAddressDecimalsDict[coinAddresses[i][0]], ...basePoolAddressDecimalsDict[basePoolAddresses[i]]],
                deposit_address: basePoolAddressZapDict[basePoolAddresses[i]],
                deposit_abi: factoryDepositABI,
            };
        }
    }

    return FACTORY_POOLS_DATA
}
