import { Module } from '@nestjs/common';
import { RedlockService } from './redlock';
import { RedisModule } from 'nestjs-redis';

@Module({
    providers: [RedlockService],
    exports: [RedlockService],
    imports: [
        RedisModule.register({
            host: process.env.REDIS_URL,
            port: parseInt(process.env.REDIS_PORT),
            password: process.env.REDIS_PASSWORD,
            keyPrefix: process.env.REDIS_PREFIX,
        }),
    ],
})
export class ServicesModule {}
