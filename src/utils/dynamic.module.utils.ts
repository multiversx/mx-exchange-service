import {
    CacheModule,
    RedisCacheModuleOptions,
} from '@multiversx/sdk-nestjs-cache';
import { DynamicModule } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { mxConfig } from 'src/config';
import { ApiConfigService } from 'src/helpers/api.config.service';

export class DynamicModuleUtils {
    static getCacheModule(): DynamicModule {
        return CacheModule.forRootAsync(
            {
                imports: [CommonAppModule],
                inject: [ApiConfigService],
                useFactory: (configService: ApiConfigService) =>
                    new RedisCacheModuleOptions({
                        host: configService.getRedisUrl(),
                        port: configService.getRedisPort(),
                        password: configService.getRedisPassword(),
                    }),
            },
            {
                maxItems: mxConfig.localCacheMaxItems,
            },
        );
    }
}
