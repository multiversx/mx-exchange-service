import { Inject, Injectable } from '@nestjs/common';
import { awsConfig } from '../../../config';
import { generateCacheKeyFromParams } from '../../../utils/generate-cache-key';
import { generateGetLogMessage } from '../../../utils/generate-log-message';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { CachingService } from '../../../services/caching/cache.service';
import { oneMinute } from '../../../helpers/helpers';
import { AWSTimestreamQueryService } from 'src/services/aws/aws.timestream.query';
import { HistoricDataModel } from '../models/analytics.model';

@Injectable()
export class AnalyticsService {
    constructor(
        private readonly awsTimestreamQuery: AWSTimestreamQueryService,
        private readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    private async getData(
        key: string,
        createValueFunc: () => any,
        ttl: number,
    ): Promise<any> {
        const cacheKey = this.getAnalyticsCacheKey(key);
        try {
            return await this.cachingService.getOrSet(
                cacheKey,
                createValueFunc,
                ttl,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                AnalyticsService.name,
                this.getData.name,
                cacheKey,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getHistoricData(
        series: string,
        metric: string,
        time: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'historicData',
            series,
            metric,
            time,
        );
        return await this.getData(
            cacheKey,
            () =>
                this.awsTimestreamQuery.getValues({
                    table: awsConfig.timestream.tableName,
                    series,
                    metric,
                    time,
                }),
            oneMinute() * 5,
        );
    }

    async getClosingValue(
        series: string,
        metric: string,
        time: string,
    ): Promise<string> {
        const cacheKey = this.getAnalyticsCacheKey(
            'closingValue',
            series,
            metric,
            time,
        );
        return await this.getData(
            cacheKey,
            () =>
                this.awsTimestreamQuery.getClosingValue({
                    table: awsConfig.timestream.tableName,
                    series,
                    metric,
                    time,
                }),
            oneMinute() * 5,
        );
    }

    async getCompleteValues(
        series: string,
        metric: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'completeValues',
            series,
            metric,
        );
        return await this.getData(
            cacheKey,
            () =>
                this.awsTimestreamQuery.getCompleteValues({
                    table: awsConfig.timestream.tableName,
                    series,
                    metric,
                }),
            oneMinute() * 5,
        );
    }

    async getLatestCompleteValues(
        series: string,
        metric: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'latestCompleteValues',
            series,
            metric,
        );
        return await this.getData(
            cacheKey,
            () =>
                this.awsTimestreamQuery.getLatestCompleteValues({
                    table: awsConfig.timestream.tableName,
                    series,
                    metric,
                }),
            oneMinute() * 5,
        );
    }

    async getLatestValues(
        series: string,
        metric: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'latestValues',
            series,
            metric,
        );
        return await this.getData(
            cacheKey,
            () =>
                this.awsTimestreamQuery.getLatestValues({
                    table: awsConfig.timestream.tableName,
                    series,
                    metric,
                }),
            oneMinute() * 5,
        );
    }

    async getMarketValues(
        series: string,
        metric: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'marketValues',
            series,
            metric,
        );
        return await this.getData(
            cacheKey,
            () =>
                this.awsTimestreamQuery.getMarketValues({
                    table: awsConfig.timestream.tableName,
                    series,
                    metric,
                }),
            oneMinute() * 5,
        );
    }

    async getMarketCompleteValues(
        series: string,
        metric: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'marketCompleteValues',
            series,
            metric,
        );
        return await this.getData(
            cacheKey,
            () =>
                this.awsTimestreamQuery.getMarketCompleteValues({
                    table: awsConfig.timestream.tableName,
                    series,
                    metric,
                }),
            oneMinute() * 5,
        );
    }

    private getAnalyticsCacheKey(...args: any) {
        return generateCacheKeyFromParams('analytics', ...args);
    }
}
