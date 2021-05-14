import { Pool } from "../pools";
import { DictInterface } from "../interfaces"
import { getBalances } from "../utils";
import { createLock, getLockedAmountAndUnlockTime } from '../voting';
import { curve, ALIASES } from "../curve";

const showBalances = async (address: string): Promise<void> => {
    console.log("Checking balances");
    const balances: DictInterface<string[]> = await getBalances([address], [ALIASES.crv]);
    const { lockedAmount } = await getLockedAmountAndUnlockTime(address);
    console.log("CRV: ", balances[address][0]); // TODO get decimals
    console.log("Locked CRV: ", lockedAmount); // TODO get decimals
}

const myPool = new Pool('3pool');
myPool.init(async function() {
    await curve.init();

    console.log(`--- VOTING ESCROW ---`);
    const address = await curve.signer.getAddress();

    await showBalances(address);

    console.log('\nCREATE LOCK (50 000 CRV)\n');
    const hash = await createLock('50000.0', 365);
    console.log('TX hash: ', hash, '\n');

    await showBalances(address);
}).then(null, (e) => console.log(e));
