import { Lock } from '@multiversx/sdk-nestjs-common';
import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { CurrencyConverterComputeService } from 'src/modules/currency-converter/services/currency.converter.compute.service';
import { CurrencyConverterSetterService } from 'src/modules/currency-converter/services/currency.converter.setter.service';
import { PUB_SUB } from '../redis.pubSub.module';

@Injectable()
export class CurrencyConverterCacheWarmerService {
    constructor(
        private readonly currencyConverterCompute: CurrencyConverterComputeService,
        private readonly currencyConverterSetter: CurrencyConverterSetterService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
    ) {}

    @Cron(CronExpression.EVERY_HOUR)
    @Lock({ name: 'cacheCurrencyRates', verbose: true })
    async cacheCurrencyRates(): Promise<void> {
        const currencyRates =
            await this.currencyConverterCompute.fetchCurrencyRates();
        const cryptoRates = await this.currencyConverterCompute.cryptoRates();

        const cachedKeys = await this.currencyConverterSetter.allCurrencyRates([
            ...currencyRates,
            ...cryptoRates,
        ]);

        await this.deleteCacheKeys([cachedKeys]);
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
