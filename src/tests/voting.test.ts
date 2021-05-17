import assert from "assert";
import { getBalances, BN } from "../utils";
import { createLock, getLockedAmountAndUnlockTime } from '../voting';
import { curve, ALIASES } from "../curve";


describe('Voting Escrow', function() {
    it('Creates lock in Voting Escrow contract', async function () {
        await curve.init();

        const address = await curve.signer.getAddress();
        const lockAmount = '1000';

        const initialCRVBalance: string = (await getBalances([address], [ALIASES.crv]))[address][0];
        await createLock(lockAmount, 365);
        const CRVBalanceAfterLock = (await getBalances([address], [ALIASES.crv]))[address][0];
        const { lockedAmount } = await getLockedAmountAndUnlockTime(address);

        assert.deepStrictEqual(BN(lockedAmount), BN(initialCRVBalance).minus(BN(CRVBalanceAfterLock)));
    }).timeout(15000);
});
