import { IExtendedPoolDataFromApi } from "./interfaces";
import axios from "axios";
import memoize from "memoizee";

export const _getPoolsFromApi = memoize(
    async (network: "ethereum" | "polygon", poolType: "main" | "crypto" | "factory" | "factory-crypto"): Promise<IExtendedPoolDataFromApi> => {
        const url = `https://api.curve.fi/api/getPools/${network}/${poolType}`;
        try {
            const response = await axios.get(url);
            return response.data.data;
        } catch (err) {
            return { poolData: [], tvl: 0, tvlAll: 0 };
        }
    },
    {
        promise: true,
        maxAge: 5 * 60 * 1000, // 5m
    }
)
