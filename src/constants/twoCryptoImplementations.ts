/**
 * TwoCrypto pool implementation configurations https://docs.curve.finance/deployments/implementations/#cryptoswap-ng
 */

export type TwoCryptoImplementationIndex = number | string;

/**
 * TwoCrypto implementation indices
 */
export enum TwoCryptoImplementation {
    DEFAULT = 0,
    YB_POOLS_0_PERCENT = "110827960954786879070795645317684308345156454977361180728234664032152099907574",
    FX_25_PERCENT = "13710427451595223911029771732871636196811780523916976014878790826087297352222",
    FX_REGULAR_50_PERCENT = "110205523814837221872401067839670671012439480455633721548677383351514213591649",
    SETTABLE_ADMIN_FEE = "6789"
}

/**
 * Implementation metadata
 */
export interface TwoCryptoImplementationInfo {
    index: TwoCryptoImplementationIndex;
    address: string;
    description: string;
    availableInUI: boolean;
}

export const TWOCRYPTO_IMPLEMENTATIONS: TwoCryptoImplementationInfo[] = [
    {
        index: TwoCryptoImplementation.DEFAULT,
        address: "0x934791f7F391727db92BFF94cd789c4623d14c52",
        description: "",
        availableInUI: true,
    },
    {
        index: TwoCryptoImplementation.YB_POOLS_0_PERCENT,
        address: "0x82c251317ede0514302EEE1aD48f838a7A6EcE2F",
        description: "TwoCrypto (0% DAO fee) — for yb pools",
        availableInUI: false,
    },
    {
        index: TwoCryptoImplementation.FX_25_PERCENT,
        address: "0x3B0df55A2c64Ac7A3ada784eEA0898F0FD3cF17e",
        description: "TwoCrypto (25% DAO fee) — for FX where the asset issuer will be the main source of LP and donations",
        availableInUI: false,
    },
    {
        index: TwoCryptoImplementation.FX_REGULAR_50_PERCENT,
        address: "0xD1FAeCA80d6FDd1DF4CBcCe4b2551b6Ee63Ae3D6",
        description: "TwoCrypto (50% DAO fee) — for FX / regular pairs (where donations may stream from within Curve protocol)",
        availableInUI: true,
    },
    {
        index: TwoCryptoImplementation.SETTABLE_ADMIN_FEE,
        address: "0xeC1045809e383811Cc74B3D25219e1607A5f32dC",
        description: "Alternative implementation with settable admin fee for two/tricrypto (default admin fee remains at 50%)",
        availableInUI: false,
    },
];

export function getTwoCryptoImplementations(uiOnly: boolean = false): TwoCryptoImplementationInfo[] {
    return uiOnly ? TWOCRYPTO_IMPLEMENTATIONS.filter((impl) => impl.availableInUI) : TWOCRYPTO_IMPLEMENTATIONS;
}

