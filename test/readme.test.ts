import curve from "../src/index.js";
import { IDict } from "../src/interfaces.js";


const generalMethodsTest = async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0 });

    console.log(await curve.getTVL());
    // 7867623953.766793
    console.log(await curve.getVolume());
    // {
    //     totalVolume: 514893871.3481678,
    //     cryptoVolume: 162757004.96876568,
    //     cryptoShare: 31.609815930147377
    // }

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
    await curve.factory.fetchPools();
    await curve.crvUSDFactory.fetchPools();
    await curve.EYWAFactory.fetchPools();
    await curve.cryptoFactory.fetchPools();
    await curve.tricryptoFactory.fetchPools();

    console.log(curve.getMainPoolList());
    console.log(curve.factory.getPoolList());
    console.log(curve.crvUSDFactory.getPoolList());
    console.log(curve.EYWAFactory.getPoolList());
    console.log(curve.cryptoFactory.getPoolList());
    console.log(curve.tricryptoFactory.getPoolList());
    console.log(curve.getPoolList());
}

const poolFieldsTest = async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0 });
    await curve.factory.fetchPools();
    await curve.crvUSDFactory.fetchPools();
    await curve.cryptoFactory.fetchPools();
    await curve.EYWAFactory.fetchPools();
    await curve.tricryptoFactory.fetchPools();

    const pool = curve.getPool('factory-v2-11');

    console.log(pool.id);
    console.log(pool.name);
    console.log(pool.fullName);
    console.log(pool.symbol);
    console.log(pool.referenceAsset);
    console.log(pool.address);
    console.log(pool.lpToken);
    console.log(pool.gauge.address);
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
    console.log(pool.inApi);
    console.log(pool.isGaugeKilled);
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
    const underlyingRequired = await pool.swapRequired('MIM', 'DAI', 10);
    // OR const underlyingRequired = await pool.swapRequired('0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3', '0x6B175474E89094C44Da98b954EedeAC495271d0F', '10');
    // OR const underlyingRequired = await pool.swapRequired(0, 1, '10');
    console.log(underlyingRequired);
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
    const wrappedRequired = await pool.swapWrappedRequired('3crv', 'MIM', 10);
    // OR const wrappedRequired = await pool.swapWrappedRequired('0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490', '0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3', '10');
    // OR const wrappedRequired = await pool.swapWrappedRequired(1, 0, '10');
    console.log(wrappedRequired);
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

    console.log(curve.hasDepositAndStake());

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

    console.log(curve.hasRouter());

    console.log(await curve.getBalances(['DAI', 'CRV']));

    const { route, output } = await curve.router.getBestRouteAndOutput('DAI', 'CRV', 1000);
    // OR await curve.router.getBestPoolAndOutput('0x6B175474E89094C44Da98b954EedeAC495271d0F', '0xD533a949740bb3306d119CC777fa900bA034cd52', '10000');
    const expected = await curve.router.expected('DAI', 'CRV', 1000);
    // OR await curve.router.expected('0x6B175474E89094C44Da98b954EedeAC495271d0F', '0xD533a949740bb3306d119CC777fa900bA034cd52', '10000');
    const required = await curve.router.required('DAI', 'CRV', expected);
    // OR await curve.router.required('0x6B175474E89094C44Da98b954EedeAC495271d0F', '0xD533a949740bb3306d119CC777fa900bA034cd52', expected);
    const priceImpact = await curve.router.priceImpact('DAI', 'CRV', '1000');
    // OR await curve.router.priceImpact('0x6B175474E89094C44Da98b954EedeAC495271d0F', '0xD533a949740bb3306d119CC777fa900bA034cd52', '1000');
    const args = curve.router.getArgs(route);

    console.log(route, output, expected, required, priceImpact, args);

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

const sidechainBoostingTest = async () => {

    // --- SIDECHAIN ---

    await curve.init('JsonRpc', {}, { gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0 });

    console.log(await curve.boosting.sidechain.lastEthBlock());

    console.log(await curve.boosting.sidechain.getAnycallBalance());
    console.log(await curve.boosting.sidechain.topUpAnycall(0.1));
    console.log(await curve.boosting.sidechain.getAnycallBalance());


    // --- MAINNET (ETHEREUM) ---

    await curve.init('JsonRpc', {}, { gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0 });
    console.log(await curve.boosting.sidechain.lastBlockSent(137)); // Polygon
    // 17038505
    const blockToSend = await curve.boosting.sidechain.blockToSend();  // currentBlock - 128
    // 17377005
    console.log(await curve.boosting.sidechain.sendBlockhash(blockToSend, 137)); // Polygon


    // --- SIDECHAIN ---

    // Wait until blockhash is delivered

    await curve.init('JsonRpc', {}, { gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0 });
    const lastEthBlock = await curve.boosting.sidechain.lastEthBlock();
    // 17377005
    console.log(await curve.boosting.sidechain.submitProof(lastEthBlock, "0x33A4622B82D4c04a53e170c638B944ce27cffce3"));
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
    console.log(await pool.userCrvApy());
    console.log(await pool.userBoost());

    await curve.boosting.createLock(10000, 365 * 4);
    console.log(await pool.depositAndStake([1000, 1000]));
    console.log(await pool.crvProfit());
    console.log(await pool.stats.tokenApy());
    console.log(await pool.userCrvApy());
    console.log(await pool.userBoost());
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

const fetchNewFactoryPoolsTest = async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0 });

    // Fetch pools from api (if false arg is not passed)
    await curve.factory.fetchPools();
    await curve.cryptoFactory.fetchPools();
    await curve.tricryptoFactory.fetchPools();

    // Fetch very new pools (that haven't been added to api yet) from blockchain
    await curve.factory.fetchNewPools();
    // [ 'factory-v2-285' ]
    await curve.cryptoFactory.fetchNewPools();
    // [ 'factory-crypto-232' ]
    await curve.tricryptoFactory.fetchNewPools();
    // [ 'factory-tricrypto-2' ]
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

    console.log(curve.factory.gaugeImplementation());
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

    const amounts = await pool.getSeedAmounts(10);
    console.log(amounts);
    await pool.depositAndStake(amounts); // Initial amounts for stable pool must be equal
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

    console.log(curve.factory.gaugeImplementation());
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

    const amounts = await pool.getSeedAmounts(10);
    console.log(amounts)
    await pool.depositAndStakeWrapped(amounts);
    const balances = await pool.stats.wrappedBalances();
    console.log(balances);

    // Or deposit & Stake Underlying

    // const amounts = pool.getSeedAmounts(10, true);  // useUnderlying = true
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

    console.log(curve.cryptoFactory.gaugeImplementation());
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

    const amounts = await pool.getSeedAmounts(30); // Initial amounts for crypto pools must have the ratio corresponding to initialPrice
    console.log(amounts);
    await pool.depositAndStake(amounts);
    const underlyingBalances = await pool.stats.underlyingBalances();
    console.log(underlyingBalances);
}

const deployTricryptoPoolTest = async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0 });

    const coins = [
        "0xC581b735A1688071A1746c968e0798D642EDE491", // EURT
        "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
        "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // WBTC
    ];

    // Deploy pool

    const gas = await curve.tricryptoFactory.estimateGas.deployPool(
        "Test tricrypto pool",
        "TTP",
        coins,
        400000,
        0.0000725,
        0.25,
        0.45,
        0.000002,
        0.00023,
        0.000146,
        600,
        [1700, 27000]
    );
    console.log(gas);
    const deployPoolTx = await curve.tricryptoFactory.deployPool(
        "Test tricrypto pool",
        "TTP",
        coins,
        400000,
        0.0000725,
        0.25,
        0.45,
        0.000002,
        0.00023,
        0.000146,
        600,
        [1700, 27000]
    );
    console.log(deployPoolTx);
    const poolAddress = await curve.tricryptoFactory.getDeployedPoolAddress(deployPoolTx);
    console.log(poolAddress);

    // Deploy gauge

    console.log(curve.tricryptoFactory.gaugeImplementation());
    const gaugeGas = await curve.tricryptoFactory.estimateGas.deployGauge(poolAddress);
    console.log(gaugeGas);
    const deployGaugeTx = await curve.tricryptoFactory.deployGauge(poolAddress);
    console.log(deployPoolTx);
    const gaugeAddress = await curve.factory.getDeployedGaugeAddress(deployGaugeTx);
    console.log(gaugeAddress);

    // Deposit & Stake

    const poolId = await curve.tricryptoFactory.fetchRecentlyDeployedPool(poolAddress);
    console.log(poolId);
    const pool = curve.getPool(poolId);

    const amounts = await pool.getSeedAmounts(30); // Initial amounts for crypto pools must have the ratio corresponding to initialPrice
    console.log(amounts);
    await pool.depositAndStake(amounts);
    const underlyingBalances = await pool.stats.underlyingBalances();
    console.log(underlyingBalances);
}

const deployStableNgPlainPool = async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0 });

    const coins = [
        "0xae7ab96520de3a18e5e111b5eaab095312d7fe84", // stETH
        "0xac3e018457b222d93114458476f3e3416abbe38f", // sfrxETH
    ];

    //0 = Standard, 1 = Oracle, 2 = Rebasing, 3 = ERC4626
    const assetTypes = [2, 1] as Array<0 | 1 | 2 | 3>;

    const oracleAddresses = [
        '0x0000000000000000000000000000000000000000',
        '0xac3e018457b222d93114458476f3e3416abbe38f',
    ];

    const methodNames = [
        '',
        'pricePerShare',
    ];

    // Deploy pool

    const deployPoolTx = await curve.stableNgFactory.deployPlainPool('Test pool', 'test', coins, 5, 0.05, 5, assetTypes, 0, 600, oracleAddresses, methodNames);

    const poolAddress = await curve.stableNgFactory.getDeployedPlainPoolAddress(deployPoolTx);
    console.log(poolAddress)
    // 0x0816bc9ced716008c88bb8940c297e9c9167755e

    // Deploy gauge

    if(curve.chainId === 1) {
        const deployGaugeTx = await curve.stableNgFactory.deployGauge(poolAddress);

        const gaugeAddress = await curve.stableNgFactory.getDeployedGaugeAddress(deployGaugeTx);
        console.log(gaugeAddress)
    } else {
        const salt = '15'

        const deployGaugeSidechain = await curve.stableNgFactory.deployGaugeSidechain(poolAddress, salt);

        const gaugeSidechainAddress = await curve.stableNgFactory.getDeployedGaugeAddress(deployGaugeSidechain);
        console.log(gaugeSidechainAddress)
    }

}

const deployStableNgMetaPool = async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0 });

    const basePool = "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7";  // 3pool address
    const coin = "0xac3e018457b222d93114458476f3e3416abbe38f"; // sfrxETH
    const oracleAddress = '0xac3e018457b222d93114458476f3e3416abbe38f';
    const methodName = 'pricePerShare';

    // Deploy pool

    const deployPoolTx = await curve.stableNgFactory.deployMetaPool(basePool, 'Test pool', 'test', coin, 5, 0.05, 5, 600, 0, 0, methodName, oracleAddress);

    const poolAddress = await curve.factory.getDeployedMetaPoolAddress(deployPoolTx);
    console.log(poolAddress);

    // Deploy gauge

    if (curve.chainId === 1) {
        const deployGaugeTx = await curve.stableNgFactory.deployGauge(poolAddress);

        const gaugeAddress = await curve.stableNgFactory.getDeployedGaugeAddress(deployGaugeTx);
        console.log(gaugeAddress);
    } else {
        const salt = '15'
        //salt - unical random string
        const deployGaugeSidechain = await curve.stableNgFactory.deployGaugeSidechain(poolAddress, salt);

        const gaugeSidechainAddress = await curve.stableNgFactory.getDeployedGaugeAddress(deployGaugeSidechain);
        console.log(gaugeSidechainAddress);
    }
}

// --- DAO ---

const daoLockAndBoosting = async () => {
    await curve.init('JsonRpc', {}, { gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0 });

    console.log(await curve.dao.crvSupplyStats());

    console.log(await curve.dao.userCrv());
    const lockAmount = 10000;
    console.log(await curve.dao.estimateGas.crvLockApprove(lockAmount));
    console.log(await curve.dao.crvLockApprove(lockAmount));
    console.log(await curve.dao.crvLockIsApproved(lockAmount));
    console.log(curve.dao.calcCrvUnlockTime(365));
    console.log(await curve.dao.estimateGas.createCrvLock(lockAmount, 365));
    console.log(await curve.dao.createCrvLock(lockAmount, 7));
    console.log(await curve.dao.userVeCrv());

    const pool = curve.getPool("3pool");
    console.log(await pool.depositAndStake([1000, 1000, 1000]));
    console.log(await pool.userBoost());
    console.log(await pool.userCrvApy());
    console.log(await pool.userFutureBoost());
    console.log(await pool.userFutureCrvApy());

    console.log(await curve.dao.crvLockApprove(lockAmount));
    console.log(await curve.dao.estimateGas.increaseCrvLockedAmount(lockAmount));
    console.log(await curve.dao.increaseCrvLockedAmount(lockAmount));
    console.log(await curve.dao.userVeCrv());
    console.log(await pool.userBoost());
    console.log(await pool.userCrvApy());
    console.log(await pool.userFutureBoost());
    console.log(await pool.userFutureCrvApy());


    const { unlockTime } = await curve.dao.userVeCrv();
    console.log(curve.dao.calcCrvUnlockTime(365, unlockTime));
    console.log(await curve.dao.estimateGas.increaseCrvUnlockTime(365));
    console.log(await curve.dao.increaseCrvUnlockTime(365));
    console.log(await curve.dao.userVeCrv());
    console.log(await pool.userBoost());
    console.log(await pool.userCrvApy());
    console.log(await pool.userFutureBoost());
    console.log(await pool.userFutureCrvApy());

    // Checkpoint to adjust boost
    console.log(await pool.claimCrv());
    console.log(await pool.userBoost());
    console.log(await pool.userCrvApy());
    console.log(await pool.userFutureBoost());
    console.log(await pool.userFutureCrvApy());

    // Need to claim from some real address
    const someAddress = "0x0dc81478167527c8784f4Eb4Fd751766821A5340";
    console.log(await curve.dao.claimableFees(someAddress));
    console.log(await curve.getBalances(['3crv'], someAddress));
    console.log(await curve.dao.estimateGas.claimFees(someAddress));
    console.log(await curve.dao.claimFees(someAddress));
    console.log(await curve.dao.claimableFees(someAddress));
    console.log(await curve.getBalances(['3crv'], someAddress));

    // Time travel is needed before
    console.log(await curve.dao.userCrv());
    console.log(await curve.dao.userVeCrv());
    console.log(await curve.dao.estimateGas.withdrawLockedCrv());
    console.log(await curve.dao.withdrawLockedCrv());
    console.log(await curve.dao.userCrv());
    console.log(await curve.dao.userVeCrv());
}

const daoGaugeVoting = async () => {
    await curve.init('JsonRpc', {}, {gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0});

    const pool1 = curve.getPool("3pool");
    const pool2 = curve.getPool("gusd");
    console.log(await curve.dao.crvLockApprove(10000));
    console.log(await curve.dao.createCrvLock(10000, 365 * 2));

    console.log(await curve.dao.getVotingGaugeList());
    console.log(await curve.dao.voteForGaugeNextTime(pool1.gauge.address));
    console.log(await curve.dao.voteForGaugeNextTime(pool2.gauge.address));
    console.log(await curve.dao.estimateGas.voteForGauge(pool1.gauge.address, 50));  // 50%
    console.log(await curve.dao.voteForGauge(pool1.gauge.address, 50));  // 50%
    console.log(await curve.dao.estimateGas.voteForGauge(pool2.gauge.address, 50));  // 50%
    console.log(await curve.dao.voteForGauge(pool2.gauge.address, 50));  // 50%
    console.log(await curve.dao.voteForGaugeNextTime(pool1.gauge.address));
    console.log(await curve.dao.voteForGaugeNextTime(pool2.gauge.address));
    console.log(await curve.dao.userGaugeVotes());

    console.log(await curve.dao.increaseCrvUnlockTime(365 * 2));
    console.log(await curve.dao.userGaugeVotes());
    // Adjust voting power. 10 days time travel is needed
    console.log(await curve.dao.estimateGas.voteForGauge(pool1.gauge.address, 50));  // 50%
    console.log(await curve.dao.voteForGauge(pool1.gauge.address, 50));  // 50%
    console.log(await curve.dao.estimateGas.voteForGauge(pool2.gauge.address, 50));  // 50%
    console.log(await curve.dao.voteForGauge(pool2.gauge.address, 50));  // 50%
    console.log(await curve.dao.userGaugeVotes());
}

const daoProposalVoting = async () => {
    await curve.init('JsonRpc', {}, {gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0});

    console.log(await curve.dao.crvLockApprove(10000));
    console.log(await curve.dao.createCrvLock(10000, 365 * 2));

    console.log(await curve.dao.getProposalList());
    console.log(await curve.dao.getProposal("PARAMETER", 21));
    console.log(await curve.dao.getProposal("OWNERSHIP", 244));
    console.log(await curve.dao.estimateGas.voteForProposal("PARAMETER", 21, false));
    console.log(await curve.dao.voteForProposal("PARAMETER", 21, false));
    console.log(await curve.dao.estimateGas.voteForProposal("OWNERSHIP", 244, true));
    console.log(await curve.dao.voteForProposal("OWNERSHIP", 244, true));

    // Need to use some real address
    console.log(await curve.dao.userProposalVotes("0x7a16fF8270133F063aAb6C9977183D9e72835428"));
}
