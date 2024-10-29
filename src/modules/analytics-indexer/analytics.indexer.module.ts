import { Module } from '@nestjs/common';
import { PairModule } from '../pair/pair.module';
import { RouterModule } from '../router/router.module';
import { PriceDiscoveryModule } from '../price-discovery/price.discovery.module';
import { TokenModule } from '../tokens/token.module';
import { ElasticSearchModule } from 'src/services/elastic-search/elastic.search.module';
import { IndexerService } from './services/indexer.service';
import { IndexerStateService } from './services/indexer.state.service';
import { IndexerPairService } from './services/indexer.pair.service';
import { IndexerRouterService } from './services/indexer.router.service';
import { IndexerTokenService } from './services/indexer.token.service';
import { IndexerPriceDiscoveryService } from './services/indexer.price.discovery.service';
import { IndexerSwapHandlerService } from './services/event-handlers/indexer.swap.handler.service';
import { IndexerLiquidityHandlerService } from './services/event-handlers/indexer.liquidity.handler.service';
import { IndexerPriceDiscoveryHandlerService } from './services/event-handlers/indexer.price.discovery.handler.service';
import { IndexerSessionRepositoryService } from './services/indexer.session.repository.service';
import { IndexerPersistenceService } from './services/indexer.persistence.service';
import { AnalyticsIndexerController } from './analytics.indexer.controller';
import { DatabaseModule } from 'src/services/database/database.module';
import { MongooseModule } from '@nestjs/mongoose';
import {
    IndexerSession,
    IndexerSessionSchema,
} from './schemas/indexer.session.schema';
import { MXCommunicationModule } from 'src/services/multiversx-communication/mx.communication.module';
import { IndexerCronService } from './services/indexer.cron.service';
import { IndexerMexBurnHandlerService } from './services/event-handlers/indexer.mex.burn.handler.service';

@Module({
    imports: [
        MXCommunicationModule,
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
        IndexerService,
        IndexerStateService,
        IndexerPairService,
        IndexerRouterService,
        IndexerTokenService,
        IndexerPriceDiscoveryService,
        IndexerSwapHandlerService,
        IndexerLiquidityHandlerService,
        IndexerPriceDiscoveryHandlerService,
        IndexerMexBurnHandlerService,
        IndexerSessionRepositoryService,
        IndexerPersistenceService,
        IndexerCronService,
    ],
    exports: [IndexerService],
    controllers: [AnalyticsIndexerController],
})
export class AnalyticsIndexerModule {}
