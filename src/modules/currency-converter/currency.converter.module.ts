import { Module } from '@nestjs/common';
import { CurrencyConverterResolver } from './currency.converter.resolver';
import { CurrencyConverterComputeService } from './services/currency.converter.compute.service';
import { CurrencyConverterSetterService } from './services/currency.converter.setter.service';
import { ApiConfigService } from 'src/helpers/api.config.service';

@Module({
    imports: [],
    providers: [
        ApiConfigService,
        CurrencyConverterResolver,
        CurrencyConverterComputeService,
        CurrencyConverterSetterService,
    ],
    exports: [CurrencyConverterComputeService, CurrencyConverterSetterService],
})
export class CurrencyConverterModule {}
