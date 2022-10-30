import axios from 'axios';
import { ethers, Contract } from 'ethers';
import BigNumber from 'bignumber.js';
import { IDict, INetworkName } from './interfaces';
import { curve } from "./curve";
import { _getPoolsFromApi } from "./external-api";
import {Contract as MulticallContract} from "ethcall";


export const ETH_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
export const MAX_ALLOWANCE = ethers.BigNumber.from(2).pow(ethers.BigNumber.from(256)).sub(ethers.BigNumber.from(1));

// bignumber.js

export const BN = (val: number | string): BigNumber => new BigNumber(val);

export const toBN = (n: ethers.BigNumber, decimals = 18): BigNumber => {
    return BN(ethers.utils.formatUnits(n, decimals));
}

export const toStringFromBN = (bn: BigNumber, decimals = 18): string => {
    return bn.toFixed(decimals);
}

export const fromBN = (bn: BigNumber, decimals = 18): ethers.BigNumber => {
    return ethers.utils.parseUnits(toStringFromBN(bn, decimals), decimals)
}

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

export const parseUnits = (n: number | string, decimals = 18): ethers.BigNumber => {
    return ethers.utils.parseUnits(formatNumber(n, decimals), decimals);
}

// -------------------


export const isEth = (address: string): boolean => address.toLowerCase() === ETH_ADDRESS.toLowerCase();
export const getEthIndex = (addresses: string[]): number => addresses.map((address: string) => address.toLowerCase()).indexOf(ETH_ADDRESS.toLowerCase());

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
    const _response: ethers.BigNumber[] = await curve.multicallProvider.all(contractCalls);

    if (ethIndex !== -1) {
        const ethBalances: ethers.BigNumber[] = [];
        for (const address of addresses) {
            ethBalances.push(await curve.provider.getBalance(address));
        }
        _response.splice(ethIndex * addresses.length, 0, ...ethBalances);
    }

    const _balances: IDict<ethers.BigNumber[]>  = {};
    addresses.forEach((address: string, i: number) => {
        _balances[address] = coins.map((_, j: number ) => _response[i + (j * addresses.length)]);
    });

    const balances: IDict<string[]>  = {};
    for (const address of addresses) {
        balances[address] = _balances[address].map((b, i: number ) => ethers.utils.formatUnits(b, decimals[i]));
    }

    return balances;
}

export const _prepareAddresses = (addresses: string[] | string[][]): string[] => {
    if (addresses.length == 1 && Array.isArray(addresses[0])) addresses = addresses[0];
    if (addresses.length === 0 && curve.signerAddress !== '') addresses = [curve.signerAddress];
    addresses = addresses as string[];

    return addresses.filter((val, idx, arr) => arr.indexOf(val) === idx)
}

export const getBalances = async (coins: string[], ...addresses: string[] | string[][]): Promise<IDict<string[]> | string[]> => {
    addresses = _prepareAddresses(addresses);
    const balances: IDict<string[]> = await _getBalances(coins, addresses);

    return addresses.length === 1 ? balances[addresses[0]] : balances
}


export const _getAllowance = async (coins: string[], address: string, spender: string): Promise<ethers.BigNumber[]> => {
    const _coins = [...coins]
    const ethIndex = getEthIndex(_coins);
    if (ethIndex !== -1) {
        _coins.splice(ethIndex, 1);

    }

    let allowance: ethers.BigNumber[];
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

    return _allowance.map((a, i) => ethers.utils.formatUnits(a, decimals[i]))
}

// coins can be either addresses or symbols
export const hasAllowance = async (coins: string[], amounts: (number | string)[], address: string, spender: string): Promise<boolean> => {
    const coinAddresses = _getCoinAddresses(coins);
    const decimals = _getCoinDecimals(coinAddresses);
    const _allowance = await _getAllowance(coinAddresses, address, spender);
    const _amounts = amounts.map((a, i) => parseUnits(a, decimals[i]));

    return _allowance.map((a, i) => a.gte(_amounts[i])).reduce((a, b) => a && b);
}

export const _ensureAllowance = async (coins: string[], amounts: ethers.BigNumber[], spender: string): Promise<string[]> => {
    const address = curve.signerAddress;
    const allowance: ethers.BigNumber[] = await _getAllowance(coins, address, spender);

    const txHashes: string[] = []
    for (let i = 0; i < allowance.length; i++) {
        if (allowance[i].lt(amounts[i])) {
            const contract = curve.contracts[coins[i]].contract;
            await curve.updateFeeData();
            if (allowance[i].gt(ethers.BigNumber.from(0))) {
                const gasLimit = (await contract.estimateGas.approve(spender, ethers.BigNumber.from(0), curve.constantOptions)).mul(130).div(100);
                txHashes.push((await contract.approve(spender, ethers.BigNumber.from(0), { ...curve.options, gasLimit })).hash);
            }
            const gasLimit = (await contract.estimateGas.approve(spender, MAX_ALLOWANCE, curve.constantOptions)).mul(130).div(100);
            txHashes.push((await contract.approve(spender, MAX_ALLOWANCE, { ...curve.options, gasLimit })).hash);
        }
    }

    return txHashes;
}

// coins can be either addresses or symbols
export const ensureAllowanceEstimateGas = async (coins: string[], amounts: (number | string)[], spender: string): Promise<number> => {
    const coinAddresses = _getCoinAddresses(coins);
    const decimals = _getCoinDecimals(coinAddresses);
    const _amounts = amounts.map((a, i) => parseUnits(a, decimals[i]));
    const address = curve.signerAddress;
    const allowance: ethers.BigNumber[] = await _getAllowance(coinAddresses, address, spender);

    let gas = 0;
    for (let i = 0; i < allowance.length; i++) {
        if (allowance[i].lt(_amounts[i])) {
            const contract = curve.contracts[coinAddresses[i]].contract;
            if (allowance[i].gt(ethers.BigNumber.from(0))) {
                gas += (await contract.estimateGas.approve(spender, ethers.BigNumber.from(0), curve.constantOptions)).toNumber();
            }
            gas += (await contract.estimateGas.approve(spender, MAX_ALLOWANCE, curve.constantOptions)).toNumber();
        }
    }

    return gas
}

// coins can be either addresses or symbols
export const ensureAllowance = async (coins: string[], amounts: (number | string)[], spender: string): Promise<string[]> => {
    const coinAddresses = _getCoinAddresses(coins);
    const decimals = _getCoinDecimals(coinAddresses);
    const _amounts = amounts.map((a, i) => parseUnits(a, decimals[i]));

    return await _ensureAllowance(coinAddresses, _amounts, spender)
}

export const getPoolNameBySwapAddress = (swapAddress: string): string => {
    const poolsData = { ...curve.constants.POOLS_DATA, ...curve.constants.FACTORY_POOLS_DATA, ...curve.constants.CRYPTO_FACTORY_POOLS_DATA };
    return Object.entries(poolsData).filter(([_, poolData]) => poolData.swap_address.toLowerCase() === swapAddress.toLowerCase())[0][0];
}

export const _getUsdPricesFromApi = async (): Promise<IDict<number>> => {
    const network = curve.constants.NETWORK_NAME;
    const promises = [
        _getPoolsFromApi(network, "main"),
        _getPoolsFromApi(network, "crypto"),
        _getPoolsFromApi(network, "factory"),
        _getPoolsFromApi(network, "factory-crypto"),
    ];
    const allTypesExtendedPoolData = await Promise.all(promises);
    const priceDict: IDict<number> = {};

    for (const extendedPoolData of allTypesExtendedPoolData) {
        for (const pool of extendedPoolData.poolData) {
            const lpTokenAddress = pool.lpTokenAddress ?? pool.address;
            const totalSupply = pool.totalSupply / (10 ** 18);
            priceDict[lpTokenAddress.toLowerCase()] = pool.usdTotal && totalSupply ? pool.usdTotal / totalSupply : 0;

            for (const coin of pool.coins) {
                if (typeof coin.usdPrice === "number") priceDict[coin.address.toLowerCase()] = coin.usdPrice;
            }

            for (const coin of pool.gaugeRewards ?? []) {
                if (typeof coin.tokenPrice === "number") priceDict[coin.tokenAddress.toLowerCase()] = coin.tokenPrice;
            }
        }
    }

    return priceDict
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
        100: 'xdai',
        137: 'polygon-pos',
        250: 'fantom',
        1284: 'moonbeam',
        2222: 'kava',
        43114: 'avalanche',
        42161: 'arbitrum-one',
        1313161554: 'aurora',
    }[curve.chainId];

    const nativeTokenName = {
        1: 'ethereum',
        10: 'ethereum',
        100: 'xdai',
        137: 'matic-network',
        250: 'fantom',
        1284: 'moonbeam',
        2222: 'kava',
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

export const getTVL = async (chainId = curve.chainId): Promise<number> => {
    const network = {
        1: "ethereum",
        10: 'optimism',
        100: 'xdai',
        137: "polygon",
        250: "fantom",
        1284: "moonbeam",
        2222: 'kava',
        43114: "avalanche",
        42161: "arbitrum",
        1313161554: "aurora",
    }[chainId] as INetworkName ?? "ethereum";

    const promises = [
        _getPoolsFromApi(network, "main"),
        _getPoolsFromApi(network, "crypto"),
        _getPoolsFromApi(network, "factory"),
        _getPoolsFromApi(network, "factory-crypto"),
    ];
    const allTypesExtendedPoolData = await Promise.all(promises);

    return allTypesExtendedPoolData.reduce((sum, data) => sum + (data.tvl ?? data.tvlAll ?? 0), 0)
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
export const _get_small_x = (_x: ethers.BigNumber, _y: ethers.BigNumber, x_decimals: number, y_decimals: number): BigNumber => {
    const target_x = BN(10 ** (x_decimals > 5 ? x_decimals - 3 : x_decimals));
    const target_y = BN(10 ** (y_decimals > 5 ? y_decimals - 3 : y_decimals));
    const x_int_BN = toBN(_x, 0);
    const y_int_BN = toBN(_y, 0);
    const k = BigNumber.max(target_x.div(x_int_BN), target_y.div(y_int_BN));

    return BigNumber.min(x_int_BN.times(k), BN(10 ** x_decimals));
}

export const _get_price_impact = (
    _x: ethers.BigNumber,
    _y: ethers.BigNumber,
    _small_x: ethers.BigNumber,
    _small_y: ethers.BigNumber,
    x_decimals: number,
    y_decimals: number
): BigNumber => {
    const x_BN = toBN(_x, x_decimals);
    const y_BN = toBN(_y, y_decimals);
    const small_x_BN = toBN(_small_x, x_decimals);
    const small_y_BN = toBN(_small_y, y_decimals);
    const rateBN = y_BN.div(x_BN);
    const smallRateBN = small_y_BN.div(small_x_BN);

    return BN(1).minus(rateBN.div(smallRateBN)).times(100);
}
