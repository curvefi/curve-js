import {IDict} from "../../interfaces";
import gaugeControllerABI from "../abis/gaugecontroller.json" assert { type: 'json' };
import votingEscrowABI from '../abis/votingescrow.json' assert { type: 'json' };

export const poolActions = [
    'commit_new_fee',
    'ramp_A',
    'commit_transfer_ownership',
    'withdraw_admin_fees',
    'unkill_me',
    'apply_transfer_ownership',
    'revert_transfer_ownership',
    'apply_new_fee',
    'stop_ramp_A',
    'revert_new_parameters',
]

export const DaoAbiDictionaries: Record<string, IDict<any>>  = {
    pools: {
        'commit_new_fee': undefined,
        'ramp_A': undefined,
        'commit_transfer_ownership': undefined,
        'withdraw_admin_fees': undefined,
        'unkill_me': undefined,
        'apply_transfer_ownership': undefined,
        'revert_transfer_ownership': undefined,
        'apply_new_fee': undefined,
        'stop_ramp_A': undefined,
        'revert_new_parameters': undefined,
    },
    gauges: {
        'commit_transfer_ownership': gaugeControllerABI,
        'add_type': gaugeControllerABI,
        'add_gauge': gaugeControllerABI,
        'change_type_weight': gaugeControllerABI,
        'change_gauge_weight': gaugeControllerABI,
        'apply_transfer_ownership': gaugeControllerABI,
    },
    member: {
        'mint': undefined,
        'burn': undefined,
    },
    escrow: {
        'commit_transfer_ownership': votingEscrowABI,
        'commit_smart_wallet_checker': votingEscrowABI,
        'apply_transfer_ownership': votingEscrowABI,
        'apply_smart_wallet_checker': votingEscrowABI,
    },
    poolProxy: {
        'commit_set_admins': undefined,
        'set_burner': undefined,
        'apply_set_admins': undefined,
    },
    registry: {
        'add_pool': undefined,
        'add_pool_without_underlying': undefined,
        'remove_pool': undefined,
        'set_returns_none': undefined,
        'set_gas_estimate_contract': undefined,
        'set_calculator': undefined,
        'set_burner': undefined,
        'apply_set_admins': undefined,
        'commit_transfer_ownership': undefined,
        'apply_transfer_ownership': undefined,
        'revert_transfer_ownership': undefined,
        'claim_token_balance': undefined,
        'claim_eth_balance': undefined,
    },
    vesting: {
        'fund_individual': undefined,
        'toggle_disable': undefined,
        'disable_can_disable': undefined,
    },
}