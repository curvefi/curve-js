import { IDict } from "../interfaces";
import factorySwapABI from "../constants/abis/factoryPools/swap.json";
import MetaUSDABI from "../constants/abis/factory-v2/MetaUSD.json";
import MetaUSDBalancesABI from "../constants/abis/factory-v2/MetaUSDBalances.json";
import MetaFraxUSDABI from "../constants/abis/factory-v2/MetaFraxUSD.json";
import MetaFraxUSDBalancesABI from "../constants/abis/factory-v2/MetaFraxUSDBalances.json";
import MetaBTCABI from "../constants/abis/factory-v2/MetaBTC.json";
import MetaBTCBalancesABI from "../constants/abis/factory-v2/MetaBTCBalances.json";
import MetaBTCRenABI from "../constants/abis/factory-v2/MetaBTCRen.json";
import MetaBTCRenBalancesABI from "../constants/abis/factory-v2/MetaBTCBalancesRen.json";
import MetaUSDGeistABI from "../constants/abis/factory-v2/MetaUSDGeist.json";
import Plain2BasicABI from "../constants/abis/factory-v2/Plain2Basic.json";
import Plain2BalancesABI from "../constants/abis/factory-v2/Plain2Balances.json";
import Plain2ETHABI from "../constants/abis/factory-v2/Plain2ETH.json";
import Plain2OptimizedABI from "../constants/abis/factory-v2/Plain2Optimized.json";
import Plain3BasicABI from "../constants/abis/factory-v2/Plain3Basic.json";
import Plain3BalancesABI from "../constants/abis/factory-v2/Plain3Balances.json";
import Plain3ETHABI from "../constants/abis/factory-v2/Plain3ETH.json";
import Plain3OptimizedABI from "../constants/abis/factory-v2/Plain3Optimized.json";
import Plain4BasicABI from "../constants/abis/factory-v2/Plain4Basic.json";
import Plain4BalancesABI from "../constants/abis/factory-v2/Plain4Balances.json";
import Plain4ETHABI from "../constants/abis/factory-v2/Plain4ETH.json";
import Plain4OptimizedABI from "../constants/abis/factory-v2/Plain4Optimized.json";
// --- ZAPS --
import factoryDepositABI from "../constants/abis/factoryPools/deposit.json";
import fraxusdcMetaZapABI from "../constants/abis/fraxusdc/meta_zap.json";
import MetaUsdZapPolygonABI from "../constants/abis/factory-v2/DepositZapMetaUsdPolygon.json";
import MetaBtcZapPolygonABI from "../constants/abis/factory-v2/DepositZapMetaBtcPolygon.json";
import MetaZapFantomABI from "../constants/abis/factory-v2/DepositZapFantom.json";
import MetaGeistUsdZapFantomABI from "../constants/abis/factory-v2/DepositZapMetaUsd2Fantom.json";
import RenMetaZapABI from "../constants/abis/ren/meta_zap.json";


export const implementationABIDictEthereum: IDict<any> = {
    "0x5F890841f657d90E081bAbdB532A05996Af79Fe6": factorySwapABI,

    "0x213be373FDff327658139C7df330817DAD2d5bBE": MetaUSDABI,
    "0x55Aa9BF126bCABF0bDC17Fa9E39Ec9239e1ce7A9": MetaUSDBalancesABI,

    "0x33bB0e62d5e8C688E645Dd46DFb48Cd613250067": MetaFraxUSDABI,
    "0x2EB24483Ef551dA247ab87Cf18e1Cc980073032D": MetaFraxUSDBalancesABI,

    "0xC6A8466d128Fbfd34AdA64a9FFFce325D57C9a52": MetaBTCABI,
    "0xc4C78b08fA0c3d0a312605634461A88184Ecd630": MetaBTCBalancesABI,

    "0xECAaecd9d2193900b424774133B1f51ae0F29d9E": MetaBTCRenABI,
    "0x40fD58D44cFE63E8517c9Bb3ac98676838Ea56A8": MetaBTCRenBalancesABI,

    "0x6523Ac15EC152Cb70a334230F6c5d62C5Bd963f1": Plain2BasicABI,
    "0x24D937143d3F5cF04c72bA112735151A8CAE2262": Plain2BalancesABI,
    "0x6326DEbBAa15bCFE603d831e7D75f4fc10d9B43E": Plain2ETHABI,
    "0x4A4d7868390EF5CaC51cDA262888f34bD3025C3F": Plain2OptimizedABI,

    "0x9B52F13DF69D79Ec5aAB6D1aCe3157d29B409cC3": Plain3BasicABI,
    "0x50b085f2e5958C4A87baf93A8AB79F6bec068494": Plain3BalancesABI,
    "0x8c1aB78601c259E1B43F19816923609dC7d7de9B": Plain3ETHABI,
    "0xE5F4b89E0A16578B3e0e7581327BDb4C712E44De": Plain3OptimizedABI,

    "0x5Bd47eA4494e0F8DE6e3Ca10F1c05F55b72466B8": Plain4BasicABI,
    "0xd35B58386705CE75CE6d09842E38E9BE9CDe5bF6": Plain4BalancesABI,
    "0x88855cdF2b0A8413D470B86952E726684de915be": Plain4ETHABI,
    "0xaD4753D045D3Aed5C1a6606dFb6a7D7AD67C1Ad7": Plain4OptimizedABI,
}

export const implementationABIDictPolygon: IDict<any> = {
    "0x4fb93D7d320E8A263F22f62C2059dFC2A8bCbC4c": MetaUSDABI,
    "0x39fE1824f98CD828050D7c51dA443E84121c7cf1": MetaUSDBalancesABI,

    "0xC05EB760A135d3D0c839f1141423002681157a17": MetaBTCRenABI,
    "0xD8336532f6ED7b94282fAF724fe41d6145E07Cfc": MetaBTCRenBalancesABI,

    "0x571FF5b7b346F706aa48d696a9a4a288e9Bb4091": Plain2BasicABI,
    "0x8925D9d9B4569D737a48499DeF3f67BaA5a144b9": Plain2BalancesABI,
    "0xAe00f57663F4C85FC948B13963cd4627dAF01061": Plain2ETHABI,
    "0x8101E6760130be2C8Ace79643AB73500571b7162": Plain2OptimizedABI,

    "0x493084cA44C779Af27a416ac1F71e3823BF21b53": Plain3BasicABI,
    "0x9B4Ed6F8904E976146b3dC0233CD48Cf81835240": Plain3BalancesABI,
    "0xA9134FaE98F92217f457918505375Ae91fdc5e3c": Plain3ETHABI,
    "0xCC9fd96C26c450Dd4580893afF75efd5cb6C12Fc": Plain3OptimizedABI,

    "0x991b05d5316fa3A2C053F84658b84987cd5c9970": Plain4BasicABI,
    "0xC7c46488566b9ef9B981b87E328939CaA5ca152f": Plain4BalancesABI,
    "0xf31bcdf0B9a5eCD7AB463eB905551fBc32e51856": Plain4ETHABI,
    "0xAc273d5b4FC06625d8b1abA3BE8De15bDFb8E39f": Plain4OptimizedABI,
}

export const implementationABIDictFantom: IDict<any> = {
    "0xfCE359115dFe1533a2458650123F86C454BC0213": MetaUSDABI,
    "0x09C62ad0694e3f1ad8cF8876aaBe56138C586f5F": MetaUSDBalancesABI,

    "0xC9438d8928486bD9621D326002F4672bF684187A": MetaBTCRenABI,
    "0x2b70A5B878665FfDB4A06Ba40a264d6c70f68F4B": MetaBTCRenBalancesABI,

    "0x210C806F6AE850279f7E298dE749EC4B427d00DD": MetaUSDGeistABI,
    "0xf82162bB68aD5a168345bb7EFb2faA0EDCCA5177": MetaUSDBalancesABI,

    "0x61E10659fe3aa93d036d099405224E4Ac24996d0": Plain2BasicABI,
    "0xd9Acb0BAeeD77C99305017821167674Cc7e82f7a": Plain2BalancesABI,
    "0xE6358f6a45B502477e83CC1CDa759f540E4459ee": Plain2ETHABI,
    "0xAD4768F408dD170e62E074188D81A29AE31B8Fd8": Plain2OptimizedABI,

    "0x3cABd83bCa606768939B843f91df8f4963dBC079": Plain3BasicABI,
    "0xD1602F68CC7C4c7B59D686243EA35a9C73B0c6a2": Plain3BalancesABI,
    "0x5d58Eb45e97B43e471AF05cD2b11CeB4106E1b1a": Plain3ETHABI,
    "0x7Ee25A34C921E4009B726cC6be0643fd6a39DbfE": Plain3OptimizedABI,

    "0xABE216918fFDa43B44e3FC09639Fd82fD3527D89": Plain4BasicABI,
    "0x775A21E0dfE25aF30FF2FCAC37512EbD8fD36471": Plain4BalancesABI,
    "0xb11Dc44A9f981fAF1669dca6DD40c3cc2554A2ce": Plain4ETHABI,
    "0x9D7C28226AA7142cBF234ab9aa9C203D095c528B": Plain4OptimizedABI,
}

export const implementationABIDictAvalanche: IDict<any> = {
    "0xA237034249290De2B07988Ac64b96f22c0E76fE0": MetaUSDABI,
    "0xc50C05Ca1f8C2346664bd0d4a1eb6aC1Da38414f": MetaUSDBalancesABI, // 0x7f90122BF0700F9E7e1F688fe926940E8839F353

    "0xa27f39E9C21b3376F43266E13Ad5A5d6E9BdB320": MetaBTCRenABI,
    "0x505C34ED8dBE96d2D5C7D83158aA844887770970": MetaBTCRenBalancesABI, // 0x16a7DA911A4DD1d83F3fF066fE28F3C792C50d90

    "0x697434ca761d4F86b553784B69F4f37F5eDf54dF": Plain2BasicABI,
    "0xBdFF0C27dd073C119ebcb1299a68A6A92aE607F0": Plain2BalancesABI,
    "0x64448B78561690B70E17CBE8029a3e5c1bB7136e": Plain2ETHABI,
    "0x09672362833d8f703D5395ef3252D4Bfa51c15ca": Plain2OptimizedABI,

    "0x1de7f0866e2c4adAC7b457c58Cc25c8688CDa1f2": Plain3BasicABI,
    "0x094d12e5b541784701FD8d65F11fc0598FBC6332": Plain3BalancesABI,
    "0xF1f85a74AD6c64315F85af52d3d46bF715236ADc": Plain3ETHABI,
    "0xaa82ca713D94bBA7A89CEAB55314F9EfFEdDc78c": Plain3OptimizedABI,

    "0x7544Fe3d184b6B55D6B36c3FCA1157eE0Ba30287": Plain4BasicABI,
    "0x7D86446dDb609eD0F5f8684AcF30380a356b2B4c": Plain4BalancesABI,
    "0x0eb0F1FaF5F509Ac53fA224477509EAD167cf410": Plain4ETHABI,
    "0xCE94D3E5b0D80565D7B713A687b39a3Dc81780BA": Plain4OptimizedABI,
}

export const implementationABIDictArbitrum: IDict<any> = {
    "0x09672362833d8f703D5395ef3252D4Bfa51c15ca": MetaUSDABI,
    "0xBE175115BF33E12348ff77CcfEE4726866A0Fbd5": MetaUSDBalancesABI,

    "0x094d12e5b541784701FD8d65F11fc0598FBC6332": MetaBTCRenABI,
    "0xF1f85a74AD6c64315F85af52d3d46bF715236ADc": MetaBTCRenBalancesABI,

    "0x8DEb66a4A40E370355bEe35f12E55Fe9c755d686": MetaFraxUSDABI, // fraxbp
    "0x3edE9b145F82e9e46C03f8A8F67B77aEE847b632": MetaFraxUSDBalancesABI, // fraxbp

    "0x54e8A25d0Ac0E4945b697C80b8372445FEA17A62": Plain2BasicABI,
    "0xD68970e266cE1A015953897C7055a5E0bC657Af8": Plain2BalancesABI,
    "0x7DA64233Fefb352f8F501B357c018158ED8aA455": Plain2ETHABI,
    "0x0100fBf414071977B19fC38e6fc7c32FE444F5C9": Plain2OptimizedABI,

    "0xe381C25de995d62b453aF8B931aAc84fcCaa7A62": Plain3BasicABI,
    "0xc379bA7b8e1c6C48D64e1cf9dD602C97c9fD0F40": Plain3BalancesABI,
    "0xAAe75FAebCae43b9d541Fd875622BE48D9B4f5D0": Plain3ETHABI,
    "0x8866414733F22295b7563f9C5299715D2D76CAf4": Plain3OptimizedABI,

    "0x8d53E5De033078367Ad91527c53abfd1Eb6bfa86": Plain4BasicABI,
    "0x2ac56cEBc2D27c9bB51a11773355E44371Eb88D3": Plain4BalancesABI,
    "0x89287c32c2CAC1C76227F6d300B2DBbab6b75C08": Plain4ETHABI,
    "0x06e3C4da96fd076b97b7ca3Ae23527314b6140dF": Plain4OptimizedABI,
}

export const implementationABIDictOptimism: IDict<any> = {
    "0x78CF256256C8089d68Cde634Cf7cDEFb39286470": MetaUSDABI,
    "0xADf698e4d8Df08b3E2c79682891636eF00F6e205": MetaUSDBalancesABI,

    "0xe8269B33E47761f552E1a3070119560d5fa8bBD6": MetaFraxUSDABI,
    "0x114C4042B11a2b16F58Fe1BFe847589a122F678a": MetaFraxUSDBalancesABI,

    "0xC2b1DF84112619D190193E48148000e3990Bf627": Plain2BasicABI,
    "0x16a7DA911A4DD1d83F3fF066fE28F3C792C50d90": Plain2BalancesABI,
    "0x4f3E8F405CF5aFC05D68142F3783bDfE13811522": Plain2ETHABI,
    "0x0f9cb53Ebe405d49A0bbdBD291A65Ff571bC83e1": Plain2OptimizedABI,

    "0x78D0fC2B9D5AE65512DB242e424a9c683F18c243": Plain3BasicABI,
    "0x35796DAc54f144DFBAD1441Ec7C32313A7c29F39": Plain3BalancesABI,
    "0x6600e98b71dabfD4A8Cac03b302B0189Adb86Afb": Plain3ETHABI,
    "0x6D65b498cb23deAba52db31c93Da9BFFb340FB8F": Plain3OptimizedABI,

    "0x445FE580eF8d70FF569aB36e80c647af338db351": Plain4BasicABI,
    "0xF6bDc2619FFDA72c537Cd9605e0A274Dc48cB1C9": Plain4BalancesABI,
    "0x1AEf73d49Dedc4b1778d0706583995958Dc862e6": Plain4ETHABI,
    "0x8474DdbE98F5aA3179B3B3F5942D724aFcdec9f6": Plain4OptimizedABI,
}

export const implementationABIDictXDai: IDict<any> = {
    "0x4A5bF7Ab9A8202692051c19B102d3eDD62aaBAE6": MetaUSDABI,
    "0x0B4dc7A945695D11FD83e40B2DfC2B896A02395F": MetaUSDBalancesABI,

    "0x04e39EF8332e979Cf8e4f8891E64934FF65F231b": Plain2BasicABI,
    "0xC9438d8928486bD9621D326002F4672bF684187A": Plain2BalancesABI,
    "0x2b70A5B878665FfDB4A06Ba40a264d6c70f68F4B": Plain2ETHABI,
    "0x2D036f0Ff6F440dB623e0D9D3B5Daa509e5500C3": Plain2OptimizedABI,

    "0xec9cEBE650E181079576C1b6d0d2e092B1EdfF13": Plain3BasicABI,
    "0xe8269B33E47761f552E1a3070119560d5fa8bBD6": Plain3BalancesABI,
    "0x114C4042B11a2b16F58Fe1BFe847589a122F678a": Plain3ETHABI,
    "0x4244eB811D6e0Ef302326675207A95113dB4E1F8": Plain3OptimizedABI,

    "0x66B5792ED50a2a7405Ea75C4B6B1913eF4E46661": Plain4BasicABI,
    "0xcB4eB43E31C830e22baF764c64F11F32C280496c": Plain4BalancesABI,
    "0xc1C49622b63B961ce1D352ecb7D8261Ab5556695": Plain4ETHABI,
    "0x0E2615ce69Cd3Dc3Ff6f66a975bEa0655F3bA7b9": Plain4OptimizedABI,
}

export const implementationABIDictMoonbeam: IDict<any> = {
    "0x6842E0412AC1c00464dc48961330156a07268d14": Plain2BasicABI,
    "0x9fAe78C4bBB649deB7b2295dDB8A03adA7eB660F": Plain2BalancesABI,
    "0xfCE359115dFe1533a2458650123F86C454BC0213": Plain2ETHABI,
    "0x09C62ad0694e3f1ad8cF8876aaBe56138C586f5F": Plain2OptimizedABI,

    "0xD19Baeadc667Cf2015e395f2B08668Ef120f41F5": Plain3BasicABI,
    "0x04e39EF8332e979Cf8e4f8891E64934FF65F231b": Plain3BalancesABI,
    "0xC9438d8928486bD9621D326002F4672bF684187A": Plain3ETHABI,
    "0x2b70A5B878665FfDB4A06Ba40a264d6c70f68F4B": Plain3OptimizedABI,

    "0x2D036f0Ff6F440dB623e0D9D3B5Daa509e5500C3": Plain4BasicABI,
    "0x7Bb707085905c9D80854652809A1ba8480C11789": Plain4BalancesABI,
    "0xec9cEBE650E181079576C1b6d0d2e092B1EdfF13": Plain4ETHABI,
    "0xe8269B33E47761f552E1a3070119560d5fa8bBD6": Plain4OptimizedABI,
}

export const implementationABIDictKava: IDict<any> = {
    "0x2632679f5ca396a1bd2647092d9dbf7ec5d7b263": Plain2BasicABI,
    "0x12f196251efcaca0fd73d5b58132b16760ba96a8": Plain2BalancesABI,
    "0xafdab4f8f6e6992b16e3906295fba390aab59ca5": Plain2ETHABI,
    "0x50d7a3e0d5350d52e9e08a1b58eefd1db8759d7d": Plain2OptimizedABI,

    "0xc8913d486a42459e6b34db33f0c660fca61306b9": Plain3BasicABI,
    "0xc8913D486a42459e6B34db33F0C660FCa61306b9": Plain3BasicABI,  // TODO lowercase all implementation addresses
    "0xc5ec776a55ea062fa3173c6c76703e9c9fa91c47": Plain3BalancesABI,
    "0xed2c5f2c4cab6e82630d5615ea15dd47d8b29983": Plain3ETHABI,
    "0xe7d5293c01685a414ddde527eb5effbf92b52648": Plain3OptimizedABI,

    "0x77016d2de65de15a3c36bebbddc90804f670d2d0": Plain4BasicABI,
    "0xd59c875dccb6cdcb3a75b91b58a363b5e4b0ca9a": Plain4BalancesABI,
    "0x6378dd741b24bd884f3590d7bc7555fdb2f5b003": Plain4ETHABI,
    "0x509495dfeec3a53acb2f60669985d868131ad9a5": Plain4OptimizedABI,
}

export const implementationBasePoolIdDictEthereum: IDict<string> = {
    "0x5F890841f657d90E081bAbdB532A05996Af79Fe6": "3pool",

    "0x213be373FDff327658139C7df330817DAD2d5bBE": "3pool",
    "0x55Aa9BF126bCABF0bDC17Fa9E39Ec9239e1ce7A9": "3pool",

    "0x33bB0e62d5e8C688E645Dd46DFb48Cd613250067": "fraxusdc",
    "0x2EB24483Ef551dA247ab87Cf18e1Cc980073032D": "fraxusdc",

    "0xC6A8466d128Fbfd34AdA64a9FFFce325D57C9a52": "sbtc",
    "0xc4C78b08fA0c3d0a312605634461A88184Ecd630": "sbtc",

    "0xECAaecd9d2193900b424774133B1f51ae0F29d9E": "ren",
    "0x40fD58D44cFE63E8517c9Bb3ac98676838Ea56A8": "ren",
}

export const implementationBasePoolIdDictPolygon: IDict<string> = {
    "0x4fb93D7d320E8A263F22f62C2059dFC2A8bCbC4c": "aave",
    "0x39fE1824f98CD828050D7c51dA443E84121c7cf1": "aave",

    "0xC05EB760A135d3D0c839f1141423002681157a17": "ren",
    "0xD8336532f6ED7b94282fAF724fe41d6145E07Cfc": "ren",
}

export const implementationBasePoolIdDictFantom: IDict<string> = {
    "0xfCE359115dFe1533a2458650123F86C454BC0213": "2pool",
    "0x09C62ad0694e3f1ad8cF8876aaBe56138C586f5F": "2pool",

    "0xC9438d8928486bD9621D326002F4672bF684187A": "ren",
    "0x2b70A5B878665FfDB4A06Ba40a264d6c70f68F4B": "ren",

    "0x210C806F6AE850279f7E298dE749EC4B427d00DD": "geist",
    "0xf82162bB68aD5a168345bb7EFb2faA0EDCCA5177": "geist",
}

export const implementationBasePoolIdDictAvalanche: IDict<string> = {
    "0xA237034249290De2B07988Ac64b96f22c0E76fE0": "aave",
    "0xc50C05Ca1f8C2346664bd0d4a1eb6aC1Da38414f": "aave",

    "0xa27f39E9C21b3376F43266E13Ad5A5d6E9BdB320": "ren",
    "0x505C34ED8dBE96d2D5C7D83158aA844887770970": "ren",
}

export const implementationBasePoolIdDictArbitrum: IDict<string> = {
    "0x09672362833d8f703D5395ef3252D4Bfa51c15ca": "2pool",
    "0xBE175115BF33E12348ff77CcfEE4726866A0Fbd5": "2pool",

    "0x094d12e5b541784701FD8d65F11fc0598FBC6332": "ren",
    "0xF1f85a74AD6c64315F85af52d3d46bF715236ADc": "ren",

    "0x8DEb66a4A40E370355bEe35f12E55Fe9c755d686": "factory-v2-41", // fraxbp
    "0x3edE9b145F82e9e46C03f8A8F67B77aEE847b632": "factory-v2-41", // fraxbp
}

export const implementationBasePoolIdDictOptimism: IDict<string> = {
    "0x78CF256256C8089d68Cde634Cf7cDEFb39286470": "3pool",
    "0xADf698e4d8Df08b3E2c79682891636eF00F6e205": "3pool",

    "0xe8269B33E47761f552E1a3070119560d5fa8bBD6": "factory-v2-16", // fraxusdc
    "0x114C4042B11a2b16F58Fe1BFe847589a122F678a": "factory-v2-16", // fraxusdc
}

export const implementationBasePoolIdDictXDai: IDict<string> = {
    "0x4A5bF7Ab9A8202692051c19B102d3eDD62aaBAE6": "3pool",
    "0x0B4dc7A945695D11FD83e40B2DfC2B896A02395F": "3pool",
}

export const implementationBasePoolIdDictMoonbeam: IDict<string> = {}

export const implementationBasePoolIdDictKava: IDict<string> = {}

export const basePoolIdZapDictEthereum: IDict<{ address: string, ABI: any }> = {
    '3pool': {
        address: "0xA79828DF1850E8a3A3064576f380D90aECDD3359".toLowerCase(),
        ABI: factoryDepositABI,
    },
    fraxusdc: {
        address: "0x08780fb7E580e492c1935bEe4fA5920b94AA95Da".toLowerCase(),
        ABI: fraxusdcMetaZapABI,
    },
    sbtc: {
        address: "0x7abdbaf29929e7f8621b757d2a7c04d78d633834".toLowerCase(),
        ABI: factoryDepositABI,
    },
    ren: {
        address: "0x8Fb3Ec8f2d1Dc089E70CD61f1E49496d443B2124".toLowerCase(),
        ABI: RenMetaZapABI,
    },
}

export const basePoolIdZapDictPolygon: IDict<{ address: string, ABI: any }> = {
    aave: {
        address: "0x5ab5C56B9db92Ba45a0B46a207286cD83C15C939".toLowerCase(),
        ABI: MetaUsdZapPolygonABI,
    },
    ren: {
        address: "0xE2e6DC1708337A6e59f227921db08F21e3394723".toLowerCase(),
        ABI: MetaBtcZapPolygonABI,
    },
}

export const basePoolIdZapDictFantom: IDict<{ address: string, ABI: any }> = {
    '2pool': {
        address: "0x78D51EB71a62c081550EfcC0a9F9Ea94B2Ef081c".toLowerCase(),
        ABI: MetaZapFantomABI,
    },
    ren: {
        address: "0x001E3BA199B4FF4B5B6e97aCD96daFC0E2e4156e".toLowerCase(),
        ABI: MetaZapFantomABI,
    },
    geist: {
        address: "0x247aEB220E87f24c40C9F86b65d6bd5d3c987B55".toLowerCase(),
        ABI: MetaGeistUsdZapFantomABI,
    },
}

export const basePoolIdZapDictAvalanche: IDict<{ address: string, ABI: any }> = {
    aave: {
        address: "0x001E3BA199B4FF4B5B6e97aCD96daFC0E2e4156e".toLowerCase(),
        ABI: MetaUsdZapPolygonABI,
    },
    ren: {
        address: "0xEeB3DDBcc4174e0b3fd1C13aD462b95D11Ef42C3".toLowerCase(),
        ABI: MetaBtcZapPolygonABI,
    },
}

export const basePoolIdZapDictArbitrum: IDict<{ address: string, ABI: any }> = {
    "2pool": {
        address: "0x7544Fe3d184b6B55D6B36c3FCA1157eE0Ba30287".toLowerCase(),
        ABI: MetaZapFantomABI,
    },
    ren: {
        address: "0x803A2B40c5a9BB2B86DD630B274Fa2A9202874C2".toLowerCase(),
        ABI: MetaZapFantomABI,
    },
    "factory-v2-41": {
        address: "0x58AC91f5BE7dC0c35b24B96B19BAc55FBB8E705e".toLowerCase(),
        ABI: MetaZapFantomABI,
    },
}

export const basePoolIdZapDictOptimism: IDict<{ address: string, ABI: any }> = {
    "3pool": {
        address: "0x167e42a1c7ab4be03764a2222aac57f5f6754411".toLowerCase(),
        ABI: factoryDepositABI,
    },
    "factory-v2-16": {
        address: "0x4244eB811D6e0Ef302326675207A95113dB4E1F8".toLowerCase(),
        ABI: MetaZapFantomABI,
    },
}

export const basePoolIdZapDictXDai: IDict<{ address: string, ABI: any }> = {
    "3pool": {
        address: "0x87C067fAc25f123554a0E76596BF28cFa37fD5E9".toLowerCase(),
        ABI: factoryDepositABI,
    },
}

export const basePoolIdZapDictMoonbeam: IDict<{ address: string, ABI: any }> = {}

export const basePoolIdZapDictKava: IDict<{ address: string, ABI: any }> = {}

export const FACTORY_CONSTANTS: { [index: number]: { implementationABIDict: IDict<any>, implementationBasePoolIdDict: IDict<string>, basePoolIdZapDict: IDict<{ address: string, ABI: any }> } } = {
    1: {  // ETH
        implementationABIDict: implementationABIDictEthereum,
        implementationBasePoolIdDict: implementationBasePoolIdDictEthereum,
        basePoolIdZapDict: basePoolIdZapDictEthereum,
    },
    10: {  // OPTIMISM
        implementationABIDict: implementationABIDictOptimism,
        implementationBasePoolIdDict: implementationBasePoolIdDictOptimism,
        basePoolIdZapDict: basePoolIdZapDictOptimism,
    },
    100: {  // XDAI
        implementationABIDict: implementationABIDictXDai,
        implementationBasePoolIdDict: implementationBasePoolIdDictXDai,
        basePoolIdZapDict: basePoolIdZapDictXDai,
    },
    137: {  // POLYGON
        implementationABIDict: implementationABIDictPolygon,
        implementationBasePoolIdDict: implementationBasePoolIdDictPolygon,
        basePoolIdZapDict: basePoolIdZapDictPolygon,
    },
    250: {  // FANTOM
        implementationABIDict: implementationABIDictFantom,
        implementationBasePoolIdDict: implementationBasePoolIdDictFantom,
        basePoolIdZapDict: basePoolIdZapDictFantom,
    },
    1284: {  // MOONBEAM
        implementationABIDict: implementationABIDictMoonbeam,
        implementationBasePoolIdDict: implementationBasePoolIdDictMoonbeam,
        basePoolIdZapDict: basePoolIdZapDictMoonbeam,
    },
    2222: {  // KAVA
        implementationABIDict: implementationABIDictKava,
        implementationBasePoolIdDict: implementationBasePoolIdDictKava,
        basePoolIdZapDict: basePoolIdZapDictKava,
    },
    43114: {  // AVALANCHE
        implementationABIDict: implementationABIDictAvalanche,
        implementationBasePoolIdDict: implementationBasePoolIdDictAvalanche,
        basePoolIdZapDict: basePoolIdZapDictAvalanche,
    },
    42161: {  // ARBITRUM
        implementationABIDict: implementationABIDictArbitrum,
        implementationBasePoolIdDict: implementationBasePoolIdDictArbitrum,
        basePoolIdZapDict: basePoolIdZapDictArbitrum,
    },
}
