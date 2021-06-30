import { HttpModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PairModule } from '../modules/pair/pair.module';
import { ContextModule } from './context/context.module';
import { CacheWarmerService } from './crons/cache.warmer.service';
import { PriceFeedModule } from './price-feed/price-feed.module';
import { ServicesModule } from './services.module';
import {
    utilities as nestWinstonModuleUtilities,
    WinstonModule,
} from 'nest-winston';
import * as winston from 'winston';
import * as Transport from 'winston-transport';

const logTransports: Transport[] = [
    new winston.transports.Console({
        format: winston.format.combine(
            winston.format.timestamp(),
            nestWinstonModuleUtilities.format.nestLike(),
        ),
    }),
];

const loglevel = !!process.env.LOG_LEVEL ? process.env.LOG_LEVEL : 'error';

if (!!process.env.LOG_FILE) {
    logTransports.push(
        new winston.transports.File({
            filename: process.env.LOG_FILE,
            dirname: 'logs',
            maxsize: 100000,
            level: loglevel,
        }),
    );
}

@Module({
    imports: [
        ScheduleModule.forRoot(),
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        WinstonModule.forRoot({
            transports: logTransports,
        }),
        HttpModule,
        PriceFeedModule,
        PairModule,
        ServicesModule,
        ContextModule,
    ],
    controllers: [],
    providers: [CacheWarmerService],
})
export class CacheWarmerModule {}
