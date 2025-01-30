import { Constants, ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { ApiService } from '@multiversx/sdk-nestjs-http';
import { Injectable } from '@nestjs/common';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { CurrencyRateModel } from '../models/currency.rate.model';
import { ApiConfigService } from 'src/helpers/api.config.service';

@Injectable()
export class CurrencyConverterComputeService {
    constructor(
        private readonly apiService: ApiService,
        private readonly apiConfig: ApiConfigService,
    ) {}

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'currencyConverter',
        remoteTtl: Constants.oneHour(),
        localTtl: Constants.oneMinute() * 30,
    })
    async allCurrencyRates(): Promise<CurrencyRateModel[]> {
        return await this.fetchCurrencyRates();
    }

    async currencyRates(symbols: string[]): Promise<CurrencyRateModel[]> {
        const allCurrencyRates = await this.allCurrencyRates();
        return allCurrencyRates.filter((rate) =>
            symbols.includes(rate.currency),
        );
    }

    async fetchCurrencyRates(symbols?: string[]): Promise<CurrencyRateModel[]> {
        const params: any = {
            app_id: this.apiConfig.getOepnExchangeRateAppID(),
            base: 'USD',
        };

        if (symbols && symbols.length > 0) {
            params.symbols = symbols.join(',');
        }

        try {
            const response = await this.apiService.get(
                'https://openexchangerates.org/api/latest.json',
                { params },
            );

            return Object.entries(response.data.rates).map(
                ([currency, rate]) => ({
                    currency,
                    rate: rate as number,
                }),
            );
        } catch (error) {
            throw new Error(`Failed to fetch currency rates: ${error.message}`);
        }
    }
}
