import {BigNumber, ethers} from "ethers";
import { Pool, getBestPoolAndOutput, swap } from "../pools";
import { CoinInterface, DictInterface } from "../interfaces"
import { getBalances } from "../utils";
import { curve } from "../curve";

(async function () {
    await curve.init();

    const dai = "0x6b175474e89094c44da98b954eedeac495271d0f";
    const usdc = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";

    const { poolAddress, output } = await getBestPoolAndOutput(dai, usdc, '1000');
    console.log( poolAddress, output )
    await swap(dai, usdc, '1000');
})()
