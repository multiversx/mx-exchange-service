import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonAppModule } from 'src/common.app.module';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { TimescaleDBQueryService } from './timescaledb.query.service';
import { TimescaleDBWriteService } from './timescaledb.write.service';
import {
    CloseDaily,
    CloseHourly,
    PDCloseMinute,
    PriceCandleHourly,
    PriceCandleMinute,
    PriceCandleDaily,
    SumDaily,
    SumHourly,
    TokenBurnedWeekly,
    XExchangeAnalyticsEntity,
    TokenCandlesMinute,
    TokenCandlesHourly,
    TokenCandlesDaily,
    PairFirstTokenCandlesMinute,
    PairFirstTokenCandlesHourly,
    PairFirstTokenCandlesDaily,
    PairSecondTokenCandlesMinute,
    PairSecondTokenCandlesHourly,
    PairSecondTokenCandlesDaily,
} from './entities/timescaledb.entities';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';

@Module({
    imports: [
        CommonAppModule,
        DynamicModuleUtils.getCacheModule(),
        TypeOrmModule.forRootAsync({
            imports: [CommonAppModule],
            useFactory: (apiConfig: ApiConfigService) => ({
                type: 'postgres',
                host: apiConfig.getTimescaleDbHost(),
                port: apiConfig.getTimescaleDbPort(),
                database: apiConfig.getTimescaleDbDatabase(),
                username: apiConfig.getTimescaleDbUsername(),
                password: apiConfig.getTimescaleDbPassword(),
                applicationName: 'xExchangeService',
                ssl: true,
                extra: {
                    ssl: {
                        rejectUnauthorized: false,
                    },
                },
                entities: ['dist/**/*.entities.{ts,js}'],
            }),
            inject: [ApiConfigService],
        }),
        TypeOrmModule.forFeature([
            XExchangeAnalyticsEntity,
            SumDaily,
            SumHourly,
            CloseDaily,
            CloseHourly,
            TokenBurnedWeekly,
            PDCloseMinute,
            PriceCandleMinute,
            PriceCandleHourly,
            PriceCandleDaily,
            TokenCandlesMinute,
            TokenCandlesHourly,
            TokenCandlesDaily,
            PairFirstTokenCandlesMinute,
            PairFirstTokenCandlesHourly,
            PairFirstTokenCandlesDaily,
            PairSecondTokenCandlesMinute,
            PairSecondTokenCandlesHourly,
            PairSecondTokenCandlesDaily,
        ]),
    ],
    providers: [TimescaleDBQueryService, TimescaleDBWriteService],
    exports: [TimescaleDBQueryService, TimescaleDBWriteService],
})
export class TimescaleDBModule {}
