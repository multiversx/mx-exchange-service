import { Resolver, Query, Args } from '@nestjs/graphql';
import {
    CurrencyCategory,
    CurrencyRateModel,
} from './models/currency.rate.model';
import { CurrencyConverterService } from './services/currency.converter.service';

@Resolver()
export class CurrencyConverterResolver {
    constructor(
        private readonly currencyConverter: CurrencyConverterService,
    ) {}

    @Query(() => [CurrencyRateModel])
    async currencyRates(
        @Args('symbols', { type: () => [String] }) symbols: string[],
    ): Promise<CurrencyRateModel[]> {
        return this.currencyConverter.currencyRates(symbols);
    }

    @Query(() => [String])
    async currencySymbols(
        @Args('category', {
            type: () => CurrencyCategory,
            nullable: true,
            defaultValue: CurrencyCategory.ALL,
        })
        category?: CurrencyCategory,
    ): Promise<string[]> {
        return this.currencyConverter.currencySymbols(category);
    }
}
