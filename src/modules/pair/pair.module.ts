import { Module } from '@nestjs/common';
import { PairService } from './services/pair.service';
import { PairResolver } from './pair.resolver';
import { AbiPairService } from './services/abi-pair.service';
import { TransactionPairService } from './services/pair.transactions.service';
import { PriceFeedModule } from '../../services/price-feed/price-feed.module';
import { ContextModule } from '../../services/context/context.module';
import { ElrondCommunicationModule } from '../../services/elrond-communication/elrond-communication.module';
import { WrappingModule } from '../wrapping/wrap.module';
import { PairAnalyticsService } from './services/pair.analytics.service';
import { CachingModule } from '../../services/caching/cache.module';

@Module({
    imports: [
        ElrondCommunicationModule,
        ContextModule,
        PriceFeedModule,
        WrappingModule,
        CachingModule,
    ],
    providers: [
        PairService,
        PairAnalyticsService,
        AbiPairService,
        TransactionPairService,
        PairResolver,
    ],
    exports: [PairService, AbiPairService, PairAnalyticsService],
})
export class PairModule {}
