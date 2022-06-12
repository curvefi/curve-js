import { curve } from "../curve";
import { getPool } from "./poolConstructor";

export const getPoolList = (): string[] => Object.keys(curve.constants.POOLS_DATA);

export const getFactoryPoolList = (): string[] => Object.keys(curve.constants.FACTORY_POOLS_DATA);

export const getCryptoFactoryPoolList = (): string[] => Object.keys(curve.constants.CRYPTO_FACTORY_POOLS_DATA);

export const getUserPoolList = async (address?: string): Promise<string[]> => {
    if (!address) address = curve.signerAddress;
    address = address as string;

    const poolNames = [...getPoolList(), ...getFactoryPoolList(), ...getCryptoFactoryPoolList()];
    const promises = [];
    for (const poolName of poolNames) {
        const pool = getPool(poolName);
        promises.push(pool.wallet.lpTokenBalances(address)) // TODO optimization
    }

    const userPoolList: string[] = []
    const balances = (await Promise.all(promises)).map((lpBalance) => Object.values(lpBalance).map(Number).reduce((a, b) => a + b));
    for (let i = 0; i < poolNames.length; i++) {
        if (balances[i] > 0) {
            userPoolList.push(poolNames[i]);
        }
    }

    return userPoolList
}
