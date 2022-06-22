import { Contract } from "ethers";
import { Contract as MulticallContract } from "ethcall";
import { ICurve } from "../interfaces";
import factoryDepositABI from "../constants/abis/factoryPools/deposit.json";
import MetaUsdZapPolygonABI from "../constants/abis/factory-v2/DepositZapMetaUsdPolygon.json";
import MetaBtcZapPolygonABI from "../constants/abis/factory-v2/DepositZapMetaBtcPolygon.json";

export function setFactoryZapContracts(this: ICurve): void {
    if (this.chainId === 1) {
        const metaSBtcZapAddress = "0x7abdbaf29929e7f8621b757d2a7c04d78d633834".toLowerCase();
        this.contracts[metaSBtcZapAddress] = {
            contract: new Contract(metaSBtcZapAddress, factoryDepositABI, this.signer || this.provider),
            multicallContract: new MulticallContract(metaSBtcZapAddress, factoryDepositABI),
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
    }
}