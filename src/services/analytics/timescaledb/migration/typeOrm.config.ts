import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import {
    CloseDaily,
    CloseHourly,
    PriceCandleHourly,
    PriceCandleMinute,
    PriceCandleDaily,
    SumDaily,
    SumHourly,
    XExchangeAnalyticsEntity,
} from '../entities/timescaledb.entities';

config();

const configService = new ConfigService();

export default new DataSource({
    type: 'postgres',
    host: configService.get('TIMESCALEDB_URL'),
    port: configService.get('TIMESCALEDB_PORT'),
    username: configService.get('TIMESCALEDB_USERNAME'),
    password: configService.get('TIMESCALEDB_PASSWORD'),
    database: configService.get('TIMESCALEDB_DATABASE'),
    migrationsTransactionMode: 'each',
    entities: [
        XExchangeAnalyticsEntity,
        SumDaily,
        SumHourly,
        CloseDaily,
        CloseHourly,
        PriceCandleMinute,
        PriceCandleHourly,
        PriceCandleDaily
    ],
    migrations: ['src/services/analytics/timescaledb/migration/*-xExchange.ts'],
});
