import { IPoolDataFromApi } from "./interfaces";
import axios from "axios";
import memoize from "memoizee";

export const _getPoolsFromApi = memoize(
    async (network: "ethereum" | "polygon", poolType: "main" | "crypto" | "factory" | "factory-crypto"): Promise<IPoolDataFromApi[]> => {
        const url = `https://api.curve.fi/api/getPools/${network}/${poolType}`;
        try {
            const response = await axios.get(url);
            return response.data.data.poolData
        } catch (err) {
            return [];
        }
    },
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
    }
)
