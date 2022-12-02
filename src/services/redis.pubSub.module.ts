import { RedisPubSub } from 'graphql-redis-subscriptions';
import { Global, Module } from '@nestjs/common';
import { ApiConfigService } from '../helpers/api.config.service';
import { ConfigModule } from '@nestjs/config';
import { setClient } from '../utils/redisClient';
import * as Redis from 'ioredis';

export const PUB_SUB = 'PUB_SUB';

@Global()
@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
    ],
    providers: [
        {
            provide: PUB_SUB,
            useFactory: (configService: ApiConfigService) => {
                const options: Redis.RedisOptions = {
                    host: configService.getRedisUrl(),
                    port: configService.getRedisPort(),
                    retryStrategy: function () {
                        return 1000;
                    },
                };

                return new RedisPubSub({
                    publisher: setClient(options),
                    subscriber: setClient(options),
                });
            },
            inject: [ApiConfigService],
        },
        ApiConfigService,
    ],
    exports: [PUB_SUB],
})
export class RedisPubSubModule { }
