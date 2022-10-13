import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneMinute } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { Logger } from 'winston';
import { HistoricDataModel } from '../models/analytics.model';
import { GenericSetterService } from '../../../services/generics/generic.setter.service';

@Injectable()
export class AnalyticsAWSSetterService extends GenericSetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(cachingService, logger);
        this.baseKey = 'analytics';
    }

    async setLatestCompleteValues(
        series: string,
        metric: string,
        values: HistoricDataModel[],
    ): Promise<string> {
        const cacheKey = this.getCacheKey(
            'latestCompleteValues',
            series,
            metric,
        );
        return await this.setData(
            cacheKey,
            values,
            oneMinute() * 30,
            oneMinute() * 10,
        );
    }

    async setSumCompleteValues(
        series: string,
        metric: string,
        values: HistoricDataModel[],
    ): Promise<string> {
        const cacheKey = this.getCacheKey(
            'sumCompleteValues',
            series,
            metric,
        );
        return await this.setData(
            cacheKey,
            values,
            oneMinute() * 30,
            oneMinute() * 10,
        );
    }

    async setValues24hSum(
        series: string,
        metric: string,
        values: HistoricDataModel[],
    ): Promise<string> {
        const cacheKey = this.getCacheKey(
            'values24hSum',
            series,
            metric,
        );
        return await this.setData(
            cacheKey,
            values,
            oneMinute() * 30,
            oneMinute() * 10,
        );
    }

    async setValues24h(
        series: string,
        metric: string,
        values: HistoricDataModel[],
    ): Promise<string> {
        const cacheKey = this.getCacheKey('values24h', series, metric);
        return await this.setData(
            cacheKey,
            values,
            oneMinute() * 30,
            oneMinute() * 10,
        );
    }

    async setLatestHistoricData(
        time: string,
        series: string,
        metric: string,
        start: string,
        values: HistoricDataModel[],
    ): Promise<string> {
        const cacheKey = this.getCacheKey(
            'latestHistoricData',
            time,
            series,
            metric,
            start,
        );
        return await this.setData(
            cacheKey,
            values,
            oneMinute() * 30,
            oneMinute() * 10,
        );
    }

    async setLatestBinnedHistoricData(
        time: string,
        series: string,
        metric: string,
        bin: string,
        start: string,
        values: HistoricDataModel[],
    ): Promise<string> {
        const cacheKey = this.getCacheKey(
            'latestBinnedHistoricData',
            time,
            series,
            metric,
            bin,
            start,
        );
        return await this.setData(
            cacheKey,
            values,
            oneMinute() * 30,
            oneMinute() * 10,
        );
    }
}
