import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { ContextService } from 'src/services/context/context.service';
import { HistoricDataModel, PairDayDataModel } from '../models/analytics.model';
import { AnalyticsAWSGetterService } from './analytics.service';

@Injectable()
export class AnalyticsPairService {
    constructor(
        private readonly pairGetterService: PairGetterService,
        private readonly analyticsService: AnalyticsAWSGetterService,
        private readonly context: ContextService,
    ) {}

    async getClosingLockedValueUSD(
        pairAddress: string,
    ): Promise<HistoricDataModel[]> {
        return await this.analyticsService.getLatestCompleteValues(
            pairAddress,
            'lockedValueUSD',
        );
    }

    async getDailyVolumesUSD(
        pairAddress: string,
    ): Promise<HistoricDataModel[]> {
        return await this.analyticsService.getSumCompleteValues(
            pairAddress,
            'volumeUSD',
        );
    }

    async getTotalVolumeUSD(pairAddress: string): Promise<string> {
        const dailyVolumes: HistoricDataModel[] = await this.getDailyVolumesUSD(
            pairAddress,
        );
        console.log(dailyVolumes);
        let totalVolume: BigNumber = new BigNumber(0);
        for (const dailyVolume of dailyVolumes) {
            totalVolume = totalVolume.plus(dailyVolume.value);
        }
        return totalVolume.toString();
    }

    async getTotalVolumeForAllPairsUSD(): Promise<string> {
        const pairAddresses: string[] = await this.context.getAllPairsAddress();

        console.log(pairAddresses.length);

        let promises: Promise<string>[] = [];
        for (const pair of pairAddresses) {
            promises.push(this.getTotalVolumeUSD(pair));
        }

        let totalVolume: BigNumber = new BigNumber(0);
        for (const promise of promises) {
            totalVolume = totalVolume.plus(await promise);
        }

        return totalVolume.toString();
    }

    async getDailyFeesUSD(pairAddress: string): Promise<HistoricDataModel[]> {
        return await this.analyticsService.getSumCompleteValues(
            pairAddress,
            'feesUSD',
        );
    }

    async getClosingPriceUSD(tokenID: string): Promise<HistoricDataModel[]> {
        return await this.analyticsService.getLatestCompleteValues(
            tokenID,
            'priceUSD',
        );
    }

    async getPairDayDatas(pairAddress: string): Promise<PairDayDataModel[]> {
        const [firstTokenID, secondTokenID] = await Promise.all([
            this.pairGetterService.getFirstTokenID(pairAddress),
            this.pairGetterService.getSecondTokenID(pairAddress),
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
            const volumeUSD = volumesUSD.find(v => {
                return v.timestamp === lockedValueUSD.timestamp;
            });
            const feeUSD = feesUSD.find(
                fee => fee.timestamp === lockedValueUSD.timestamp,
            );
            const firstTokenPriceUSD = firstTokenPricesUSD.find(
                price => price.timestamp === lockedValueUSD.timestamp,
            );
            const secondTokenPriceUSD = secondTokenPricesUSD.find(
                price => price.timestamp === lockedValueUSD.timestamp,
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
        const pairAddresses = await this.context.getAllPairsAddress();
        const pairsDayDatas: PairDayDataModel[] = [];
        for (const pairAddress of pairAddresses) {
            const pairDayDatas = await this.getPairDayDatas(pairAddress);
            pairsDayDatas.push(...pairDayDatas);
        }

        return pairsDayDatas;
    }
}
