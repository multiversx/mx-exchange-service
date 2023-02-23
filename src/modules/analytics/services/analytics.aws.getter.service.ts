import { Inject, Injectable } from '@nestjs/common';
import { generateCacheKeyFromParams } from '../../../utils/generate-cache-key';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { CachingService } from '../../../services/caching/cache.service';
import { HistoricDataModel } from '../models/analytics.model';
import { generateGetLogMessage } from 'src/utils/generate-log-message';
import { GenericGetterService } from 'src/services/generics/generic.getter.service';
import { oneMinute } from 'src/helpers/helpers';
import { AWSTimestreamQueryService } from 'src/services/aws/aws.timestream.query';
import { ApiConfigService } from 'src/helpers/api.config.service';
import moment from 'moment';

@Injectable()
export class AnalyticsAWSGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly awsQuery: AWSTimestreamQueryService,
        private readonly apiConfig: ApiConfigService,
    ) {
        super(cachingService, logger);
    }

    private async getCachedData<T>(
        cacheKey: string,
        methodName: string,
    ): Promise<T> {
        try {
            const data = await this.cachingService.getCache<T>(cacheKey);
            if (!data || data === undefined) {
                throw new Error(`Unavailable cached key ${cacheKey}`);
            }
            return data;
        } catch (error) {
            const logMessage = generateGetLogMessage(
                this.constructor.name,
                methodName,
                cacheKey,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getLatestCompleteValues(
        series: string,
        metric: string,
        start?: string,
        time?: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'latestCompleteValues',
            series,
            metric,
        );
        let data = await this.getCachedData<HistoricDataModel[]>(
            cacheKey,
            this.getLatestCompleteValues.name,
        );
        if (start) {
            const formattedStart = moment.unix(parseInt(start)).utc();

            data = data.filter((historicData) =>
                moment
                    .utc(historicData.timestamp)
                    .isSameOrAfter(formattedStart),
            );

            if (time) {
                const [timeAmount, timeUnit] = time.match(/[a-zA-Z]+|[0-9]+/g);
                const endDate = formattedStart.add(
                    moment.duration(
                        timeAmount,
                        timeUnit as moment.unitOfTime.Base,
                    ),
                );
                data = data.filter((historicData) =>
                    moment.utc(historicData.timestamp).isSameOrBefore(endDate),
                );
            }
        }

        return data;
    }

    async getSumCompleteValues(
        series: string,
        metric: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'sumCompleteValues',
            series,
            metric,
        );
        return await this.getCachedData(
            cacheKey,
            this.getSumCompleteValues.name,
        );
    }

    async getValues24hSum(
        series: string,
        metric: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'values24hSum',
            series,
            metric,
        );
        return await this.getCachedData(cacheKey, this.getValues24hSum.name);
    }

    async getValues24h(
        series: string,
        metric: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey('values24h', series, metric);
        return await this.getCachedData(cacheKey, this.getValues24h.name);
    }

    async getLatestHistoricData(
        time: string,
        series: string,
        metric: string,
        start: string,
    ): Promise<HistoricDataModel[]> {
        if (!this.apiConfig.isAWSTimestreamRead()) {
            return [];
        }

        const cacheKey = this.getAnalyticsCacheKey(
            'latestHistoricData',
            time,
            series,
            metric,
            start,
        );
        return await this.getData(
            cacheKey,
            () =>
                this.awsQuery.getLatestHistoricData({
                    table: this.apiConfig.getAWSTableName(),
                    series,
                    metric,
                    time,
                    start,
                }),
            oneMinute() * 2,
        );
    }

    async getLatestBinnedHistoricData(
        time: string,
        series: string,
        metric: string,
        bin: string,
        start: string,
    ): Promise<HistoricDataModel[]> {
        if (!this.apiConfig.isAWSTimestreamRead()) {
            return [];
        }

        const cacheKey = this.getAnalyticsCacheKey(
            'latestBinnedHistoricData',
            time,
            series,
            metric,
            bin,
            start,
        );
        return await this.getData(
            cacheKey,
            () =>
                this.awsQuery.getLatestBinnedHistoricData({
                    table: this.apiConfig.getAWSTableName(),
                    series,
                    metric,
                    time,
                    start,
                    bin,
                }),
            oneMinute() * 2,
        );
    }

    private getAnalyticsCacheKey(...args: any) {
        return generateCacheKeyFromParams('analytics', ...args);
    }
}
