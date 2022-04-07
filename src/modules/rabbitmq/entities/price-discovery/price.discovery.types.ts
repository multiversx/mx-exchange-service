import { GenericTokenType } from 'src/models/genericToken.model';

export type PriceDiscoveryTopicsType = {
    eventName: string;
    caller: string;
    block: number;
    epoch: number;
    timestamp: number;
};

export type PhaseType = {
    name: string;
    penaltyPercent: number;
};

export type PriceDiscoveryEventType = {
    address: string;
    identifier: string;
};

export type ExtraRewardsEventType = PriceDiscoveryEventType & {
    rewardsToken: GenericTokenType;
};

export type DepositEventType = PriceDiscoveryEventType & {
    tokenIn: GenericTokenType;
    redeemToken: GenericTokenType;
    launchedTokenAmount: string;
    acceptedTokenAmount: string;
    launchedTokenPrice: string;
    currentPhase: PhaseType;
};

export type RedeemEventType = PriceDiscoveryEventType & {
    redeemToken: GenericTokenType;
    lpToken: GenericTokenType;
    remainingLpTokens: string;
    totalLpTokensReceived: string;
    rewardsToken: GenericTokenType;
};

export type InitialLiquidityEventType = PriceDiscoveryEventType & {
    lpToken: GenericTokenType;
};
