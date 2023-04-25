import { PhaseModel } from '../models/price.discovery.model';

export interface IPriceDiscoveryAbiService {
    launchedTokenID(priceDiscoveryAddress: string): Promise<string>;
    acceptedTokenID(priceDiscoveryAddress: string): Promise<string>;
    redeemTokenID(priceDiscoveryAddress: string): Promise<string>;
    launchedTokenAmount(priceDiscoveryAddress: string): Promise<string>;
    acceptedTokenAmount(priceDiscoveryAddress: string): Promise<string>;
    launchedTokenRedeemAmount(priceDiscoveryAddress: string): Promise<string>;
    acceptedTokenRedeemAmount(priceDiscoveryAddress: string): Promise<string>;
    startBlock(priceDiscoveryAddress: string): Promise<number>;
    endBlock(priceDiscoveryAddress: string): Promise<number>;
    currentPhase(priceDiscoveryAddress: string): Promise<PhaseModel>;
    minLaunchedTokenPrice(priceDiscoveryAddress: string): Promise<string>;
    noLimitPhaseDurationBlocks(priceDiscoveryAddress: string): Promise<number>;
    linearPenaltyPhaseDurationBlocks(
        priceDiscoveryAddress: string,
    ): Promise<number>;
    fixedPenaltyPhaseDurationBlocks(
        priceDiscoveryAddress: string,
    ): Promise<number>;
    lockingScAddress(priceDiscoveryAddress: string): Promise<string>;
    unlockEpoch(priceDiscoveryAddress: string): Promise<number>;
    penaltyMinPercentage(priceDiscoveryAddress: string): Promise<number>;
    penaltyMaxPercentage(priceDiscoveryAddress: string): Promise<number>;
    fixedPenaltyPercentage(priceDiscoveryAddress: string): Promise<number>;
}

export interface IPriceDiscoveryComputeService {
    launchedTokenPrice(priceDiscoveryAddress: string): Promise<string>;
    acceptedTokenPrice(priceDiscoveryAddress: string): Promise<string>;
    launchedTokenPriceUSD(priceDiscoveryAddress: string): Promise<string>;
    acceptedTokenPriceUSD(priceDiscoveryAddress: string): Promise<string>;
}
