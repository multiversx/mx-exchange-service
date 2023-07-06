import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
    utilities as nestWinstonModuleUtilities,
    WinstonModule,
} from 'nest-winston';
import * as winston from 'winston';
import * as Transport from 'winston-transport';
import { ApiConfigService } from './helpers/api.config.service';
import { RedisPubSubModule } from './services/redis.pubSub.module';

const loglevel = !!process.env.LOG_LEVEL ? process.env.LOG_LEVEL : 'error';

const logTransports: Transport[] = [
    new winston.transports.Console({
        format: winston.format.combine(
            winston.format.timestamp(),
            nestWinstonModuleUtilities.format.nestLike('xExchangeService', {
                colors: true,
                prettyPrint: true,
            }),
        ),
        level: loglevel,
    }),
];

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
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        WinstonModule.forRoot({
            transports: logTransports,
        }),
        RedisPubSubModule,
    ],
    providers: [ApiConfigService],
    exports: [ApiConfigService],
})
export class CommonAppModule {}
