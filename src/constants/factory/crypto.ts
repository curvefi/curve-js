import { IDict } from "../../interfaces";
import { lowerCaseKeys } from "../utils.js";
// --- ZAPS --
import atricrypto3ZapABI from "../abis/atricrypto3/base_pool_zap.json" assert { type: 'json' };
import tripoolZapABI from "../abis/3pool/meta_zap_crypto.json" assert { type: 'json' };
import fraxusdcZapABI from "../abis/fraxusdc/meta_zap_crypto.json" assert { type: 'json' };


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
        amm_native_transfers_enabled: '0xBff334F8D5912AC5c4f2c590A2396d1C5d990123'.toLowerCase(), //0
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
    196: {  // X-LAYER
        amm_native_transfers_disabled: '0x64379C265Fc6595065D7d835AAaa731c0584dB80'.toLowerCase(), //1
        amm_native_transfers_enabled: '0x0C9D8c7e486e822C29488Ff51BFf0167B4650953'.toLowerCase(), //0
        implementationIdx: 1,
    },
    250: {  // FANTOM
        amm_native_transfers_disabled: '0xd125E7a0cEddF89c6473412d85835450897be6Dc'.toLowerCase(), //1
        amm_native_transfers_enabled: '0x76303e4fDcA0AbF28aB3ee42Ce086E6503431F1D'.toLowerCase(), //0
        implementationIdx: 1,
    },
    252: { // FRAXTAL
        amm_native_transfers_disabled: '0x1A83348F9cCFD3Fe1A8C0adBa580Ac4e267Fe495'.toLowerCase(), //1
        amm_native_transfers_enabled: '0xd3b17f862956464ae4403ccf829ce69199856e1e'.toLowerCase(), //0
        implementationIdx: 1,
    },
    324: {  // ZKSYNC
        amm_native_transfers_disabled: '0x1BD7d40CF9bBb63537746C89992f421bC35C6716'.toLowerCase(),
        amm_native_transfers_enabled: '0x18d01726FeDaBd91579A9368DFB2F8A24f905280'.toLowerCase(),
        implementationIdx: 0,
    },
    1284: {  // MOONBEAM
        amm_native_transfers_disabled: '0x0000000000000000000000000000000000000000'.toLowerCase(),
        amm_native_transfers_enabled: '0x0000000000000000000000000000000000000000'.toLowerCase(),
        implementationIdx: 0,
    },
    2222: {  // KAVA
        amm_native_transfers_disabled: '0x0c59d36b23f809f8b6C7cb4c8C590a0AC103baEf'.toLowerCase(), //1
        amm_native_transfers_enabled: '0xFAbC421e3368D158d802684A217a83c083c94CeB'.toLowerCase(), //0
        implementationIdx: 1,
    },
    5000: {  // MANTLE
        amm_native_transfers_disabled: '0x7Ca46A636b02D4aBC66883D7FF164bDE506DC66a'.toLowerCase(), //1
        amm_native_transfers_enabled: '0x046207cB759F527b6c10C2D61DBaca45513685CC'.toLowerCase(), //0
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
    42220: {  // CELO
        amm_native_transfers_disabled: '0x0c59d36b23f809f8b6C7cb4c8C590a0AC103baEf'.toLowerCase(), //1
        amm_native_transfers_enabled: '0xFAbC421e3368D158d802684A217a83c083c94CeB'.toLowerCase(), //0
        implementationIdx: 1,
    },
    43114: {  // AVALANCHE
        amm_native_transfers_disabled: '0x0c59d36b23f809f8b6C7cb4c8C590a0AC103baEf'.toLowerCase(), //1
        amm_native_transfers_enabled: '0xFAbC421e3368D158d802684A217a83c083c94CeB'.toLowerCase(), //0
        implementationIdx: 1,
    },
    1313161554: {  // AURORA
        amm_native_transfers_disabled: '0x3d6cB2F6DcF47CDd9C13E4e3beAe9af041d8796a'.toLowerCase(), //1
        amm_native_transfers_enabled: '0x0c59d36b23f809f8b6C7cb4c8C590a0AC103baEf'.toLowerCase(), //0
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
    196: {  // X-LAYER
        tricryptoDeployImplementations: tricryptoDeployImplementations[196],
    },
    250: {  // FANTOM
        tricryptoDeployImplementations: tricryptoDeployImplementations[250],
    },
    252: { // FRAXTAL
        tricryptoDeployImplementations: tricryptoDeployImplementations[252],
    },
    324: {  // ZKSYNC
        tricryptoDeployImplementations: tricryptoDeployImplementations[324],
    },
    1284: {  // MOONBEAM
        tricryptoDeployImplementations: tricryptoDeployImplementations[1284],
    },
    2222: {  // KAVA
        tricryptoDeployImplementations: tricryptoDeployImplementations[2222],
    },
    5000: {  // MANTLE
        tricryptoDeployImplementations: tricryptoDeployImplementations[5000],
    },
    8453: {  // BASE
        tricryptoDeployImplementations: tricryptoDeployImplementations[8453],
    },
    42161: {  // ARBITRUM
        tricryptoDeployImplementations: tricryptoDeployImplementations[42161],
    },
    42220: {  // CELO
        tricryptoDeployImplementations: tricryptoDeployImplementations[42220],
    },
    43114: {  // AVALANCHE
        tricryptoDeployImplementations: tricryptoDeployImplementations[43114],
    },
    1313161554: {  // AURORA
        tricryptoDeployImplementations: tricryptoDeployImplementations[1313161554],
    },
}
