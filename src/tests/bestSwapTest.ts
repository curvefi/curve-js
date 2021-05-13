import { ethers } from "ethers";
import { getBestPoolAndOutput, swap } from "../pools";
import { getBalances } from "../utils";
import { curve } from "../curve";

(async function () {
    await curve.init();
    const address = await curve.signer.getAddress();

    const dai = "0x6b175474e89094c44da98b954eedeac495271d0f";
    const usdc = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
    const balances = await getBalances([address], [dai, usdc]);
    console.log('DAI ', ethers.utils.formatUnits(balances[address][0], 18));
    console.log('USDC ', ethers.utils.formatUnits(balances[address][1], 6));

    const { poolAddress, output } = await getBestPoolAndOutput(dai, usdc, '1000');
    console.log( poolAddress, output )
    await swap(dai, usdc, '1000');

    const balances2 = await getBalances([address], [dai, usdc]);
    console.log('DAI ', ethers.utils.formatUnits(balances2[address][0], 18));
    console.log('USDC ', ethers.utils.formatUnits(balances2[address][1], 6));
})()
