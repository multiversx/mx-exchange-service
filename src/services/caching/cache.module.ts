import { DynamicModule, Global, Module } from '@nestjs/common';
import {
    RedisCacheModule,
    InMemoryCacheModule as SdkInMemoryCacheModule,
    RedisCacheModuleAsyncOptions,
} from '@multiversx/sdk-nestjs-cache';
import { CacheService } from './cache.service';
import { InMemoryCacheModule } from './in.memory.cache.module';
import { InMemoryCacheOptions } from '@multiversx/sdk-nestjs-cache/lib/in-memory-cache/entities/in-memory-cache-options.interface';

export const ADDITIONAL_CACHING_OPTIONS = 'ADDITIONAL_CACHING_OPTIONS';

@Global()
@Module({})
export class CacheModule {
    static forRootAsync(
        redisCacheModuleAsyncOptions: RedisCacheModuleAsyncOptions,
        inMemoryCacheModuleOptions?: InMemoryCacheOptions,
    ): DynamicModule {
        return {
            module: CacheModule,
            imports: [
                InMemoryCacheModule,
                SdkInMemoryCacheModule.forRoot(inMemoryCacheModuleOptions),
                RedisCacheModule.forRootAsync(redisCacheModuleAsyncOptions),
                ...(redisCacheModuleAsyncOptions.imports || []),
            ],
            providers: [
                {
                    provide: ADDITIONAL_CACHING_OPTIONS,
                    useFactory: async (...args: any[]) => {
                        const factoryData =
                            await redisCacheModuleAsyncOptions.useFactory(
                                ...args,
                            );
                        return factoryData.additionalOptions;
                    },
                    inject: redisCacheModuleAsyncOptions.inject || [],
                },
                CacheService,
            ],
            exports: [CacheService],
        };
    }
}
