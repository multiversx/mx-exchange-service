import { Constants, ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { ApiService } from '@multiversx/sdk-nestjs-http';
import { Injectable } from '@nestjs/common';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import {
    CurrencyCategory,
    CurrencyRateModel,
    CurrencyRateType,
} from '../models/currency.rate.model';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import BigNumber from 'bignumber.js';
import {
    constantsConfig,
    cryptoRatesIdentifiers,
    mxConfig,
    tokenProviderUSD,
} from 'src/config';
import { TokenService } from 'src/modules/tokens/services/token.service';

@Injectable()
export class CurrencyConverterService {
    constructor(
        private readonly apiService: ApiService,
        private readonly apiConfig: ApiConfigService,
        private readonly tokenCompute: TokenComputeService,
        private readonly tokenService: TokenService,
    ) {}

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'currency',
        remoteTtl: Constants.oneDay(),
        localTtl: Constants.oneHour() * 18,
    })
    async fiatRates(): Promise<CurrencyRateModel[]> {
        return await this.fetchCurrencyRates();
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'currency',
        remoteTtl: Constants.oneMinute() * 4,
        localTtl: Constants.oneMinute() * 2,
    })
    async cryptoRates(): Promise<CurrencyRateModel[]> {
        return await this.computeCryptoRates();
    }

    async allCurrencyRates(): Promise<CurrencyRateModel[]> {
        const fiatRates = await this.fiatRates();
        const cryptoRates = await this.cryptoRates();

        return [...fiatRates, ...cryptoRates];
    }

    async computeCryptoRates(): Promise<CurrencyRateModel[]> {
        const tokenPrices = await this.tokenCompute.getAllTokensPriceDerivedUSD(
            cryptoRatesIdentifiers,
        );
        const tokens = await this.tokenService.getAllTokensMetadata(
            cryptoRatesIdentifiers,
        );

        const usdcPrice = await this.tokenCompute.computeTokenPriceDerivedUSD(
            constantsConfig.USDC_TOKEN_ID,
        );

        const tokenRates: CurrencyRateModel[] = cryptoRatesIdentifiers.map(
            (identifier, index) => {
                const token = tokens.find((t) => t.identifier === identifier);
                const price = tokenPrices[index];
                const [symbol, name] =
                    identifier === tokenProviderUSD
                        ? [mxConfig.EGLDIdentifier, mxConfig.EGLDIdentifier]
                        : [identifier.split('-')[0], token.name];

                const rate = new BigNumber(usdcPrice)
                    .dividedBy(price)
                    .toNumber();

                return {
                    symbol,
                    rate,
                    category: CurrencyRateType.CRYPTO,
                    name,
                };
            },
        );

        return tokenRates;
    }

    async currencyRates(symbols: string[]): Promise<CurrencyRateModel[]> {
        const allCurrencyRates = await this.allCurrencyRates();

        return allCurrencyRates.filter((rate) => {
            if (
                symbols.includes(mxConfig.EGLDIdentifier) &&
                rate.symbol === tokenProviderUSD
            ) {
                return true;
            }
            return symbols.includes(rate.symbol);
        });
    }

    async fetchCurrencyRates(symbols?: string[]): Promise<CurrencyRateModel[]> {
        try {
            const apiEndpoint = this.apiConfig.getOpenExchangeRateUrl();
            const params: any = {
                app_id: this.apiConfig.getOpenExchangeRateAppID(),
                base: 'USD',
            };

            if (symbols && symbols.length > 0) {
                params.symbols = symbols.join(',');
            }

            const latestRes = await this.apiService.get(
                `${apiEndpoint}/latest.json`,
                { params },
            );
            const currenciesRes = await this.fiatCurrencies();

            return Object.entries(latestRes.data.rates).map(
                ([symbol, rate]) => ({
                    symbol,
                    rate: rate as number,
                    category: CurrencyRateType.FIAT,
                    name: currenciesRes[symbol] || symbol,
                }),
            );
        } catch (error) {
            throw new Error(`Failed to fetch currency rates: ${error.message}`);
        }
    }

    async currencySymbols(category: CurrencyCategory): Promise<string[]> {
        const allSymbols = await this.allCurrencySymbols();

        switch (category) {
            case CurrencyCategory.FIAT:
                return allSymbols.filter(
                    (symbol) => !this.getCryptoSymbols().includes(symbol),
                );
            case CurrencyCategory.CRYPTO:
                return allSymbols.filter((symbol) =>
                    this.getCryptoSymbols().includes(symbol),
                );
            case CurrencyCategory.ALL:
            default:
                return allSymbols;
        }
    }

    getCryptoSymbols(): string[] {
        return cryptoRatesIdentifiers.map((identifier) =>
            identifier === tokenProviderUSD
                ? mxConfig.EGLDIdentifier
                : identifier.split('-')[0],
        );
    }

    async allCurrencySymbols(): Promise<string[]> {
        const fiatCurrencies = await this.fiatCurrencies();
        const fiatSymbols = Object.keys(fiatCurrencies);
        const cryptoSymbols = this.getCryptoSymbols();

        return [...fiatSymbols, ...cryptoSymbols];
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'currency',
        remoteTtl: Constants.oneDay(),
        localTtl: Constants.oneHour() * 18,
    })
    async fiatCurrencies(): Promise<Record<string, string>> {
        return await this.fetchFiatCurrencies();
    }

    async fetchFiatCurrencies(): Promise<Record<string, string>> {
        try {
            const apiEndpoint = this.apiConfig.getOpenExchangeRateUrl();
            const currenciesRes = await this.apiService.get(
                `${apiEndpoint}/currencies.json`,
            );

            return currenciesRes.data;
        } catch (error) {
            throw new Error(`Failed to fetch currency rates: ${error.message}`);
        }
    }
}
