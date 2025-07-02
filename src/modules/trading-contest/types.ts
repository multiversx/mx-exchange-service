import { SwapEvent } from '@multiversx/sdk-exchange';

export type ExtendedSwapEvent = SwapEvent & {
    txHash: string;
    originalTxHash?: string;
};

export type SwapEventPairData = {
    volumeUSD: string;
    feesUSD: string;
};
