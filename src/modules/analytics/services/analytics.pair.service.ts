import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import {
    CandleDataModel,
    HistoricDataModel,
    PairDayDataModel,
} from '../models/analytics.model';
import { AnalyticsAWSGetterService } from './analytics.aws.getter.service';
import { PairAbiService } from 'src/modules/pair/services/pair.abi.service';
import { RouterAbiService } from 'src/modules/router/services/router.abi.service';
import { AnalyticsQueryService } from 'src/services/analytics/services/analytics.query.service';
import { PriceCandlesResolutions } from '../models/query.args';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { Constants } from '@multiversx/sdk-nestjs-common';

@Injectable()
export class AnalyticsPairService {
    constructor(
        private readonly pairAbi: PairAbiService,
        private readonly routerAbi: RouterAbiService,
        private readonly analyticsAWSGetter: AnalyticsAWSGetterService,
        private readonly analyticsQueryService: AnalyticsQueryService,
    ) {}

    async getClosingLockedValueUSD(
        pairAddress: string,
    ): Promise<HistoricDataModel[]> {
        return this.analyticsAWSGetter.getLatestCompleteValues(
            pairAddress,
            'lockedValueUSD',
        );
    }

    async getDailyVolumesUSD(
        pairAddress: string,
    ): Promise<HistoricDataModel[]> {
        return this.analyticsAWSGetter.getSumCompleteValues(
            pairAddress,
            'volumeUSD',
        );
    }

    async getDailyFeesUSD(pairAddress: string): Promise<HistoricDataModel[]> {
        return this.analyticsAWSGetter.getSumCompleteValues(
            pairAddress,
            'feesUSD',
        );
    }

    async getClosingPriceUSD(tokenID: string): Promise<HistoricDataModel[]> {
        return this.analyticsAWSGetter.getLatestCompleteValues(
            tokenID,
            'priceUSD',
        );
    }

    async getPairDayDatas(pairAddress: string): Promise<PairDayDataModel[]> {
        const [firstTokenID, secondTokenID] = await Promise.all([
            this.pairAbi.firstTokenID(pairAddress),
            this.pairAbi.secondTokenID(pairAddress),
        ]);
        const [
            lockedValuesUSD,
            volumesUSD,
            feesUSD,
            firstTokenPricesUSD,
            secondTokenPricesUSD,
        ] = await Promise.all([
            this.getClosingLockedValueUSD(pairAddress),
            this.getDailyVolumesUSD(pairAddress),
            this.getDailyFeesUSD(pairAddress),
            this.getClosingPriceUSD(firstTokenID),
            this.getClosingPriceUSD(secondTokenID),
        ]);
        const pairDayDatas: PairDayDataModel[] = [];
        for (const lockedValueUSD of lockedValuesUSD) {
            const volumeUSD = volumesUSD.find((v) => {
                return v.timestamp === lockedValueUSD.timestamp;
            });
            const feeUSD = feesUSD.find(
                (fee) => fee.timestamp === lockedValueUSD.timestamp,
            );
            const firstTokenPriceUSD = firstTokenPricesUSD.find(
                (price) => price.timestamp === lockedValueUSD.timestamp,
            );
            const secondTokenPriceUSD = secondTokenPricesUSD.find(
                (price) => price.timestamp === lockedValueUSD.timestamp,
            );

            pairDayDatas.push(
                new PairDayDataModel({
                    timestamp: lockedValueUSD.timestamp,
                    address: pairAddress,
                    lockedValueUSD: new BigNumber(
                        lockedValueUSD.value,
                    ).toFixed(),
                    firstTokenPriceUSD:
                        firstTokenPriceUSD !== undefined
                            ? new BigNumber(firstTokenPriceUSD.value).toFixed()
                            : '0',
                    secondTokenPriceUSD:
                        secondTokenPriceUSD !== undefined
                            ? new BigNumber(secondTokenPriceUSD.value).toFixed()
                            : '0',
                    volumeUSD24h:
                        volumeUSD !== undefined
                            ? new BigNumber(volumeUSD.value).toFixed()
                            : '0',
                    feesUSD24h:
                        feeUSD !== undefined
                            ? new BigNumber(feeUSD.value).toFixed()
                            : '0',
                }),
            );
        }
        return pairDayDatas;
    }

    async getPairsDayDatas(): Promise<PairDayDataModel[]> {
        const pairAddresses = await this.routerAbi.pairsAddress();
        const pairsDayDatas: PairDayDataModel[] = [];

        await Promise.all(
            pairAddresses.map(async (pairAddress) => {
                const pairDayDatas = await this.getPairDayDatas(pairAddress);
                pairsDayDatas.push(...pairDayDatas);
            }),
        );

        return pairsDayDatas;
    }

    @GetOrSetCache({
        baseKey: 'analytics',
        remoteTtl: Constants.oneHour() * 4,
        localTtl: Constants.oneHour() * 3,
    })
    async tokenMiniChartPriceCandles(
        series: string,
        start: string,
        end: string,
    ): Promise<CandleDataModel[]> {
        return await this.analyticsQueryService.getTokenMiniChartPriceCandles({
            series,
            start,
            end,
        });
    }
}
