import { CacheModule, HttpModule, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PairModule } from '../modules/pair/pair.module';
import { ContextModule } from './context/context.module';
import { CacheWarmerService } from './crons/cache.warmer.service';
import { PriceFeedModule } from './price-feed/price-feed.module';
import { ServicesModule } from './services.module';
import { CachingService } from './caching/cache.service';
import { FarmModule } from 'src/modules/farm/farm.module';
import { ProxyModule } from 'src/modules/proxy/proxy.module';
import { ProxyFarmModule } from 'src/modules/proxy/services/proxy-farm/proxy-farm.module';
import { ProxyPairModule } from 'src/modules/proxy/services/proxy-pair/proxy-pair.module';
import { PairCacheWarmerService } from './crons/pair.cache.warmer.service';
import { FarmCacheWarmerService } from './crons/farm.cache.warmer.service';
import { ProxyCacheWarmerService } from './crons/proxy.cache.warmer.service';
import { ElrondCommunicationModule } from './elrond-communication/elrond-communication.module';
import { CommonAppModule } from 'src/common.app.module';
import { AnalyticsCacheWarmerService } from './crons/analytics.cache.warmer.service';
import { AnalyticsModule } from 'src/modules/analytics/analytics.module';
import { TransactionProcessorService } from './crons/transaction.processor.service';
import { LogsProcessorService } from './crons/logs.processor.service';
import { ElasticService } from 'src/helpers/elastic.service';
import { AWSModule } from './aws/aws.module';
import { StakingModule } from 'src/modules/staking/staking.module';
import { StakingCacheWarmerService } from './crons/staking.cache.warmer.service';
import { StakingProxyCacheWarmerService } from './crons/staking.proxy.cache.warmer.service';
import { StakingProxyModule } from 'src/modules/staking-proxy/staking.proxy.module';
import { MetabondingCacheWarmerService } from './crons/metabonding.cache.warmer.service';
import { MetabondingModule } from 'src/modules/metabonding/metabonding.module';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        CommonAppModule,
        CacheModule.register(),
        HttpModule,
        PriceFeedModule,
        PairModule,
        ServicesModule,
        ElrondCommunicationModule,
        ContextModule,
        FarmModule,
        StakingModule,
        StakingProxyModule,
        MetabondingModule,
        ProxyModule,
        ProxyFarmModule,
        ProxyPairModule,
        AnalyticsModule,
        AWSModule,
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
        CachingService,
        TransactionProcessorService,
        LogsProcessorService,
        ElasticService,
    ],
})
export class CacheWarmerModule {}
