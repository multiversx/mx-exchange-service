import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Query,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import {
    BenchmarkSnapshotResponse,
    SwapBenchmarkSnapshotService,
} from './services/snapshot.service';
import { SnapshotDto } from './dtos/create.snapshot.dto';
import {
    DeepHistorySwap,
    SwapBenchmarkService,
} from './services/benchmark.service';
import { AutoRouteModel } from '../auto-router/models/auto-route.model';
import { BenchmarkDto } from './dtos/benchmark.dto';
import { MultiHopRouteModel } from './models/benchmark.models';
import { EsdtToken } from '../tokens/models/esdtToken.model';
import { HypotheticalSwapDto } from './dtos/create.hypothetical.swap.dto';
import { HypotheticalSwapService } from './services/hypothetical.swap.service';
import {
    HypotheticalSwap,
    HypotheticalSwapResult,
} from './schemas/hypothetical.swap.schema';

@Controller('swap-benchmark')
export class SwapBenchmarkController {
    constructor(
        private readonly snapshotService: SwapBenchmarkSnapshotService,
        private readonly benchmarkService: SwapBenchmarkService,
        private readonly hypotheticalSwapService: HypotheticalSwapService,
    ) {}

    // @UseGuards(JwtOrNativeAdminGuard)
    @UsePipes(new ValidationPipe())
    @Post('/snapshots')
    async createSnapshot(@Body() createDto: SnapshotDto): Promise<number> {
        await this.snapshotService.createSnapshotForTimestamp(
            createDto.timestamp - 100,
        );
        return createDto.timestamp;
    }

    // @UseGuards(JwtOrNativeAdminGuard)
    @Get('/snapshots')
    async getAvailableSnapshots(): Promise<number[]> {
        return this.snapshotService.getAvailableSnapshots();
    }

    // @UseGuards(JwtOrNativeAdminGuard)
    @Get('/test-snapshots')
    async testSnaps(): Promise<string> {
        // return this.snapshotService.testSnapshots();
        return this.benchmarkService.pruneHypotheticalSwapResults();
        // return this.snapshotService.fixMissingPairs();
        // return this.snapshotService.indexFromElastic();
    }

    // @UseGuards(JwtOrNativeAdminGuard)
    @Get('/snapshots/:timestamp')
    async getSnapshotData(
        @Param('timestamp') timestamp: number,
    ): Promise<BenchmarkSnapshotResponse> {
        // const { pairs, tokensMetadata, tokensPriceUSD } =
        const { pairs, tokensMetadata } =
            await this.snapshotService.getSnapshot(timestamp);

        const uniqueTokens: EsdtToken[] = [];
        tokensMetadata.forEach((token) =>
            uniqueTokens.push(
                new EsdtToken({
                    identifier: token.identifier,
                    decimals: token.decimals,
                    price: '0',
                }),
            ),
        );

        return {
            pairs,
            tokensMetadata: uniqueTokens,
        };
    }

    // @UseGuards(JwtOrNativeAdminGuard)
    @UsePipes(new ValidationPipe())
    @Post('/run')
    async runBenchmark(@Body() benchmarkDto: BenchmarkDto): Promise<{
        current: AutoRouteModel;
        optimized: {
            name: string;
            multiHop: MultiHopRouteModel;
        }[];
    }> {
        return this.benchmarkService.runBenchmark(
            benchmarkDto.timestamp,
            benchmarkDto.args,
        );
    }

    @UsePipes(new ValidationPipe())
    @Post('/run-deep-history')
    async runDeepHistoryBenchmark(): Promise<string> {
        return this.benchmarkService.runDeepHistoryBenchmark();
    }

    @Get('/deep-history')
    async getDeepHistoryData(): Promise<{
        swaps: DeepHistorySwap[];
        tokens: EsdtToken[];
    }> {
        return this.benchmarkService.getDeepHistoryData();
    }

    @UsePipes(new ValidationPipe())
    @Post('/hypothetical-swaps')
    async createHypotheticalSwap(
        @Body() dto: HypotheticalSwapDto,
    ): Promise<HypotheticalSwap[]> {
        return this.hypotheticalSwapService.createHypotheticalSwaps(dto);
    }

    @Get('/hypothetical-swaps')
    async getHypotheticalSwaps(): Promise<HypotheticalSwap[]> {
        // return this.hypotheticalSwapService.getHypotheticalSwaps();
        return this.hypotheticalSwapService.getAllHypotheticalSwaps();
    }

    @Get('/hypothetical-swaps/results')
    async getHypotheticalSwapResults(
        @Query('tin') tokenIn: string,
        @Query('tout') tokenOut: string,
        @Query('a') amount: string,
    ): Promise<HypotheticalSwapResult[]> {
        return this.hypotheticalSwapService.getHypotheticalSwapResults(
            tokenIn,
            tokenOut,
            amount,
            {
                autoRouterAmountOut: 0,
                autoRouterRoute: 0,
                autoRouterIntermediaryAmounts: 0,
                smartRouterAmountOut: 0,
                smartRouterRoutes: 0,
                smartRouterIntermediaryAmounts: 0,
                swap: 0,
            },
        );
    }

    @Get('/hypothetical-swaps/token-results')
    async getHypotheticalSwapResultsForTokens(
        @Query('tin') tokenIn: string,
        @Query('tout') tokenOut: string,
    ): Promise<HypotheticalSwapResult[]> {
        return this.hypotheticalSwapService.getHypotheticalSwapResultsForTokens(
            tokenIn,
            tokenOut,
            {
                autoRouterAmountOut: 0,
                autoRouterRoute: 0,
                autoRouterIntermediaryAmounts: 0,
                smartRouterAmountOut: 0,
                smartRouterRoutes: 0,
                smartRouterIntermediaryAmounts: 0,
                // swap: 0,
            },
        );
    }

    @UsePipes(new ValidationPipe())
    @Post('/run-hypothetical-swaps')
    async runHypotheticalBenchmark(): Promise<string> {
        return this.benchmarkService.runHypotheticalBenchmark();
    }
}
