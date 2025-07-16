import { MultiPairSwapEvent, SwapEvent } from '@multiversx/sdk-exchange';

export type ExtendedSwapEvent = (SwapEvent | MultiPairSwapEvent) & {
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

export type ContestParticipantTokenStats = {
    tokenID: string;
    buyVolumeUSD: number;
    buyAmount: string;
    sellVolumeUSD: number;
    sellAmount: string;
    buyCount?: number;
    sellCount?: number;
};

export type RawSwapStat = {
    tokenIn: string;
    tokenInAmount: string;
    tokenOut: string;
    tokenOutAmount: string;
    totalVolumeUSD: number;
    tradeCount?: number;
};
