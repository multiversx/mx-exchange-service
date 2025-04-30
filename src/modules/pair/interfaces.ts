import { PairInfoModel } from './models/pair-info.model';
import { FeeDestination } from './models/pair.model';
import { EsdtTokenPayment } from '../../models/esdtTokenPayment.model';

export interface IPairAbiService {
    firstTokenID(pairAddress: string): Promise<string>;
    secondTokenID(pairAddress: string): Promise<string>;

    lpTokenID(pairAddress: string): Promise<string>;
    tokenReserve(pairAddress: string, tokenID: string): Promise<string>;
    firstTokenReserve(pairAddress: string): Promise<string>;
    secondTokenReserve(pairAddress: string): Promise<string>;
    totalSupply(pairAddress: string): Promise<string>;
    pairInfoMetadata(pairAddress: string): Promise<PairInfoModel>;
    totalFeePercent(pairAddress: string): Promise<number>;
    specialFeePercent(pairAddress: string): Promise<number>;
    trustedSwapPairs(pairAddress: string): Promise<string[]>;
    initialLiquidityAdder(pairAddress: string): Promise<string>;
    state(pairAddress: string): Promise<string>;
    feeState(pairAddress: string): Promise<boolean>;
    lockingScAddress(pairAddress: string): Promise<string | undefined>;
    unlockEpoch(pairAddress: string): Promise<number | undefined>;
    lockingDeadlineEpoch(pairAddress: string): Promise<number | undefined>;
    feeDestinations(pairAddress: string): Promise<FeeDestination[]>;
    whitelistedAddresses(pairAddress: string): Promise<string[]>;
    routerAddress(pairAddress: string): Promise<string>;
    safePrice(
        pairAddress: string,
        esdtTokenPayment: EsdtTokenPayment,
    ): Promise<EsdtTokenPayment>;
}

export interface IPairComputeService {
    getTokenPrice(pairAddress: string, tokenID: string): Promise<string>;
    firstTokenPrice(pairAddress: string): Promise<string>;
    secondTokenPrice(pairAddress: string): Promise<string>;
    lpTokenPriceUSD(pairAddress: string): Promise<string>;
    tokenPriceUSD(tokenID: string): Promise<string>;
    firstTokenPriceUSD(pairAddress: string): Promise<string>;
    secondTokenPriceUSD(pairAddress: string): Promise<string>;
    firstTokenLockedValueUSD(pairAddress: string): Promise<string>;
    secondTokenLockedValueUSD(pairAddress: string): Promise<string>;
    lockedValueUSD(pairAddress: string): Promise<string>;
    firstTokenVolume(pairAddress: string): Promise<string>;
    secondTokenVolume(pairAddress: string): Promise<string>;
    volumeUSD(pairAddress: string): Promise<string>;
    feesUSD(pairAddress: string, time: string): Promise<string>;
    feesAPR(pairAddress: string): Promise<string>;
    type(pairAddress: string): Promise<string>;
}
