import { Module } from '@nestjs/common';
import { CurrencyConverterResolver } from './currency.converter.resolver';
import { CurrencyConverterService } from './services/currency.converter.service';
import { CurrencyConverterSetterService } from './services/currency.converter.setter.service';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { TokenModule } from '../tokens/token.module';

@Module({
    imports: [TokenModule],
    providers: [
        ApiConfigService,
        CurrencyConverterResolver,
        CurrencyConverterService,
        CurrencyConverterSetterService,
    ],
    exports: [CurrencyConverterService, CurrencyConverterSetterService],
})
export class CurrencyConverterModule {}
