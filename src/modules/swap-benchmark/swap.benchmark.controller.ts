import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import {
    BenchmarkSnapshotResponse,
    SwapBenchmarkSnapshotService,
} from './services/snapshot.service';
import { SnapshotDto } from './dtos/create.snapshot.dto';
import { SwapBenchmarkService } from './services/benchmark.service';
import { AutoRouteModel } from '../auto-router/models/auto-route.model';
import { BenchmarkDto } from './dtos/benchmark.dto';
import { MultiHopRouteModel } from './models/benchmark.models';
import { EsdtToken } from '../tokens/models/esdtToken.model';

@Controller('swap-benchmark')
export class SwapBenchmarkController {
    constructor(
        private readonly snapshotService: SwapBenchmarkSnapshotService,
        private readonly benchmarkService: SwapBenchmarkService,
    ) {}

    // @UseGuards(JwtOrNativeAdminGuard)
    @UsePipes(new ValidationPipe())
    @Post('/snapshots')
    async createSnapshot(@Body() createDto: SnapshotDto): Promise<number> {
        await this.snapshotService.createSnapshotForTimestamp(
            createDto.timestamp,
        );
        return createDto.timestamp;
    }

    // @UseGuards(JwtOrNativeAdminGuard)
    @Get('/snapshots')
    async getAvailableSnapshots(): Promise<number[]> {
        return this.snapshotService.getAvailableSnapshots();
    }

    // @UseGuards(JwtOrNativeAdminGuard)
    @Get('/snapshots/:timestamp')
    async getSnapshotData(
        @Param('timestamp') timestamp: number,
    ): Promise<BenchmarkSnapshotResponse> {
        const { pairs, tokensMetadata, tokensPriceUSD } =
            await this.snapshotService.getSnapshot(timestamp);

        const uniqueTokens: EsdtToken[] = [];
        tokensMetadata.forEach((token) =>
            uniqueTokens.push(
                new EsdtToken({
                    identifier: token.identifier,
                    decimals: token.decimals,
                    price: tokensPriceUSD.get(token.identifier),
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
}
