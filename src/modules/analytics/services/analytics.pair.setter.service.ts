import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { CacheService } from '@multiversx/sdk-nestjs-cache';
import { GenericSetterService } from 'src/services/generics/generic.setter.service';
import { CandleDataModel } from '../models/analytics.model';
import { PriceCandlesResolutions } from '../models/query.args';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { Constants } from '@multiversx/sdk-nestjs-common';

@Injectable()
export class AnalyticsPairSetterService extends GenericSetterService {
    constructor(
        protected readonly cachingService: CacheService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(cachingService, logger);
        this.baseKey = 'analytics';
    }

    async setPriceCandles(
        series: string,
        metric: string,
        start: string,
        end: string,
        resolution: PriceCandlesResolutions,
        candles: CandleDataModel[],
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('priceCandles', series, metric, start, end, resolution),
            candles,
            Constants.oneHour() * 3,
            Constants.oneHour(),
        );
    }
} 