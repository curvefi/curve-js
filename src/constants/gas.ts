import type { IGasStrategy } from "../interfaces.js";

export const GAS_STRATEGIES = {
    economy: {
        percentile: 10,
        baseFeeMulBps: 11_000,   // baseFee × 1.10
        tipMulBps: 9400,   // median tip × 0.94
        minTipBaseFractionBps: 300,  // tip floor = baseFee × 0.03 (mainnet only)
        legacyGasPriceMulBps: 10_000,  // gasPrice × 1.00
        fallbackTipMulBps: 10_000,  // tip × 1.00
    },
    standard: {
        percentile: 20,
        baseFeeMulBps: 12_000,   // baseFee × 1.20
        tipMulBps: 10_000,   // median tip × 1.00
        minTipBaseFractionBps: 500,  // tip floor = baseFee × 0.05 (mainnet only)
        legacyGasPriceMulBps: 11_000,  // gasPrice × 1.10
        fallbackTipMulBps: 15_000,  // tip × 1.50
    },
    aggressive: {
        percentile: 30,
        baseFeeMulBps: 12_500,   // baseFee × 1.25
        tipMulBps: 10_200,   // median tip × 1.06
        minTipBaseFractionBps: 700,  // tip floor = baseFee × 0.07 (mainnet only)
        legacyGasPriceMulBps: 12_500,  // gasPrice × 1.25
        fallbackTipMulBps: 20_000,  // tip × 2.00
    },
} as const satisfies Record<IGasStrategy, {
    percentile: number;
    baseFeeMulBps: number;
    tipMulBps: number;
    minTipBaseFractionBps: number;
    legacyGasPriceMulBps: number;
    fallbackTipMulBps: number;
}>;

export const FEE_HISTORY_BLOCK_COUNT = 10;
export const MAINNET_CHAIN_ID = 1;
