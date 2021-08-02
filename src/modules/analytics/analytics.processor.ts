import BigNumber from 'bignumber.js';
import { SwapAnalytics } from 'src/services/transactions/models/swap.analytics.dto';
import {
    FactoryAnalyticsModel,
    PairAnalyticsModel,
    TokenAnalyticsModel,
} from './models/analytics.model';

export function processFactoryAnalytics(
    swapAnalytics: SwapAnalytics[],
): FactoryAnalyticsModel {
    let totalVolumesUSD = new BigNumber(0);
    let totalFeesUSD = new BigNumber(0);

    for (const swap of swapAnalytics) {
        totalVolumesUSD = totalVolumesUSD.plus(swap.volumeUSD);
        totalFeesUSD = totalFeesUSD.plus(swap.feesUSD);
    }

    return new FactoryAnalyticsModel({
        totalVolumesUSD: totalVolumesUSD.toFixed(),
        totalFeesUSD: totalFeesUSD.toFixed(),
    });
}

export function processPairsAnalytics(
    swapAnalytics: SwapAnalytics[],
): PairAnalyticsModel[] {
    const pairsAnalytics: PairAnalyticsModel[] = [];

    for (const swap of swapAnalytics) {
        const pairIndex = pairsAnalytics.findIndex(
            pair => pair.pairAddress === swap.pairAddress,
        );
        if (pairIndex > 0) {
            pairsAnalytics[pairIndex].volumesUSD = new BigNumber(
                pairsAnalytics[pairIndex].volumesUSD,
            )
                .plus(swap.volumeUSD)
                .toFixed();
            pairsAnalytics[pairIndex].feesUSD = new BigNumber(
                pairsAnalytics[pairIndex].feesUSD,
            )
                .plus(swap.feesUSD)
                .toFixed();
        } else {
            pairsAnalytics.push(
                new PairAnalyticsModel({
                    pairAddress: swap.pairAddress,
                    volumesUSD: swap.volumeUSD.toFixed(),
                    feesUSD: swap.feesUSD.toFixed(),
                }),
            );
        }
    }

    return pairsAnalytics;
}

export function processTokensAnalytics(
    swapAnalytics: SwapAnalytics[],
): TokenAnalyticsModel[] {
    const tokensAnalytics: TokenAnalyticsModel[] = [];

    for (const swap of swapAnalytics) {
        const tokenInIndex = tokensAnalytics.findIndex(
            token => token.tokenID === swap.tokenInID,
        );
        if (tokenInIndex > 0) {
            tokensAnalytics[tokenInIndex].volume = new BigNumber(
                tokensAnalytics[tokenInIndex].volume,
            )
                .plus(swap.tokenInVolume)
                .toFixed();
            tokensAnalytics[tokenInIndex].volumeUSD = new BigNumber(
                tokensAnalytics[tokenInIndex].volumeUSD,
            )
                .plus(swap.tokenInVolumeUSD)
                .toFixed();
            tokensAnalytics[tokenInIndex].feesUSD = new BigNumber(
                tokensAnalytics[tokenInIndex].feesUSD,
            )
                .plus(swap.feesUSD)
                .toFixed();
        } else {
            tokensAnalytics.push(
                new TokenAnalyticsModel({
                    tokenID: swap.tokenInID,
                    feesUSD: swap.feesUSD.toFixed(),
                    volume: swap.tokenInVolume.toFixed(),
                    volumeUSD: swap.tokenInVolumeUSD.toFixed(),
                }),
            );
        }

        const tokenOutIndex = tokensAnalytics.findIndex(
            token => token.tokenID === swap.tokenOutID,
        );
        if (tokenOutIndex > 0) {
            tokensAnalytics[tokenOutIndex].volume = new BigNumber(
                tokensAnalytics[tokenOutIndex].volume,
            )
                .plus(swap.tokenOutVolume)
                .toFixed();
            tokensAnalytics[tokenOutIndex].volumeUSD = new BigNumber(
                tokensAnalytics[tokenOutIndex].volumeUSD,
            )
                .plus(swap.tokenOutVolumeUSD)
                .toFixed();
        } else {
            tokensAnalytics.push(
                new TokenAnalyticsModel({
                    tokenID: swap.tokenOutID,
                    feesUSD: new BigNumber(0).toFixed(),
                    volume: swap.tokenOutVolume.toFixed(),
                    volumeUSD: swap.tokenOutVolumeUSD.toFixed(),
                }),
            );
        }
    }
    return tokensAnalytics;
}
