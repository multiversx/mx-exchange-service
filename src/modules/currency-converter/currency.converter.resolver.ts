import { Resolver, Query, Args } from '@nestjs/graphql';
import {
    CurrencyCategory,
    CurrencyRateModel,
} from './models/currency.rate.model';
import { CurrencyConverterComputeService } from './services/currency.converter.compute.service';

@Resolver()
export class CurrencyConverterResolver {
    constructor(
        private readonly currencyConverterCompute: CurrencyConverterComputeService,
    ) {}

    @Query(() => [CurrencyRateModel])
    async currencyRates(
        @Args('symbols', { type: () => [String] }) symbols: string[],
    ): Promise<CurrencyRateModel[]> {
        return this.currencyConverterCompute.currencyRates(symbols);
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
        return this.currencyConverterCompute.fetchCurrencySymbols(category);
    }
}
