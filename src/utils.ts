import {Contract, ethers, TransactionLike} from 'ethers';
import {Contract as MulticallContract} from "@curvefi/ethcall";
import BigNumber from 'bignumber.js';
import {
    Abi,
    AbiFunction,
    IBasePoolShortItem,
    IChainId,
    ICurveLiteNetwork,
    IDict,
    INetworkName,
    IRewardFromApi,
    IVolumeAndAPYs,
    REFERENCE_ASSET,
} from './interfaces';
import {Curve} from "./curve.js";
import {
    _getCurveLiteNetworks,
    _getFactoryAPYs,
    _getLiteNetworksData,
    _getSubgraphData,
    _getVolumes,
} from "./external-api.js";
import {_getAllPoolsFromApi, _getUsdPricesFromApi} from "./cached.js";
import ERC20Abi from './constants/abis/ERC20.json' with {type: 'json'};
import {L2Networks} from './constants/L2Networks.js';
import {volumeNetworks} from "./constants/volumeNetworks.js";
import {getPool} from "./pools/index.js";
import {NETWORK_CONSTANTS} from "./constants/network_constants.js";
import {formatUnits} from "./constants/utils.js";


export const ETH_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
// export const MAX_ALLOWANCE = curve.parseUnits(new BigNumber(2).pow(256).minus(1).toFixed(), 0);
export const MAX_ALLOWANCE = BigInt("115792089237316195423570985008687907853269984665640564039457584007913129639935");  // 2**256 - 1


// Formatting numbers

export const _cutZeros = (strn: string): string => {
    return strn.replace(/(\.\d*[1-9])0+$/gi, '$1').replace(/\.0+$/gi, '');
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

export function parseUnits(n: number | string, decimals = 18): bigint {
    return ethers.parseUnits(formatNumber(n, decimals), decimals);
}

// bignumber.js

export const BN = (val: number | string): BigNumber => new BigNumber(checkNumber(val));

export const toBN = (n: bigint, decimals = 18): BigNumber => {
    return BN(formatUnits(n, decimals));
}

export const toStringFromBN = (bn: BigNumber, decimals = 18): string => {
    return bn.toFixed(decimals);
}

export const fromBN = (bn: BigNumber, decimals = 18): bigint => {
    return parseUnits(toStringFromBN(bn, decimals), decimals)
}

// -------------------


export const isEth = (address: string): boolean => address.toLowerCase() === ETH_ADDRESS.toLowerCase();
export const getEthIndex = (addresses: string[]): number => addresses.map((address: string) => address.toLowerCase()).indexOf(ETH_ADDRESS.toLowerCase());
export const mulBy1_3 = (n: bigint): bigint => n * parseUnits("130", 0) / parseUnits("100", 0);

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
export function _getCoinAddressesNoCheck(this: Curve, ...coins: string[] | string[][]): string[] {
    if (coins.length == 1 && Array.isArray(coins[0])) coins = coins[0];
    coins = coins as string[];
    return coins.map((c) => c.toLowerCase()).map((c) => this.constants.COINS[c] || c);
}

export function _getCoinAddresses(this: Curve, ...coins: string[] | string[][]): string[] {
    const coinAddresses = _getCoinAddressesNoCheck.call(this, ...coins);
    const availableAddresses = [...Object.keys(this.constants.DECIMALS), ...this.constants.GAUGES];
    for (const coinAddr of coinAddresses) {
        if (!availableAddresses.includes(coinAddr)) throw Error(`Coin with address '${coinAddr}' is not available`);
    }

    return coinAddresses
}

export function _getCoinDecimals(this: Curve, ...coinAddresses: string[] | string[][]): number[] {
    if (coinAddresses.length == 1 && Array.isArray(coinAddresses[0])) coinAddresses = coinAddresses[0];
    coinAddresses = coinAddresses as string[];

    return coinAddresses.map((coinAddr) => this.constants.DECIMALS[coinAddr.toLowerCase()] ?? 18); // 18 for gauges
}

export async function _getBalances(this: Curve, coins: string[], addresses: string[]): Promise<IDict<string[]>> {
    const coinAddresses = _getCoinAddresses.call(this, coins);
    const decimals = _getCoinDecimals.call(this, coinAddresses);

    const ethIndex = getEthIndex(coinAddresses);
    if (ethIndex !== -1) {
        coinAddresses.splice(ethIndex, 1);
    }

    const contractCalls = [];
    for (const coinAddr of coinAddresses) {
        contractCalls.push(...addresses.map((address: string) => this.contracts[coinAddr].multicallContract.balanceOf(address)));
    }
    const _response: bigint[] = await this.multicallProvider.all(contractCalls);

    if (ethIndex !== -1) {
        const ethBalances: bigint[] = [];
        for (const address of addresses) {
            ethBalances.push(await this.provider.getBalance(address));
        }
        _response.splice(ethIndex * addresses.length, 0, ...ethBalances);
    }

    const _balances: IDict<bigint[]>  = {};
    addresses.forEach((address: string, i: number) => {
        _balances[address] = coins.map((_, j: number ) => _response[i + (j * addresses.length)]);
    });

    const balances: IDict<string[]>  = {};
    for (const address of addresses) {
        balances[address] = _balances[address].map((b, i: number ) => this.formatUnits(b, decimals[i]));
    }

    return balances;
}

export function _prepareAddresses(this: Curve, addresses: string[] | string[][]): string[] {
    if (addresses.length == 1 && Array.isArray(addresses[0])) addresses = addresses[0];
    if (addresses.length === 0 && this.signerAddress !== '') addresses = [this.signerAddress];
    addresses = addresses as string[];

    return addresses.filter((val, idx, arr) => arr.indexOf(val) === idx)
}

export function _getAddress(this: Curve, address: string): string {
    address = address || this.signerAddress;
    if (!address) throw Error("Need to connect wallet or pass address into args");

    return address
}

export async function getBalances(this: Curve, coins: string[], ...addresses: string[] | string[][]): Promise<IDict<string[]> | string[]> {
    addresses = _prepareAddresses.call(this, addresses);
    const balances: IDict<string[]> = await _getBalances.call(this, coins, addresses);

    return addresses.length === 1 ? balances[addresses[0]] : balances
}


export async function _getAllowance(this: Curve, coins: string[], address: string, spender: string): Promise<bigint[]> {
    const _coins = [...coins]
    const ethIndex = getEthIndex(_coins);
    if (ethIndex !== -1) {
        _coins.splice(ethIndex, 1);

    }

    let allowance: bigint[];
    if (_coins.length === 1) {
        allowance = [await this.contracts[_coins[0]].contract.allowance(address, spender, this.constantOptions)];
    } else {
        const contractCalls = _coins.map((coinAddr) => this.contracts[coinAddr].multicallContract.allowance(address, spender));
        allowance = await this.multicallProvider.all(contractCalls);
    }


    if (ethIndex !== -1) {
        allowance.splice(ethIndex, 0, MAX_ALLOWANCE);
    }

    return allowance;
}

// coins can be either addresses or symbols
export async function getAllowance(this: Curve, coins: string[], address: string, spender: string): Promise<string[]> {
    const coinAddresses = _getCoinAddresses.call(this, coins);
    const decimals = _getCoinDecimals.call(this, coinAddresses);
    const _allowance = await _getAllowance.call(this, coinAddresses, address, spender);

    return _allowance.map((a, i) => this.formatUnits(a, decimals[i]))
}

// coins can be either addresses or symbols
export async function hasAllowance(this: Curve, coins: string[], amounts: (number | string)[], address: string, spender: string): Promise<boolean> {
    const coinAddresses = _getCoinAddresses.call(this, coins);
    const decimals = _getCoinDecimals.call(this, coinAddresses);
    const _allowance = await _getAllowance.call(this, coinAddresses, address, spender);
    const _amounts = amounts.map((a, i) => parseUnits(a, decimals[i]));

    return _allowance.map((a, i) => a >= _amounts[i]).reduce((a, b) => a && b);
}

export async function _ensureAllowance(this: Curve, coins: string[], amounts: bigint[], spender: string, isMax = true): Promise<string[]> {
    const address = this.signerAddress;
    const allowance: bigint[] = await _getAllowance.call(this, coins, address, spender);

    const txHashes: string[] = []
    for (let i = 0; i < allowance.length; i++) {
        if (allowance[i] < amounts[i]) {
            const contract = this.contracts[coins[i]].contract;
            const _approveAmount = isMax ? MAX_ALLOWANCE : amounts[i];
            await this.updateFeeData();

            if (allowance[i] > parseUnits("0")) {
                const gasLimit = mulBy1_3(DIGas(await contract.approve.estimateGas(spender, parseUnits("0"), this.constantOptions)));
                const resetTx = await contract.approve(spender, parseUnits("0"), { ...this.options, gasLimit });
                txHashes.push(resetTx.hash);
                await resetTx.wait();
            }

            const gasLimit = mulBy1_3(DIGas(await contract.approve.estimateGas(spender, _approveAmount, this.constantOptions)));
            const approveTx = await contract.approve(spender, _approveAmount, { ...this.options, gasLimit });
            txHashes.push(approveTx.hash);
            await approveTx.wait();
        }
    }

    return txHashes;
}

// coins can be either addresses or symbols
export async function ensureAllowanceEstimateGas(this: Curve, coins: string[], amounts: (number | string)[], spender: string, isMax = true): Promise<number | number[]> {
    const coinAddresses = _getCoinAddresses.call(this, coins);
    const decimals = _getCoinDecimals.call(this, coinAddresses);
    const _amounts = amounts.map((a, i) => parseUnits(a, decimals[i]));
    const address = this.signerAddress;
    const _allowance: bigint[] = await _getAllowance.call(this, coinAddresses, address, spender);

    let gas = [0,0];
    for (let i = 0; i < _allowance.length; i++) {
        if (_allowance[i] < _amounts[i]) {
            const contract = this.contracts[coinAddresses[i]].contract;
            const _approveAmount = isMax ? MAX_ALLOWANCE : _amounts[i];
            if (_allowance[i] > parseUnits("0")) {
                let currentGas = smartNumber(await contract.approve.estimateGas(spender, parseUnits("0"), this.constantOptions));
                // For some coins (crv for example ) we can't estimate the second tx gas (approve: 0 --> amount), so we assume it will cost the same amount of gas
                if (typeof currentGas === "number") {
                    currentGas = currentGas * 2;
                } else {
                    currentGas = currentGas.map((g) => g * 2)
                }
                gas = gasSum(gas, currentGas);
            } else {
                const currentGas = smartNumber(await contract.approve.estimateGas(spender, _approveAmount, this.constantOptions));
                gas = gasSum(gas, currentGas);
            }
        }
    }

    return getGasFromArray(gas);
}

// coins can be either addresses or symbols
export async function ensureAllowance(this: Curve, coins: string[], amounts: (number | string)[], spender: string, isMax = true): Promise<string[]> {
    const coinAddresses = _getCoinAddresses.call(this, coins);
    const decimals = _getCoinDecimals.call(this, coinAddresses);
    const _amounts = amounts.map((a, i) => parseUnits(a, decimals[i]));

    return await _ensureAllowance.call(this, coinAddresses, _amounts, spender, isMax)
}

export async function populateApprove(this: Curve, coins: string[], amounts: (number | string)[], spender: string, isMax = true, userAddress?: string): Promise<TransactionLike[]> {
    const coinAddresses = _getCoinAddresses.call(this, coins);
    const decimals = _getCoinDecimals.call(this, coinAddresses);
    const _amounts = amounts.map((a, i) => parseUnits(a, decimals[i]));
    
    const address = userAddress || this.signerAddress;
    if (!address) throw Error("User address is not defined. Pass userAddress parameter.");
    
    const allowance = await _getAllowance.call(this, coinAddresses, address, spender);
    
    const transactions: TransactionLike[] = [];
    
    for (let i = 0; i < allowance.length; i++) {
        if (allowance[i] < _amounts[i]) {
            const contract = this.contracts[coinAddresses[i]].contract;
            const _approveAmount = isMax ? MAX_ALLOWANCE : _amounts[i];
            
            if (allowance[i] > parseUnits("0")) {
                transactions.push(await contract.approve.populateTransaction(spender, parseUnits("0")));
            }
            
            transactions.push(await contract.approve.populateTransaction(spender, _approveAmount));
        }
    }
    
    return transactions;
}

export function getPoolIdBySwapAddress(this: Curve, swapAddress: string): string {
    const poolsData = this.getPoolsData();
    const poolIds = Object.entries(poolsData).filter(([, poolData]) => poolData.swap_address.toLowerCase() === swapAddress.toLowerCase());
    if (poolIds.length === 0) return "";
    return poolIds[0][0];
}

export async function _getRewardsFromApi(this: Curve): Promise<IDict<IRewardFromApi[]>> {
    const network = this.constants.NETWORK_NAME;
    const allTypesExtendedPoolData = await _getAllPoolsFromApi(network, this.isLiteChain);
    const rewardsDict: IDict<IRewardFromApi[]> = {};

    for (const extendedPoolData of allTypesExtendedPoolData) {
        for (const pool of extendedPoolData.poolData) {
            if (pool.gaugeAddress) {
                rewardsDict[pool.gaugeAddress.toLowerCase()] = (pool.gaugeRewards ?? pool.gaugeExtraRewards ?? [])
                    .filter((r) => this.chainId === 1 || r.tokenAddress.toLowerCase() !== this.constants.COINS.crv);
            }
        }
    }

    return rewardsDict
}

const _usdRatesCache: IDict<{ rate: number, time: number }> = {}
export async function _getUsdRate(this: Curve, assetId: string): Promise<number> {
    if (this.chainId === 1 && assetId.toLowerCase() === '0x8762db106b2c2a0bccb3a80d1ed41273552616e8') return 0; // RSR
    const pricesFromApi = await _getUsdPricesFromApi(this.constants.NETWORK_NAME, this.isLiteChain);
    if (assetId.toLowerCase() in pricesFromApi) return pricesFromApi[assetId.toLowerCase()];

    if (assetId === 'USD' || (this.chainId === 137 && (assetId.toLowerCase() === this.constants.COINS.am3crv.toLowerCase()))) return 1

    let chainName = this.isLiteChain? await this.constants.NETWORK_NAME : {
        1: 'ethereum',
        10: 'optimistic-ethereum',
        56: "binance-smart-chain",
        100: 'xdai',
        137: 'polygon-pos',
        146: 'sonic',
        196: 'x-layer',
        250: 'fantom',
        252: 'fraxtal',
        324: 'zksync',
        999: 'hyperliquid',
        1284: 'moonbeam',
        2222: 'kava',
        5000: 'mantle',
        8453: 'base',
        42220: 'celo',
        43114: 'avalanche',
        42161: 'arbitrum-one',
        1313161554: 'aurora',
    }[this.chainId];

    const nativeTokenName = this.isLiteChain ? this.constants?.API_CONSTANTS?.nativeTokenName:{
        1: 'ethereum',
        10: 'ethereum',
        56: 'binancecoin',
        100: 'xdai',
        137: 'matic-network',
        146: 'sonic-3',
        196: 'okb',
        250: 'fantom',
        252: 'frax-share',
        324: 'ethereum',
        1284: 'moonbeam',
        999: 'hyperliquid',
        2222: 'kava',
        5000: 'mantle',
        8453: 'ethereum',
        42220: 'celo',
        43114: 'avalanche-2',
        42161: 'ethereum',
        1313161554: 'ethereum',
    }[this.chainId] as string;

    if (chainName === undefined) {
        throw Error('curve object is not initialized')
    }

    if (nativeTokenName === undefined) {
        if(this.isLiteChain && this.constants.API_CONSTANTS?.wrappedNativeTokenAddress.toLowerCase() && this.constants.API_CONSTANTS?.wrappedNativeTokenAddress.toLowerCase() in pricesFromApi) {
            return pricesFromApi[this.constants.API_CONSTANTS?.wrappedNativeTokenAddress.toLowerCase()];
        } else {
            throw Error('nativeTokenName not found')
        }
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
    if (this.chainId === 137 && assetId.toLowerCase() === this.constants.COINS.eurt) {
        chainName = 'ethereum';
        assetId = '0xC581b735A1688071A1746c968e0798D642EDE491'.toLowerCase(); // EURT Ethereum
    }

    // CRV
    if (assetId.toLowerCase() === this.constants.ALIASES.crv) {
        assetId = 'curve-dao-token';
    }

    if(this.isLiteChain && assetId.toLowerCase() === this.constants.API_CONSTANTS?.wrappedNativeTokenAddress.toLowerCase()) {
        assetId = nativeTokenName
    }

    if ((_usdRatesCache[assetId]?.time || 0) + 600000 < Date.now()) {
        const url = [nativeTokenName, 'ethereum', 'bitcoin', 'link', 'curve-dao-token', 'stasis-eurs'].includes(assetId.toLowerCase()) ?
            `https://api.coingecko.com/api/v3/simple/price?ids=${assetId}&vs_currencies=usd` :
            `https://api.coingecko.com/api/v3/simple/token_price/${chainName}?contract_addresses=${assetId}&vs_currencies=usd`;

        try {
            const response = await fetch(url);
            const data = await response.json() ?? {};

            if (response.status === 200 && data[assetId]?.usd !== undefined) {
                _usdRatesCache[assetId] = {
                    'rate': data[assetId].usd,
                    'time': Date.now(),
                };
            } else {
                if (!this.isLiteChain) {
                    console.warn(`Non-200 response for ${assetId}:`, response.status, data);
                }
                _usdRatesCache[assetId] = {
                    'rate': 0,
                    'time': Date.now(),
                };
            }
        } catch (err: any) {
            if (!this.isLiteChain) {
                console.error(`Error fetching USD rate for ${assetId}:`, err.message);
            }
            _usdRatesCache[assetId] = {
                'rate': 0,
                'time': Date.now(),
            };
        }
    }

    return _usdRatesCache[assetId]['rate']
}

export async function getUsdRate(this: Curve, coin: string): Promise<number> {
    const [coinAddress] = _getCoinAddressesNoCheck.call(this, coin);
    return await _getUsdRate.call(this, coinAddress);
}

export async function getBaseFeeByLastBlock(this: Curve): Promise<number> {
    const provider = this.provider;

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

export async function getGasPrice(this: Curve)  {
    const provider = this.provider;
    return Number((Number((await provider.getFeeData()).gasPrice) / 1e9).toFixed(2));
}

export async function getGasPriceFromL1(this: Curve): Promise<number> {
    if(L2Networks.includes(this.chainId) && this.L1WeightedGasPrice) {
        return this.L1WeightedGasPrice + 1e9; // + 1 gwei
    } else {
        throw Error("This method exists only for L2 networks");
    }
}

export async function getGasPriceFromL2(this: Curve): Promise<number> {
    if(this.chainId === 42161) {
        return await getBaseFeeByLastBlock.call(this)
    }
    if(this.chainId === 196) {
        return await getGasPrice.call(this) // gwei
    }
    if(this.chainId === 324) {
        return await getGasPrice.call(this) // gwei
    }
    if(this.chainId === 5000) {
        return await getGasPrice.call(this) // gwei
    }
    if(L2Networks.includes(this.chainId)) {
        const gasPrice = await this.contracts[this.constants.ALIASES.gas_oracle_blob].contract.gasPrice({"gasPrice":"0x2000000"});
        return Number(gasPrice);
    } else {
        throw Error("This method exists only for L2 networks");
    }
}

export async function getGasInfoForL2(this: Curve ): Promise<Record<string, number | null>> {
    if(this.chainId === 42161) {
        const baseFee = await getBaseFeeByLastBlock.call(this)

        return  {
            maxFeePerGas: Number(((baseFee * 1.1) + 0.01).toFixed(2)),
            maxPriorityFeePerGas: 0.01,
        }
    } else if(this.chainId === 196) {
        const gasPrice = await getGasPrice.call(this)

        return {
            gasPrice,
        }
    } else if(this.chainId === 324) {
        const gasPrice = await getGasPrice.call(this)

        return {
            gasPrice,
        }
    } else if(this.chainId === 5000) {
        const baseFee = await getBaseFeeByLastBlock.call(this)

        return  {
            maxFeePerGas: Number(((baseFee * 1.1) + 0.01).toFixed(2)),
            maxPriorityFeePerGas: 0.01,
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

export async function getCurveLiteNetworks(this: Curve): Promise<ICurveLiteNetwork[]> {
    return await _getCurveLiteNetworks()
}

export const getNetworkNameByChainId = (chainId: number, networks: ICurveLiteNetwork[]): string => {
    const network = networks.find((network: ICurveLiteNetwork) => network.chainId === chainId);
    return network ? network.id : "Unknown Network";
}

export async function getNetworkConstants(this: Curve, chainId: IChainId | number): Promise<IDict<any>> {
    if (chainId in NETWORK_CONSTANTS) {
        return { ...NETWORK_CONSTANTS[chainId], IS_LITE_CHAIN: false};
    } else {
        const NAME = getNetworkNameByChainId(chainId, await _getCurveLiteNetworks());
        if (NAME === "Unknown Network") throw Error(`Wrong chain id: ${chainId}`);
        return  {... await _getLiteNetworksData(NAME), NAME, IS_LITE_CHAIN: true };
    }
}

export async function getTVL(this: Curve, chainId = this.chainId): Promise<number> {
    const networkConstants = await getNetworkConstants.call(this, chainId);
    const allTypesExtendedPoolData = await _getAllPoolsFromApi(networkConstants.NAME, this.isLiteChain);

    return allTypesExtendedPoolData.reduce((sum, data) => sum + (data.tvl ?? data.tvlAll ?? 0), 0)
}

export async function getVolumeApiController(this: Curve, network: INetworkName): Promise<IVolumeAndAPYs> {
    if(this.isLiteChain && this.chainId !== 146) {
        throw Error('This method is not supported for the lite version')
    }

    if(volumeNetworks.getVolumes.includes(this.chainId)) {
        return await _getVolumes(network);
    }
    if(volumeNetworks.getFactoryAPYs.includes(this.chainId)) {
        return await _getFactoryAPYs(network);
    }
    if(volumeNetworks.getSubgraphData.includes(this.chainId)) {
        return await _getSubgraphData(network);
    }

    throw Error(`Can't get volume for network: ${network}`);
}

export async function getVolume(this: Curve, chainId = this.chainId): Promise<{ totalVolume: number, cryptoVolume: number, cryptoShare: number }> {
    if(this.isLiteChain && this.chainId !== 146) {
        throw Error('This method is not supported for the lite version')
    }

    const networkConstants = await getNetworkConstants.call(this, chainId);
    const { totalVolume, cryptoVolume, cryptoShare } = await getVolumeApiController.call(this, networkConstants.NAME);
    return { totalVolume, cryptoVolume, cryptoShare }
}

export function _setContracts(this: Curve, address: string, abi: any) {
    const contracts = {
        abi,
        contract: new Contract(address, abi, this.signer || this.provider),
        multicallContract: new MulticallContract(address, abi),
    }
    this.contracts[address] = contracts;
    return contracts;
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

export async function getCoinsData(this: Curve, ...coins: string[] | string[][]): Promise<{name: string, symbol: string, decimals: number}[]> {
    if (coins.length == 1 && Array.isArray(coins[0])) coins = coins[0];
    coins = coins as string[];
    const coinAddresses = _getCoinAddressesNoCheck.call(this, coins);
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
    const _response = await this.multicallProvider.all(contractCalls);

    if (ethIndex !== -1) {
        _response.splice(ethIndex * 2, 0, ...['Ethereum', 'ETH', 18]);
    }

    const res: {name: string, symbol: string, decimals: number}[]  = [];
    coins.forEach(() => {
        res.push({
            name: _response.shift() as string,
            symbol: _response.shift() as string,
            decimals: Number(this.formatUnits(_response.shift() as string, 0)),
        })
    });

    return res;
}

export function hasDepositAndStake(this: Curve): boolean { return "deposit_and_stake" in this.constants.ALIASES; }
export function hasRouter(this: Curve): boolean { return "router" in this.constants.ALIASES; }

export const findAbiFunction = (abi: Abi, methodName: string) =>
    abi.filter((item) => item.type == 'function' && item.name === methodName) as AbiFunction[]

export const getCountArgsOfMethodByAbi = (abi: Abi, methodName: string): number => findAbiFunction(abi, methodName)[0]?.inputs.length ?? -1

export const findAbiSignature = (abi: Abi, methodName: string, signature: string) =>
    findAbiFunction(abi, methodName).find((func) => func.inputs.map((i) => `${i.type}`).join(',') == signature)

export const getPoolName = (name: string): string => {
    const separatedName = name.split(": ")
    if(separatedName.length > 1) {
        return separatedName[1].trim()
    } else {
        return separatedName[0].trim()
    }
}

export const isStableNgPool = (name: string): boolean => name.includes('factory-stable-ng')

export const assetTypeNameHandler = (assetTypeName: string): REFERENCE_ASSET => {
    if (assetTypeName.toUpperCase() === 'UNKNOWN') {
        return 'OTHER';
    } else {
        return assetTypeName.toUpperCase() as REFERENCE_ASSET;
    }
}

export async function getBasePools(this: Curve): Promise<IBasePoolShortItem[]> {
    const factoryContract = this.contracts[this.constants.ALIASES['stable_ng_factory']].contract;
    const factoryMulticallContract = this.contracts[this.constants.ALIASES['stable_ng_factory']].multicallContract;

    const basePoolCount = Number(this.formatUnits(await factoryContract.base_pool_count(), 0));

    const calls = [];
    for (let i = 0; i < basePoolCount; i++) {
        calls.push(factoryMulticallContract.base_pool_list(i));
    }

    const basePoolList = (await this.multicallProvider.all(calls) as string[]).map((item: string) => item.toLowerCase());

    const pools = {...this.constants.STABLE_NG_FACTORY_POOLS_DATA, ...this.constants.FACTORY_POOLS_DATA, ...this.constants.POOLS_DATA};

    const basePoolIds = Object.keys(pools).filter((item: string) => basePoolList.includes(pools[item].swap_address));

    return basePoolIds.map((poolId) => {
        const pool = getPool.call(this, poolId);
        return {
            id: poolId,
            name: pool.name,
            pool: pool.address,
            token: pool.lpToken,
            coins: pool.underlyingCoinAddresses,
        }
    })
}

export function log(fnName: string, ...args: unknown[]): void {
    if (process.env.NODE_ENV === 'development') {
        console.log(`curve-js@${new Date().toISOString()} -> ${fnName}:`, ...args)
    }
}

export function runWorker<In extends { type: string }, Out>(code: string, syncFn: () => ((val: In) => Out) | undefined, inputData: In, timeout = 30000): Promise<Out> {
    if (typeof Worker === 'undefined') {
        // in nodejs run worker in main thread
        return Promise.resolve(syncFn()!(inputData));
    }

    const blob = new Blob([code], { type: 'application/javascript' });
    const blobUrl = URL.createObjectURL(blob);
    const worker = new Worker(blobUrl, {type: 'module'});
    return new Promise<Out>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timeout')), timeout);
        worker.onerror = (e) => {
            clearTimeout(timer);
            console.error(code, inputData, e);
            reject(e);
        };
        worker.onmessage = (e) => {
            const {type, result} = e.data;
            if (type === inputData.type) {
                clearTimeout(timer);
                resolve(result);
                // console.log(code, inputData, result, start - Date.now());
            }
        };
        worker.postMessage(inputData);
    }).finally(() => {
        worker.terminate();
    });
}

export const PERIODS = {
    DAY: 86400,
    WEEK: 604800,      // 7 * 86400
    MONTH: 2592000,    // 30 * 86400
    YEAR: 31536000,    // 365 * 86400
};
