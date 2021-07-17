import { CacheModule, Module } from '@nestjs/common';
import { CacheManagerService } from './cache-manager.service';
import * as redisStore from 'cache-manager-redis-store';
import { CacheDistributionService } from './cache-distribution.service';
import { CacheWrapService } from './cache-wrapping.service';
import { CacheProxyService } from './cache-proxy.service';
import { CacheProxyPairService } from './cache-proxy-pair.service';
import { CacheProxyFarmService } from './cache-proxy-farm.service';
import { CacheLockedAssetService } from './cache-locked-asset.service';

@Module({
    providers: [
        CacheManagerService,
        CacheDistributionService,
        CacheWrapService,
        CacheProxyService,
        CacheProxyPairService,
        CacheProxyFarmService,
        CacheLockedAssetService,
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
        CacheDistributionService,
        CacheProxyService,
        CacheProxyPairService,
        CacheProxyFarmService,
        CacheLockedAssetService,
    ],
})
export class CacheManagerModule {}
