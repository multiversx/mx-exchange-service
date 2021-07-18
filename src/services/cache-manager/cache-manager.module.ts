import { CacheModule, Module } from '@nestjs/common';
import { CacheManagerService } from './cache-manager.service';
import * as redisStore from 'cache-manager-redis-store';
import { CacheWrapService } from './cache-wrapping.service';

@Module({
    providers: [CacheManagerService, CacheWrapService],
    imports: [
        CacheModule.register({
            ttl: 60 * 5,
            store: redisStore,
            host: process.env.REDIS_URL,
            port: process.env.REDIS_PORT,
        }),
    ],
    exports: [CacheManagerService, CacheWrapService],
})
export class CacheManagerModule {}
