import { lowerCasePoolDataAddresses } from "../utils";
import { IPoolData, IDict } from "../../interfaces";

export const POOLS_DATA_ZKSYNC: IDict<IPoolData> = lowerCasePoolDataAddresses({});
