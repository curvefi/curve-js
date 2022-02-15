import { Contract, ethers } from "ethers";
import {Contract as MulticallContract, Provider as MulticallProvider} from "ethcall";
import { DictInterface, PoolDataInterface } from "./interfaces";
import ERC20ABI from "./constants/abis/json/ERC20.json";
import cryptoFactorySwapABI from "./constants/abis/json/factory-crypto/factory-crypto-pool-2.json";
import factoryGaugeABI from "./constants/abis/json/gauge_factory.json";

const WETH_ADDRESS = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";

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

async function getCryptoFactorySwapAddresses(this: CurveInterface): Promise<string[]> {
    const factoryContract = this.contracts[this.constants.ALIASES.crypto_factory].contract;
    const factoryMulticallContract = this.contracts[this.constants.ALIASES.crypto_factory].multicallContract;

    const poolCount = Number(ethers.utils.formatUnits(await factoryContract.pool_count(this.constantOptions), 0));
    const calls = [];
    for (let i = 0; i < poolCount; i++) {
        calls.push(factoryMulticallContract.pool_list(i));
    }

    const factorySwapAddresses: string[] = (await this.multicallProvider.all(calls) as string[]).map((addr) => addr.toLowerCase());
    const swapAddresses = Object.values({...this.constants.POOLS_DATA, ...this.constants.FACTORY_POOLS_DATA} as PoolDataInterface)
        .map((pool: PoolDataInterface) => pool.swap_address.toLowerCase());

    return factorySwapAddresses.filter((addr) => !swapAddresses.includes(addr));
}

function setCryptoFactorySwapContracts(this: CurveInterface, factorySwapAddresses: string[]): void {
    factorySwapAddresses.forEach((addr) => {
        this.contracts[addr] = {
            contract: new Contract(addr, cryptoFactorySwapABI, this.signer || this.provider),
            multicallContract: new MulticallContract(addr, cryptoFactorySwapABI),
        }
    });
}

async function getCryptoFactoryTokenAddresses(this: CurveInterface, factorySwapAddresses: string[]): Promise<string[]> {
    const factoryMulticallContract = await this.contracts[this.constants.ALIASES.crypto_factory].multicallContract;

    const calls = [];
    for (const addr of factorySwapAddresses) {
        calls.push(factoryMulticallContract.get_token(addr));
    }

    return (await this.multicallProvider.all(calls) as string[]).map((addr) => addr.toLowerCase());
}

function setCryptoFactoryTokenContracts(this: CurveInterface, factoryTokenAddresses: string[]): void {
    factoryTokenAddresses.forEach((addr) => {
        this.contracts[addr] = {
            contract: new Contract(addr, ERC20ABI, this.signer || this.provider),
            multicallContract: new MulticallContract(addr, ERC20ABI),
        }
    });
}

async function getCryptoFactoryGaugeAddresses(this: CurveInterface, factorySwapAddresses: string[]): Promise<string[]> {
    const factoryMulticallContract = await this.contracts[this.constants.ALIASES.crypto_factory].multicallContract;

    const calls = [];
    for (const addr of factorySwapAddresses) {
        calls.push(factoryMulticallContract.get_gauge(addr));
    }

    return (await this.multicallProvider.all(calls) as string[]).map((addr) => addr.toLowerCase());
}

function setCryptoFactoryGaugeContracts(this: CurveInterface, factoryGaugeAddresses: string[]): void {
    factoryGaugeAddresses.filter((addr) => addr !== ethers.constants.AddressZero).forEach((addr, i) => {
        this.contracts[addr] = {
            contract: new Contract(addr, factoryGaugeABI, this.signer || this.provider),
            multicallContract: new MulticallContract(addr, factoryGaugeABI),
        }
    });
}

async function getCryptoFactoryPoolNames(this: CurveInterface, factoryTokenAddresses: string[]): Promise<string[]> {
    const calls = [];
    for (const addr of factoryTokenAddresses) {
        calls.push(this.contracts[addr].multicallContract.symbol());
    }

    const names = (await this.multicallProvider.all(calls) as string[]).map((name) => name + "V2");
    const existingNames = Object.keys(this.constants.POOLS_DATA);

    // rename duplications
    for (let i = 0; i < names.length; i++) {
        if (names.indexOf(names[i]) !== i || existingNames.includes(names[i])) {
            let n = 1;
            do { n++ } while (
                names.indexOf(names[i].slice(0, -4) + `-${n}` + "-fV2") !== -1 || existingNames.includes(names[i].slice(0, -4) + `-${n}` + "-fV2")
            );
            names[i] = names[i].slice(0, -4) + `-${n}` + "-fV2";
        }
    }

    return names
}

async function getCryptoFactoryCoinAddresses(this: CurveInterface, factorySwapAddresses: string[]): Promise<string[][]> {
    const factoryMulticallContract = await this.contracts[this.constants.ALIASES.crypto_factory].multicallContract;

    const calls = [];
    for (const addr of factorySwapAddresses) {
        calls.push(factoryMulticallContract.get_coins(addr));
    }

    return (await this.multicallProvider.all(calls) as string[][]).map((addresses) => addresses.map((addr) => addr.toLowerCase()));
}

function setCryptoFactoryCoinsContracts(this: CurveInterface, coinAddresses: string[][]): void {
    const flattenedCoinAddresses = Array.from(new Set(deepFlatten(coinAddresses)));
    for (const addr of flattenedCoinAddresses) {
        if (addr in this.contracts) continue;

        this.contracts[addr] = {
            contract: new Contract(addr, ERC20ABI, this.signer || this.provider),
            multicallContract: new MulticallContract(addr, ERC20ABI),
        }
    }
}

async function getCryptoFactoryUnderlyingCoinAddresses(this: CurveInterface, coinAddresses: string[][]): Promise<string[][]> {
    return coinAddresses.map((coins: string[]) => coins.map((c) => c === WETH_ADDRESS ? "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" : c));
}

function getExistingCoinAddressNameDict(this: CurveInterface): DictInterface<string> {
    const dict: DictInterface<string> = {}
    for (const poolData of Object.values(this.constants.POOLS_DATA as DictInterface<PoolDataInterface>)) {
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

    if (this.chainId === 137) dict["0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"] = "MATIC"

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


export async function getCryptoFactoryPoolData(this: CurveInterface): Promise<DictInterface<PoolDataInterface>> {
    const swapAddresses = await getCryptoFactorySwapAddresses.call(this);
    setCryptoFactorySwapContracts.call(this, swapAddresses);
    const tokenAddresses = await getCryptoFactoryTokenAddresses.call(this, swapAddresses);
    setCryptoFactoryTokenContracts.call(this, tokenAddresses);
    this.constants.LP_TOKENS.push(...tokenAddresses); // TODO move to another place
    const gaugeAddresses = await getCryptoFactoryGaugeAddresses.call(this, swapAddresses);
    setCryptoFactoryGaugeContracts.call(this, gaugeAddresses);
    this.constants.GAUGES.push(...gaugeAddresses.filter((addr) => addr !== ethers.constants.AddressZero));  // TODO move to another place
    const poolNames = await getCryptoFactoryPoolNames.call(this, tokenAddresses);
    const coinAddresses = await getCryptoFactoryCoinAddresses.call(this, swapAddresses);
    setCryptoFactoryCoinsContracts.call(this, coinAddresses);
    const underlyingCoinAddresses = await getCryptoFactoryUnderlyingCoinAddresses.call(this, coinAddresses);
    const existingCoinAddressNameDict = getExistingCoinAddressNameDict.call(this);
    const coinAddressNameDict = await getCoinAddressNameDict.call(this, coinAddresses, existingCoinAddressNameDict);
    coinAddressNameDict['0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'] = 'ETH';
    const coinAddressDecimalsDict = await getCoinAddressDecimalsDict.call(this, coinAddresses, this.constants.DECIMALS_LOWER_CASE);
    coinAddressDecimalsDict['0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'] = 18;


    const CRYPTO_FACTORY_POOLS_DATA: DictInterface<PoolDataInterface> = {};
    for (let i = 0; i < poolNames.length; i++) {
        CRYPTO_FACTORY_POOLS_DATA[poolNames[i]] = {
            reference_asset: "CRYPTO",
            N_COINS: coinAddresses[i].length,
            is_crypto: true,
            underlying_decimals: underlyingCoinAddresses[i].map((addr) => coinAddressDecimalsDict[addr]),
            decimals: coinAddresses[i].map((addr) => coinAddressDecimalsDict[addr]),
            use_lending: coinAddresses[i].map(() => false),
            is_plain: coinAddresses[i].map(() => true),
            underlying_coins: underlyingCoinAddresses[i].map((addr) => coinAddressNameDict[addr]),
            coins: coinAddresses[i].map((addr) => coinAddressNameDict[addr]),
            swap_address: swapAddresses[i],
            token_address: tokenAddresses[i],
            gauge_address: gaugeAddresses[i],
            underlying_coin_addresses: underlyingCoinAddresses[i],
            coin_addresses: coinAddresses[i],
            swap_abi: cryptoFactorySwapABI[i],
            gauge_abi: factoryGaugeABI,
            is_factory: true,
            is_crypto_factory: true,
        };
    }

    return CRYPTO_FACTORY_POOLS_DATA
}
