import { MultiPairSwapEvent, SwapEvent } from '@multiversx/sdk-exchange';

export type ExtendedSwapEvent = (SwapEvent | MultiPairSwapEvent) & {
    txHash: string;
    originalTxHash?: string;
};

export type SwapEventPairData = {
    volumeUSD: string;
    feesUSD: string;
};

export type ContestSwapsStats = {
    totalVolumeUSD: number;
    totalFeesUSD?: number;
    tradeCount?: number;
};

export type ContestParticipantStats = ContestSwapsStats & {
    rank: number;
};

type LeaderBoardEntry = ContestParticipantStats & {
    sender: { address: string };
};

export type LeaderBoardResponse = {
    results: LeaderBoardEntry[];
    totalCount: number;
    currentOffset: number;
};

export type ContestTokenStats = {
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

export type ContestSwapsExtendedStats = ContestSwapsStats & {
    minTradeUSD: number;
    maxTradeUSD: number;
    averageTradeUSD?: number;
};

export type ContestStatsBySwapType = ContestSwapsExtendedStats & {
    swapType: 'Fixed Input' | 'Fixed Output' | 'Multi Pair' | 'Smart Swap';
};

export type ContestDailyStats = ContestSwapsExtendedStats & {
    distinctParticipants: number;
    date: string;
};

export type ContestStats = {
    bySwapType: ContestStatsBySwapType[];
    daily: ContestDailyStats[];
    summary: ContestSwapsExtendedStats & {
        distinctParticipants: number;
    };
};
