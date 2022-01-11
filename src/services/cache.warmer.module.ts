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
        ProxyModule,
        ProxyFarmModule,
        ProxyPairModule,
        AnalyticsModule,
    ],
    controllers: [],
    providers: [
        CacheWarmerService,
        PairCacheWarmerService,
        FarmCacheWarmerService,
        ProxyCacheWarmerService,
        AnalyticsCacheWarmerService,
        CachingService,
        TransactionProcessorService,
    ],
})
export class CacheWarmerModule {}
