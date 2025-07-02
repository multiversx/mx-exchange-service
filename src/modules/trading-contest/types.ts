import { MultiPairSwapEvent, SwapEvent } from '@multiversx/sdk-exchange';

export type ExtendedSwapEvent = (SwapEvent | MultiPairSwapEvent) & {
    txHash: string;
    originalTxHash?: string;
};

export type SwapEventPairData = {
    volumeUSD: string;
    feesUSD: string;
};
