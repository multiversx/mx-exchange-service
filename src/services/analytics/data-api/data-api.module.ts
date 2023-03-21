import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonAppModule } from 'src/common.app.module';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { CachingModule } from 'src/services/caching/cache.module';
import { DataApiQueryService } from './data-api.query.service';
import { DataApiWriteService } from './data-api.write.service';
import {
    CloseDaily,
    CloseHourly,
    SumDaily,
    SumHourly,
    TokenBurnedWeekly,
    XExchangeAnalyticsEntity,
} from './entities/data.api.entities';

@Module({
    imports: [
        CommonAppModule,
        CachingModule,
        TypeOrmModule.forRootAsync({
            imports: [CommonAppModule],
            useFactory: (apiConfig: ApiConfigService) => ({
                type: 'postgres',
                host: apiConfig.getTimescaleDbHost(),
                port: apiConfig.getTimescaleDbPort(),
                database: apiConfig.getTimescaleDbDatabase(),
                username: apiConfig.getTimescaleDbUsername(),
                password: apiConfig.getTimescaleDbPassword(),
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
        ]),
    ],
    providers: [DataApiQueryService, DataApiWriteService],
    exports: [DataApiQueryService, DataApiWriteService],
})
export class DataApiModule {}
