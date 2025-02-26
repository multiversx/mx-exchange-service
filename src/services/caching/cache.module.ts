import { DynamicModule, Global, Module } from '@nestjs/common';
import {
    RedisCacheModule,
    RedisCacheModuleAsyncOptions,
} from '@multiversx/sdk-nestjs-cache';
import { CacheService } from './cache.service';
import { InMemoryCacheModule } from './in.memory.cache.module';
import { InMemoryCacheOptions } from '@multiversx/sdk-nestjs-cache/lib/in-memory-cache/entities/in-memory-cache-options.interface';

@Global()
@Module({})
export class CacheModule {
    static forRootAsync(
        redisCacheModuleAsyncOptions: RedisCacheModuleAsyncOptions,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _inMemoryCacheModuleOptions?: InMemoryCacheOptions,
    ): DynamicModule {
        return {
            module: CacheModule,
            imports: [
                InMemoryCacheModule,
                RedisCacheModule.forRootAsync(redisCacheModuleAsyncOptions),
                ...(redisCacheModuleAsyncOptions.imports || []),
            ],
            providers: [CacheService],
            exports: [CacheService],
        };
    }
}
