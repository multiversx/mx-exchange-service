import { CacheModule, Module } from '@nestjs/common';
import { CacheManagerService } from './cache-manager.service';
import * as redisStore from 'cache-manager-redis-store';
import { CacheWrapService } from './cache-wrapping.service';
import { CacheProxyService } from './cache-proxy.service';
import { CacheProxyPairService } from './cache-proxy-pair.service';
import { CacheProxyFarmService } from './cache-proxy-farm.service';

@Module({
    providers: [
        CacheManagerService,
        CacheWrapService,
        CacheProxyService,
        CacheProxyPairService,
        CacheProxyFarmService,
    ],
    imports: [
        CacheModule.register({
            ttl: 60 * 5,
            store: redisStore,
            host: process.env.REDIS_URL,
            port: process.env.REDIS_PORT,
        }),
    ],
    exports: [
        CacheManagerService,
        CacheWrapService,
        CacheProxyService,
        CacheProxyPairService,
        CacheProxyFarmService,
    ],
})
export class CacheManagerModule {}
