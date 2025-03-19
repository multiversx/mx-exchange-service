import { DynamicModule, Global, Module } from '@nestjs/common';
import {
    RedisCacheModule,
    RedisCacheModuleAsyncOptions,
} from '@multiversx/sdk-nestjs-cache';
import { CacheService } from './cache.service';
import { InMemoryCacheModule } from './in.memory.cache.module';

@Global()
@Module({})
export class CacheModule {
    static forRootAsync(
        redisCacheModuleAsyncOptions: RedisCacheModuleAsyncOptions,
    ): DynamicModule {
        return {
            module: CacheModule,
            imports: [
                InMemoryCacheModule,
                RedisCacheModule.forRootAsync(redisCacheModuleAsyncOptions),
            ],
            providers: [CacheService],
            exports: [CacheService],
        };
    }
}
