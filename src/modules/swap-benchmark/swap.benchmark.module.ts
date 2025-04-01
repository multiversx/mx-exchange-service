import { Module } from '@nestjs/common';
import { SwapBenchmarkSnapshotService } from './services/snapshot.service';
import { SwapBenchmarkController } from './swap.benchmark.controller';
import { RouterModule } from '../router/router.module';
import { PairModule } from '../pair/pair.module';
import { TokenModule } from '../tokens/token.module';
import { SwapBenchmarkService } from './services/benchmark.service';
import { AutoRouterModule } from '../auto-router/auto-router.module';

@Module({
    imports: [AutoRouterModule, RouterModule, PairModule, TokenModule],
    providers: [SwapBenchmarkSnapshotService, SwapBenchmarkService],
    controllers: [SwapBenchmarkController],
})
export class SwapBenchmarkModule {}
