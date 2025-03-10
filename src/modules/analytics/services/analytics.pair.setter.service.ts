import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { CacheService } from '@multiversx/sdk-nestjs-cache';
import { GenericSetterService } from 'src/services/generics/generic.setter.service';
import { CandleDataModel } from '../models/analytics.model';
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
        start: string,
        end: string,
        candles: CandleDataModel[],
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('priceCandles', series, start, end),
            candles,
            Constants.oneHour() * 4,
            Constants.oneHour() * 3,
        );
    }
}
