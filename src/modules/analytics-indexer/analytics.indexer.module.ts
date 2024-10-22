import { Module } from '@nestjs/common';
import { AnalyticsIndexerService } from './services/analytics.indexer.service';
import { PairModule } from '../pair/pair.module';
import { StateService } from './services/state.service';
import { RouterModule } from '../router/router.module';
import { ElasticSearchModule } from 'src/services/elastic-search/elastic.search.module';
import { IndexerSwapHandlerService } from './services/event-handlers/swap.handler.service';
import { IndexerPairService } from './services/pair.service';
import { IndexerRouterService } from './services/router.service';
import { IndexerTokenService } from './services/token.service';
import { IndexerLiquidityHandlerService } from './services/event-handlers/liquidity.handler.service';
import { IndexerPriceDiscoveryHandlerService } from './services/event-handlers/price.discovery.handler.service';
import { TokenModule } from '../tokens/token.module';
import { PriceDiscoveryModule } from '../price-discovery/price.discovery.module';
import { IndexerPriceDiscoveryService } from './services/price.discovery.service';
import { AnalyticsIndexerCronService } from './services/analytics.indexer.cron.service';
import { DatabaseModule } from 'src/services/database/database.module';
import { MongooseModule } from '@nestjs/mongoose';
import {
    IndexerSession,
    IndexerSessionSchema,
} from './schemas/indexer.session.schema';
import { IndexerSessionRepositoryService } from 'src/services/database/repositories/indexer.session.repository';
import { AnalyticsIndexerController } from './analytics.indexer.controller';
import { AnalyticsIndexerPersistenceService } from './services/analytics.indexer.persistence.service';

@Module({
    imports: [
        PairModule,
        RouterModule,
        TokenModule,
        PriceDiscoveryModule,
        ElasticSearchModule,
        DatabaseModule,
        MongooseModule.forFeature([
            { name: IndexerSession.name, schema: IndexerSessionSchema },
        ]),
    ],
    providers: [
        AnalyticsIndexerService,
        AnalyticsIndexerCronService,
        StateService,
        IndexerPairService,
        IndexerPriceDiscoveryService,
        IndexerRouterService,
        IndexerTokenService,
        IndexerSwapHandlerService,
        IndexerLiquidityHandlerService,
        IndexerPriceDiscoveryHandlerService,
        IndexerSessionRepositoryService,
        AnalyticsIndexerPersistenceService,
    ],
    controllers: [AnalyticsIndexerController],
    exports: [AnalyticsIndexerService],
})
export class AnalyticsIndexerModule {}
