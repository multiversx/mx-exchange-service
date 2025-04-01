import {
    Body,
    Controller,
    Get,
    Post,
    Res,
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
import { Response } from 'express';
import { MultiHopRouteModel } from './models/models';

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
    @UsePipes(new ValidationPipe())
    @Post('/run')
    async runBenchmark(@Body() benchmarkDto: BenchmarkDto): Promise<{
        snapshot: BenchmarkSnapshotResponse;
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

    @Get('/run')
    async benchmarkView(@Res() res: Response) {
        return res.render('template');
    }
}
