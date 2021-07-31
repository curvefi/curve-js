import axios from 'axios';
import { ethers } from 'ethers';
import BigNumber from 'bignumber.js'
import { DictInterface } from './interfaces';
import { curve } from "./curve";
import { poolsData } from "./constants/abis/abis-ethereum";
import { COINS, LOWER_CASE_DECIMALS } from "./constants/coins";

const LP_TOKENS = Object.values(poolsData).map((data) => data.token_address.toLowerCase());
const GAUGES = Object.values(poolsData).map((data) => data.gauge_address.toLowerCase());

const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
export const MAX_ALLOWANCE = ethers.BigNumber.from(2).pow(ethers.BigNumber.from(256)).sub(ethers.BigNumber.from(1));

// bignumber.js

export const BN = (val: number | string): BigNumber => new BigNumber(val);

export const toBN = (n: ethers.BigNumber, decimals = 18): BigNumber => {
    return BN(ethers.utils.formatUnits(n, decimals)).times(decimals);
}

export const toStringFromBN = (bn: BigNumber, decimals = 18): string => {
    return bn.div(decimals).toFixed(decimals);
}

export const fromBN = (bn: BigNumber, decimals = 18): ethers.BigNumber => {
    return ethers.utils.parseUnits(toStringFromBN(bn, decimals), decimals)
}

// -------------------

export const isEth = (address: string): boolean => address.toLowerCase() === ETH_ADDRESS.toLowerCase();
export const getEthIndex = (addresses: string[]): number => addresses.map((address: string) => address.toLowerCase()).indexOf(ETH_ADDRESS.toLowerCase());

// coins can be either addresses or symbols
export const _getCoinAddresses = (...coins: string[] | string[][]): string[] => {
    if (coins.length == 1 && Array.isArray(coins[0])) coins = coins[0];
    coins = coins as string[];

    const coinAddresses = coins.map((c) => COINS[c.toLowerCase()] || c);
    const availableAddresses = [
        ...Object.keys(LOWER_CASE_DECIMALS).filter((c) => c !== COINS['snx'].toLowerCase()),
        ...LP_TOKENS,
        ...GAUGES,
    ];
    for (const coinAddr of coinAddresses) {
        if (!availableAddresses.includes(coinAddr.toLowerCase())) throw Error(`Coin with address '${coinAddr}' is not available`);
    }
    return coinAddresses
}

export const _getCoinDecimals = (...coinAddresses: string[] | string[][]): number[] => {
    if (coinAddresses.length == 1 && Array.isArray(coinAddresses[0])) coinAddresses = coinAddresses[0];
    coinAddresses = coinAddresses as string[];

    return coinAddresses.map((coinAddr) => LOWER_CASE_DECIMALS[coinAddr.toLowerCase()]);
}

export const _getBalances = async (coins: string[], addresses: string[]): Promise<DictInterface<string[]>> => {
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
    const response = await curve.multicallProvider.all(contractCalls);

    if (ethIndex !== -1) {
        const ethBalances: ethers.BigNumber[] = [];
        for (const address of addresses) {
            ethBalances.push(await curve.provider.getBalance(address));
        }
        response.splice(ethIndex * addresses.length, 0, ...ethBalances);
    }

    const _balances: DictInterface<ethers.BigNumber[]>  = {};
    addresses.forEach((address: string, i: number) => {
        _balances[address] = coins.map((_, j: number ) => response[i + (j * addresses.length)]);
    });

    const balances: DictInterface<string[]>  = {};
    for (const address of addresses) {
        balances[address] = _balances[address].map((b, i: number ) => ethers.utils.formatUnits(b, decimals[i]));
    }

    return balances;
}

export const getBalances = async (coins: string[], ...addresses: string[] | string[][]): Promise<DictInterface<string[]> | string[]> => {
    if (addresses.length == 1 && Array.isArray(addresses[0])) addresses = addresses[0];
    if (addresses.length === 0) addresses = [curve.signerAddress];
    addresses = addresses as string[];

    const balances: DictInterface<string[]> = await _getBalances(coins, addresses);

    return addresses.length === 1 ? balances[addresses[0]] : balances
}


export const getAllowance = async (coins: string[], address: string, spender: string): Promise<ethers.BigNumber[]> => {
    const _coins = [...coins]
    const ethIndex = getEthIndex(_coins);
    if (ethIndex !== -1) {
        _coins.splice(ethIndex, 1);

    }

    let allowance: ethers.BigNumber[];
    if (_coins.length === 1) {
        allowance = [await curve.contracts[_coins[0]].contract.allowance(address, spender)];
    } else {
        const contractCalls = _coins.map((coinAddr) => curve.contracts[coinAddr].multicallContract.allowance(address, spender));
        allowance = await curve.multicallProvider.all(contractCalls);
    }


    if (ethIndex !== -1) {
        allowance.splice(ethIndex, 0, MAX_ALLOWANCE);
    }

    return allowance;
}

export const ensureAllowance = async (coins: string[], amounts: ethers.BigNumber[], spender: string): Promise<void> => {
    const address = curve.signerAddress;
    const allowance: ethers.BigNumber[] = await getAllowance(coins, address, spender);

    for (let i = 0; i < allowance.length; i++) {
        if (allowance[i].lt(amounts[i])) {
            const contract = curve.contracts[coins[i]].contract;
            if (allowance[i].gt(ethers.BigNumber.from(0))) {
                const gasLimit = (await contract.estimateGas.approve(spender, ethers.BigNumber.from(0), curve.options)).mul(130).div(100);
                await contract.approve(spender, ethers.BigNumber.from(0), { ...curve.options, gasLimit });
            }
            const gasLimit = (await contract.estimateGas.approve(spender, MAX_ALLOWANCE, curve.options)).mul(130).div(100);
            await contract.approve(spender, MAX_ALLOWANCE, { ...curve.options, gasLimit });
        }
    }
}

export const getPoolNameBySwapAddress = (swapAddress: string): string => {
    return Object.entries(poolsData).filter(([_, poolData]) => poolData.swap_address.toLowerCase() === swapAddress.toLowerCase())[0][0];
}


const _crvRateCache = {
    'rate': 0,
    'time': 0,
}

export const getCrvRate = async (): Promise<number> => {
    let crvAddress = "0xd533a949740bb3306d119cc777fa900ba034cd52";
    crvAddress = crvAddress.toLowerCase();
    if (_crvRateCache.time + 60000 < Date.now()) {
        const response = await axios.get(`https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=${crvAddress}&vs_currencies=usd`);
        _crvRateCache['rate'] = response.data[crvAddress]['usd'];
        _crvRateCache['time'] = Date.now();
    }
    return _crvRateCache['rate']
}
