import { Lock } from '@multiversx/sdk-nestjs-common';
import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { CurrencyConverterService } from 'src/modules/currency-converter/services/currency.converter.service';
import { CurrencyConverterSetterService } from 'src/modules/currency-converter/services/currency.converter.setter.service';
import { PUB_SUB } from '../redis.pubSub.module';

@Injectable()
export class CurrencyConverterCacheWarmerService {
    constructor(
        private readonly currencyConverter: CurrencyConverterService,
        private readonly currencyConverterSetter: CurrencyConverterSetterService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
    ) {}

    @Cron(CronExpression.EVERY_5_HOURS)
    @Lock({ name: 'cacheFiatRates', verbose: true })
    async cacheFiatRates(): Promise<void> {
        const currencyRates = await this.currencyConverter.fetchCurrencyRates();

        const cachedKey = await this.currencyConverterSetter.fiatRates(
            currencyRates,
        );

        await this.deleteCacheKeys([cachedKey]);
    }

    @Cron(CronExpression.EVERY_MINUTE)
    @Lock({ name: 'cacheCryptoRates', verbose: true })
    async cacheCryptoRates(): Promise<void> {
        const cryptoRates = await this.currencyConverter.computeCryptoRates();

        const cachedKey = await this.currencyConverterSetter.cryptoRates(
            cryptoRates,
        );

        await this.deleteCacheKeys([cachedKey]);
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
