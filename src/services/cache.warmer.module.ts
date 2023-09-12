import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PairModule } from '../modules/pair/pair.module';
import { ContextModule } from './context/context.module';
import { CacheWarmerService } from './crons/cache.warmer.service';
import { ProxyModule } from 'src/modules/proxy/proxy.module';
import { ProxyFarmModule } from 'src/modules/proxy/services/proxy-farm/proxy.farm.module';
import { ProxyPairModule } from 'src/modules/proxy/services/proxy-pair/proxy.pair.module';
import { PairCacheWarmerService } from './crons/pair.cache.warmer.service';
import { FarmCacheWarmerService } from './crons/farm.cache.warmer.service';
import { ProxyCacheWarmerService } from './crons/proxy.cache.warmer.service';
import { MXCommunicationModule } from './multiversx-communication/mx.communication.module';
import { CommonAppModule } from 'src/common.app.module';
import { AnalyticsCacheWarmerService } from './crons/analytics.cache.warmer.service';
import { AnalyticsModule } from 'src/modules/analytics/analytics.module';
import { TransactionProcessorService } from './crons/transaction.processor.service';
import { LogsProcessorService } from './crons/logs.processor.service';
import { StakingModule } from 'src/modules/staking/staking.module';
import { StakingCacheWarmerService } from './crons/staking.cache.warmer.service';
import { StakingProxyCacheWarmerService } from './crons/staking.proxy.cache.warmer.service';
import { StakingProxyModule } from 'src/modules/staking-proxy/staking.proxy.module';
import { MetabondingCacheWarmerService } from './crons/metabonding.cache.warmer.service';
import { MetabondingModule } from 'src/modules/metabonding/metabonding.module';
import { PriceDiscoveryCacheWarmerService } from './crons/price.discovery.cache.warmer.service';
import { PriceDiscoveryModule } from 'src/modules/price-discovery/price.discovery.module';
import { RemoteConfigModule } from 'src/modules/remote-config/remote-config.module';
import { RouterModule } from 'src/modules/router/router.module';
import { TokenModule } from 'src/modules/tokens/token.module';
import { AWSQueryCacheWarmerService } from './crons/aws.query.cache.warmer.service';
import { FarmModuleV1_2 } from 'src/modules/farm/v1.2/farm.v1.2.module';
import { FarmModuleV1_3 } from 'src/modules/farm/v1.3/farm.v1.3.module';
import { FarmModule } from 'src/modules/farm/farm.module';
import { AnalyticsModule as AnalyticsServicesModule } from 'src/services/analytics/analytics.module';
import { ElasticService } from 'src/helpers/elastic.service';
import { ApiConfigService } from 'src/helpers/api.config.service';
import {
    CacheModule,
    RedisCacheModuleOptions,
} from '@multiversx/sdk-nestjs-cache';
import { mxConfig } from 'src/config';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        CommonAppModule,
        PairModule,
        RouterModule,
        MXCommunicationModule,
        ContextModule,
        FarmModule,
        FarmModuleV1_2,
        FarmModuleV1_3,
        StakingModule,
        StakingProxyModule,
        MetabondingModule,
        ProxyModule,
        ProxyFarmModule,
        ProxyPairModule,
        AnalyticsModule,
        PriceDiscoveryModule,
        TokenModule,
        AnalyticsServicesModule,
        RemoteConfigModule,
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
    controllers: [],
    providers: [
        CacheWarmerService,
        PairCacheWarmerService,
        FarmCacheWarmerService,
        StakingCacheWarmerService,
        StakingProxyCacheWarmerService,
        MetabondingCacheWarmerService,
        ProxyCacheWarmerService,
        AnalyticsCacheWarmerService,
        AWSQueryCacheWarmerService,
        PriceDiscoveryCacheWarmerService,
        TransactionProcessorService,
        LogsProcessorService,
        ElasticService,
    ],
})
export class CacheWarmerModule {}
