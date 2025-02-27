import { CacheService } from 'src/services/caching/cache.service';
import { Constants } from '@multiversx/sdk-nestjs-common';
import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { GenericSetterService } from 'src/services/generics/generic.setter.service';
import { Logger } from 'winston';
import { CurrencyRateModel } from '../models/currency.rate.model';

export class CurrencyConverterSetterService extends GenericSetterService {
    constructor(
        protected readonly cachingService: CacheService,
        @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    ) {
        super(cachingService, logger);
        this.baseKey = 'currency';
    }

    async cryptoRates(value: CurrencyRateModel[]): Promise<string> {
        return await this.setData(
            this.getCacheKey('cryptoRates'),
            value,
            Constants.oneMinute() * 4,
            Constants.oneMinute() * 2,
        );
    }

    async fiatRates(value: CurrencyRateModel[]): Promise<string> {
        return await this.setData(
            this.getCacheKey('fiatRates'),
            value,
            Constants.oneDay(),
            Constants.oneHour() * 18,
        );
    }
}
