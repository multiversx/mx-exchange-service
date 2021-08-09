import { Module } from '@nestjs/common';
import { FarmService } from './farm.service';
import { FarmResolver } from './farm.resolver';
import { AbiFarmService } from './abi-farm.service';
import { TransactionsFarmService } from './transactions-farm.service';
import { FarmStatisticsService } from './farm-statistics.service';
import { PairModule } from '../pair/pair.module';
import { ContextModule } from '../../services/context/context.module';
import { ElrondCommunicationModule } from '../../services/elrond-communication/elrond-communication.module';
import { TokenMergingModule } from 'src/modules/token-merging/token.merging.module';
import { RedisCacheService } from 'src/services/redis-cache.service';

@Module({
    imports: [
        ElrondCommunicationModule,
        ContextModule,
        PairModule,
        TokenMergingModule,
    ],
    providers: [
        FarmService,
        AbiFarmService,
        TransactionsFarmService,
        FarmStatisticsService,
        RedisCacheService,
        FarmResolver,
    ],
    exports: [FarmService, AbiFarmService, FarmStatisticsService],
})
export class FarmModule {}
