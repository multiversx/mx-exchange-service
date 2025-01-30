import { Resolver, Query, Args } from '@nestjs/graphql';
import { CurrencyRateModel } from './models/currency.rate.model';
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
}
