import { CacheService } from '@multiversx/sdk-nestjs-cache';
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
        this.baseKey = 'currencyConverter';
    }

    async allCurrencyRates(value: CurrencyRateModel[]): Promise<string> {
        return await this.setData(
            this.getCacheKey('allCurrencyRates'),
            value,
            Constants.oneHour(),
            Constants.oneMinute() * 30,
        );
    }
}
