import { IDict } from "../../interfaces";
import { lowerCaseKeys } from "../utils.js";
// --- ZAPS --
import atricrypto3ZapABI from "../abis/atricrypto3/base_pool_zap.json" with { type: 'json' };
import tripoolZapABI from "../abis/3pool/meta_zap_crypto.json" with { type: 'json' };
import fraxusdcZapABI from "../abis/fraxusdc/meta_zap_crypto.json" with { type: 'json' };


export const lpTokenBasePoolIdDictEthereum: IDict<string> = lowerCaseKeys({
    '0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490': '3pool',
    '0x3175Df0976dFA876431C2E9eE6Bc45b65d3473CC': 'fraxusdc',
});

export const lpTokenBasePoolIdDictPolygon: IDict<string> = lowerCaseKeys({
    '0xdAD97F7713Ae9437fa9249920eC8507e5FbB23d3': 'atricrypto3',
});

export const basePoolIdZapDictEthereum: IDict<{ address: string, ABI: any }> = {
    '3pool': {
        address: "0x97aDC08FA1D849D2C48C5dcC1DaB568B169b0267".toLowerCase(),
        ABI: tripoolZapABI,
    },
    fraxusdc: {
        address: "0x5de4ef4879f4fe3bbadf2227d2ac5d0e2d76c895".toLowerCase(),
        ABI: fraxusdcZapABI,
    },
};

export const basePoolIdZapDictPolygon: IDict<{ address: string, ABI: any }> = {
    atricrypto3: {
        address: "0x3d8EADb739D1Ef95dd53D718e4810721837c69c1".toLowerCase(),
        ABI: atricrypto3ZapABI,
    },
};

export const tricryptoDeployImplementations = {
    1: { // ETH
        amm_native_transfers_disabled: '0x0000000000000000000000000000000000000000'.toLowerCase(),
        amm_native_transfers_enabled: '0x66442B0C5260B92cAa9c234ECf2408CBf6b19a6f'.toLowerCase(), //0
        implementationIdx: 0,
    },
    10: { // OPTIMISM
        amm_native_transfers_disabled: '0x0458ea5F4CD00E873264Be2031Ceb8f9d9b3116c'.toLowerCase(), //1
        amm_native_transfers_enabled: '0x1FE2a06c8bd81AE65FD1C5036451890b37976369'.toLowerCase(), //0
        implementationIdx: 1,
    },
    56: { // BSC
        amm_native_transfers_disabled: '0x6A8cbed756804B16E05E741eDaBd5cB544AE21bf'.toLowerCase(), //1
        amm_native_transfers_enabled: '0xc6C09471Ee39C7E30a067952FcC89c8922f9Ab53'.toLowerCase(), //0
        implementationIdx: 1,
    },
    100: { // XDAI
        amm_native_transfers_disabled: '0x3f445D38E820c010a7A6E33c5F80cBEBE6930f61'.toLowerCase(), //1
        amm_native_transfers_enabled: '0xa54f3c1dfa5f7dbf2564829d14b3b74a65d26ae2'.toLowerCase(), //0
        implementationIdx: 1,
    },
    137: {  // POLYGON
        amm_native_transfers_disabled: '0x3d6cB2F6DcF47CDd9C13E4e3beAe9af041d8796a'.toLowerCase(), //1
        amm_native_transfers_enabled: '0x0c59d36b23f809f8b6C7cb4c8C590a0AC103baEf'.toLowerCase(), //0
        implementationIdx: 1,
    },
    252: { // FRAXTAL
        amm_native_transfers_disabled: '0x1A83348F9cCFD3Fe1A8C0adBa580Ac4e267Fe495'.toLowerCase(), //1
        amm_native_transfers_enabled: '0xd3b17f862956464ae4403ccf829ce69199856e1e'.toLowerCase(), //0
        implementationIdx: 1,
    },
    999: {  // HYPERLIQUID
        amm_native_transfers_disabled: '0x635742dCC8313DCf8c904206037d962c042EAfBd'.toLowerCase(), // 1
        amm_native_transfers_enabled: '0x0000000000000000000000000000000000000000'.toLowerCase(), // 0
        implementationIdx: 1,
    },
    8453: {  // BASE
        amm_native_transfers_disabled: '0x0c59d36b23f809f8b6C7cb4c8C590a0AC103baEf'.toLowerCase(), //1
        amm_native_transfers_enabled: '0xa274c88e09fDF1798a7517096557e6c1bEa1f65A'.toLowerCase(), //0
        implementationIdx: 1,
    },
    42161: {  // ARBITRUM
        amm_native_transfers_disabled: '0x1f7C86AffE5bCF7a1D74a8c8E2ef9E03BF31c1BD'.toLowerCase(), //1
        amm_native_transfers_enabled: '0xd7E72f3615aa65b92A4DBdC211E296a35512988B'.toLowerCase(),  //0
        implementationIdx: 1,
    },
}


export const CRYPTO_FACTORY_CONSTANTS: { [index: number]: {
    lpTokenBasePoolIdDict?: IDict<string>,
    basePoolIdZapDict?: IDict<{ address: string, ABI: any }>,
    tricryptoDeployImplementations?: IDict<string | number>,
} } = {
    1: {  // ETH
        lpTokenBasePoolIdDict: lpTokenBasePoolIdDictEthereum,
        basePoolIdZapDict: basePoolIdZapDictEthereum,
        tricryptoDeployImplementations: tricryptoDeployImplementations[1],
    },
    10: { // OPTIMISM
        tricryptoDeployImplementations: tricryptoDeployImplementations[10],
    },
    56: { // BSC
        tricryptoDeployImplementations: tricryptoDeployImplementations[56],
    },
    100: { // XDAI
        tricryptoDeployImplementations: tricryptoDeployImplementations[100],
    },
    137: {  // POLYGON
        lpTokenBasePoolIdDict: lpTokenBasePoolIdDictPolygon,
        basePoolIdZapDict: basePoolIdZapDictPolygon,
        tricryptoDeployImplementations: tricryptoDeployImplementations[137],
    },
    252: { // FRAXTAL
        tricryptoDeployImplementations: tricryptoDeployImplementations[252],
    },
    999: { // HYPERLIQUID
        tricryptoDeployImplementations: tricryptoDeployImplementations[999],
    },
    8453: {  // BASE
        tricryptoDeployImplementations: tricryptoDeployImplementations[8453],
    },
    42161: {  // ARBITRUM
        tricryptoDeployImplementations: tricryptoDeployImplementations[42161],
    },
}
