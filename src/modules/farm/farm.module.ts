import { Module } from '@nestjs/common';
import { FarmService } from './services/farm.service';
import { FarmResolver } from './farm.resolver';
import { AbiFarmService } from './services/abi-farm.service';
import { TransactionsFarmService } from './services/transactions-farm.service';
import { FarmStatisticsService } from './services/farm-statistics.service';
import { PairModule } from '../pair/pair.module';
import { ContextModule } from '../../services/context/context.module';
import { ElrondCommunicationModule } from '../../services/elrond-communication/elrond-communication.module';
import { CachingModule } from '../../services/caching/cache.module';
import { FarmGetterService } from './services/farm.getter.service';
import { FarmComputeService } from './services/farm.compute.service';
import { FarmSetterService } from './services/farm.setter.service';

@Module({
    imports: [
        ElrondCommunicationModule,
        CachingModule,
        ContextModule,
        PairModule,
    ],
    providers: [
        FarmService,
        AbiFarmService,
        FarmGetterService,
        FarmSetterService,
        FarmComputeService,
        TransactionsFarmService,
        FarmStatisticsService,
        FarmResolver,
    ],
    exports: [
        FarmService,
        AbiFarmService,
        FarmGetterService,
        FarmSetterService,
        FarmComputeService,
        FarmStatisticsService,
    ],
})
export class FarmModule {}
