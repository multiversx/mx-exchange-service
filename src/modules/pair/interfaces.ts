import { EsdtToken } from "../tokens/models/esdtToken.model";
import { PairInfoModel } from "./models/pair-info.model";
import { FeeDestination, LockedTokensInfo } from "./models/pair.model";
import { EsdtTokenPayment } from "../../models/esdtTokenPayment.model";

export interface IPairGetterService {
    getFirstTokenID(pairAddress: string): Promise<string>;
    getSecondTokenID(pairAddress: string): Promise<string>;
    getLpTokenID(pairAddress: string): Promise<string>;
    getFirstToken(pairAddress: string): Promise<EsdtToken>;
    getSecondToken(pairAddress: string): Promise<EsdtToken>;
    getLpToken(pairAddress: string): Promise<EsdtToken>;
    getTokenPrice(pairAddress: string, tokenID: string): Promise<string>;
    getFirstTokenPrice(pairAddress: string): Promise<string>;
    getSecondTokenPrice(pairAddress: string): Promise<string>;
    getTokenPriceUSD(tokenID: string): Promise<string>;
    getFirstTokenPriceUSD(pairAddress: string): Promise<string>;
    getSecondTokenPriceUSD(pairAddress: string): Promise<string>;
    getLpTokenPriceUSD(pairAddress: string): Promise<string>;
    getFirstTokenReserve(pairAddress: string): Promise<string>;
    getSecondTokenReserve(pairAddress: string): Promise<string>;
    getTotalSupply(pairAddress: string): Promise<string>;
    getFirstTokenLockedValueUSD(pairAddress: string): Promise<string>;
    getSecondTokenLockedValueUSD(pairAddress: string): Promise<string>;
    getLockedValueUSD(pairAddress: string): Promise<string>;
    getFirstTokenVolume(
        pairAddress: string,
        time: string,
    ): Promise<string>;
    getSecondTokenVolume(
        pairAddress: string,
        time: string,
    ): Promise<string>;
    getVolumeUSD(pairAddress: string, time: string): Promise<string>;
    getFeesUSD(pairAddress: string, time: string): Promise<string>;
    getFeesAPR(pairAddress: string): Promise<string>;
    getPairInfoMetadata(pairAddress: string): Promise<PairInfoModel>;
    getTotalFeePercent(pairAddress: string): Promise<number>;
    getSpecialFeePercent(pairAddress: string): Promise<number>;
    getTrustedSwapPairs(pairAddress: string): Promise<string[]>;
    getInitialLiquidityAdder(pairAddress: string): Promise<string>;
    getState(pairAddress: string): Promise<string>;
    getFeeState(pairAddress: string): Promise<boolean>;
    getType(pairAddress: string): Promise<string>;
    getLockingScAddress(
        pairAddress: string,
    ): Promise<string | undefined>;
    getUnlockEpoch(pairAddress: string): Promise<number | undefined>;
    getLockingDeadlineEpoch(
        pairAddress: string,
    ): Promise<number | undefined>;
    getLockedTokensInfo(pairAddress: string): Promise<LockedTokensInfo>;
    getFeeDestinations(pairAddress: string): Promise<FeeDestination[]>;
    getWhitelistedManagedAddresses(
        pairAddress: string,
    ): Promise<string[]>;
    getRouterManagedAddress(address: string): Promise<string>;
    getRouterOwnerManagedAddress(address: string): Promise<string>;
    getExternSwapGasLimit(pairAddress: string): Promise<number>;
    getTransferExecGasLimit(pairAddress: string): Promise<number>;
    updateAndGetSafePrice(
        pairAddress: string,
        esdtTokenPayment: EsdtTokenPayment,
    ): Promise<EsdtTokenPayment>;
    getNumSwapsByAddress(
        pairAddress: string,
        address: string,
    ): Promise<number>;
    getNumAddsByAddress(
        pairAddress: string,
        address: string,
    ): Promise<string>;
}
