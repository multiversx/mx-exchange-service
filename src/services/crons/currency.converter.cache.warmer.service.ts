import { Lock } from '@multiversx/sdk-nestjs-common';
import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { CurrencyConverterService } from 'src/modules/currency-converter/services/currency.converter.service';
import { CurrencyConverterSetterService } from 'src/modules/currency-converter/services/currency.converter.setter.service';
import { PUB_SUB } from '../redis.pubSub.module';
import { CurrencyCategory } from 'src/modules/currency-converter/models/currency.rate.model';

@Injectable()
export class CurrencyConverterCacheWarmerService {
    constructor(
        private readonly currencyConverter: CurrencyConverterService,
        private readonly currencyConverterSetter: CurrencyConverterSetterService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
    ) {}

    @Cron(CronExpression.EVERY_30_MINUTES)
    @Lock({ name: 'cacheCurrencyRates', verbose: true })
    async cacheCurrencyRates(): Promise<void> {
        const currencyRates =
            await this.currencyConverter.fetchCurrencyRates();
        const cryptoRates = await this.currencyConverter.cryptoRates();

        const cachedKeys = await this.currencyConverterSetter.allCurrencyRates([
            ...currencyRates,
            ...cryptoRates,
        ]);

        await this.deleteCacheKeys([cachedKeys]);
    }

    @Cron(CronExpression.EVERY_HOUR)
    @Lock({ name: 'cacheCurrencySymbols', verbose: true })
    async cacheCurrencySymbols(): Promise<void> {
        const currencySymbols =
            await this.currencyConverter.fetchCurrencySymbols(
                CurrencyCategory.ALL,
            );

        const cachedKey = await this.currencyConverterSetter.currencySymbols([
            ...currencySymbols,
        ]);

        await this.deleteCacheKeys([cachedKey]);
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
