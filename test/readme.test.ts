import curve from "../src";
import { IDict } from "../src/interfaces";


const generalMethodsTest = async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0 });

    console.log(await curve.getTVL());
    // 7867623953.766793

    const balances1 = await curve.getBalances(['DAI', 'sUSD']);
    // OR const balances1 = await curve.getBalances(['0x6B175474E89094C44Da98b954EedeAC495271d0F', '0x57Ab1ec28D129707052df4dF418D58a2D46d5f51']);
    console.log(balances1);
    // [ '10000.0', '0.0' ]

    // You can specify addresses
    const balances2 = await curve.getBalances(['aDAI', 'aSUSD'], "0x0063046686E46Dc6F15918b61AE2B121458534a5", "0x66aB6D9362d4F35596279692F0251Db635165871");
    // OR const balances2 = await curve.getBalances(['0x028171bCA77440897B824Ca71D1c56caC55b68A3', '0x6c5024cd4f8a59110119c56f8933403a539555eb'], ["0x0063046686E46Dc6F15918b61AE2B121458534a5", "0x66aB6D9362d4F35596279692F0251Db635165871"]);
    console.log(balances2);

    const spender = "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7" // 3pool swap address

    console.log(await curve.getAllowance(["DAI", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"], curve.signerAddress, spender));
    // [ '0.0', '0.0' ]
    console.log(await curve.hasAllowance(["DAI", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"], ['1000', '1000'], curve.signerAddress, spender));
    // false
    console.log(await curve.ensureAllowance(["DAI", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"], ['1000', '1000'], spender));
    // [
    //     '0xb0cada2a2983dc0ed85a26916d32b9caefe45fecde47640bd7d0e214ff22aed3',
    //     '0x00ea7d827b3ad50ce933e96c579810cd7e70d66a034a86ec4e1e10005634d041'
    // ]
}

const availablePoolsTest = async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0 });
    await curve.fetchFactoryPools();
    await curve.fetchCryptoFactoryPools();

    console.log(curve.getPoolList());
    console.log(curve.getFactoryPoolList());
    console.log(curve.getCryptoFactoryPoolList());
}

const poolFieldsTest = async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0 });
    await curve.fetchFactoryPools();
    await curve.getCryptoFactoryPoolList();

    const pool = curve.getPool('factory-v2-11');

    console.log(pool.id);
    console.log(pool.name);
    console.log(pool.fullName);
    console.log(pool.symbol);
    console.log(pool.referenceAsset);
    console.log(pool.address);
    console.log(pool.lpToken);
    console.log(pool.gauge);
    console.log(pool.zap);
    console.log(pool.rewardContract);
    console.log(pool.isPlain);
    console.log(pool.isLending);
    console.log(pool.isMeta);
    console.log(pool.isCrypto);
    console.log(pool.isFake);
    console.log(pool.isFactory);
    console.log(pool.basePool);
    console.log(pool.underlyingCoins);
    console.log(pool.wrappedCoins);
    console.log(pool.underlyingCoinAddresses);
    console.log(pool.wrappedCoinAddresses);
    console.log(pool.underlyingDecimals);
    console.log(pool.wrappedDecimals);
    console.log(pool.useLending);
}

const walletBalancesTest = async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0 });

    const saave = curve.getPool('saave');

    // Current address (signer) balances
    console.log(await saave.wallet.balances());
    console.log(await saave.wallet.lpTokenBalances());
    console.log(await saave.wallet.underlyingCoinBalances());
    console.log(await saave.wallet.wrappedCoinBalances());
    console.log(await saave.wallet.allCoinBalances());


    // For every method above you can specify address
    console.log(await saave.wallet.balances("0x0063046686E46Dc6F15918b61AE2B121458534a5"));
    // Or several addresses
    console.log(await saave.wallet.balances("0x0063046686E46Dc6F15918b61AE2B121458534a5", "0x66aB6D9362d4F35596279692F0251Db635165871"));
}

const statsTest = async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0 });

    // ------- COMPOUND -------

    const compound = curve.getPool('compound');

    console.log(await compound.stats.parameters());
    console.log(await compound.stats.underlyingBalances());
    console.log(await compound.stats.wrappedBalances());
    console.log(await compound.stats.totalLiquidity());

    // ------- STETH -------

    const steth = curve.getPool('steth');

    console.log(await steth.stats.volume());
    console.log(await steth.stats.baseApy());
    console.log(await steth.stats.tokenApy());
    console.log(await steth.stats.rewardsApy());
}

const depositTest = async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0 });

    const pool = curve.getPool('mim');

    console.log('--- UNDERLYING ---');

    console.log(await pool.wallet.underlyingCoinBalances());
    console.log(await pool.wallet.lpTokenBalances());

    console.log(await pool.depositBalancedAmounts());
    console.log(await pool.depositExpected([100, 100, 100, 100]));
    console.log(await pool.depositBonus([100, 100, 100, 100]));
    console.log(await pool.depositIsApproved([100, 100, 100, 100]));
    console.log(await pool.depositApprove([100, 100, 100, 100]));

    const depositTx = await pool.deposit(['100', '100', '100', '100'], 0.1); // slippage = 0.1%
    console.log(depositTx);

    console.log(await pool.wallet.underlyingCoinBalances());
    console.log(await pool.wallet.lpTokenBalances());


    console.log('--- WRAPPED ---');

    console.log(await pool.wallet.wrappedCoinBalances());
    console.log(await pool.wallet.lpTokenBalances());

    console.log(await pool.depositWrappedBalancedAmounts());
    console.log(await pool.depositWrappedExpected(['100', '100']));
    console.log(await pool.depositWrappedBonus([100, 100]));
    console.log(await pool.depositWrappedIsApproved([100, 100]));
    console.log(await pool.depositWrappedApprove([100, 100]));

    const depositWrappedTx = await pool.depositWrapped([100, 100], 0.1); // slippage = 0.1%
    console.log(depositWrappedTx);

    console.log(await pool.wallet.wrappedCoinBalances());
    console.log(await pool.wallet.lpTokenBalances());
}

const stakingTest = async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0 });

    const pool = curve.getPool('mim');
    
    const balances = await pool.wallet.lpTokenBalances() as IDict<string>;
    console.log(balances);
    console.log(await pool.stakeIsApproved(balances.lpToken));
    console.log(await pool.stakeApprove(balances.lpToken));
    console.log(await pool.stake(balances.lpToken));

    console.log(await pool.wallet.lpTokenBalances());

    console.log(await pool.unstake(balances.lpToken));

    console.log(await pool.wallet.lpTokenBalances());
}

const withdrawTest = async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0 });

    const pool = curve.getPool('mim');

    // --- UNDERLYING ---
    console.log('--- UNDERLYING ---');

    console.log(await pool.wallet.underlyingCoinBalances());
    console.log(await pool.wallet.lpTokenBalances());

    console.log(await pool.withdrawExpected(10));
    console.log(await pool.withdrawIsApproved(10));
    console.log(await pool.withdrawApprove(10));
    const withdrawTx = await pool.withdraw('10', 0.1);
    console.log(withdrawTx);

    console.log(await pool.wallet.underlyingCoinBalances());
    console.log(await pool.wallet.lpTokenBalances());

    // --- WRAPPED ---
    console.log('--- WRAPPED ---');

    console.log(await pool.wallet.wrappedCoinBalances());
    console.log(await pool.wallet.lpTokenBalances());
    
    console.log(await pool.withdrawWrappedExpected('10'));
    const withdrawWrappedTx = await pool.withdrawWrapped(10, 0.5);
    console.log(withdrawWrappedTx);

    console.log(await pool.wallet.wrappedCoinBalances());
    console.log(await pool.wallet.lpTokenBalances());
}

const withdrawImbalanceTest = async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0 });

    const pool = curve.getPool('mim');

    // --- UNDERLYING ---
    console.log('--- UNDERLYING ---');

    console.log(await pool.wallet.underlyingCoinBalances());
    console.log(await pool.wallet.lpTokenBalances());

    console.log(await pool.withdrawImbalanceExpected(['10', '10', '10', '10']));
    console.log(await pool.withdrawImbalanceBonus(['10', '10', '10', '10']));
    console.log(await pool.withdrawImbalanceIsApproved(['10', '10', '10', '10']));
    console.log(await pool.withdrawImbalanceApprove(['10', '10', '10', '10']));
    const withdrawImbalanceTx = await pool.withdrawImbalance(['10', '10', '10', '10'], 0.1);
    console.log(withdrawImbalanceTx);

    console.log(await pool.wallet.underlyingCoinBalances());
    console.log(await pool.wallet.lpTokenBalances());

    // --- WRAPPED ---
    console.log('--- WRAPPED ---');

    console.log(await pool.wallet.wrappedCoinBalances());
    console.log(await pool.wallet.lpTokenBalances());

    console.log(await pool.withdrawImbalanceWrappedExpected(['10', '10']));
    console.log(await pool.withdrawImbalanceWrappedBonus(['10', '10']));
    const withdrawImbalanceWrappedTx = await pool.withdrawImbalanceWrapped(['10', '10'], 0.1);
    console.log(withdrawImbalanceWrappedTx);

    console.log(await pool.wallet.wrappedCoinBalances());
    console.log(await pool.wallet.lpTokenBalances());
}

const withdrawOneCoinTest = async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0 });

    const pool = curve.getPool('mim');

    // --- UNDERLYING ---
    console.log('--- UNDERLYING ---');

    console.log(await pool.wallet.underlyingCoinBalances());
    console.log(await pool.wallet.lpTokenBalances());

    const underlyingExpected = await pool.withdrawOneCoinExpected(10, 'DAI');
    // OR const underlyingExpected = await pool.withdrawOneCoinExpected('10', '0x6B175474E89094C44Da98b954EedeAC495271d0F');
    // OR const underlyingExpected = await pool.withdrawOneCoinExpected('10', 1);
    console.log(underlyingExpected);
    console.log(await pool.withdrawOneCoinBonus(10,'DAI'));
    console.log(await pool.withdrawOneCoinIsApproved(10));
    console.log(await pool.withdrawOneCoinApprove(10));
    const underlyingTx = await pool.withdrawOneCoin(10, 'DAI', 0.1);
    // OR const underlyingTx = await pool.withdrawOneCoin('10', '0x6B175474E89094C44Da98b954EedeAC495271d0F');
    // OR const underlyingTx = await pool.withdrawOneCoin('10', 1);
    console.log(underlyingTx);

    console.log(await pool.wallet.underlyingCoinBalances());
    console.log(await pool.wallet.lpTokenBalances());

    // --- WRAPPED ---
    console.log('--- WRAPPED ---');

    console.log(await pool.wallet.wrappedCoinBalances());
    console.log(await pool.wallet.lpTokenBalances());

    const wrappedExpected = await pool.withdrawOneCoinWrappedExpected('10', 'MIM');
    // OR const wrappedExpected = await pool.withdrawOneCoinWrappedExpected('10', '0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3');
    // OR const wrappedExpected = await pool.withdrawOneCoinWrappedExpected('10', 0);
    console.log(wrappedExpected)
    console.log(await pool.withdrawOneCoinWrappedBonus(10, 'MIM'));
    const wrappedTx = await pool.withdrawOneCoinWrapped('10', 'MIM', 0.1);
    // OR await pool.withdrawOneCoinWrapped('10', '0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3');
    // OR await pool.withdrawOneCoinWrapped('10', 0);
    console.log(wrappedTx);

    console.log(await pool.wallet.wrappedCoinBalances());
    console.log(await pool.wallet.lpTokenBalances());
}

const poolSwapTest = async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0 });

    const pool = curve.getPool('mim');

    // --- UNDERLYING ---
    console.log('--- UNDERLYING ---');

    console.log(await pool.wallet.underlyingCoinBalances());

    const underlyingExpected = await pool.swapExpected('MIM','DAI', 10);
    // OR const underlyingExpected = await pool.swapExpected('0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3', '0x6B175474E89094C44Da98b954EedeAC495271d0F', '10');
    // OR const underlyingExpected = await pool.swapExpected(0, 1, '10');
    console.log(underlyingExpected);
    console.log(await pool.swapIsApproved('MIM', 10));
    console.log(await pool.swapApprove('MIM', 10));
    const swapTx = await pool.swap('MIM','DAI', 10, 0.1);
    // OR const swapTx = await pool.swap('0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3', '0x6B175474E89094C44Da98b954EedeAC495271d0F', '10');
    // OR const swapTx = await pool.swap(0, 1, 10);
    console.log(swapTx);

    console.log(await pool.wallet.underlyingCoinBalances());

    // --- WRAPPED ---
    console.log('--- WRAPPED ---');

    console.log(await pool.wallet.wrappedCoinBalances());

    const wrappedExpected = await pool.swapWrappedExpected('3crv','MIM', 10);
    // OR const wrappedExpected = await pool.swapWrappedExpected('0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490', '0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3', '10');
    // OR const wrappedExpected = await pool.swapWrappedExpected(1, 0, '10');
    console.log(wrappedExpected);
    console.log(await pool.swapWrappedIsApproved('3crv', 10));
    console.log(await pool.swapWrappedApprove('3crv', 10));
    const swapWrappedTx = await pool.swapWrapped('3crv','MIM', 10, 0.1);
    // OR const swapWrappedTx = await pool.swapWrapped('0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490', '0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3', '10');
    // OR const swapWrappedTx = await pool.swapWrapped(1, 0, '10');
    console.log(swapWrappedTx);

    console.log(await pool.wallet.wrappedCoinBalances());
}

const depositAndStakeTest = async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0 });

    const pool = curve.getPool('compound');
    const amounts = [1000, 1000];


    // --- UNDERLYING ---
    console.log('--- UNDERLYING ---');


    console.log(await pool.wallet.underlyingCoinBalances());
    console.log(await pool.wallet.lpTokenBalances());

    console.log(await pool.depositAndStakeExpected(amounts));
    console.log(await pool.depositAndStakeBonus(amounts));
    console.log(await pool.depositAndStakeIsApproved(amounts));
    console.log(await pool.depositAndStakeApprove(amounts));
    console.log(await pool.depositAndStake(amounts));

    console.log(await pool.wallet.underlyingCoinBalances());
    console.log(await pool.wallet.lpTokenBalances());


    // --- WRAPPED ---
    console.log('--- WRAPPED ---');


    console.log(await pool.wallet.wrappedCoinBalances());
    console.log(await pool.wallet.lpTokenBalances());

    console.log(await pool.depositAndStakeWrappedExpected(amounts));
    console.log(await pool.depositAndStakeWrappedBonus(amounts));
    console.log(await pool.depositAndStakeWrappedIsApproved(amounts));
    console.log(await pool.depositAndStakeWrappedApprove(amounts));
    console.log(await pool.depositAndStakeWrapped(amounts));

    console.log(await pool.wallet.wrappedCoinBalances());
    console.log(await pool.wallet.lpTokenBalances());
}


const routerSwapTest = async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0 });

    console.log(await curve.getBalances(['DAI', 'CRV']));

    const { route, output } = await curve.router.getBestRouteAndOutput('DAI', 'CRV', 1000);
    // OR await curve.router.getBestPoolAndOutput('0x6B175474E89094C44Da98b954EedeAC495271d0F', '0xD533a949740bb3306d119CC777fa900bA034cd52', '10000');
    const expected = await curve.router.expected('DAI', 'CRV', 1000);
    // OR await curve.router.expected('0x6B175474E89094C44Da98b954EedeAC495271d0F', '0xD533a949740bb3306d119CC777fa900bA034cd52', '10000');

    console.log(route, output, expected);

    console.log(await curve.router.isApproved('DAI', 1000));
    console.log(await curve.router.approve('DAI', 1000));
    const swapTx = await curve.router.swap('DAI', 'CRV', 1000);
    // OR await curve.router.swap('0x6B175474E89094C44Da98b954EedeAC495271d0F', '0xD533a949740bb3306d119CC777fa900bA034cd52', '1000');
    console.log(swapTx.hash);
    const swappedAmount = await curve.router.getSwappedAmount(swapTx, 'CRV');
    console.log(swappedAmount);

    console.log(await curve.getBalances(['DAI', 'CRV']));
}

const boostingTest = async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0 });

    console.log(await curve.boosting.getCrv());

    console.log(await curve.boosting.isApproved(1000));
    console.log(await curve.boosting.approve(1000));
    console.log(curve.boosting.calcUnlockTime(365));
    await curve.boosting.createLock(1000, 365);
    console.log(await curve.boosting.getCrv());

    console.log(await curve.boosting.getLockedAmountAndUnlockTime());
    console.log(await curve.boosting.getVeCrv());
    console.log(await curve.boosting.getVeCrvPct());

    await curve.boosting.increaseAmount('500');
    console.log(await curve.boosting.getCrv());

    const { lockedAmount, unlockTime } = await curve.boosting.getLockedAmountAndUnlockTime();
    console.log({ lockedAmount, unlockTime });
    console.log(await curve.boosting.getVeCrv());
    console.log(await curve.boosting.getVeCrvPct());

    console.log(curve.boosting.calcUnlockTime(365, unlockTime as number));
    await curve.boosting.increaseUnlockTime(365);

    console.log(await curve.boosting.getLockedAmountAndUnlockTime());
    console.log(await curve.boosting.getVeCrv());
    console.log(await curve.boosting.getVeCrvPct());
}

const claimFeesTest = async () => {
    await curve.init('JsonRpc', {});

    console.log(await curve.getBalances(['3crv']));
    // ['0.0']
    console.log(await curve.boosting.claimableFees());
    // 1.30699696445248888

    console.log(await curve.boosting.claimFees());

    console.log(await curve.getBalances(['3crv']));
    // ['1.30699696445248888']
    console.log(await curve.boosting.claimableFees());
    // 0.0
}

const crvTest = async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0 });

    const pool = curve.getPool('compound');

    console.log(await pool.depositAndStake([1000, 1000]));
    console.log(await pool.crvProfit());
    console.log(await pool.stats.tokenApy());
    console.log(await pool.currentCrvApy());
    console.log(await pool.boost());

    await curve.boosting.createLock(10000, 365 * 4);
    console.log(await pool.depositAndStake([1000, 1000]));
    console.log(await pool.crvProfit());
    console.log(await pool.stats.tokenApy());
    console.log(await pool.currentCrvApy());
    console.log(await pool.boost());
    console.log(await pool.wallet.lpTokenBalances());
    console.log(await pool.maxBoostedStake());

    // ------ Wait some time... ------

    console.log(await pool.claimableCrv());
    console.log(await pool.claimCrv());
    console.log(await pool.claimableCrv());
}

const rewardsTest = async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0 });

    const pool = curve.getPool('susd');

    console.log(await pool.rewardTokens());
    console.log(await pool.depositAndStake([1000, 1000, 1000, 1000]));
    console.log(await pool.rewardsProfit());

    // ------ Wait some time... ------

    console.log(await pool.claimableRewards());
    console.log(await pool.claimRewards());
    console.log(await pool.claimableRewards());
}

const userBalancesBaseProfitAndShareTest = async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0 });

    const pool = curve.getPool('frax');

    console.log(await pool.deposit([1000, 1000, 1000, 1000]));
    console.log(await pool.wallet.lpTokenBalances());
    console.log(await pool.stake(2000));
    console.log(await pool.wallet.lpTokenBalances());
    console.log(await pool.userBalances());
    console.log(await pool.userWrappedBalances());
    console.log(await pool.userLiquidityUSD());
    console.log(await pool.baseProfit());
    console.log(await pool.userShare());
}

const deployPlainPoolTest = async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0 });

    const coins = [
        "0x1456688345527bE1f37E9e627DA0837D6f08C925", // USDP
        "0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3", // MIM
        "0x5f98805A4E8be255a32880FDeC7F6728C6568bA0", // LUSD
    ];

    // Deploy pool

    const gas = await curve.factory.estimateGas.deployPlainPool('Test pool', 'TST', coins, 200, 0.1, 0, 1);
    console.log(gas);
    const deployPoolTx = await curve.factory.deployPlainPool('Test pool', 'TST', coins, 200, 0.1, 0, 1);
    console.log(deployPoolTx);
    const poolAddress = await curve.factory.getDeployedPlainPoolAddress(deployPoolTx);
    console.log(poolAddress);

    // Deploy gauge

    const gaugeGas = await curve.factory.estimateGas.deployGauge(poolAddress);
    console.log(gaugeGas);
    const deployGaugeTx = await curve.factory.deployGauge(poolAddress);
    console.log(deployGaugeTx);
    const gaugeAddress = await curve.factory.getDeployedGaugeAddress(deployGaugeTx);
    console.log(gaugeAddress);

    // Deposit & Stake

    const poolId = await curve.factory.fetchRecentlyDeployedPool(poolAddress);
    console.log(poolId);
    const pool = curve.getPool(poolId);

    await pool.depositAndStake([10, 10, 10]); // Initial amounts for stable pool must be equal
    const balances = await pool.stats.underlyingBalances();
    console.log(balances);
}

const deployMetaPoolTest = async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0 });

    const basePool = "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7";  // 3pool address
    const coin = "0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3"; // MIM

    // Deploy pool

    const gas = await curve.factory.estimateGas.deployMetaPool(basePool, 'Test pool', 'TST', coin, 200, 0.1, 0);
    console.log(gas);
    const deployPoolTx = await curve.factory.deployMetaPool(basePool, 'Test pool', 'TST', coin, 200, 0.1, 0);
    console.log(deployPoolTx);
    const poolAddress = await curve.factory.getDeployedMetaPoolAddress(deployPoolTx);
    console.log(poolAddress);

    // Deploy gauge

    const gaugeGas = await curve.factory.estimateGas.deployGauge(poolAddress);
    console.log(gaugeGas);
    const deployGaugeTx = await curve.factory.deployGauge(poolAddress);
    console.log(deployGaugeTx);
    const gaugeAddress = await curve.factory.getDeployedGaugeAddress(deployGaugeTx);
    console.log(gaugeAddress);

    // Get created pool

    const poolId = await curve.factory.fetchRecentlyDeployedPool(poolAddress);
    console.log(poolId);
    const pool = curve.getPool(poolId);

    // Deposit & Stake Wrapped

    await pool.depositAndStakeWrapped([10, 10]); // Initial wrapped amounts for stable metapool must be equal
    const balances = await pool.stats.wrappedBalances();
    console.log(balances);

    // Or deposit & Stake Underlying

    // const amounts = pool.metaUnderlyingSeedAmounts(30);
    // console.log(amounts);
    // await pool.depositAndStake(amounts);
    // console.log(await pool.stats.underlyingBalances());
}

const deployCryptoPoolTest = async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0 });

    const coins = [
        "0xC581b735A1688071A1746c968e0798D642EDE491", // EURT
        "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
    ];

    // Deploy pool

    const gas = await curve.cryptoFactory.estimateGas.deployPool(
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
    console.log(gas);
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
    console.log(deployPoolTx);
    const poolAddress = await curve.cryptoFactory.getDeployedPoolAddress(deployPoolTx);
    console.log(poolAddress);

    // Deploy gauge

    const gaugeGas = await curve.cryptoFactory.estimateGas.deployGauge(poolAddress);
    console.log(gaugeGas);
    const deployGaugeTx = await curve.cryptoFactory.deployGauge(poolAddress);
    console.log(deployPoolTx);
    const gaugeAddress = await curve.factory.getDeployedGaugeAddress(deployGaugeTx);
    console.log(gaugeAddress);

    // Deposit & Stake

    const poolId = await curve.cryptoFactory.fetchRecentlyDeployedPool(poolAddress);
    console.log(poolId);
    const pool = curve.getPool(poolId);

    const amounts = await pool.cryptoSeedAmounts(30); // Initial amounts for crypto pools must have the ratio corresponding to initialPrice
    console.log(amounts);
    await pool.depositAndStake(amounts);
    const underlyingBalances = await pool.stats.underlyingBalances();
    console.log(underlyingBalances);
}
