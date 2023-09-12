import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { CachingService } from 'src/services/caching/cache.service';
import { Logger } from 'winston';
import { HistoricDataModel } from '../models/analytics.model';
import { GenericSetterService } from 'src/services/generics/generic.setter.service';
import { Constants } from '@multiversx/sdk-nestjs-common';

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
        return await this.setData(
            this.getCacheKey('latestCompleteValues', series, metric),
            values,
            Constants.oneMinute() * 30,
            Constants.oneMinute() * 10,
        );
    }

    async setSumCompleteValues(
        series: string,
        metric: string,
        values: HistoricDataModel[],
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('sumCompleteValues', series, metric),
            values,
            Constants.oneMinute() * 30,
            Constants.oneMinute() * 10,
        );
    }

    async setValues24hSum(
        series: string,
        metric: string,
        values: HistoricDataModel[],
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('values24hSum', series, metric),
            values,
            Constants.oneMinute() * 30,
            Constants.oneMinute() * 10,
        );
    }

    async setValues24h(
        series: string,
        metric: string,
        values: HistoricDataModel[],
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('values24h', series, metric),
            values,
            Constants.oneMinute() * 30,
            Constants.oneMinute() * 10,
        );
    }
}
