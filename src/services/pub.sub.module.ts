import { Module } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { CacheController } from '../endpoints/cache/cache.controller';
import { ApiConfigService } from '../helpers/api.config.service';
import { mxConfig } from '../config';
import {
    CacheModule,
    RedisCacheModuleOptions,
} from '@multiversx/sdk-nestjs-cache';

@Module({
    imports: [
        CommonAppModule,
        CacheModule.forRootAsync(
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
        ),
    ],
    controllers: [CacheController],
    providers: [],
})
export class PubSubModule {}
