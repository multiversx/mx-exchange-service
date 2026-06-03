import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
    utilities as nestWinstonModuleUtilities,
    WinstonModule,
} from 'nest-winston';
import * as winston from 'winston';
import { ApiConfigService } from './helpers/api.config.service';
import { RedisPubSubModule } from './services/redis.pubSub.module';

const loglevel = !!process.env.LOG_LEVEL ? process.env.LOG_LEVEL : 'error';

const errorSanitizer = winston.format((info) => {
    // Sanitize splat args (extra arguments passed to logger.error)
    const splat = info[Symbol.for('splat') as any];
    if (Array.isArray(splat)) {
        for (let i = 0; i < splat.length; i++) {
            if (splat[i] instanceof Error || splat[i]?.stack) {
                splat[i] = {
                    message: splat[i].message,
                    ...(splat[i].code !== undefined && { code: splat[i].code }),
                    ...(splat[i].details && { details: splat[i].details }),
                };
            }
        }
    }
    // Remove stack trace from the info object itself
    if (info.stack) {
        delete info.stack;
    }
    return info;
});

const logTransports: winston.transport[] = [
    new winston.transports.Console({
        format: winston.format.combine(
            winston.format.timestamp(),
            errorSanitizer(),
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
