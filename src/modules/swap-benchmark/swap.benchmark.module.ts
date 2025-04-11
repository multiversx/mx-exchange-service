import { Module } from '@nestjs/common';
import { SwapBenchmarkSnapshotService } from './services/snapshot.service';
import { SwapBenchmarkController } from './swap.benchmark.controller';
import { RouterModule } from '../router/router.module';
import { PairModule } from '../pair/pair.module';
import { TokenModule } from '../tokens/token.module';
import { SwapBenchmarkService } from './services/benchmark.service';
import { AutoRouterModule } from '../auto-router/auto-router.module';
import { ElasticSearchModule } from 'src/services/elastic-search/elastic.search.module';
import { MongooseModule } from '@nestjs/mongoose';
import {
    HistoricalSwapDbModel,
    HistoricalSwapSchema,
} from './schemas/historical.swap.schema';
import {
    HistoricalSwapRepositoryService,
    HypotheticalSwapRepositoryService,
    HypotheticalSwapResultRepositoryService,
    PairSnapshotRepositoryService,
} from './services/repository.service';
import {
    PairSnapshotDbModel,
    PairSnapshotSchema,
} from './schemas/pair.snapshot.schema';
import { ScheduleModule } from '@nestjs/schedule';
import { SnapshotCronService } from './services/snapshot.cron.service';
import {
    HypotheticalSwap,
    HypotheticalSwapResult,
    HypotheticalSwapResultSchema,
    HypotheticalSwapSchema,
} from './schemas/hypothetical.swap.schema';
import { HypotheticalSwapService } from './services/hypothetical.swap.service';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        AutoRouterModule,
        RouterModule,
        PairModule,
        TokenModule,
        ElasticSearchModule,
        MongooseModule.forFeature([
            { name: HistoricalSwapDbModel.name, schema: HistoricalSwapSchema },
        ]),
        MongooseModule.forFeature([
            { name: PairSnapshotDbModel.name, schema: PairSnapshotSchema },
        ]),
        MongooseModule.forFeature([
            { name: HypotheticalSwap.name, schema: HypotheticalSwapSchema },
        ]),
        MongooseModule.forFeature([
            {
                name: HypotheticalSwapResult.name,
                schema: HypotheticalSwapResultSchema,
            },
        ]),
    ],
    providers: [
        SwapBenchmarkSnapshotService,
        SwapBenchmarkService,
        HistoricalSwapRepositoryService,
        PairSnapshotRepositoryService,
        SnapshotCronService,
        HypotheticalSwapService,
        HypotheticalSwapRepositoryService,
        HypotheticalSwapResultRepositoryService,
    ],
    controllers: [SwapBenchmarkController],
})
export class SwapBenchmarkModule {}
