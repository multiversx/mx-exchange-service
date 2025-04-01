import { Module } from '@nestjs/common';
import { SwapBenchmarkSnapshotService } from './services/snapshot.service';
import { SwapBenchmarkController } from './swap.benchmark.controller';
import { RouterModule } from '../router/router.module';
import { PairModule } from '../pair/pair.module';
import { TokenModule } from '../tokens/token.module';
import { SwapBenchmarkService } from './services/benchmark.service';
import { AutoRouterModule } from '../auto-router/auto-router.module';
import { ClaudeV2SmartRouterService } from './services/claude/claude.v2.smart.router.service';
import { GrokSmartRouterService } from './services/grok.smart.router.service';
import { ClaudeV3SmartRouterService } from './services/claude/claude.v3.smart.router.service';
import { O1SmartRouterService } from './services/o1/o1.smart.router.service';
import { O1SmartRouterServiceV3 } from './services/o1/o1.smart.router.v3.service';
import { O1SmartRouterServiceV4 } from './services/o1/o1.smart.router.v4.service';
import { ClaudeV4SmartRouterService } from './services/claude/claude.v4.smart.router.service';
import { GeminiSmartRouterService } from './services/gemini.smart.router.service';
import { RC1SmartRouterService } from './services/release-candidates/rc1.smart.router.service';
import { RC2SmartRouterService } from './services/release-candidates/rc2.smart.router.service';
import { RC3SmartRouterService } from './services/release-candidates/rc3.smart.router.service';
import { RC4SmartRouterService } from './services/release-candidates/rc4.smart.router.service';

@Module({
    imports: [AutoRouterModule, RouterModule, PairModule, TokenModule],
    providers: [
        SwapBenchmarkSnapshotService,
        SwapBenchmarkService,
        O1SmartRouterService,
        O1SmartRouterServiceV3,
        O1SmartRouterServiceV4,
        ClaudeV2SmartRouterService,
        ClaudeV3SmartRouterService,
        ClaudeV4SmartRouterService,
        GrokSmartRouterService,
        GeminiSmartRouterService,
        RC1SmartRouterService,
        RC2SmartRouterService,
        RC3SmartRouterService,
        RC4SmartRouterService,
    ],
    controllers: [SwapBenchmarkController],
})
export class SwapBenchmarkModule {}
