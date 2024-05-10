import axios from 'axios';
import {BrowserProvider, Contract, JsonRpcProvider, Signer} from 'ethers';
import { Contract as MulticallContract } from "ethcall";
import BigNumber from 'bignumber.js';
import {
    IBasePoolShortItem,
    IChainId,
    IDict,
    INetworkName,
    IRewardFromApi,
    IVolumeAndAPYs,
    REFERENCE_ASSET,
} from './interfaces';
import { curve, NETWORK_CONSTANTS } from "./curve.js";
import {
    _getAllPoolsFromApi,
    _getFactoryAPYs,
    _getSubgraphData,
    _getVolumes,
} from "./external-api.js";
import ERC20Abi from './constants/abis/ERC20.json' assert { type: 'json' };
import { L2Networks } from './constants/L2Networks.js';
import { volumeNetworks } from "./constants/volumeNetworks.js";
import { getPool } from "./pools/index.js";


export const ETH_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
// export const MAX_ALLOWANCE = curve.parseUnits(new BigNumber(2).pow(256).minus(1).toFixed(), 0);
export const MAX_ALLOWANCE = BigInt("115792089237316195423570985008687907853269984665640564039457584007913129639935");  // 2**256 - 1


// Formatting numbers

export const _cutZeros = (strn: string): string => {
    return strn.replace(/0+$/gi, '').replace(/\.$/gi, '');
}

export const checkNumber = (n: number | string): number | string => {
    if (Number(n) !== Number(n)) throw Error(`${n} is not a number`); // NaN

    return n
}

export const formatNumber = (n: number | string, decimals = 18): string => {
    if (Number(n) !== Number(n)) throw Error(`${n} is not a number`); // NaN
    const [integer, fractional] = String(n).split(".");

    return !fractional ? integer : integer + "." + fractional.slice(0, decimals);
}

export const parseUnits = (n: number | string, decimals = 18): bigint => {
    return curve.parseUnits(formatNumber(n, decimals), decimals);
}

// bignumber.js

export const BN = (val: number | string): BigNumber => new BigNumber(checkNumber(val));

export const toBN = (n: bigint, decimals = 18): BigNumber => {
    return BN(curve.formatUnits(n, decimals));
}

export const toStringFromBN = (bn: BigNumber, decimals = 18): string => {
    return bn.toFixed(decimals);
}

export const fromBN = (bn: BigNumber, decimals = 18): bigint => {
    return curve.parseUnits(toStringFromBN(bn, decimals), decimals)
}

// -------------------


export const isEth = (address: string): boolean => address.toLowerCase() === ETH_ADDRESS.toLowerCase();
export const getEthIndex = (addresses: string[]): number => addresses.map((address: string) => address.toLowerCase()).indexOf(ETH_ADDRESS.toLowerCase());
export const mulBy1_3 = (n: bigint): bigint => n * curve.parseUnits("130", 0) / curve.parseUnits("100", 0);

export const smartNumber = (abstractNumber: bigint | bigint[]): number | number[] => {
    if(Array.isArray(abstractNumber)) {
        return [Number(abstractNumber[0]), Number(abstractNumber[1])];
    } else {
        return Number(abstractNumber);
    }
}

export const DIGas = (gas: bigint | Array<bigint>): bigint => {
    if(Array.isArray(gas)) {
        return gas[0];
    } else {
        return gas;
    }
}

export const getGasFromArray = (gas: number[]): number | number[] => {
    if(gas[1] === 0) {
        return gas[0];
    } else {
        return gas;
    }
}

export const gasSum = (gas: number[], currentGas: number | number[]): number[] => {
    if(Array.isArray(currentGas)) {
        gas[0] = gas[0] + currentGas[0];
        gas[1] = gas[1] + currentGas[1];
    } else {
        gas[0] = gas[0] + currentGas;
    }
    return gas;
}

// coins can be either addresses or symbols
export const _getCoinAddressesNoCheck = (...coins: string[] | string[][]): string[] => {
    if (coins.length == 1 && Array.isArray(coins[0])) coins = coins[0];
    coins = coins as string[];
    return coins.map((c) => c.toLowerCase()).map((c) => curve.constants.COINS[c] || c);
}

export const _getCoinAddresses = (...coins: string[] | string[][]): string[] => {
    const coinAddresses = _getCoinAddressesNoCheck(...coins);
    const availableAddresses = [...Object.keys(curve.constants.DECIMALS), ...curve.constants.GAUGES];
    for (const coinAddr of coinAddresses) {
        if (!availableAddresses.includes(coinAddr)) throw Error(`Coin with address '${coinAddr}' is not available`);
    }

    return coinAddresses
}

export const _getCoinDecimals = (...coinAddresses: string[] | string[][]): number[] => {
    if (coinAddresses.length == 1 && Array.isArray(coinAddresses[0])) coinAddresses = coinAddresses[0];
    coinAddresses = coinAddresses as string[];

    return coinAddresses.map((coinAddr) => curve.constants.DECIMALS[coinAddr.toLowerCase()] ?? 18); // 18 for gauges
}

export const _getBalances = async (coins: string[], addresses: string[]): Promise<IDict<string[]>> => {
    const coinAddresses = _getCoinAddresses(coins);
    const decimals = _getCoinDecimals(coinAddresses);

    const ethIndex = getEthIndex(coinAddresses);
    if (ethIndex !== -1) {
        coinAddresses.splice(ethIndex, 1);
    }

    const contractCalls = [];
    for (const coinAddr of coinAddresses) {
        contractCalls.push(...addresses.map((address: string) => curve.contracts[coinAddr].multicallContract.balanceOf(address)));
    }
    const _response: bigint[] = await curve.multicallProvider.all(contractCalls);

    if (ethIndex !== -1) {
        const ethBalances: bigint[] = [];
        for (const address of addresses) {
            ethBalances.push(await curve.provider.getBalance(address));
        }
        _response.splice(ethIndex * addresses.length, 0, ...ethBalances);
    }

    const _balances: IDict<bigint[]>  = {};
    addresses.forEach((address: string, i: number) => {
        _balances[address] = coins.map((_, j: number ) => _response[i + (j * addresses.length)]);
    });

    const balances: IDict<string[]>  = {};
    for (const address of addresses) {
        balances[address] = _balances[address].map((b, i: number ) => curve.formatUnits(b, decimals[i]));
    }

    return balances;
}

export const _prepareAddresses = (addresses: string[] | string[][]): string[] => {
    if (addresses.length == 1 && Array.isArray(addresses[0])) addresses = addresses[0];
    if (addresses.length === 0 && curve.signerAddress !== '') addresses = [curve.signerAddress];
    addresses = addresses as string[];

    return addresses.filter((val, idx, arr) => arr.indexOf(val) === idx)
}

export const _getAddress = (address: string): string => {
    address = address || curve.signerAddress;
    if (!address) throw Error("Need to connect wallet or pass address into args");

    return address
}

export const getBalances = async (coins: string[], ...addresses: string[] | string[][]): Promise<IDict<string[]> | string[]> => {
    addresses = _prepareAddresses(addresses);
    const balances: IDict<string[]> = await _getBalances(coins, addresses);

    return addresses.length === 1 ? balances[addresses[0]] : balances
}


export const _getAllowance = async (coins: string[], address: string, spender: string): Promise<bigint[]> => {
    const _coins = [...coins]
    const ethIndex = getEthIndex(_coins);
    if (ethIndex !== -1) {
        _coins.splice(ethIndex, 1);

    }

    let allowance: bigint[];
    if (_coins.length === 1) {
        allowance = [await curve.contracts[_coins[0]].contract.allowance(address, spender, curve.constantOptions)];
    } else {
        const contractCalls = _coins.map((coinAddr) => curve.contracts[coinAddr].multicallContract.allowance(address, spender));
        allowance = await curve.multicallProvider.all(contractCalls);
    }


    if (ethIndex !== -1) {
        allowance.splice(ethIndex, 0, MAX_ALLOWANCE);
    }

    return allowance;
}

// coins can be either addresses or symbols
export const getAllowance = async (coins: string[], address: string, spender: string): Promise<string[]> => {
    const coinAddresses = _getCoinAddresses(coins);
    const decimals = _getCoinDecimals(coinAddresses);
    const _allowance = await _getAllowance(coinAddresses, address, spender);

    return _allowance.map((a, i) => curve.formatUnits(a, decimals[i]))
}

// coins can be either addresses or symbols
export const hasAllowance = async (coins: string[], amounts: (number | string)[], address: string, spender: string): Promise<boolean> => {
    const coinAddresses = _getCoinAddresses(coins);
    const decimals = _getCoinDecimals(coinAddresses);
    const _allowance = await _getAllowance(coinAddresses, address, spender);
    const _amounts = amounts.map((a, i) => parseUnits(a, decimals[i]));

    return _allowance.map((a, i) => a >= _amounts[i]).reduce((a, b) => a && b);
}

export const _ensureAllowance = async (coins: string[], amounts: bigint[], spender: string, isMax = true): Promise<string[]> => {
    const address = curve.signerAddress;
    const allowance: bigint[] = await _getAllowance(coins, address, spender);

    const txHashes: string[] = []
    for (let i = 0; i < allowance.length; i++) {
        if (allowance[i] < amounts[i]) {
            const contract = curve.contracts[coins[i]].contract;
            const _approveAmount = isMax ? MAX_ALLOWANCE : amounts[i];
            await curve.updateFeeData();
            if (allowance[i] > curve.parseUnits("0")) {
                const gasLimit = mulBy1_3(DIGas(await contract.approve.estimateGas(spender, curve.parseUnits("0"), curve.constantOptions)));
                txHashes.push((await contract.approve(spender, curve.parseUnits("0"), { ...curve.options, gasLimit })).hash);
            }
            const gasLimit = mulBy1_3(DIGas(await contract.approve.estimateGas(spender, _approveAmount, curve.constantOptions)));
            txHashes.push((await contract.approve(spender, _approveAmount, { ...curve.options, gasLimit })).hash);
        }
    }

    return txHashes;
}

// coins can be either addresses or symbols
export const ensureAllowanceEstimateGas = async (coins: string[], amounts: (number | string)[], spender: string, isMax = true): Promise<number | number[]> => {
    const coinAddresses = _getCoinAddresses(coins);
    const decimals = _getCoinDecimals(coinAddresses);
    const _amounts = amounts.map((a, i) => parseUnits(a, decimals[i]));
    const address = curve.signerAddress;
    const _allowance: bigint[] = await _getAllowance(coinAddresses, address, spender);

    let gas = [0,0];
    for (let i = 0; i < _allowance.length; i++) {
        if (_allowance[i] < _amounts[i]) {
            const contract = curve.contracts[coinAddresses[i]].contract;
            const _approveAmount = isMax ? MAX_ALLOWANCE : _amounts[i];
            if (_allowance[i] > curve.parseUnits("0")) {
                let currentGas = smartNumber(await contract.approve.estimateGas(spender, curve.parseUnits("0"), curve.constantOptions));
                // For some coins (crv for example ) we can't estimate the second tx gas (approve: 0 --> amount), so we assume it will cost the same amount of gas
                if (typeof currentGas === "number") {
                    currentGas = currentGas * 2;
                } else {
                    currentGas = currentGas.map((g) => g * 2)
                }
                gas = gasSum(gas, currentGas);
            } else {
                const currentGas = smartNumber(await contract.approve.estimateGas(spender, _approveAmount, curve.constantOptions));
                gas = gasSum(gas, currentGas);
            }
        }
    }

    return getGasFromArray(gas);
}

// coins can be either addresses or symbols
export const ensureAllowance = async (coins: string[], amounts: (number | string)[], spender: string, isMax = true): Promise<string[]> => {
    const coinAddresses = _getCoinAddresses(coins);
    const decimals = _getCoinDecimals(coinAddresses);
    const _amounts = amounts.map((a, i) => parseUnits(a, decimals[i]));

    return await _ensureAllowance(coinAddresses, _amounts, spender, isMax)
}

export const getPoolIdBySwapAddress = (swapAddress: string): string => {
    const poolsData = curve.getPoolsData();
    const poolIds = Object.entries(poolsData).filter(([_, poolData]) => poolData.swap_address.toLowerCase() === swapAddress.toLowerCase());
    if (poolIds.length === 0) return "";
    return poolIds[0][0];
}

const _getTokenAddressBySwapAddress = (swapAddress: string): string => {
    const poolsData = curve.getPoolsData()
    const res = Object.entries(poolsData).filter(([_, poolData]) => poolData.swap_address.toLowerCase() === swapAddress.toLowerCase());
    if (res.length === 0) return "";
    return res[0][1].token_address;
}

export const _getUsdPricesFromApi = async (): Promise<IDict<number>> => {
    const network = curve.constants.NETWORK_NAME;
    const allTypesExtendedPoolData = await _getAllPoolsFromApi(network);
    const priceDict: IDict<Record<string, number>[]> = {};
    const priceDictByMaxTvl: IDict<number> = {};

    for (const extendedPoolData of allTypesExtendedPoolData) {
        for (const pool of extendedPoolData.poolData) {
            const lpTokenAddress = pool.lpTokenAddress ?? pool.address;
            const totalSupply = pool.totalSupply / (10 ** 18);
            if(lpTokenAddress.toLowerCase() in priceDict) {
                priceDict[lpTokenAddress.toLowerCase()].push({
                    price: pool.usdTotal && totalSupply ? pool.usdTotal / totalSupply : 0,
                    tvl: pool.usdTotal,
                })
            } else {
                priceDict[lpTokenAddress.toLowerCase()] = []
                priceDict[lpTokenAddress.toLowerCase()].push({
                    price: pool.usdTotal && totalSupply ? pool.usdTotal / totalSupply : 0,
                    tvl: pool.usdTotal,
                })
            }

            for (const coin of pool.coins) {
                if (typeof coin.usdPrice === "number") {
                    if(coin.address.toLowerCase() in priceDict) {
                        priceDict[coin.address.toLowerCase()].push({
                            price: coin.usdPrice,
                            tvl: pool.usdTotal,
                        })
                    } else {
                        priceDict[coin.address.toLowerCase()] = []
                        priceDict[coin.address.toLowerCase()].push({
                            price: coin.usdPrice,
                            tvl: pool.usdTotal,
                        })
                    }
                }
            }

            for (const coin of pool.gaugeRewards ?? []) {
                if (typeof coin.tokenPrice === "number") {
                    if(coin.tokenAddress.toLowerCase() in priceDict) {
                        priceDict[coin.tokenAddress.toLowerCase()].push({
                            price: coin.tokenPrice,
                            tvl: pool.usdTotal,
                        });
                    } else {
                        priceDict[coin.tokenAddress.toLowerCase()] = []
                        priceDict[coin.tokenAddress.toLowerCase()].push({
                            price: coin.tokenPrice,
                            tvl: pool.usdTotal,
                        });
                    }
                }
            }
        }
    }

    for(const address in priceDict) {
        if(priceDict[address].length > 0) {
            const maxTvlItem = priceDict[address].reduce((prev, current) => {
                if (+current.tvl > +prev.tvl) {
                    return current;
                } else {
                    return prev;
                }
            });
            priceDictByMaxTvl[address] = maxTvlItem.price
        } else {
            priceDictByMaxTvl[address] = 0
        }

    }

    return priceDictByMaxTvl
}

export const _getCrvApyFromApi = async (): Promise<IDict<[number, number]>> => {
    const network = curve.constants.NETWORK_NAME;
    const allTypesExtendedPoolData = await _getAllPoolsFromApi(network);
    const apyDict: IDict<[number, number]> = {};

    for (const extendedPoolData of allTypesExtendedPoolData) {
        for (const pool of extendedPoolData.poolData) {
            if (pool.gaugeAddress) {
                if (!pool.gaugeCrvApy) {
                    apyDict[pool.gaugeAddress.toLowerCase()] = [0, 0];
                } else {
                    apyDict[pool.gaugeAddress.toLowerCase()] = [pool.gaugeCrvApy[0] ?? 0, pool.gaugeCrvApy[1] ?? 0];
                }
            }
        }
    }

    return apyDict
}

export const _getRewardsFromApi = async (): Promise<IDict<IRewardFromApi[]>> => {
    const network = curve.constants.NETWORK_NAME;
    const allTypesExtendedPoolData = await _getAllPoolsFromApi(network);
    const rewardsDict: IDict<IRewardFromApi[]> = {};

    for (const extendedPoolData of allTypesExtendedPoolData) {
        for (const pool of extendedPoolData.poolData) {
            if (pool.gaugeAddress) {
                rewardsDict[pool.gaugeAddress.toLowerCase()] = (pool.gaugeRewards ?? [])
                    .filter((r) => curve.chainId === 1 || r.tokenAddress.toLowerCase() !== curve.constants.COINS.crv);
            }
        }
    }

    return rewardsDict
}

const _usdRatesCache: IDict<{ rate: number, time: number }> = {}
export const _getUsdRate = async (assetId: string): Promise<number> => {
    if (curve.chainId === 1 && assetId.toLowerCase() === '0x8762db106b2c2a0bccb3a80d1ed41273552616e8') return 0; // RSR
    const pricesFromApi = await _getUsdPricesFromApi();
    if (assetId.toLowerCase() in pricesFromApi) return pricesFromApi[assetId.toLowerCase()];

    if (assetId === 'USD' || (curve.chainId === 137 && (assetId.toLowerCase() === curve.constants.COINS.am3crv.toLowerCase()))) return 1

    let chainName = {
        1: 'ethereum',
        10: 'optimistic-ethereum',
        56: "binance-smart-chain",
        100: 'xdai',
        137: 'polygon-pos',
        196: 'x-layer',
        250: 'fantom',
        252: 'fraxtal',
        324: 'zksync',
        1284: 'moonbeam',
        2222: 'kava',
        8453: 'base',
        42220: 'celo',
        43114: 'avalanche',
        42161: 'arbitrum-one',
        1313161554: 'aurora',
    }[curve.chainId];

    const nativeTokenName = {
        1: 'ethereum',
        10: 'ethereum',
        56: 'binancecoin',
        100: 'xdai',
        137: 'matic-network',
        196: 'okb',
        250: 'fantom',
        252: 'frax-ether',
        324: 'ethereum',
        1284: 'moonbeam',
        2222: 'kava',
        8453: 'ethereum',
        42220: 'celo',
        43114: 'avalanche-2',
        42161: 'ethereum',
        1313161554: 'ethereum',
    }[curve.chainId] as string;

    if (chainName === undefined) {
        throw Error('curve object is not initialized')
    }

    assetId = {
        'CRV': 'curve-dao-token',
        'EUR': 'stasis-eurs',
        'BTC': 'bitcoin',
        'ETH': 'ethereum',
        'LINK': 'link',
    }[assetId.toUpperCase()] || assetId
    assetId = isEth(assetId) ? nativeTokenName : assetId.toLowerCase();

    // No EURT on Coingecko Polygon
    if (curve.chainId === 137 && assetId.toLowerCase() === curve.constants.COINS.eurt) {
        chainName = 'ethereum';
        assetId = '0xC581b735A1688071A1746c968e0798D642EDE491'.toLowerCase(); // EURT Ethereum
    }

    // CRV
    if (assetId.toLowerCase() === curve.constants.ALIASES.crv) {
        assetId = 'curve-dao-token';
    }

    if ((_usdRatesCache[assetId]?.time || 0) + 600000 < Date.now()) {
        const url = [nativeTokenName, 'ethereum', 'bitcoin', 'link', 'curve-dao-token', 'stasis-eurs'].includes(assetId.toLowerCase()) ?
            `https://api.coingecko.com/api/v3/simple/price?ids=${assetId}&vs_currencies=usd` :
            `https://api.coingecko.com/api/v3/simple/token_price/${chainName}?contract_addresses=${assetId}&vs_currencies=usd`
        const response = await axios.get(url);
        try {
            _usdRatesCache[assetId] = {'rate': response.data[assetId]['usd'] ?? 0, 'time': Date.now()};
        } catch (err) { // TODO pay attention!
            _usdRatesCache[assetId] = {'rate': 0, 'time': Date.now()};
        }
    }

    return _usdRatesCache[assetId]['rate']
}

export const getUsdRate = async (coin: string): Promise<number> => {
    const [coinAddress] = _getCoinAddressesNoCheck(coin);
    return await _getUsdRate(coinAddress);
}

export const getBaseFeeByLastBlock = async ()  => {
    const provider = curve.provider;

    try {
        const block = await provider.getBlock('latest');
        if(!block) {
            return 0.01
        }

        return Number(block.baseFeePerGas) / (10**9);
    } catch (error: any) {
        throw new Error(error)
    }
}

export const getGasPriceByLastTransactions = async ()  => {
    const provider = curve.provider;

    const latestBlockNumber = await provider.getBlockNumber();

    let totalGasPrice = 0;
    let transactionsCount = 0;

    const txAmount = 15;

    for (let i = latestBlockNumber; i > latestBlockNumber - txAmount && i >= 0; i--) {
        const block = await provider.getBlock(i);
        if (!block) continue;

        for (const txHash of block.transactions) {
            const tx = await provider.getTransaction(txHash);
            console.log(tx, tx?.gasPrice);
            if (!tx) continue;

            totalGasPrice = totalGasPrice + Number(tx.gasPrice);
            transactionsCount++;

            if (transactionsCount >= txAmount) break; // Limit to txAmount transactions
        }
    }

    return Number((totalGasPrice / transactionsCount / 1e9).toFixed(2));
}

export const getGasPriceFromL1 = async (): Promise<number> => {
    if(L2Networks.includes(curve.chainId) && curve.L1WeightedGasPrice) {
        return curve.L1WeightedGasPrice + 1e9; // + 1 gwei
    } else {
        throw Error("This method exists only for L2 networks");
    }
}

export const getGasPriceFromL2 = async (): Promise<number> => {
    if(curve.chainId === 42161) {
        return await getBaseFeeByLastBlock()
    }
    if(curve.chainId === 196) {
        return await getGasPriceByLastTransactions() // gwei
    }
    if(L2Networks.includes(curve.chainId)) {
        const gasPrice = await curve.contracts[curve.constants.ALIASES.gas_oracle_blob].contract.gasPrice({"gasPrice":"0x2000000"});
        return Number(gasPrice);
    } else {
        throw Error("This method exists only for L2 networks");
    }
}

export const getGasInfoForL2 = async (): Promise<Record<string, number | null>> => {
    if(curve.chainId === 42161) {
        const baseFee = await getBaseFeeByLastBlock()

        return  {
            maxFeePerGas: Number(((baseFee * 1.1) + 0.01).toFixed(2)),
            maxPriorityFeePerGas: 0.01,
        }
    } else if(curve.chainId === 196) {
        const gasPrice = await getGasPriceByLastTransactions()

        return  {
            gasPrice,
            maxFeePerGas: null,
            maxPriorityFeePerGas: null,
        }
    } else {
        throw Error("This method exists only for L2 networks");
    }
}

export const getTxCostsUsd = (ethUsdRate: number, gasPrice: number, gas: number | number[], gasPriceL1 = 0): number => {
    if(Array.isArray(gas)) {
        return ethUsdRate * ((gas[0] * gasPrice / 1e18) + (gas[1] * gasPriceL1 / 1e18));
    } else {
        return ethUsdRate * gas * gasPrice / 1e18;
    }
}

const _getNetworkName = (network: INetworkName | IChainId = curve.chainId): INetworkName => {
    if (typeof network === "number" && NETWORK_CONSTANTS[network]) {
        return NETWORK_CONSTANTS[network].NAME;
    } else if (typeof network === "string" && Object.values(NETWORK_CONSTANTS).map((n) => n.NAME).includes(network)) {
        return network;
    } else {
        throw Error(`Wrong network name or id: ${network}`);
    }
}

const _getChainId = (network: INetworkName | IChainId = curve.chainId): IChainId => {
    if (typeof network === "number" && NETWORK_CONSTANTS[network]) {
        return network;
    } else if (typeof network === "string" && Object.values(NETWORK_CONSTANTS).map((n) => n.NAME).includes(network)) {
        const idx = Object.values(NETWORK_CONSTANTS).map((n) => n.NAME).indexOf(network);
        return Number(Object.keys(NETWORK_CONSTANTS)[idx]) as IChainId;
    } else {
        throw Error(`Wrong network name or id: ${network}`);
    }
}

export const getTVL = async (network: INetworkName | IChainId = curve.chainId): Promise<number> => {
    network = _getNetworkName(network);
    const allTypesExtendedPoolData = await _getAllPoolsFromApi(network);

    return allTypesExtendedPoolData.reduce((sum, data) => sum + (data.tvl ?? data.tvlAll ?? 0), 0)
}

export const getVolumeApiController = async (network: INetworkName): Promise<IVolumeAndAPYs> => {
    if(volumeNetworks.getVolumes.includes(curve.chainId)) {
        return  await _getVolumes(network);
    }
    if(volumeNetworks.getFactoryAPYs.includes(curve.chainId)) {
        return await _getFactoryAPYs(network);
    }
    if(volumeNetworks.getSubgraphData.includes(curve.chainId)) {
        return await _getSubgraphData(network);
    }

    throw Error(`Can't get volume for network: ${network}`);
}

export const getVolume = async (network: INetworkName | IChainId = curve.chainId): Promise<{ totalVolume: number, cryptoVolume: number, cryptoShare: number }> => {
    network = _getNetworkName(network);
    const { totalVolume, cryptoVolume, cryptoShare } = await getVolumeApiController(network);
    return { totalVolume, cryptoVolume, cryptoShare }
}

export const _setContracts = (address: string, abi: any): void => {
    curve.contracts[address] = {
        contract: new Contract(address, abi, curve.signer || curve.provider),
        multicallContract: new MulticallContract(address, abi),
    }
}

// Find k for which x * k = target_x or y * k = target_y
// k = max(target_x / x, target_y / y)
// small_x = x * k
export const _get_small_x = (_x: bigint, _y: bigint, x_decimals: number, y_decimals: number): BigNumber => {
    const target_x = BN(10 ** (x_decimals > 5 ? x_decimals - 3 : x_decimals));
    const target_y = BN(10 ** (y_decimals > 5 ? y_decimals - 3 : y_decimals));
    const x_int_BN = toBN(_x, 0);
    const y_int_BN = toBN(_y, 0);
    const k = BigNumber.max(target_x.div(x_int_BN), target_y.div(y_int_BN));

    return BigNumber.min(x_int_BN.times(k), BN(10 ** x_decimals));
}

export const _get_price_impact = (
    _x: bigint,
    _y: bigint,
    _small_x: bigint,
    _small_y: bigint,
    x_decimals: number,
    y_decimals: number
): BigNumber => {
    const x_BN = toBN(_x, x_decimals);
    const y_BN = toBN(_y, y_decimals);
    const small_x_BN = toBN(_small_x, x_decimals);
    const small_y_BN = toBN(_small_y, y_decimals);
    const rateBN = y_BN.div(x_BN);
    const smallRateBN = small_y_BN.div(small_x_BN);
    if (rateBN.gt(smallRateBN)) return BN(0);

    return BN(1).minus(rateBN.div(smallRateBN)).times(100);
}

export const getCoinsData = async (...coins: string[] | string[][]): Promise<{name: string, symbol: string, decimals: number}[]> => {
    if (coins.length == 1 && Array.isArray(coins[0])) coins = coins[0];
    coins = coins as string[];
    const coinAddresses = _getCoinAddressesNoCheck(coins);
    console.log(coinAddresses);

    const ethIndex = getEthIndex(coinAddresses);
    if (ethIndex !== -1) {
        coinAddresses.splice(ethIndex, 1);
    }

    const contractCalls = [];
    for (const coinAddr of coinAddresses) {
        const coinContract = new MulticallContract(coinAddr, ERC20Abi);
        contractCalls.push(coinContract.name(), coinContract.symbol(), coinContract.decimals());
    }
    const _response = await curve.multicallProvider.all(contractCalls);

    if (ethIndex !== -1) {
        _response.splice(ethIndex * 2, 0, ...['Ethereum', 'ETH', 18]);
    }

    const res: {name: string, symbol: string, decimals: number}[]  = [];
    coins.forEach((address: string, i: number) => {
        res.push({
            name: _response.shift() as string,
            symbol: _response.shift() as string,
            decimals: Number(curve.formatUnits(_response.shift() as string, 0)),
        })
    });

    return res;
}


export const hasDepositAndStake = (): boolean => curve.constants.ALIASES.deposit_and_stake !== curve.constants.ZERO_ADDRESS;
export const hasRouter = (): boolean => curve.constants.ALIASES.router !== curve.constants.ZERO_ADDRESS;

export const getCountArgsOfMethodByContract = (contract: Contract, methodName: string): number => {
    const func = contract.interface.fragments.find((item: any) => item.name === methodName);
    if(func) {
        return func.inputs.length;
    } else {
        return -1;
    }
}

export const isMethodExist = (contract: Contract, methodName: string): boolean => {
    const func = contract.interface.fragments.find((item: any) => item.name === methodName);
    if(func) {
        return true;
    } else {
        return false;
    }
}

export const getPoolName = (name: string): string => {
    const separatedName = name.split(": ")
    if(separatedName.length > 1) {
        return separatedName[1].trim()
    } else {
        return separatedName[0].trim()
    }
}

export const isStableNgPool = (name: string): boolean => {
    return name.includes('factory-stable-ng')
}

export const assetTypeNameHandler = (assetTypeName: string): REFERENCE_ASSET => {
    if (assetTypeName.toUpperCase() === 'UNKNOWN') {
        return 'OTHER';
    } else {
        return assetTypeName.toUpperCase() as REFERENCE_ASSET;
    }
}

export const getBasePools = async (): Promise<IBasePoolShortItem[]> => {
    const factoryContract = curve.contracts[curve.constants.ALIASES['stable_ng_factory']].contract;
    const factoryMulticallContract = curve.contracts[curve.constants.ALIASES['stable_ng_factory']].multicallContract;

    const basePoolCount = Number(curve.formatUnits(await factoryContract.base_pool_count(curve.constantOptions), 0));

    const calls = [];
    for (let i = 0; i < basePoolCount; i++) {
        calls.push(factoryMulticallContract.base_pool_list(i));
    }

    const basePoolList = (await curve.multicallProvider.all(calls) as string[]).map((item: string) => item.toLowerCase());

    const pools = {...curve.constants.STABLE_NG_FACTORY_POOLS_DATA, ...curve.constants.FACTORY_POOLS_DATA, ...curve.constants.POOLS_DATA};

    const basePoolIds = Object.keys(pools).filter((item: string) => basePoolList.includes(pools[item].swap_address));

    return basePoolIds.map((poolId) => {
        const pool = getPool(poolId);
        return {
            id: poolId,
            name: pool.name,
            pool: pool.address,
            token: pool.lpToken,
            coins: pool.underlyingCoinAddresses,
        }
    })
}

export const memoizedContract = (): (address: string, abi: any, provider: BrowserProvider | JsonRpcProvider | Signer) => Contract => {
    const cache: Record<string, Contract> = {};
    return (address: string, abi: any, provider: BrowserProvider | JsonRpcProvider | Signer): Contract => {
        if (address in cache) {
            return cache[address];
        }
        else {
            const result = new Contract(address, abi, provider)
            cache[address] = result;
            return result;
        }
    }
}

export const memoizedMulticallContract = (): (address: string, abi: any) => MulticallContract => {
    const cache: Record<string, MulticallContract> = {};
    return (address: string, abi: any): MulticallContract => {
        if (address in cache) {
            return cache[address];
        }
        else {
            const result = new MulticallContract(address, abi)
            cache[address] = result;
            return result;
        }
    }
}