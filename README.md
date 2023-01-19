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
    await curve.init('JsonRpc', {}, {}); // In this case JsonRpc url, privateKey, fee data and chainId will be specified automatically

    // 2. Infura
    await curve.init("Infura", { network: "homestead", apiKey: <INFURA_KEY> }, { chainId: 1 });
    
    // 3. Web3 provider
    await curve.init('Web3', { externalProvider: <WEB3_PROVIDER> }, { chainId: 1 });
    
    // Fetch factory pools
    await curve.fetchFactoryPools();
    await curve.getCryptoFactoryPoolList();
})()
```
**Note 1.** ```chainId``` parameter is optional, but you must specify it in the case you use Metamask on localhost network, because Metamask has that [bug](https://hardhat.org/metamask-issue.html)

**Note 2.** Web3 init requires the address. Therefore, it can be initialized only after receiving the address.

**Wrong ❌️**
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

**Right ✔️**
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

## Notes
- 1 Amounts can be passed in args either as numbers or strings.
- 2 depositOrWithdraw**Bonus** and swap**PriceImpact** methods return %, e. g. 0 < bonus/priceImpact <= 100
- 3 Slippage arg should be passed as %, e. g. 0 < slippage <= 100



## General methods
```ts
import curve from "@curvefi/api";

(async () => {
    await curve.getTVL();
    // 7870819849.685552

    const balances1 = await curve.getBalances(['DAI', 'sUSD']);
    // OR const balances1 = await curve.getBalances(['0x6B175474E89094C44Da98b954EedeAC495271d0F', '0x57Ab1ec28D129707052df4dF418D58a2D46d5f51']);
    console.log(balances1);
    // [ '10000.0', '0.0' ]

    // You can specify addresses
    const balances2 = await curve.getBalances(['aDAI', 'aSUSD'], "0x0063046686E46Dc6F15918b61AE2B121458534a5", "0x66aB6D9362d4F35596279692F0251Db635165871");
    // OR const balances2 = await curve.getBalances(['0x028171bCA77440897B824Ca71D1c56caC55b68A3', '0x6c5024cd4f8a59110119c56f8933403a539555eb'], ["0x0063046686E46Dc6F15918b61AE2B121458534a5", "0x66aB6D9362d4F35596279692F0251Db635165871"]);
    console.log(balances2);
    // {
    //     '0x0063046686E46Dc6F15918b61AE2B121458534a5': [ '0.0', '0.0' ],
    //     '0x66aB6D9362d4F35596279692F0251Db635165871': [ '0.0', '0.0' ]
    // }

    
    const spender = "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7" // 3pool swap address

    await curve.getAllowance(["DAI", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"], curve.signerAddress, spender);
    // [ '0.0', '0.0' ]
    await curve.hasAllowance(["DAI", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"], ['1000', '1000'], curve.signerAddress, spender);
    // false
    await curve.ensureAllowance(["DAI", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"], ['1000', '1000'], spender);
    // [
    //     '0xb0cada2a2983dc0ed85a26916d32b9caefe45fecde47640bd7d0e214ff22aed3',
    //     '0x00ea7d827b3ad50ce933e96c579810cd7e70d66a034a86ec4e1e10005634d041'
    // ]
})()
```

## Pools

### Available pools
```ts
import curve from "@curvefi/api";

(async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0 });
    await curve.fetchFactoryPools();
    await curve.fetchCryptoFactoryPools();

    curve.getPoolList();
    // [
    //     'compound', 'usdt',    'y',          'busd',
    //     'susd',     'pax',     'ren',        'sbtc',
    //     'hbtc',     '3pool',   'gusd',       'husd',
    //     'usdk',     'usdn',    'musd',       'rsv',
    //     'tbtc',     'dusd',    'pbtc',       'bbtc',
    //     'obtc',     'seth',    'eurs',       'ust',
    //     'aave',     'steth',   'saave',      'ankreth',
    //     'usdp',     'ib',      'link',       'tusd',
    //     'frax',     'lusd',    'busdv2',     'reth',
    //     'alusd',    'mim',     'tricrypto2', 'eurt',
    //     'eurtusd',  'eursusd', 'crveth',     'rai',
    //     'cvxeth',   'xautusd', 'spelleth',   'teth',
    //     '2pool',    '4pool'
    // ]
    
    curve.getFactoryPoolList();
    // [
    //     'factory-v2-0',   'factory-v2-2',   'factory-v2-3',   'factory-v2-4',
    //     'factory-v2-5',   'factory-v2-6',   'factory-v2-7',   'factory-v2-8',
    //     'factory-v2-9',   'factory-v2-10',  'factory-v2-11',  'factory-v2-14',
    //     'factory-v2-15',  'factory-v2-17',  'factory-v2-18',  'factory-v2-19',
    //     'factory-v2-21',  'factory-v2-22',  'factory-v2-23',  'factory-v2-24',
    //     'factory-v2-25',  'factory-v2-26',  'factory-v2-27',  'factory-v2-28',
    //     'factory-v2-29',  'factory-v2-30',  'factory-v2-31',  'factory-v2-32',
    //     'factory-v2-33',  'factory-v2-34',  'factory-v2-35',  'factory-v2-36',
    //     'factory-v2-37',  'factory-v2-38',  'factory-v2-39',  'factory-v2-40',
    //     'factory-v2-41',  'factory-v2-42',  'factory-v2-43',  'factory-v2-44',
    //     'factory-v2-45',  'factory-v2-46',  'factory-v2-47',  'factory-v2-48',
    //     'factory-v2-49',  'factory-v2-50',  'factory-v2-51',  'factory-v2-52',
    //     'factory-v2-53',  'factory-v2-54',  'factory-v2-55',  'factory-v2-56',
    //     'factory-v2-57',  'factory-v2-58',  'factory-v2-59',  'factory-v2-60',
    //     'factory-v2-61',  'factory-v2-62',  'factory-v2-63',  'factory-v2-64',
    //     'factory-v2-65',  'factory-v2-66',  'factory-v2-67',  'factory-v2-68',
    //     'factory-v2-69',  'factory-v2-70',  'factory-v2-71',  'factory-v2-72',
    //     'factory-v2-73',  'factory-v2-74',  'factory-v2-75',  'factory-v2-76',
    //     'factory-v2-77',  'factory-v2-78',  'factory-v2-79',  'factory-v2-80',
    //     'factory-v2-81',  'factory-v2-82',  'factory-v2-83',  'factory-v2-84',
    //     'factory-v2-85',  'factory-v2-86',  'factory-v2-87',  'factory-v2-88',
    //     'factory-v2-89',  'factory-v2-90',  'factory-v2-91',  'factory-v2-92',
    //     'factory-v2-93',  'factory-v2-94',  'factory-v2-95',  'factory-v2-96',
    //     'factory-v2-97',  'factory-v2-98',  'factory-v2-99',  'factory-v2-100',
    //     'factory-v2-101', 'factory-v2-102', 'factory-v2-103', 'factory-v2-104',
    //     ... 27 more items
    // ]
    
    curve.getCryptoFactoryPoolList();
    // [
    //     'factory-crypto-0',  'factory-crypto-1',  'factory-crypto-2',
    //     'factory-crypto-3',  'factory-crypto-4',  'factory-crypto-5',
    //     'factory-crypto-6',  'factory-crypto-7',  'factory-crypto-8',
    //     'factory-crypto-9',  'factory-crypto-10', 'factory-crypto-11',
    //     'factory-crypto-12', 'factory-crypto-13', 'factory-crypto-14',
    //     'factory-crypto-15', 'factory-crypto-16', 'factory-crypto-17',
    //     'factory-crypto-18', 'factory-crypto-19', 'factory-crypto-20',
    //     'factory-crypto-21', 'factory-crypto-22', 'factory-crypto-23',
    //     'factory-crypto-24', 'factory-crypto-25', 'factory-crypto-26',
    //     'factory-crypto-27', 'factory-crypto-28', 'factory-crypto-29',
    //     'factory-crypto-30', 'factory-crypto-31', 'factory-crypto-32',
    //     'factory-crypto-33', 'factory-crypto-34', 'factory-crypto-35',
    //     'factory-crypto-36', 'factory-crypto-37', 'factory-crypto-38',
    //     'factory-crypto-39', 'factory-crypto-40', 'factory-crypto-41',
    //     'factory-crypto-42', 'factory-crypto-43', 'factory-crypto-44',
    //     'factory-crypto-45', 'factory-crypto-46', 'factory-crypto-47',
    //     'factory-crypto-48', 'factory-crypto-49', 'factory-crypto-50',
    //     'factory-crypto-51', 'factory-crypto-52', 'factory-crypto-53',
    //     'factory-crypto-54', 'factory-crypto-55', 'factory-crypto-56',
    //     'factory-crypto-57', 'factory-crypto-58', 'factory-crypto-59',
    //     'factory-crypto-60', 'factory-crypto-61', 'factory-crypto-62'
    // ]
})()
````

### Pool fields
```ts
import curve from "@curvefi/api";

(async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0 });
    await curve.fetchFactoryPools();
    await curve.fetchCryptoFactoryPools();

    const pool = curve.getPool('factory-v2-11');

    pool.id;
    // factory-v2-11
    pool.name;
    // FEI Metapool
    pool.fullName;
    // Curve.fi Factory USD Metapool: FEI Metapool
    pool.symbol;
    // FEI3CRV3CRV-f
    pool.referenceAsset;
    // USD
    pool.address;
    // 0x06cb22615ba53e60d67bf6c341a0fd5e718e1655
    pool.lpToken;
    // 0x06cb22615ba53e60d67bf6c341a0fd5e718e1655
    pool.gauge;
    // 0xdc69d4cb5b86388fff0b51885677e258883534ae
    pool.zap;
    // 0xa79828df1850e8a3a3064576f380d90aecdd3359
    pool.sRewardContract;
    // null
    pool.rewardContract;
    // null
    pool.isPlain;
    // false
    pool.isLending;
    // false
    pool.isMeta;
    // true
    pool.isCrypto;
    // false
    pool.isFake;
    // false
    pool.isFactory;
    // true
    pool.basePool;
    // 3pool
    pool.underlyingCoins;
    // [ 'FEI', 'DAI', 'USDC', 'USDT' ]
    pool.wrappedCoins;
    // [ 'FEI', '3Crv' ]
    pool.underlyingCoinAddresses;
    // [
    //     '0x956f47f50a910163d8bf957cf5846d573e7f87ca',
    //     '0x6b175474e89094c44da98b954eedeac495271d0f',
    //     '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    //     '0xdac17f958d2ee523a2206206994597c13d831ec7'
    // ]
    pool.wrappedCoinAddresses;
    // [
    //     '0x956f47f50a910163d8bf957cf5846d573e7f87ca',
    //     '0x6c3f90f043a72fa612cbac8115ee7e52bde6e490'
    // ]
    pool.underlyingDecimals;
    // [ 18, 18, 6, 6 ]
    pool.wrappedDecimals;
    // [ 18, 18 ]
    pool.useLending;
    // [ false, false, false, false ]
})()
````

### Wallet balances for pool
```ts
import curve from "@curvefi/api";

(async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0 });
    
    const saave = curve.getPool('saave');
    
    // 1. Current address (signer) balances

    await saave.wallet.balances();
    // {
    //     lpToken: '0.0',
    //     gauge: '0.0',
    //     '0x6B175474E89094C44Da98b954EedeAC495271d0F': '10000.0',
    //     '0x57Ab1ec28D129707052df4dF418D58a2D46d5f51': '10000.0',
    //     '0x028171bCA77440897B824Ca71D1c56caC55b68A3': '10000.00017727177059715',
    //     '0x6c5024cd4f8a59110119c56f8933403a539555eb': '10000.000080108429034461'
    // }


    await saave.wallet.lpTokenBalances();
    // { lpToken: '0.0', gauge: '0.0' }

    await saave.wallet.underlyingCoinBalances();
    // {
    //     '0x6B175474E89094C44Da98b954EedeAC495271d0F': '10000.0',
    //     '0x57Ab1ec28D129707052df4dF418D58a2D46d5f51': '10000.0'
    // }

    await saave.wallet.wrappedCoinBalances();
    // {
    //     '0x028171bCA77440897B824Ca71D1c56caC55b68A3': '10000.00017727177059715',
    //     '0x6c5024cd4f8a59110119c56f8933403a539555eb': '10000.000080108429034461'
    // }

    await saave.wallet.allCoinBalances();
    // {
    //     '0x6B175474E89094C44Da98b954EedeAC495271d0F': '10000.0',
    //     '0x57Ab1ec28D129707052df4dF418D58a2D46d5f51': '10000.0',
    //     '0x028171bCA77440897B824Ca71D1c56caC55b68A3': '10000.00017727177059715',
    //     '0x6c5024cd4f8a59110119c56f8933403a539555eb': '10000.000080108429034461'
    // }


    // 2. For every method above you can specify the address
    
    await saave.wallet.balances("0x0063046686E46Dc6F15918b61AE2B121458534a5");
    // {
    //     lpToken: '0.0',
    //     gauge: '0.0',
    //     '0x6B175474E89094C44Da98b954EedeAC495271d0F': '0.0',
    //     '0x57Ab1ec28D129707052df4dF418D58a2D46d5f51': '0.0',
    //     '0x028171bCA77440897B824Ca71D1c56caC55b68A3': '0.0',
    //     '0x6c5024cd4f8a59110119c56f8933403a539555eb': '0.0'
    // }

    // Or several addresses
    await saave.wallet.balances("0x0063046686E46Dc6F15918b61AE2B121458534a5", "0x66aB6D9362d4F35596279692F0251Db635165871");
    // {
    //     '0x0063046686E46Dc6F15918b61AE2B121458534a5': {
    //         lpToken: '0.0',
    //         gauge: '0.0',
    //         '0x6B175474E89094C44Da98b954EedeAC495271d0F': '0.0',
    //         '0x57Ab1ec28D129707052df4dF418D58a2D46d5f51': '0.0',
    //         '0x028171bCA77440897B824Ca71D1c56caC55b68A3': '0.0',
    //         '0x6c5024cd4f8a59110119c56f8933403a539555eb': '0.0'
    //     },
    //     '0x66aB6D9362d4F35596279692F0251Db635165871': {
    //         lpToken: '0.0',
    //         gauge: '0.0',
    //         '0x6B175474E89094C44Da98b954EedeAC495271d0F': '10000.0',
    //         '0x57Ab1ec28D129707052df4dF418D58a2D46d5f51': '10000.0',
    //         '0x028171bCA77440897B824Ca71D1c56caC55b68A3': '10000.00017727177059715',
    //         '0x6c5024cd4f8a59110119c56f8933403a539555eb': '10000.000080108429034461'
    //     }
    // }
})()
```

### Stats
```ts
import curve from "@curvefi/api";

(async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0 });
    
    
    // --- COMPOUND ---

    const compound = curve.getPool('compound');
    
    await compound.stats.parameters();
    // {
    //     lpTokenSupply: '66658430.461661546713781772',
    //     virtualPrice: '1.107067773320466717',
    //     fee: '0.04',
    //     adminFee: '0.02',
    //     A: '4500',
    //     future_A: '4500',
    //     initial_A: undefined,
    //     future_A_time: undefined,
    //     initial_A_time: undefined,
    //     gamma: undefined
    // }
    
    await compound.stats.underlyingBalances();
    // [ '66625943.103442629270215258', '33124832.500932' ]
    
    await compound.stats.wrappedBalances();
    // [ '3026076723.05777297', '1464830413.37972924' ]

    await compound.stats.totalLiquidity();
    // 99836271.3031733

    // --- STETH ---
    
    const steth = curve.getPool('steth');
    
    await steth.stats.volume();
    // 174737430.35185483

    await steth.stats.baseApy();
    // { day: '3.1587592896017647', week: '2.6522145719060752' } (as %)
    
    await steth.stats.tokenApy();
    // [ '0.5918', '1.4796' ] (as %)
    
    await steth.stats.rewardsApy();
    // [
    //     {
    //         gaugeAddress: '0x182b723a58739a9c974cfdb385ceadb237453c28',
    //         tokenAddress: '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32',
    //         tokenPrice: 1.023,
    //         name: 'Lido DAO Token',
    //         symbol: 'LDO',
    //         decimals: '18',
    //         apy: 2.6446376845647155 (as %)
    //     }
    // ]
    
})()
````

### Deposit
```ts
(async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0 });

    const pool = curve.getPool('mim');

    
    // --- UNDERLYING ---

    
    await pool.wallet.underlyingCoinBalances();
    // {
    //     '0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3': '10000.0',
    //     '0x6b175474e89094c44da98b954eedeac495271d0f': '10000.0',
    //     '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': '10000.0',
    //     '0xdac17f958d2ee523a2206206994597c13d831ec7': '10000.0',
    // }
    await pool.wallet.lpTokenBalances();
    // { lpToken: '0.0', gauge: '0.0' }

    await pool.depositBalancedAmounts();
    // [
    //     '10000.000000000000000000',
    //     '785.167649368248476094',
    //     '771.263652',
    //     '2234.662927'
    // ]
    await pool.depositExpected([100, 100, 100, 100]);
    // 397.546626854200557344
    await pool.depositBonus([100, 100, 100, 100]);
    // 0.04489060058668274
    await pool.depositIsApproved([100, 100, 100, 100]);
    // false
    await pool.depositApprove([100, 100, 100, 100]);
    // [
    //     '0xd3bb4266a9004b4c42d41984d65cce65050a216564dcefa852bbe29f0466bc32',
    //     '0xb2e67fb6cc0d4cef18e918bccf85248a30aa5c318220e8c3887f5f936599e639',
    //     '0x6d523d348ef1dc24e4a61830476f3c5e4450e8e2c91d903f9e0272efc73f5af8',
    //     '0xe2c7bd884b91011791d0e979b9511ca035efee60a5c23b7f5623d490250ca4b2'
    // ]
    await pool.deposit(['100', '100', '100', '100'], 0.1); // slippage = 0.1 %
    // 0x8202a2fd645d6b9bc2c6f47aa3475d61bcfd5905def125e8287cb47f3f86db75
    
    // {
    //     '0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3': '9900.0',
    //     '0x6b175474e89094c44da98b954eedeac495271d0f': '9900.0',
    //     '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': '9900.0',
    //     '0xdac17f958d2ee523a2206206994597c13d831ec7': '9900.0',
    // }
    // { lpToken: '397.465346370726773487', gauge: '0.0' }
    
    
    // --- WRAPPED ---
    
    
    await pool.wallet.wrappedCoinBalances();
    // {
    //     '0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3': '9900.0',
    //     '0x6c3f90f043a72fa612cbac8115ee7e52bde6e490': '100000.0'
    // }
    await pool.wallet.lpTokenBalances();
    // { lpToken: '397.465346370726773487', gauge: '0.0' }
    
    await pool.depositWrappedBalancedAmounts();
    // [ '9900.000000000000000000', '3674.037213475177850341' ]
    await pool.depositWrappedExpected(['100', '100']);
    // 200.853415578798484973
    await pool.depositWrappedBonus([100, 100]);
    // 0.5057286575144729
    await pool.depositWrappedIsApproved([100, 100]);
    // false
    await pool.depositWrappedApprove([100, 100]);
    // [
    //     '0xe8eb519833d417dcd8da1ee3c4fcadf30dece560b7e1977a5f78c995f8e72b4b',
    //     '0xd7d02b26a052f755bed033a880745ff58775d4668d7620042b6e5973e90ba574'
    // ]
    await pool.depositWrapped([100, 100], 0.1); // slippage = 0.1 %
    // 0x78b943a9a1082cd07ddb0225b070e934740448bfa10444b00cd00e7368ad0601
    
    // {
    //     '0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3': '9800.0',
    //     '0x6c3f90f043a72fa612cbac8115ee7e52bde6e490': '99900.0'
    // }
    // { lpToken: '598.300246031617065027', gauge: '0.0' }
})()
```

### Staking
```ts
(async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0 });

    const pool = curve.getPool('mim');
    
    const balances = await pool.wallet.lpTokenBalances() as IDict<string>;
    // { lpToken: '598.300246031617065027', gauge: '0.0' }
    
    await pool.stakeIsApproved(balances.lpToken);
    // false
    await pool.stakeApprove(balances.lpToken);
    // [
    //     '0x9d5011800bb4afe82b3a97a56a55762f11b5e999c1de908f38a66f7425c0b0d0'
    // ]
    await pool.stake(balances.lpToken);
    // 0xf884b798be15295f090476eb9d13c46d09d8c05dc0e05d822a34120fa641f645

    await pool.wallet.lpTokenBalances();
    // { lpToken: '0.0', gauge: '598.300246031617065027' }
    
    await pool.unstake(balances.lpToken);
    // 0x802b96921f2fabb433e02489315850a81c1a2e180cd05d84a6d71ce9fc624020

    await pool.wallet.lpTokenBalances();
    // { lpToken: '598.300246031617065027', gauge: '0.0' }
})()
```

### Withdraw
```ts
(async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0 });

    const pool = curve.getPool('mim');

    // --- UNDERLYING ---

    await pool.wallet.underlyingCoinBalances();
    // {
    //     '0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3': '9800.0',
    //     '0x6b175474e89094c44da98b954eedeac495271d0f': '9900.0',
    //     '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': '9900.0',
    //     '0xdac17f958d2ee523a2206206994597c13d831ec7': '9900.0'
    // }
    await pool.wallet.lpTokenBalances();
    // { lpToken: '598.300246031617065027', gauge: '0.0' }

    await pool.withdrawExpected(10);
    // [
    //     '7.299072252784503555',
    //     '0.573101727634383933',
    //     '0.562953',
    //     '1.631103'
    // ]
    await pool.withdrawIsApproved(10);
    // false
    await pool.withdrawApprove(10);
    // [
    //     '0xbc72529f860eab00ae6e72234a68c48c9bfa8e093813ecf6796d46de419badca'
    // ]
    await pool.withdraw('10', 0.1); // slippage = 0.1 %
    // 0x4dc3add45566e0f3404c2fa0b7aa27203688833ffbe9b985f36bf785d19e4fad

    // {
    //     '0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3': '9807.299072252784503555',
    //     '0x6b175474e89094c44da98b954eedeac495271d0f': '9900.573101727634383932',
    //     '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': '9900.562953',
    //     '0xdac17f958d2ee523a2206206994597c13d831ec7': '9901.631102'
    // }
    // { lpToken: '588.300246031617065027', gauge: '0.0' }

    // --- WRAPPED ---

    await pool.wallet.wrappedCoinBalances();
    // {
    //     '0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3': '9807.299072252784503555',
    //     '0x6c3f90f043a72fa612cbac8115ee7e52bde6e490': '99900.0'
    // }
    await pool.wallet.lpTokenBalances();
    // { lpToken: '588.300246031617065027', gauge: '0.0' }

    await pool.withdrawWrappedExpected('10');
    // [ '7.299072252784503555', '2.708796226980363129' ]
    await pool.withdrawWrapped(10); // slippage = 0.5 % by default
    // 0x61f7b602bc52d20fdf473c8dd8cbea12f11918fdbd74c496235887c70321395a
    
    // {
    //     '0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3': '9814.59814450556900711',
    //     '0x6c3f90f043a72fa612cbac8115ee7e52bde6e490': '99902.708796226980363129'
    // }
    // { lpToken: '578.300246031617065027', gauge: '0.0' }
})()
```

### Withdraw imbalance
```ts
(async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0 });

    const pool = curve.getPool('mim');

    // --- UNDERLYING ---

    await pool.wallet.underlyingCoinBalances();
    // {
    //     '0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3': '9814.59814450556900711',
    //     '0x6b175474e89094c44da98b954eedeac495271d0f': '9900.573101727634383932',
    //     '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': '9900.562953',
    //     '0xdac17f958d2ee523a2206206994597c13d831ec7': '9901.631102'
    // }
    await pool.wallet.lpTokenBalances();
    // { lpToken: '578.300246031617065027', gauge: '0.0' }

    await pool.withdrawImbalanceExpected(['10', '10', '10', '10']);
    // 39.754662629184493064
    await pool.withdrawImbalanceBonus(['10', '10', '10', '10']);
    // -0.04487324436377509
    await pool.withdrawImbalanceIsApproved(['10', '10', '10', '10']);
    // true
    await pool.withdrawImbalanceApprove(['10', '10', '10', '10']);
    // []
    await pool.withdrawImbalance(['10', '10', '10', '10'], 0.1); // slippage = 0.1 %
    // 0xfba4dfb47cd5692ef01608e7b04439ec211cb28430b488e60fee5cadb77ac321

    // {
    //     '0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3': '9824.59814450556900711',
    //     '0x6b175474e89094c44da98b954eedeac495271d0f': '9910.573101727634383932',
    //     '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': '9910.562953',
    //     '0xdac17f958d2ee523a2206206994597c13d831ec7': '9911.631102'
    // }
    // { lpToken: '538.537454267261447723', gauge: '0.0' }

    // --- WRAPPED ---

    await pool.wallet.wrappedCoinBalances();
    // {
    //     '0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3': '9824.59814450556900711',
    //     '0x6c3f90f043a72fa612cbac8115ee7e52bde6e490': '99902.708796226980363129'
    // }
    await pool.wallet.lpTokenBalances();
    // { lpToken: '538.537454267261447723', gauge: '0.0' }

    await pool.withdrawImbalanceWrappedExpected(['10', '10']);
    // 20.085341556879117658
    await pool.withdrawImbalanceWrappedBonus(['10', '10']);
    // -0.5031837243343519
    await pool.withdrawImbalanceWrapped(['10', '10'], 0.1); // slippage = 0.1 %
    // 0xb9e6174695152d7dbe274fec969ffd2d62c994cdbf58455e9954cddd0a8f7189

    // {
    //     '0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3': '9834.59814450556900711',
    //     '0x6c3f90f043a72fa612cbac8115ee7e52bde6e490': '99912.708796226980363129'
    // }
    // { lpToken: '518.450261119283204342', gauge: '0.0' }
})()
```

### Withdraw one coin
```ts
(async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0 });

    const pool = curve.getPool('mim');

    
    // --- UNDERLYING ---

    
    await pool.wallet.underlyingCoinBalances();
    // {
    //     '0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3': '9834.59814450556900711',
    //     '0x6b175474e89094c44da98b954eedeac495271d0f': '9910.573101727634383932',
    //     '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': '9910.562953',
    //     '0xdac17f958d2ee523a2206206994597c13d831ec7': '9911.631102'
    // }
    await pool.wallet.lpTokenBalances();
    // { lpToken: '518.450261119283204342', gauge: '0.0' }

    const underlyingExpected = await pool.withdrawOneCoinExpected(10, 'DAI');
    // OR const underlyingExpected = await pool.withdrawOneCoinExpected('10', '0x6B175474E89094C44Da98b954EedeAC495271d0F');
    // OR const underlyingExpected = await pool.withdrawOneCoinExpected('10', 1);
    console.log(underlyingExpected);
    // 10.053583529099204888
    await pool.withdrawOneCoinBonus(10, 'DAI');
    // -0.1256449500769996
    await pool.withdrawOneCoinIsApproved(10);
    // true
    await pool.withdrawOneCoinApprove(10);
    // []
    const underlyingTx = await pool.withdrawOneCoin(10, 'DAI', 0.1);
    // OR const underlyingTx = await pool.withdrawOneCoin('10', '0x6B175474E89094C44Da98b954EedeAC495271d0F');
    // OR const underlyingTx = await pool.withdrawOneCoin('10', 1);
    console.log(underlyingTx);
    //0x5b4c5ec49f53719b5440355439a2cad445935895b5c1034ae6092ebbe17f0328

    // {
    //     '0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3': '9834.59814450556900711',
    //     '0x6b175474e89094c44da98b954eedeac495271d0f': '9920.62668525673358882',
    //     '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': '9910.562953',
    //     '0xdac17f958d2ee523a2206206994597c13d831ec7': '9911.631102'
    // }
    // { lpToken: '508.450261119283204342', gauge: '0.0' }

    
    // --- WRAPPED ---

    
    await pool.wallet.wrappedCoinBalances();
    // {
    //     '0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3': '9834.59814450556900711',
    //     '0x6c3f90f043a72fa612cbac8115ee7e52bde6e490': '99912.708796226980363129'
    // }
    await pool.wallet.lpTokenBalances();
    // { lpToken: '508.450261119283204342', gauge: '0.0' }

    const wrappedExpected = await pool.withdrawOneCoinWrappedExpected('10', 'MIM');
    // OR const wrappedExpected = await pool.withdrawOneCoinWrappedExpected('10', '0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3');
    // OR const wrappedExpected = await pool.withdrawOneCoinWrappedExpected('10', 0);
    console.log(wrappedExpected)
    // 10.066854269984687383
    await pool.withdrawOneCoinWrappedBonus(10, 'MIM');
    // 0.5893939242941038
    const wrappedTx = await pool.withdrawOneCoinWrapped('10', 'MIM', 0.1);
    // OR await pool.withdrawOneCoinWrapped('10', '0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3');
    // OR await pool.withdrawOneCoinWrapped('10', 0);
    console.log(wrappedTx);
    // 0xf82af519a3e4f0743c89fd1e93982934f1a2dde721221b00dd474f6b0a24f7f2

    // {
    //     '0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3': '9844.664998775553694493',
    //     '0x6c3f90f043a72fa612cbac8115ee7e52bde6e490': '99912.708796226980363129'
    // }
    // { lpToken: '498.450261119283204342', gauge: '0.0' }
})()
```

### Swap
```ts
(async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0 });

    const pool = curve.getPool('mim');

    
    // --- UNDERLYING ---

    
    await pool.wallet.underlyingCoinBalances();
    // {
    //     '0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3': '9844.882755243317396535',
    //     '0x6b175474e89094c44da98b954eedeac495271d0f': '9930.611305190224186298',
    //     '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': '9910.562953',
    //     '0xdac17f958d2ee523a2206206994597c13d831ec7': '9911.631102'
    // }

    const underlyingExpected = await pool.swapExpected('MIM','DAI', 10);
    // OR const underlyingExpected = await pool.swapExpected('0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3', '0x6B175474E89094C44Da98b954EedeAC495271d0F', '10');
    // OR const underlyingExpected = await pool.swapExpected(0, 1, '10');
    console.log(underlyingExpected);
    // 9.984619933234026875
    const underlyingPriceImpact = await pool.swapPriceImpact('MIM','DAI', 10);
    // OR const underlyingPriceImpact = await pool.swapPriceImpact('0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3', '0x6B175474E89094C44Da98b954EedeAC495271d0F', '10');
    // OR const underlyingPriceImpact = await pool.swapPriceImpact(0, 1, '10');
    console.log(underlyingPriceImpact);
    // 0.000026 (as %)
    await pool.swapIsApproved('MIM', 10);
    // true
    await pool.swapApprove('MIM', 10);
    // []
    const swapTx = await pool.swap('MIM','DAI', 10, 0.1);
    // OR const swapTx = await pool.swap('0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3', '0x6B175474E89094C44Da98b954EedeAC495271d0F', '10');
    // OR const swapTx = await pool.swap(0, 1, 10);
    console.log(swapTx);
    // 0xbcd0d1248e6a8571c2a45d4f7095bc1fece479b6e87219cdd7d239c4e1e0ca32

    // {
    //     '0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3': '9834.882755243317396535',
    //     '0x6b175474e89094c44da98b954eedeac495271d0f': '9940.595925123458213173',
    //     '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': '9910.562953',
    //     '0xdac17f958d2ee523a2206206994597c13d831ec7': '9911.631102'
    // }

    
    // --- WRAPPED ---

    
    await pool.wallet.wrappedCoinBalances();
    // {
    //     '0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3': '9834.882755243317396535',
    //     '0x6c3f90f043a72fa612cbac8115ee7e52bde6e490': '99902.708796226980363129'
    // }

    const wrappedExpected = await pool.swapWrappedExpected('3crv','MIM', 10);
    // OR const wrappedExpected = await pool.swapWrappedExpected('0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490', '0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3', '10');
    // OR const wrappedExpected = await pool.swapWrappedExpected(1, 0, '10');
    console.log(wrappedExpected);
    // 10.217756467720521951
    const wrappedPriceImpact = await pool.swapWrappedPriceImpact('3crv','MIM', 10);
    // OR const wrappedPriceImpact = await pool.swapWrappedPriceImpact('0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490', '0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3', '10');
    // OR const wrappedPriceImpact = await pool.swapWrappedPriceImpact(1, 0, '10');
    console.log(wrappedPriceImpact);
    // 0.000081 (as %)
    await pool.swapWrappedIsApproved('3crv', 10);
    // true
    await pool.swapWrappedApprove('3crv', 10);
    // []
    const swapWrappedTx = await pool.swapWrapped('3crv','MIM', 10, 0.1);
    // OR const swapWrappedTx = await pool.swapWrapped('0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490', '0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3', '10');
    // OR const swapWrappedTx = await pool.swapWrapped(1, 0, '10');
    console.log(swapWrappedTx);
    // 0x59ff5e44f083b57a1f612c1ad5ac7d3fe68b4c753ddd6400ab8bd6437485288c

    // {
    //     '0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3': '9845.100511711037918486',
    //     '0x6c3f90f043a72fa612cbac8115ee7e52bde6e490': '99892.708796226980363129'
    // }
})()
```

### Deposit & Stake
```ts
(async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0 });
    
    const pool = curve.getPool('compound');
    const amounts = [1000, 1000];

    
    // --- UNDERLYING ---
    
    
    await pool.wallet.underlyingCoinBalances();
    // {
    //     '0x6b175474e89094c44da98b954eedeac495271d0f': '10000.0',
    //     '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': '10000.0',
    // }
    await pool.wallet.lpTokenBalances();
    // { lpToken: '0.0', gauge: '0.0' }
    
    await pool.depositAndStakeExpected(amounts);
    // 1820.604572902286288394
    await pool.depositAndStakeBonus(amounts);
    // 0.0030482584681188
    await pool.depositAndStakeIsApproved(amounts);
    // false
    await pool.depositAndStakeApprove(amounts);
    // [
    //     '0xb363c95fb8e63f724d6a05dfa756ede38132ce3fc8faf80306d925856996669c',
    //     '0x53d01fd54fb607091c67f8b39ff9e2e7670396d831b856b1979caaa6ac6ea37b',
    //     '0xd69ca27c30fa6e5ba927d0382987f142895481710439dae358a1daeeb01c7248'
    // ]
    await pool.depositAndStake(amounts);
    // 0x3ec53842120be75f51e907803da844f4d3e8435766e0c25a40700085ed5b56c4

    // {
    //     '0x6b175474e89094c44da98b954eedeac495271d0f': '9000.0',
    //     '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': '9000.0',
    // }
    // { lpToken: '0.0', gauge: '1820.556829935710883568' }

    
    // --- WRAPPED ---
    
    
    await pool.wallet.wrappedCoinBalances();
    // {
    //     '0x5d3a536e4d6dbd6114cc1ead35777bab948e3643': '10000.0',
    //     '0x39aa39c021dfbae8fac545936693ac917d5e7563': '10000.0'
    // }
    await pool.wallet.lpTokenBalances();
    // { lpToken: '0.0', gauge: '1820.556829935710883568' }

    await pool.depositAndStakeWrappedExpected(amounts);
    // 40.328408669183101673
    await pool.depositAndStakeWrappedBonus(amounts);
    // 0.46040576921447873
    await pool.depositAndStakeWrappedIsApproved(amounts);
    // false
    await pool.depositAndStakeWrappedApprove(amounts);
    // [
    //     '0x53035c46f877ed4d156aff5aee0f8e04c0e0701e40651e9e55f41976919b093d',
    //     '0x4743386669a6a21fbe09805ae50e281db22cf518d681ee1e5d0f81a1d761e79b',
    //     '0x8580b6bd88dfd0eeab77480e50d82ba14922fd4b431b0123a7ac425236e1db3a'
    // ]
    await pool.depositAndStakeWrapped(amounts);
    // 0xdb73e3176ab876806f99f71d70ad6ee93d7a865c15faa062ebaba2011b94b315

    // {
    //     '0x5d3a536e4d6dbd6114cc1ead35777bab948e3643': '9000.0',
    //     '0x39aa39c021dfbae8fac545936693ac917d5e7563': '9000.0'
    // }
    // { lpToken: '0.0', gauge: '1860.884096082215274556' }
})();
```


## Router
```ts
import curve from "@curvefi/api";

(async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0 });
    await curve.fetchFactoryPools();
    await curve.getCryptoFactoryPoolList();

    await curve.getBalances(['DAI', 'CRV']);
    // [ '9900.0', '100049.744832225238317557' ]

    const { route, output } = await curve.router.getBestRouteAndOutput('DAI', 'CRV', '1000');
    // OR await curve.router.getBestRouteAndOutput('0x6B175474E89094C44Da98b954EedeAC495271d0F', '0xD533a949740bb3306d119CC777fa900bA034cd52', '1000');
    const expected = await curve.router.expected('DAI', 'CRV', '1000');
    // OR await curve.router.expected('0x6B175474E89094C44Da98b954EedeAC495271d0F', '0xD533a949740bb3306d119CC777fa900bA034cd52', '1000');
    const priceImpact = await curve.router.priceImpact('DAI', 'CRV', '1000');
    // OR await curve.router.priceImpact('0x6B175474E89094C44Da98b954EedeAC495271d0F', '0xD533a949740bb3306d119CC777fa900bA034cd52', '1000');

    console.log(route, output, expected, priceImpact);
    // route = [
    //     {
    //         poolId: '3pool',
    //         poolAddress: '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7',
    //         outputCoinAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    //         i: 0,
    //         j: 2,
    //         swapType: 1,
    //         swapAddress: '0x0000000000000000000000000000000000000000'
    //     },
    //     {
    //         poolId: 'tricrypto2',
    //         poolAddress: '0xD51a44d3FaE010294C616388b506AcdA1bfAAE46',
    //         outputCoinAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    //         i: 0,
    //         j: 2,
    //         swapType: 3,
    //         swapAddress: '0x0000000000000000000000000000000000000000'
    //     },
    //     {
    //         poolId: 'crveth',
    //         poolAddress: '0x8301AE4fc9c624d1D396cbDAa1ed877821D7C511',
    //         outputCoinAddress: '0xd533a949740bb3306d119cc777fa900ba034cd52',
    //         i: 0,
    //         j: 1,
    //         swapType: 3,
    //         swapAddress: '0x0000000000000000000000000000000000000000'
    //     }
    // ]
    // 
    // output = expected = 378.881631202862354937
    // 
    // priceImpact = 0.158012 %
    
    await curve.router.isApproved('DAI', 1000);
    // false
    await curve.router.approve('DAI', 1000);
    // [
    //     '0xc111e471715ae6f5437e12d3b94868a5b6542cd7304efca18b5782d315760ae5'
    // ]
    const swapTx = await curve.router.swap('DAI', 'CRV', '1000');
    // OR const swapTx = await curve.router.swap('0x6B175474E89094C44Da98b954EedeAC495271d0F', '0xD533a949740bb3306d119CC777fa900bA034cd52', '1000');
    console.log(swapTx.hash);
    // 0xc7ba1d60871c0295ac5471bb602c37ec0f00a71543b3a041308ebd91833f26ba
    const swappedAmount = await curve.router.getSwappedAmount(swapTx, 'CRV');
    // 1573.668171170839785062

    await curve.getBalances(['DAI', 'CRV']);
    // [ '8900.0', '100428.626463428100672494' ]
})()
```

## Boosting

### Lock
```ts
import curve from "@curvefi/api";

(async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0 });

    await curve.boosting.getCrv();
    // 100000.0
    await curve.boosting.getLockedAmountAndUnlockTime();
    // { lockedAmount: '0.0', unlockTime: 0 }
    await curve.boosting.getVeCrv();
    // 0.0
    await curve.boosting.getVeCrvPct();
    // 0.000000000000000000

    curve.boosting.isApproved(1000);
    // false 
    curve.boosting.approve(1000);
    // [
    //     '0x07f6daedb705446cb56ab42c18ba9ec5302ef5ed9c7ef0bb5c3c92493abcfc79'
    // ]
    
    curve.boosting.calcUnlockTime(365);  // now (by default) + 365 days, rounded down by WEEK
    // 1657152000000
    await curve.boosting.createLock(1000, 365);
    // 99000.0 CRV
    // { lockedAmount: '1000.0', unlockTime: 1657152000000 }
    // 248.193183980208499221
    // 0.000006190640156035

    await curve.boosting.increaseAmount('500');
    // 98500.0 CRV
    // { lockedAmount: '1500.0', unlockTime: 1657152000000 }
    // 372.289692732093137414 veCRV
    // 0.000009285953543912 veCRV %

    const { unlockTime: currentUnlockTime } = await curve.boosting.getLockedAmountAndUnlockTime();
    curve.boosting.calcUnlockTime(365, currentUnlockTime);  // currentUnlockTime + 365 days, rounded down by WEEK
    // 1688601600000
    await curve.boosting.increaseUnlockTime(365);
    // 98500.0 CRV
    // { lockedAmount: '1500.0', unlockTime: 1688601600000 }
    // 746.262271689452535192 veCRV
    // 0.000018613852077810 veCRV %
})()
```
### Claim fees
```ts
import curve from "@curvefi/api";

(async () => {
    await curve.init('JsonRpc', {});

    await curve.getBalances(['3crv']);
    // ['0.0']
    await curve.boosting.claimableFees();
    // 1.30699696445248888

    await curve.boosting.claimFees();

    await curve.getBalances(['3crv']);
    // ['1.30699696445248888']
    await curve.boosting.claimableFees();
    // 0.0
})()
```

## CRV. Profit, claim, boosting
```ts
import curve from "@curvefi/api";

(async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0 });

    const pool = curve.getPool('compound');

    await pool.depositAndStake([1000, 1000]);
    await pool.crvProfit();
    // {
    //     day: '0.01861607837347995222',
    //     week: '0.13031254861435966551',
    //     month: '0.55848235120439856649',
    //     year: '6.79486860632018255891',
    //     token: '0xd533a949740bb3306d119cc777fa900ba034cd52',
    //     symbol: 'CRV',
    //     price: 0.978134
    // }
    await pool.stats.tokenApy();
    // [ '0.3324', '0.8309' ]
    await pool.currentCrvApy();
    // 0.3324
    await pool.boost();
    // 1.0

    await curve.boosting.createLock(10000, 365 * 4);
    await pool.depositAndStake([1000, 1000]);
    // crvProfit = {
    //     day: '0.05703837081508656944',
    //     week: '0.39926859570560598606',
    //     month: '1.7111511244525970831',
    //     year: '20.81900534750659784443',
    //     token: '0xd533a949740bb3306d119cc777fa900ba034cd52',
    //     symbol: 'CRV',
    //     price: 0.978134
    // }
    //
    // currentApy = 0.5092
    // boost = 1.532

    await pool.wallet.lpTokenBalances();
    // { lpToken: '0.0', gauge: '3610.795806899650569624' }
    await pool.maxBoostedStake();
    // 1281.660714834072909477

    // ------ Wait some time... ------
    await pool.claimableCrv();
    // 0.4085482040149887
    await pool.claimCrv();
    // claimableCrv = 0.0
})()
```

## Rewards. Profit and claim
```ts
import curve from "@curvefi/api";

(async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0 });
    
    const pool = curve.getPool('susd');

    await pool.rewardTokens();
    // [
    //     {
    //         token: '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f',
    //         symbol: 'SNX',
    //         decimals: 18
    //     }
    // ]
    await pool.depositAndStake([1000, 1000, 1000, 1000]);
    await pool.rewardsProfit();
    // [
    //     {
    //         day: '0.02387645750842563304',
    //         week: '0.16713520255897943129',
    //         month: '0.71629372525276899123',
    //         year: '8.71490699057535605995',
    //         token: '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f',
    //         symbol: 'SNX',
    //         price: 2.61
    //     }
    // ]
    
    // ------ Wait some time... ------
    
    await pool.claimableRewards();
    // [
    //     {
    //         token: '0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F',
    //         symbol: 'SNX',
    //         amount: '0.000596325465987726'
    //     }
    // ]
    await pool.claimRewards();
    // claimableRewards = [
    //     {
    //         token: '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f',
    //         symbol: 'SNX',
    //         amount: '0.0'
    //     }
    // ]
})()
```
## User balances, base profit and share
```ts
(async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0 });

    const pool = curve.getPool('frax');

    await pool.deposit([1000, 1000, 1000, 1000]);
    // { lpToken: '3967.761942945398518479', gauge: '0.0' }
    await pool.stake(2000);
    // { lpToken: '1967.761942945398518479', gauge: '2000.0' }

    await pool.userBalances();
    // [
    //     '2489.266644542275414077',
    //     '276.21290758040371998',
    //     '280.160024',
    //     '955.058471'
    // ]
    await pool.userWrappedBalances();
    // [ '2489.266644542275414077', '1479.135765218522838249' ]
    await pool.userLiquidityUSD();
    // 4003.16466431
    await pool.baseProfit();
    // {
    //     day: '0.01476134356908610233',
    //     week: '0.1036132769753159106',
    //     month: '0.44899086689303561258',
    //     year: '5.38789040271642735101374407'
    // }
    await pool.userShare();
    // {
    //     lpUser: '3967.761942945398518479',
    //     lpTotal: '1124490985.047288488832152598',
    //     lpShare: '0.000352849600015116',
    //     gaugeUser: '2000.0',
    //     gaugeTotal: '1123703753.306098922471106555',
    //     gaugeShare: '0.000177982853053192'
    // }
})()
````

## Gas estimation
Every non-constant method has corresponding gas estimation method. Rule: ```obj.method -> obj.estimateGas.method```

**Examples**
```ts
import curve from "@curvefi/api";

(async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0 });
    
    const spender = "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7" // 3pool swap address
    await curve.estimateGas.ensureAllowance(["DAI", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"], [1000, 1000], spender);
    // 94523
    
    const pool = curve.getPool('usdn');
    await pool.estimateGas.depositApprove(["1000", "1000", "1000", "1000"]);
    // 186042
    await pool.estimateGas.deposit(["1000", "1000", "1000", "1000"]);
    // 679238
    
    await curve.router.estimateGas.swap('DAI', "WBTC", "1000");
    // 476904
    await curve.boosting.estimateGas.createLock('1000', 365);
    // 324953
})()
```

## Factory

### Deploy stable plain pool

```ts
import curve from "@curvefi/api";

(async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0 });

    const coins = [
        "0x1456688345527bE1f37E9e627DA0837D6f08C925", // USDP
        "0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3", // MIM
        "0x5f98805A4E8be255a32880FDeC7F6728C6568bA0", // LUSD
    ];

    // Deploy pool
    
    const deployPoolTx = await curve.factory.deployPlainPool('Test pool', 'TST', coins, 200, 0.1, 0, 1);
    // {
    //     hash: '0xb84206f6a17488459d8dfc9a9f41ae89c71d1920b7aa87ad2eefd3171ba5166c',
    //     type: 0,
    //     accessList: null,
    //     blockHash: '0xf1c7d05a7cebfe2331cca0e8ce0e7b45aac2097934a23c73f6e0b16fac0a9b5f',
    //     blockNumber: 15839419,
    //     transactionIndex: 0,
    //     confirmations: 1,
    //     from: '0x66aB6D9362d4F35596279692F0251Db635165871',
    //     gasPrice: BigNumber { _hex: '0x00', _isBigNumber: true },
    //     gasLimit: BigNumber { _hex: '0x1037c4', _isBigNumber: true },
    //     to: '0xB9fC157394Af804a3578134A6585C0dc9cc990d4',
    //         value: BigNumber { _hex: '0x00', _isBigNumber: true },
    //     nonce: 12,
    //         data: '0x52f2db69000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001800000000000000000000000001456688345527be1f37e9e627da0837d6f08c92500000000000000000000000099d8a9c45b2eca8864373a26d1459e3dff1e17f30000000000000000000000005f98805a4e8be255a32880fdec7f6728c6568ba0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c800000000000000000000000000000000000000000000000000000000009896800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000095465737420706f6f6c000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000035453540000000000000000000000000000000000000000000000000000000000',
    //     r: '0x0f8f0277c982e1cf3153fd5a63a104a0338bf907fdb270589dc847c6f4b6600d',
    //     s: '0x32e2f279f759673e5254b893539cfe1258338f177e892b46e1edb7b73e869a3d',
    //     v: 38,
    //     creates: null,
    //     chainId: 1,
    //     wait: [Function (anonymous)]
    // }
    const poolAddress = await curve.factory.getDeployedPlainPoolAddress(deployPoolTx);
    // 0xa77b5d170f3aec2f72ca06490a7b9383a70ae5eb

    // Deploy gauge
    
    const deployGaugeTx = await curve.factory.deployGauge(poolAddress);
    // {
    //     hash: '0x8bb0eb63430e6c522c30922a833fee263816ebc0f30367d53ecfe52e17b7c3a0',
    //     type: 0,
    //     accessList: null,
    //     ...
    // }
    const gaugeAddress = await curve.factory.getDeployedGaugeAddress(deployGaugeTx);
    // 0x1400e08f1d9f5bc90ae19acd4bf81beabc9e79de

    // Deposit & Stake

    const poolId = await curve.factory.fetchRecentlyDeployedPool(poolAddress);
    // factory-v2-221
    const pool = curve.getPool(poolId);

    await pool.depositAndStake([10, 10, 10]); // Initial amounts for stable pool must be equal
    const balances = await pool.stats.underlyingBalances();
    // [ '10.0', '10.0', '10.0' ]
})()
```

### Deploy stable meta pool

```ts
import curve from "@curvefi/api";

(async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0 });

    const basePool = "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7";  // 3pool address
    const coin = "0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3"; // MIM

    // Deploy pool
    
    const deployPoolTx = await curve.factory.deployMetaPool(basePool, 'Test pool', 'TST', coin, 200, 0.1, 0);
    // {
    //     hash: '0xac49dead008ccc04988e513a8502dea35bad721b0c79fa1503054541ee51ea90',
    //     type: 0,
    //     accessList: null,
    //     ...
    // }
    const poolAddress = await curve.factory.getDeployedMetaPoolAddress(deployPoolTx);
    // 0xd87f26c2f658657779e452dd043df9b2751ae7c4

    // Deploy gauge
    
    const deployGaugeTx = await curve.factory.deployGauge(poolAddress);
    // {
    //     hash: '0x37a53a08d6c71095de8c25bcd4a01b39beec35990f77c7b98355bd064511541f',
    //     type: 0,
    //     accessList: null,
    //     ...
    // }

    const gaugeAddress = await curve.factory.getDeployedGaugeAddress(deployGaugeTx);
    // 0x326290a1b0004eee78fa6ed4f1d8f4b2523ab669

    // Get created pool

    const poolId = await curve.factory.fetchRecentlyDeployedPool(poolAddress);
    // factory-v2-222
    const pool = curve.getPool(poolId);

    // Deposit & Stake Wrapped
    
    await pool.depositAndStakeWrapped([10, 10]); // Initial wrapped amounts for stable metapool must be equal
    const balances = await pool.stats.wrappedBalances();
    // [ '10.0', '10.0' ]

    // Or deposit & Stake Underlying

    // const amounts = pool.metaUnderlyingSeedAmounts(30);
    // [ '30', '10.000000000000000000', '10.000000', '10.000000' ]
    // await pool.depositAndStake(amounts);
    // [ '30.0', '9.272021785560442569', '8.927595', '11.800485' ]
})()
```

### Deploy crypto pool

```ts
import curve from "@curvefi/api";

(async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0 });

    const coins = [
        "0xC581b735A1688071A1746c968e0798D642EDE491", // EURT
        "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
    ];

    // Deploy pool
    
    const deployPoolTx = await curve.cryptoFactory.deployPool(
        "Test crypto pool",
        "TCP",
        coins,
        400000,
        0.0000725,
        0.25,
        0.45,
        0.000002,
        0.00023,
        0.000146,
        600,
        1500
    );
    // {
    //     hash: '0x406900448e537f2fd5c833a4f62a81305b9567e71f870772e10c72271bd78c37',
    //     type: 0,
    //     accessList: null,
    //     ...
    // }
    const poolAddress = await curve.cryptoFactory.getDeployedPoolAddress(deployPoolTx);
    // 0xe01a9ecdb0aaabe2f12a25a0d289480debf09e89
    
    // Deploy gauge
    
    const deployGaugeTx = await curve.cryptoFactory.deployGauge(poolAddress);
    // {
    //     hash: '0x406900448e537f2fd5c833a4f62a81305b9567e71f870772e10c72271bd78c37',
    //     type: 0,
    //     accessList: null,
    //     ...
    // }
    const gaugeAddress = await curve.factory.getDeployedGaugeAddress(deployGaugeTx);
    // 0x0b4f303a4434647dbf257e3ae4fb134259f3d4fa

    // Deposit & Stake

    const poolId = await curve.cryptoFactory.fetchRecentlyDeployedPool(poolAddress);
    // factory-crypto-155
    const pool = curve.getPool(poolId);

    const amounts = await pool.cryptoSeedAmounts(30); // Initial amounts for crypto pools must have the ratio corresponding to initialPrice
    // [ '30', '0.02' ]
    await pool.depositAndStake(amounts);
    const underlyingBalances = await pool.stats.underlyingBalances();
    // [ '30.0', '0.02' ]
})()
```