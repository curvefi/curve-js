import { assert } from "chai";
import { getBalances, BN } from "../utils";
import { createLock, increaseAmount, increaseUnlockTime, getLockedAmountAndUnlockTime } from '../voting';
import { curve, ALIASES } from "../curve";

describe('Voting Escrow', function() {
    this.timeout(120000);
    const address = curve.signerAddress;

    before(async function() {
        await curve.init('JsonRpc', {}, { gasPrice: 0 });
    });

    it('Creates lock in Voting Escrow contract', async function () {
        const lockAmount = '1000';

        const initialCRVBalance: string = (await getBalances([address], [ALIASES.crv]))[address][0];
        const lockTime = Date.now();
        await createLock(lockAmount, 365);
        const CRVBalanceAfterLock = (await getBalances([address], [ALIASES.crv]))[address][0];
        const { lockedAmount, unlockTime } = await getLockedAmountAndUnlockTime(address);

        assert.deepEqual(BN(lockedAmount), BN(initialCRVBalance).minus(BN(CRVBalanceAfterLock)));
        assert.isAtLeast(unlockTime + (7 * 86400 * 1000), lockTime + (365 * 86400 * 1000));
    });

    it('Increases amount locked in Voting Escrow contract', async function () {
        const increaseLockAmount = '1000';

        const initialCRVBalance: string = (await getBalances([address], [ALIASES.crv]))[address][0];
        const { lockedAmount: initialLockedAmount } = await getLockedAmountAndUnlockTime(address);
        await increaseAmount(increaseLockAmount);
        const CRVBalanceAfterLock = (await getBalances([address], [ALIASES.crv]))[address][0];
        const { lockedAmount } = await getLockedAmountAndUnlockTime(address);

        assert.deepEqual(BN(lockedAmount).minus(BN(initialLockedAmount)), BN(initialCRVBalance).minus(BN(CRVBalanceAfterLock)));
    });

    it('Extends lock time', async function () {
        const { unlockTime: initialUnlockTime } = await getLockedAmountAndUnlockTime(address);
        await increaseUnlockTime(120);
        const { unlockTime } = await getLockedAmountAndUnlockTime(address);

        assert.isAtLeast(unlockTime + (7 * 86400 * 1000), initialUnlockTime + (120 * 86400 * 1000));
    });
});
