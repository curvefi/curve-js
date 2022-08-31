import { Contract } from "ethers";
import { Contract as MulticallContract } from "ethcall";
import { ICurve } from "../interfaces";
import factoryDepositABI from "../constants/abis/factoryPools/deposit.json";
import fraxusdcMetaZapABI from "../constants/abis/fraxusdc/metaZap.json";
import MetaUsdZapPolygonABI from "../constants/abis/factory-v2/DepositZapMetaUsdPolygon.json";
import MetaBtcZapPolygonABI from "../constants/abis/factory-v2/DepositZapMetaBtcPolygon.json";
import MetaZapFantomABI from "../constants/abis/factory-v2/DepositZapFantom.json";
import MetaGeistUsdZapFantomABI from "../constants/abis/factory-v2/DepositZapMetaUsd2Fantom.json";
import atricrypto3ZapABI from "../constants/abis/atricrypto3/base_pool_zap.json";

export function setFactoryZapContracts(this: ICurve): void {
    if (this.chainId === 1) {
        const fraxusdcMetaZapAddress = "0x08780fb7E580e492c1935bEe4fA5920b94AA95Da".toLowerCase();
        this.contracts[fraxusdcMetaZapAddress] = {
            contract: new Contract(fraxusdcMetaZapAddress, fraxusdcMetaZapABI, this.signer || this.provider),
            multicallContract: new MulticallContract(fraxusdcMetaZapAddress, fraxusdcMetaZapABI),
        };
        const metaSBtcZapAddress = "0x7abdbaf29929e7f8621b757d2a7c04d78d633834".toLowerCase();
        this.contracts[metaSBtcZapAddress] = {
            contract: new Contract(metaSBtcZapAddress, factoryDepositABI, this.signer || this.provider),
            multicallContract: new MulticallContract(metaSBtcZapAddress, factoryDepositABI),
        };
    } else if (this.chainId === 10) {
        const metaUsdZapAddress = "0x167e42a1c7ab4be03764a2222aac57f5f6754411".toLowerCase();
        this.contracts[metaUsdZapAddress] = {
            contract: new Contract(metaUsdZapAddress, factoryDepositABI, this.signer || this.provider),
            multicallContract: new MulticallContract(metaUsdZapAddress, factoryDepositABI),
        };
        const metaUsd2ZapAddress = "0x4244eB811D6e0Ef302326675207A95113dB4E1F8".toLowerCase();
        this.contracts[metaUsd2ZapAddress] = {
            contract: new Contract(metaUsd2ZapAddress, MetaZapFantomABI, this.signer || this.provider),
            multicallContract: new MulticallContract(metaUsd2ZapAddress, MetaZapFantomABI),
        };
    } else if (this.chainId === 100) {
        const metaUsdZapAddress = "0x87C067fAc25f123554a0E76596BF28cFa37fD5E9".toLowerCase();
        this.contracts[metaUsdZapAddress] = {
            contract: new Contract(metaUsdZapAddress, factoryDepositABI, this.signer || this.provider),
            multicallContract: new MulticallContract(metaUsdZapAddress, factoryDepositABI),
        };
    } else if (this.chainId === 137) {
        const metaUsdZapAddress = "0x5ab5C56B9db92Ba45a0B46a207286cD83C15C939".toLowerCase();
        this.contracts[metaUsdZapAddress] = {
            contract: new Contract(metaUsdZapAddress, MetaUsdZapPolygonABI, this.signer || this.provider),
            multicallContract: new MulticallContract(metaUsdZapAddress, MetaUsdZapPolygonABI),
        };
        const metaBtcZapAddress = "0xE2e6DC1708337A6e59f227921db08F21e3394723".toLowerCase();
        this.contracts[metaBtcZapAddress] = {
            contract: new Contract(metaBtcZapAddress, MetaBtcZapPolygonABI, this.signer || this.provider),
            multicallContract: new MulticallContract(metaBtcZapAddress, MetaBtcZapPolygonABI),
        };
    } else if (this.chainId === 250) {
        const metaUsdZapAddress = "0x78D51EB71a62c081550EfcC0a9F9Ea94B2Ef081c".toLowerCase();
        this.contracts[metaUsdZapAddress] = {
            contract: new Contract(metaUsdZapAddress, MetaZapFantomABI, this.signer || this.provider),
            multicallContract: new MulticallContract(metaUsdZapAddress, MetaZapFantomABI),
        };
        const metaRenBtcZapAddress = "0x001E3BA199B4FF4B5B6e97aCD96daFC0E2e4156e".toLowerCase();
        this.contracts[metaRenBtcZapAddress] = {
            contract: new Contract(metaRenBtcZapAddress, MetaZapFantomABI, this.signer || this.provider),
            multicallContract: new MulticallContract(metaRenBtcZapAddress, MetaZapFantomABI),
        };
        const metaGeistUsdZapAddress = "0x247aEB220E87f24c40C9F86b65d6bd5d3c987B55".toLowerCase();
        this.contracts[metaGeistUsdZapAddress] = {
            contract: new Contract(metaGeistUsdZapAddress, MetaGeistUsdZapFantomABI, this.signer || this.provider),
            multicallContract: new MulticallContract(metaGeistUsdZapAddress, MetaGeistUsdZapFantomABI),
        };
    } else if (this.chainId === 43114) {
        const metaUsdZapAddress = "0x001E3BA199B4FF4B5B6e97aCD96daFC0E2e4156e".toLowerCase();
        this.contracts[metaUsdZapAddress] = {
            contract: new Contract(metaUsdZapAddress, MetaUsdZapPolygonABI, this.signer || this.provider),
            multicallContract: new MulticallContract(metaUsdZapAddress, MetaUsdZapPolygonABI),
        };
        const metaBtcZapAddress = "0xEeB3DDBcc4174e0b3fd1C13aD462b95D11Ef42C3".toLowerCase();
        this.contracts[metaBtcZapAddress] = {
            contract: new Contract(metaBtcZapAddress, MetaBtcZapPolygonABI, this.signer || this.provider),
            multicallContract: new MulticallContract(metaBtcZapAddress, MetaBtcZapPolygonABI),
        };
    } else if (this.chainId === 42161) {
        const metaUsdZapAddress = "0x7544Fe3d184b6B55D6B36c3FCA1157eE0Ba30287".toLowerCase();
        this.contracts[metaUsdZapAddress] = {
            contract: new Contract(metaUsdZapAddress, MetaZapFantomABI, this.signer || this.provider),
            multicallContract: new MulticallContract(metaUsdZapAddress, MetaZapFantomABI),
        };
        const metaBtcZapAddress = "0x803A2B40c5a9BB2B86DD630B274Fa2A9202874C2".toLowerCase();
        this.contracts[metaBtcZapAddress] = {
            contract: new Contract(metaBtcZapAddress, MetaZapFantomABI, this.signer || this.provider),
            multicallContract: new MulticallContract(metaBtcZapAddress, MetaZapFantomABI),
        };
        const metaUsd2ZapAddress = "0x58AC91f5BE7dC0c35b24B96B19BAc55FBB8E705e".toLowerCase();
        this.contracts[metaUsd2ZapAddress] = {
            contract: new Contract(metaUsd2ZapAddress, MetaZapFantomABI, this.signer || this.provider),
            multicallContract: new MulticallContract(metaUsd2ZapAddress, MetaZapFantomABI),
        };
    }
}

export function setCryptoFactoryZapContracts(this: ICurve): void {
    if (this.chainId === 137) {
        const atricrypto3ZapAddress = "0x3d8EADb739D1Ef95dd53D718e4810721837c69c1".toLowerCase();
        this.contracts[atricrypto3ZapAddress] = {
            contract: new Contract(atricrypto3ZapAddress, atricrypto3ZapABI, this.signer || this.provider),
            multicallContract: new MulticallContract(atricrypto3ZapAddress, atricrypto3ZapABI),
        };
    }
}
