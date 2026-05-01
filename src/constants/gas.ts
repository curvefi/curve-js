import type { IGasStrategy } from "../interfaces.js";

export const GAS_STRATEGIES = {
    economy: {
        percentile: 20,
        baseFeeMulBps: 11_000,   // baseFee × 1.10
        tipMulBps: 9400,   // median tip × 0.94
        minTipMainnet: 0, // 0 gwei
        legacyGasPriceMulBps: 10_000,  // gasPrice × 1.00
        fallbackTipMulBps: 10_000,  // tip × 1.00
    },
    standard: {
        percentile: 50,
        baseFeeMulBps: 12_500,   // baseFee × 1.25
        tipMulBps: 10_000,   // median tip × 1.00
        minTipMainnet: 2_000_000_000,  // tip floor = baseFee × 0.05 (mainnet only)
        legacyGasPriceMulBps: 11_000,  // gasPrice × 1.10
        fallbackTipMulBps: 15_000,  // tip × 1.50
    },
    aggressive: {
        percentile: 80,
        baseFeeMulBps: 13_000,   // baseFee × 1.3
        tipMulBps: 10_200,   // median tip × 1.06
        minTipMainnet: 4_000_000_000,  // 4 gwei
        legacyGasPriceMulBps: 12_500,  // gasPrice × 1.25
        fallbackTipMulBps: 20_000,  // tip × 2.00
    },
} as const satisfies Record<IGasStrategy, {
    percentile: number;
    baseFeeMulBps: number;
    tipMulBps: number;
    minTipMainnet: number;
    legacyGasPriceMulBps: number;
    fallbackTipMulBps: number;
}>;

export const FEE_HISTORY_BLOCK_COUNT = 10;
export const MAINNET_CHAIN_ID = 1;
