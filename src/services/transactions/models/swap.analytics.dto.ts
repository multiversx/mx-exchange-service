import BigNumber from 'bignumber.js';

export interface SwapAnalytics {
    pairAddress: string;
    volumeUSD: BigNumber;
    feesUSD: BigNumber;
    tokenInID: string;
    tokenInVolume: BigNumber;
    tokenInVolumeUSD: BigNumber;
    tokenOutID: string;
    tokenOutVolume: BigNumber;
    tokenOutVolumeUSD: BigNumber;
}
