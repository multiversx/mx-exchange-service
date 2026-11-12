import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { ApiConfigService } from './helpers/api.config.service';
import { RedisPubSubModule } from './services/redis.pubSub.module';
import {
    consoleLogFormat,
    jsonLogFormat,
    loggerFormat,
} from './utils/logger.formats';

const loglevel = !!process.env.LOG_LEVEL ? process.env.LOG_LEVEL : 'error';

const logTransports: winston.transport[] = [
    new winston.transports.Console({
        format: consoleLogFormat(),
        level: loglevel,
    }),
];

if (!!process.env.LOG_FILE) {
    logTransports.push(
        new winston.transports.File({
            filename: process.env.LOG_FILE,
            dirname: 'logs',
            maxsize: 10 * 1024 * 1024,
            maxFiles: 5,
            tailable: true,
            format: jsonLogFormat(),
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
            format: loggerFormat(),
            transports: logTransports,
        }),
        RedisPubSubModule,
    ],
    providers: [ApiConfigService],
    exports: [ApiConfigService],
})
export class CommonAppModule {}
