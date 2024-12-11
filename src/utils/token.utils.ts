import BigNumber from 'bignumber.js';
import { constantsConfig } from 'src/config';

export function calculateTokenPriceChange24h(
    currentPrice: string,
    previous24hPrice: string,
): number {
    const currentPriceBN = new BigNumber(currentPrice);
    const previous24hPriceBN = new BigNumber(previous24hPrice);

    if (previous24hPriceBN.isZero() || previous24hPrice === undefined) {
        return 0;
    }

    return currentPriceBN.dividedBy(previous24hPriceBN).toNumber();
}

export function calculateTokenPriceChange7d(
    currentPrice: string,
    previous7dPrice: string,
): number {
    const currentPriceBN = new BigNumber(currentPrice);
    const previous7dPriceBN = new BigNumber(previous7dPrice);

    if (previous7dPriceBN.isZero()) {
        return 0;
    }

    return currentPriceBN.dividedBy(previous7dPriceBN).toNumber();
}

export function calculateTokenVolumeUSDChange24h(
    currentVolume: string,
    previous24hVolume: string,
): number {
    const currentVolumeBN = new BigNumber(currentVolume);
    const previous24hVolumeBN = new BigNumber(previous24hVolume);

    if (currentVolumeBN.isZero()) {
        return 0;
    }

    const maxPrevious24hVolume = BigNumber.maximum(
        previous24hVolumeBN,
        constantsConfig.trendingScore.MIN_24H_VOLUME,
    );

    return currentVolumeBN.dividedBy(maxPrevious24hVolume).toNumber();
}

export function calculateTokenTradeChange24h(
    currentSwaps: number,
    previous24hSwaps: number,
): number {
    const currentSwapsBN = new BigNumber(currentSwaps);
    const previous24hSwapsBN = new BigNumber(previous24hSwaps);

    const maxPrevious24hTradeCount = BigNumber.maximum(
        previous24hSwapsBN,
        constantsConfig.trendingScore.MIN_24H_TRADE_COUNT,
    );

    return currentSwapsBN.dividedBy(maxPrevious24hTradeCount).toNumber();
}
