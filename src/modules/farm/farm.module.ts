import { Module } from '@nestjs/common';
import { FarmService } from './services/farm.service';
import { FarmResolver } from './farm.resolver';
import { AbiFarmService } from './services/abi-farm.service';
import { TransactionsFarmService } from './services/transactions-farm.service';
import { FarmStatisticsService } from './services/farm-statistics.service';
import { PairModule } from '../pair/pair.module';
import { ContextModule } from '../../services/context/context.module';
import { ElrondCommunicationModule } from '../../services/elrond-communication/elrond-communication.module';
import { TokenMergingModule } from '../../modules/token-merging/token.merging.module';
import { CachingModule } from '../../services/caching/cache.module';

@Module({
    imports: [
        ElrondCommunicationModule,
        CachingModule,
        ContextModule,
        PairModule,
        TokenMergingModule,
    ],
    providers: [
        FarmService,
        AbiFarmService,
        TransactionsFarmService,
        FarmStatisticsService,
        FarmResolver,
    ],
    exports: [FarmService, AbiFarmService, FarmStatisticsService],
})
export class FarmModule {}
