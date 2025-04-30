import {
    RedisCacheModule,
    RedisCacheModuleOptions,
    RedlockConnectionOptions,
    RedlockModule,
} from '@multiversx/sdk-nestjs-cache';
import {
    ElasticModule,
    ElasticModuleOptions,
} from '@multiversx/sdk-nestjs-elastic';
import { ApiModule, ApiModuleOptions } from '@multiversx/sdk-nestjs-http';
import { DynamicModule } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { mxConfig } from 'src/config';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { CacheModule } from 'src/services/caching/cache.module';

export class DynamicModuleUtils {
    static getCacheModule(): DynamicModule {
        return CacheModule.forRootAsync({
            imports: [CommonAppModule],
            inject: [ApiConfigService],
            useFactory: (configService: ApiConfigService) =>
                new RedisCacheModuleOptions({
                    host: configService.getRedisUrl(),
                    port: configService.getRedisPort(),
                    password: configService.getRedisPassword(),
                    enableAutoPipelining: true,
                }),
        });
    }

    static getCommonRedisModule(): DynamicModule {
        return RedisCacheModule.forRootAsync({
            imports: [CommonAppModule],
            useFactory: (configService: ApiConfigService) =>
                new RedisCacheModuleOptions({
                    host: configService.getCommonRedisUrl(),
                    port: configService.getCommonRedisPort(),
                    password: configService.getCommonRedisPassword(),
                }),
            inject: [ApiConfigService],
        });
    }

    static getRedlockModule(): DynamicModule {
        return RedlockModule.forRootAsync({
            imports: [CommonAppModule],
            useFactory: (configService: ApiConfigService) => [
                new RedlockConnectionOptions({
                    host: configService.getCommonRedisUrl(),
                    port: configService.getCommonRedisPort(),
                    password: configService.getCommonRedisPassword(),
                }),
            ],
            inject: [ApiConfigService],
        });
    }

    static getElasticModule(): DynamicModule {
        return ElasticModule.forRootAsync({
            imports: [CommonAppModule],
            inject: [ApiConfigService],
            useFactory: (configService: ApiConfigService) =>
                new ElasticModuleOptions({
                    url: configService.getElasticSearchUrl(),
                }),
        });
    }

    static getApiModule(): DynamicModule {
        return ApiModule.forRootAsync({
            imports: [CommonAppModule],
            inject: [ApiConfigService],
            useFactory: (configService: ApiConfigService) =>
                new ApiModuleOptions({
                    axiosTimeout:
                        configService.getKeepAliveTimeoutDownstream() ?? 61000,
                    rateLimiterSecret:
                        configService.getRateLimiterSecret() ?? '',
                    serverTimeout:
                        configService.getKeepAliveTimeoutDownstream() ?? 60000,
                    useKeepAliveAgent: mxConfig.keepAlive,
                }),
        });
    }
}
