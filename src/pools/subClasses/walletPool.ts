import {IDict} from '../../interfaces';
import {
    _prepareAddresses,
    _getBalances,
} from '../../utils.js';
import {type PoolTemplate} from "../PoolTemplate.js";

export interface IWalletPool {
    balances: (...addresses: string[] | string[][]) => Promise<IDict<IDict<string>> | IDict<string>>,
    lpTokenBalances: (...addresses: string[] | string[][]) => Promise<IDict<IDict<string>> | IDict<string>>,
    underlyingCoinBalances: (...addresses: string[] | string[][]) => Promise<IDict<IDict<string>> | IDict<string>>,
    wrappedCoinBalances: (...addresses: string[] | string[][]) => Promise<IDict<IDict<string>> | IDict<string>>,
    allCoinBalances: (...addresses: string[] | string[][]) => Promise<IDict<IDict<string>> | IDict<string>>,
}

export class WalletPool implements IWalletPool {
    private pool: PoolTemplate;

    constructor(pool: PoolTemplate, readonly curve = pool.curve) {
        this.pool = pool;
    }

    private _balances = async (rawCoinNames: string[], rawCoinAddresses: string[], ...addresses: string[] | string[][]):
        Promise<IDict<IDict<string>> | IDict<string>> => {
        const coinNames: string[] = [];
        const coinAddresses: string[] = [];
        // removing duplicates
        for (let i = 0; i < rawCoinAddresses.length; i++) {
            if (!coinAddresses.includes(rawCoinAddresses[i])) {
                coinNames.push(rawCoinNames[i]);
                coinAddresses.push(rawCoinAddresses[i])
            }
        }

        addresses = _prepareAddresses.call(this.curve, addresses);
        const rawBalances: IDict<string[]> = await _getBalances.call(this.curve, coinAddresses, addresses);

        const balances: IDict<IDict<string>> = {};
        for (const address of addresses) {
            balances[address] = {};
            for (const coinName of coinNames) {
                balances[address][coinName] = rawBalances[address].shift() as string;
            }
        }

        return addresses.length === 1 ? balances[addresses[0]] : balances
    }

    public async balances(...addresses: string[] | string[][]): Promise<IDict<IDict<string>> | IDict<string>> {
        if (this.pool.gauge.address === this.curve.constants.ZERO_ADDRESS) {
            return await this._balances(
                ['lpToken', ...this.pool.underlyingCoinAddresses, ...this.pool.wrappedCoinAddresses],
                [this.pool.lpToken, ...this.pool.underlyingCoinAddresses, ...this.pool.wrappedCoinAddresses],
                ...addresses
            );
        } else {
            return await this._balances(
                ['lpToken', 'gauge', ...this.pool.underlyingCoinAddresses, ...this.pool.wrappedCoinAddresses],
                [this.pool.lpToken, this.pool.gauge.address, ...this.pool.underlyingCoinAddresses, ...this.pool.wrappedCoinAddresses],
                ...addresses
            );
        }
    }

    public async lpTokenBalances(...addresses: string[] | string[][]): Promise<IDict<IDict<string>> | IDict<string>> {
        if (this.pool.gauge.address === this.curve.constants.ZERO_ADDRESS) {
            return await this._balances(['lpToken'], [this.pool.lpToken], ...addresses);
        } else {
            return await this._balances(['lpToken', 'gauge'], [this.pool.lpToken, this.pool.gauge.address], ...addresses);
        }
    }

    public async underlyingCoinBalances(...addresses: string[] | string[][]): Promise<IDict<IDict<string>> | IDict<string>> {
        return await this._balances(this.pool.underlyingCoinAddresses, this.pool.underlyingCoinAddresses, ...addresses)
    }

    public async wrappedCoinBalances(...addresses: string[] | string[][]): Promise<IDict<IDict<string>> | IDict<string>> {
        return await this._balances(this.pool.wrappedCoinAddresses, this.pool.wrappedCoinAddresses, ...addresses)
    }

    public async allCoinBalances(...addresses: string[] | string[][]): Promise<IDict<IDict<string>> | IDict<string>> {
        return await this._balances(
            [...this.pool.underlyingCoinAddresses, ...this.pool.wrappedCoinAddresses],
            [...this.pool.underlyingCoinAddresses, ...this.pool.wrappedCoinAddresses],
            ...addresses
        )
    }
}
