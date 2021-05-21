import { assert } from "chai";
import { getBalances, BN } from "../utils";
import { createLock, increaseAmount, getLockedAmountAndUnlockTime } from '../voting';
import { curve, ALIASES } from "../curve";

describe('Voting Escrow', function() {
    let address = '';

    before(async function() {
        await curve.init();
        address = await curve.signer.getAddress();
    });

    it('Creates lock in Voting Escrow contract', async function () {
        const lockAmount = '1000';

        const initialCRVBalance: string = (await getBalances([address], [ALIASES.crv]))[address][0];
        await createLock(lockAmount, 365);
        const CRVBalanceAfterLock = (await getBalances([address], [ALIASES.crv]))[address][0];
        const { lockedAmount } = await getLockedAmountAndUnlockTime(address);

        assert.deepEqual(BN(lockedAmount), BN(initialCRVBalance).minus(BN(CRVBalanceAfterLock)));
    }).timeout(15000);

    it('Increases amount locked in Voting Escrow contract', async function () {
        const increaseLockAmount = '1000';

        const initialCRVBalance: string = (await getBalances([address], [ALIASES.crv]))[address][0];
        const { lockedAmount: initialLockedAmount } = await getLockedAmountAndUnlockTime(address);
        await increaseAmount(increaseLockAmount);
        const CRVBalanceAfterLock = (await getBalances([address], [ALIASES.crv]))[address][0];
        const { lockedAmount } = await getLockedAmountAndUnlockTime(address);

        assert.deepEqual(BN(lockedAmount).minus(BN(initialLockedAmount)), BN(initialCRVBalance).minus(BN(CRVBalanceAfterLock)));
    }).timeout(15000);
});
