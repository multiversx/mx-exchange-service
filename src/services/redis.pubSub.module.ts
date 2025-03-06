import { RedisPubSub } from 'graphql-redis-subscriptions';
import { Global, Module } from '@nestjs/common';
import { ApiConfigService } from '../helpers/api.config.service';
import { ConfigModule } from '@nestjs/config';
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
                const publisher = new Redis.default({
                    host: configService.getRedisUrl() || 'localhost',
                    port: Number(configService.getRedisPort()) || 6379,
                    retryStrategy: function () {
                        return 1000;
                    },
                });

                const subscriber = new Redis.default({
                    host: configService.getRedisUrl() || 'localhost',
                    port: Number(configService.getRedisPort()) || 6379,
                    retryStrategy: function () {
                        return 1000;
                    },
                });

                return new RedisPubSub({ publisher, subscriber });
            },
            inject: [ApiConfigService],
        },
        ApiConfigService,
    ],
    exports: [PUB_SUB],
})
export class RedisPubSubModule {}
