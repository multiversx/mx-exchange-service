import { SwapEvent } from '@multiversx/sdk-exchange';

export type ExtendedSwapEvent = SwapEvent & {
    txHash: string;
    originalTxHash?: string;
};

export type SwapEventPairData = {
    volumeUSD: string;
    feesUSD: string;
};

export type LeaderBoardEntry = {
    sender: { address: string };
    totalVolumeUSD: number;
    tradeCount: number;
    totalFeesUSD: number;
    rank: number;
};

export type ContestParticipantStats = {
    totalVolumeUSD: number;
    tradeCount: number;
    totalFeesUSD: number;
    rank: number;
};
