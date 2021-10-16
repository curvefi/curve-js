# Curve JS

## Setup

Install from npm:

`npm install @curvefi/api`

## Init
```ts
import curve from "@curvefi/api";

(async () => {
    // 1. Dev
    await curve.init('JsonRpc', {url: 'http://localhost:8545/', privateKey: ''}, { gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0, chainId: 1 });
    // OR
    await curve.init('JsonRpc', {}, { chainId: 1 }); // In this case fee data will be specified automatically

    // 2. Infura
    curve.init("Infura", { network: "homestead", apiKey: <INFURA_KEY> }, { chainId: 1 });
    
    // 3. Web3 provider
    curve.init('Web3', { externalProvider: <WEB3_PROVIDER> }, { chainId: 1 });
})()
```
**Note 1.** ```chainId``` parameter is optional, but you must specify it in the case you use Metamask on localhost network, because Metamask has that [bug](https://hardhat.org/metamask-issue.html)

**Note 2.** Web3 init requires the address. Therefore, it can be initialized only after receiving the address.

**Wrong ✖️ ❌️**
```tsx
import type { FunctionComponent } from 'react'
import { useState, useMemo } from 'react'
import { providers } from 'ethers'
import Onboard from 'bnc-onboard'
import type { Wallet } from 'bnc-onboard/dist/src/interfaces'
import curve from '@curvefi/api'

    ...

const WalletProvider: FunctionComponent = ({ children }) => {
    const [wallet, setWallet] = useState<Wallet>()
    const [provider, setProvider] = useState<providers.Web3Provider>()
    const [address, setAddress] = useState<string>()

    const networkId = 1

    const onboard = useMemo(
        () =>
            Onboard({
                dappId: DAPP_ID,
                networkId,

                subscriptions: {
                    address: (address) => {
                        setAddress(address)
                    },

                    wallet: (wallet) => {
                        setWallet(wallet)
                        if (wallet.provider) {
                            curve.init("Web3", { externalProvider: wallet.provider }, { chainId: networkId })
                        }
                    },
                },
                walletSelect: {
                    wallets: wallets,
                },
            }),
        []
    )

    ...
```

**Right ✔ ✅️**
```tsx
import type { FunctionComponent } from 'react'
import { useState, useMemo, useEffect } from 'react'
import { providers } from 'ethers'
import Onboard from 'bnc-onboard'
import type { Wallet } from 'bnc-onboard/dist/src/interfaces'
import curve from '@curvefi/api'

    ...

const WalletProvider: FunctionComponent = ({ children }) => {
    const [wallet, setWallet] = useState<Wallet>()
    const [provider, setProvider] = useState<providers.Web3Provider>()
    const [address, setAddress] = useState<string>()

    const networkId = 1

    const onboard = useMemo(
        () =>
            Onboard({
                dappId: DAPP_ID,
                networkId,

                subscriptions: {
                    address: (address) => {
                        setAddress(address)
                    },

                    wallet: (wallet) => {
                        setWallet(wallet)
                    },
                },
                walletSelect: {
                    wallets: wallets,
                },
            }),
        []
    )

    useEffect(() => {
        if (address && wallet?.provider) {
            curve.init("Web3", { externalProvider: wallet.provider }, { chainId: networkId })
        }
    }, [address, wallet?.provider]);

    ...
```

## Balances
```ts
import curve from "@curvefi/api";

(async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0, chainId: 1 });

    console.log(await curve.getBalances(['DAI', 'sUSD']));
    // OR console.log(await curve.getBalances(['0x6B175474E89094C44Da98b954EedeAC495271d0F', '0x57Ab1ec28D129707052df4dF418D58a2D46d5f51']));
    
    // [ '10000.0', '10000.0' ]

    console.log(await curve.getBalances(['aDAI', 'aSUSD']));
    // OR console.log(await curve.getBalances(['0x028171bCA77440897B824Ca71D1c56caC55b68A3', '0x6c5024cd4f8a59110119c56f8933403a539555eb']));

    // [ '10000.000211315200513239', '10000.0' ]

    
    // --- Pool ---

    const saave = new curve.Pool('saave');

    
    // 1. Current address balances (signer balances)
    
    console.log(await saave.balances());
    // {
    //     lpToken: '0.0',
    //     gauge: '0.0',
    //     DAI: '10000.0',
    //     sUSD: '10000.0',
    //     aDAI: '10000.000211315200513239',
    //     aSUSD: '10000.0'
    // }

    console.log(await saave.lpTokenBalances());
    // { lpToken: '0.0', gauge: '0.0' }
    
    console.log(await saave.underlyingCoinBalances());
    // { DAI: '10000.0', sUSD: '10000.0' }

    console.log(await saave.coinBalances());
    // { aDAI: '10000.000211315200513239', aSUSD: '10000.0' }
    
    console.log(await saave.allCoinBalances());
    // {
    //     DAI: '10000.0',
    //     sUSD: '10000.0',
    //     aDAI: '10000.000211315200513239',
    //     aSUSD: '10000.0'
    // }

    
    // 2. For every method above you can specify the address
    
    console.log(await saave.balances("0x0063046686E46Dc6F15918b61AE2B121458534a5"));
    // {
    //     lpToken: '0.0',
    //     gauge: '0.0',
    //     DAI: '0.0',
    //     sUSD: '0.0',
    //     aDAI: '0.0',
    //     aSUSD: '0.0'
    // }

    // Or several addresses
    console.log(await saave.balances("0x0063046686E46Dc6F15918b61AE2B121458534a5", "0x66aB6D9362d4F35596279692F0251Db635165871"));
    // {
    //     '0x0063046686E46Dc6F15918b61AE2B121458534a5': {
    //         lpToken: '0.0',
    //         gauge: '0.0',
    //         DAI: '0.0',
    //         sUSD: '0.0',
    //         aDAI: '0.0',
    //         aSUSD: '0.0'
    //     },
    //     '0x66aB6D9362d4F35596279692F0251Db635165871': {
    //         lpToken: '0.0',
    //         gauge: '0.0',
    //         DAI: '10000.0',
    //         sUSD: '10000.0',
    //         aDAI: '10000.000211315200513239',
    //         aSUSD: '10000.0'
    //     }
    // }

})()
```

## Add/remove liquidity

```ts
import curve from "@curvefi/api";

(async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0, chainId: 1 });

    const pool = new curve.Pool('aave');
    console.log(pool.underlyingCoins); // [ 'DAI', 'USDC', 'USDT' ]
    console.log(pool.coins); // [ 'aDAI', 'aUSDC', 'aUSDT' ]

    console.log(await pool.balances());
    //{
    //  lpToken: '0.0',
    //  gauge: '0.0',
    //  DAI: '1000.0',
    //  USDC: '1000.0',
    //  USDT: '1000.0',
    //  aDAI: '1000.000012756069187853',
    //  aUSDC: '1000.000005',
    //  aUSDT: '1000.0'
    //}


    // --- ADD LIQUIDITY ---
    
    const expectedLpTokenAmount1 = await pool.addLiquidityExpected(['100', '100', '100']);
    // 283.535915313504880343
    const tx = await pool.addLiquidity(['100', '100', '100']);
    console.log(tx); // 0x7aef5b13385207f1d311b7e5d485d4994a6520482e8dc682b5ef26e9addc53be

    //{
    //  lpToken: '283.531953275007017412',
    //  gauge: '0.0',
    //  DAI: '900.0',
    //  USDC: '900.0',
    //  USDT: '900.0',
    //  aDAI: '1000.000091543555348124',
    //  aUSDC: '1000.00007',
    //  aUSDT: '1000.000095'
    //}


    // --- ADD LIQUIDITY WRAPPED ---
    
    await pool.addLiquidityWrappedExpected(['100', '100', '100']);
    // 283.53589268907800207
    await pool.addLiquidityWrapped(['100', '100', '100']);
    
    //{
    //  lpToken: '567.06390438645751582',
    //  gauge: '0.0',
    //  DAI: '900.0',
    //  USDC: '900.0',
    //  USDT: '900.0',
    //  aDAI: '900.00009904712567354',
    //  aUSDC: '900.000077',
    //  aUSDT: '900.000104'
    //}

    
    // --- GAUGE DEPOSIT ---
    
    const lpTokenBalance = (await pool.balances())['lpToken'];
    await pool.gaugeDeposit(lpTokenBalance);
    
    //{
    //  lpToken: '0.0',
    //  gauge: '567.06390438645751582',
    //  DAI: '900.0',
    //  USDC: '900.0',
    //  USDT: '900.0',
    //  aDAI: '900.00009972244701026',
    //  aUSDC: '900.000077',
    //  aUSDT: '900.000105'
    //}


    // --- GAUGE WITHDRAW ---
    
    await pool.gaugeWithdraw(lpTokenBalance);

    //{
    //  lpToken: '567.06390438645751582',
    //  gauge: '0.0',
    //  DAI: '900.0',
    //  USDC: '900.0',
    //  USDT: '900.0',
    //  aDAI: '900.000116605480428249',
    //  aUSDC: '900.000091',
    //  aUSDT: '900.000125'
    //}


    // --- REMOVE LIQUIDITY ---
    
    await pool.removeLiquidityExpected('10');
    // [ '3.200409227699300211', '3.697305', '3.683197' ]
    await pool.removeLiquidity('10');

    //{
    //  lpToken: '557.06390438645751582',
    //  gauge: '0.0',
    //  DAI: '903.200409232502213136',
    //  USDC: '903.697304',
    //  USDT: '903.683196',
    //  aDAI: '900.000117956123101688',
    //  aUSDC: '900.000092',
    //  aUSDT: '900.000127'
    //}


    // --- REMOVE LIQUIDITY WRAPPED ---
    
    await pool.removeLiquidityWrappedExpected('10');
    // [ '3.200409232502213137', '3.697305', '3.683197' ]
    await pool.removeLiquidityWrapped('10');
    
    //{
    //  lpToken: '547.06390438645751582',
    //  gauge: '0.0',
    //  DAI: '903.200409232502213136',
    //  USDC: '903.697304',
    //  USDT: '903.683196',
    //  aDAI: '903.200529221793815936',
    //  aUSDC: '903.697398',
    //  aUSDT: '903.683325'
    //}


    // --- REMOVE LIQUIDITY IMBALANCE ---
    
    await pool.removeLiquidityImbalanceExpected(['10', '10', '10']);
    // 28.353588385263656951
    await pool.removeLiquidityImbalance(['10', '10', '10']);

    //{
    //  lpToken: '518.709923802845859288',
    //  gauge: '0.0',
    //  DAI: '913.200409232502213136',
    //  USDC: '913.697304',
    //  USDT: '913.683196',
    //  aDAI: '903.200530577239468989',
    //  aUSDC: '903.697399',
    //  aUSDT: '903.683327'
    //}


    // --- REMOVE LIQUIDITY IMBALANCE WRAPPED ---
    
    await pool.removeLiquidityImbalanceWrappedExpected(['10', '10', '10']);
    // 28.353588342257067439
    await pool.removeLiquidityImbalanceWrapped(['10', '10', '10']);
    
    //{
    //  lpToken: '490.355943262223785163',
    //  gauge: '0.0',
    //  DAI: '913.200409232502213136',
    //  USDC: '913.697304',
    //  USDT: '913.683196',
    //  aDAI: '913.200531932685151936',
    //  aUSDC: '913.6974',
    //  aUSDT: '913.683329'
    //}


    // --- REMOVE LIQUIDITY ONE COIN ---
    
    await pool.removeLiquidityOneCoinExpected('10','DAI');  // OR await pool.removeLiquidityOneCoinExpected('10', 0);
    // 10.573292542135201585 (DAI amount)
    await pool.removeLiquidityOneCoin('10', 'DAI');  // OR await pool.removeLiquidityOneCoin('10', 0);
    
    //{
    //  lpToken: '480.355943262223785163',
    //  gauge: '0.0',
    //  DAI: '923.773701782667764366',
    //  USDC: '913.697304',
    //  USDT: '913.683196',
    //  aDAI: '913.200532617911563408',
    //  aUSDC: '913.697401',
    //  aUSDT: '913.68333'
    //}


    // --- REMOVE LIQUIDITY ONE COIN WRAPPED ---
    
    await pool.removeLiquidityOneCoinWrappedExpected('10', 'aUSDC');  // OR await pool.removeLiquidityOneCoinWrappedExpected('10', 1);
    // 10.581285 (aUSDC amount)
    await pool.removeLiquidityOneCoinWrapped('10', 'aUSDC');  // OR await pool.removeLiquidityOneCoinWrapped('10', 1);
    
    //{
    //  lpToken: '470.355943262223785163',
    //  gauge: '0.0',
    //  DAI: '923.773701782667764366',
    //  USDC: '913.697304',
    //  USDT: '913.683196',
    //  aDAI: '913.200533988364413768',
    //  aUSDC: '924.278687',
    //  aUSDT: '913.683331'
    //}
})()
```

## Exchange using all pools

```ts
import curve from "@curvefi/api";

(async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0, chainId: 1 });

    console.log(await curve.getBalances(['DAI', 'USDC']));
    // [ '1000.0', '0.0' ]

    const { poolAddress, output } = await curve.getBestPoolAndOutput('DAI', 'USDC', '100');
    // OR await curve.getBestPoolAndOutput('0x6B175474E89094C44Da98b954EedeAC495271d0F', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', '100');
    const expected = await curve.exchangeExpected('DAI', 'USDC', '100');
    // OR await curve.exchangeExpected('0x6B175474E89094C44Da98b954EedeAC495271d0F', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', '100');

    console.log(poolAddress, output, expected);
    // poolAddress = 0x79a8C46DeA5aDa233ABaFFD40F3A0A2B1e5A4F27, output = expected = 100.071099

    await curve.exchange('DAI', 'USDC', '10')
    // OR await curve.exchange('0x6B175474E89094C44Da98b954EedeAC495271d0F', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', '100');

    console.log(await curve.getBalances(['DAI', 'USDC']));
    // [ '900.0', '100.071098' ]
})()
```

## Cross-Asset Exchange

```ts
import curve from "@curvefi/api";

(async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0, chainId: 1 });

    console.log(await curve.getBalances(['DAI', 'WBTC']));
    // [ '1000.0', '0.0' ]

    console.log(await curve.crossAssetExchangeAvailable('DAI', 'WBTC'));
    // true
    console.log(await curve.crossAssetExchangeOutputAndSlippage('DAI', 'WBTC', '500'));
    // { output: '0.01207752', slippage: 0.0000016559718476472085 }
    console.log(await curve.crossAssetExchangeExpected('DAI', 'WBTC', '500'));
    // 0.01207752

    const tx = await curve.crossAssetExchange('DAI', 'WBTC', '500');
    console.log(tx);
    // 0xf452fbb49d9e4ba8976dc6762bcfcc87d5e164577c21f3fa087ae4fe275d1710

    console.log(await curve.getBalances(['DAI', 'WBTC']));
    // [ '500.0', '0.01207752' ]
})()
```

## Boosting
```ts
import curve from "@curvefi/api";

(async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0, chainId: 1 });

    console.log(await curve.boosting.getCrv());
    // 100000.0

    await curve.boosting.createLock('1000', 365);
    // 99000.0 CRV
    
    console.log(await curve.boosting.getLockedAmountAndUnlockTime());
    // { lockedAmount: '1000.0', unlockTime: 1657152000000 }
    console.log(await curve.boosting.getVeCrv());
    // 248.193183980208499221
    console.log(await curve.boosting.getVeCrvPct());
    // 0.000006190640156035

    await curve.boosting.increaseAmount('500');

    // 98500.0 CRV
    // { lockedAmount: '1500.0', unlockTime: 1657152000000 }
    // 372.289692732093137414 veCRV
    // 0.000009285953543912 veCRV %


    await curve.boosting.increaseUnlockTime(365);

    // { lockedAmount: '1500.0', unlockTime: 1688601600000 }
    // 746.262271689452535192 veCRV
    // 0.000018613852077810 veCRV %
})()
```
