import { Module } from '@nestjs/common';
import { FarmService } from './farm.service';
import { FarmResolver } from './farm.resolver';
import { CacheManagerModule } from '../../services/cache-manager/cache-manager.module';
import { AbiFarmService } from './abi-farm.service';
import { TransactionsFarmService } from './transactions-farm.service';
import { FarmStatisticsService } from './farm-statistics.service';
import { PairModule } from '../pair/pair.module';
import { ContextModule } from '../../services/context/context.module';

@Module({
    imports: [CacheManagerModule, ContextModule, PairModule],
    providers: [
        FarmService,
        AbiFarmService,
        TransactionsFarmService,
        FarmStatisticsService,
        FarmResolver,
    ],
    exports: [FarmService],
})
export class FarmModule {}
