import { CacheModule, Module } from '@nestjs/common';
import { CacheManagerService } from './cache-manager.service';

import * as redisStore from 'cache-manager-redis-store';
import { CacheDistributionService } from './cache-distribution.service';
import { CacheWrapService } from './cache-wrapping.service';

@Module({
    providers: [
        CacheManagerService,
        CacheDistributionService,
        CacheWrapService,
    ],
    imports: [
        CacheModule.register({
            ttl: 60 * 5,
            store: redisStore,
            host: process.env.REDIS_URL,
            port: process.env.REDIS_PORT,
            password: process.env.REDIS_PASSWORD,
            prefix: process.env.REDIS_PREFIX,
        }),
    ],
    exports: [CacheManagerService, CacheDistributionService, CacheWrapService],
})
export class CacheManagerModule {}
