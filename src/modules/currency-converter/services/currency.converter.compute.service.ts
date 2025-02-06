import { Constants, ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { ApiService } from '@multiversx/sdk-nestjs-http';
import { Injectable } from '@nestjs/common';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import {
    CurrencyRateModel,
    CurrencyRateType,
} from '../models/currency.rate.model';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import BigNumber from 'bignumber.js';
import { cryptoRatesIdentifiers } from 'src/config';
import { TokenService } from 'src/modules/tokens/services/token.service';

@Injectable()
export class CurrencyConverterComputeService {
    constructor(
        private readonly apiService: ApiService,
        private readonly apiConfig: ApiConfigService,
        private readonly tokenCompute: TokenComputeService,
        private readonly tokenService: TokenService,
    ) {}

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'currencyConverter',
        remoteTtl: Constants.oneHour(),
        localTtl: Constants.oneMinute() * 30,
    })
    async allCurrencyRates(): Promise<CurrencyRateModel[]> {
        const fiatRates = await this.fetchCurrencyRates();
        const cryptoRates = await this.cryptoRates();

        return [...fiatRates, ...cryptoRates];
    }

    async cryptoRates(): Promise<CurrencyRateModel[]> {
        const tokenPrices = await this.tokenCompute.getAllTokensPriceDerivedUSD(
            cryptoRatesIdentifiers,
        );
        const tokens = await this.tokenService.getAllTokensMetadata(
            cryptoRatesIdentifiers,
        );

        const tokenRates: CurrencyRateModel[] = cryptoRatesIdentifiers.map(
            (identifier, index) => {
                const currency = identifier.split('-')[0];
                const rate = tokenPrices[index];
                const token = tokens.find((t) => t.identifier === identifier);
                return {
                    currency,
                    rate: new BigNumber(rate).toNumber(),
                    category: CurrencyRateType.CRYPTO,
                    name: token.name,
                };
            },
        );

        return tokenRates;
    }

    async currencyRates(symbols: string[]): Promise<CurrencyRateModel[]> {
        const allCurrencyRates = await this.allCurrencyRates();

        return allCurrencyRates.filter((rate) =>
            symbols.includes(rate.currency),
        );
    }

    async fetchCurrencyRates(symbols?: string[]): Promise<CurrencyRateModel[]> {
        const apiEndpoint = this.apiConfig.getOpenExchangeRateUrl();
        const params: any = {
            app_id: this.apiConfig.getOpenExchangeRateAppID(),
            base: 'USD',
        };

        if (symbols && symbols.length > 0) {
            params.symbols = symbols.join(',');
        }

        try {
            const latestRes = await this.apiService.get(
                `${apiEndpoint}/latest.json`,
                { params },
            );
            const currenciesRes = await this.apiService.get(
                `${apiEndpoint}/currencies.json`,
            );

            const currencies = currenciesRes.data;

            return Object.entries(latestRes.data.rates).map(
                ([currency, rate]) => ({
                    currency,
                    rate: rate as number,
                    category: CurrencyRateType.FIAT,
                    name: currencies[currency] || currency,
                }),
            );
        } catch (error) {
            throw new Error(`Failed to fetch currency rates: ${error.message}`);
        }
    }
}
