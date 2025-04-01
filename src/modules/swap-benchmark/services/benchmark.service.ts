import { Injectable } from '@nestjs/common';
import {
    BenchmarkSnapshotResponse,
    SwapBenchmarkSnapshotService,
} from './snapshot.service';
import { AutoRouterArgs } from 'src/modules/auto-router/models/auto-router.args';
import {
    AutoRouteModel,
    SWAP_TYPE,
} from 'src/modules/auto-router/models/auto-route.model';
import {
    BaseEsdtToken,
    EsdtToken,
} from 'src/modules/tokens/models/esdtToken.model';
import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { Constants, OriginLogger } from '@multiversx/sdk-nestjs-common';
import { denominateAmount } from 'src/utils/token.converters';
import { constantsConfig } from 'src/config';
import { PairModel } from 'src/modules/pair/models/pair.model';
import {
    AutoRouterComputeService,
    BestSwapRoute,
} from 'src/modules/auto-router/services/auto-router.compute.service';
import { O1SmartRouterService } from './o1/o1.smart.router.service';
import { GrokSmartRouterService } from './grok.smart.router.service';
import { ClaudeV2SmartRouterService } from './claude/claude.v2.smart.router.service';
import {
    MultiHopRouteModel,
    ParallelRouteAllocation,
    RouteAllocation,
} from '../models/models';
import { CacheService } from 'src/services/caching/cache.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { GraphService } from 'src/modules/auto-router/services/graph.service';
import {
    addTolerance,
    calculateExchangeRate,
    calculateTokenPriceDeviationPercent,
    getPairsRoute,
    getPriceImpactPercents,
    isFixedInput,
} from '../router.utils';
import { ClaudeV3SmartRouterService } from './claude/claude.v3.smart.router.service';
import { O1SmartRouterServiceV3 } from './o1/o1.smart.router.v3.service';
import { O1SmartRouterServiceV4 } from './o1/o1.smart.router.v4.service';
import { ClaudeV4SmartRouterService } from './claude/claude.v4.smart.router.service';
import { GeminiSmartRouterService } from './gemini.smart.router.service';
import { RC1SmartRouterService } from './release-candidates/rc1.smart.router.service';
import { RC2SmartRouterService } from './release-candidates/rc2.smart.router.service';
import { RC3SmartRouterService } from './release-candidates/rc3.smart.router.service';
import { RC4SmartRouterService } from './release-candidates/rc4.smart.router.service';

export const STEPS = 100;

interface ISmartRouterService {
    computeBestSwapRoute(
        paths: string[][],
        pairs: PairModel[],
        amount: string,
        swapType: SWAP_TYPE,
    ): Promise<{
        allocations: ParallelRouteAllocation[];
        totalResult: string;
    }>;
}

type MultiSwapArgs = {
    args: AutoRouterArgs;
    paths: string[][];
    tokenInID: string;
    tokenOutID: string;
    pairs: PairModel[];
    allTokensMetadata: Map<string, BaseEsdtToken>;
    allTokensPriceUSD: Map<string, string>;
    swapType: SWAP_TYPE;
};

@Injectable()
export class SwapBenchmarkService {
    private readonly logger = new OriginLogger(SwapBenchmarkService.name);
    constructor(
        private readonly snapshotService: SwapBenchmarkSnapshotService,
        private readonly autoRouterComputeService: AutoRouterComputeService,
        private readonly o1SmartRouter: O1SmartRouterService,
        private readonly o1SmartRouterV3: O1SmartRouterServiceV3,
        private readonly o1SmartRouterV4: O1SmartRouterServiceV4,
        private readonly grokSmartRouter: GrokSmartRouterService,
        private readonly claudeV2SmartRouter: ClaudeV2SmartRouterService,
        private readonly claudeV3SmartRouter: ClaudeV3SmartRouterService,
        private readonly claudeV4SmartRouter: ClaudeV4SmartRouterService,
        private readonly geminiSmartRouter: GeminiSmartRouterService,
        private readonly rc1SmartRouter: RC1SmartRouterService,
        private readonly rc2SmartRouter: RC2SmartRouterService,
        private readonly rc3SmartRouter: RC3SmartRouterService,
        private readonly rc4SmartRouter: RC4SmartRouterService,
        private readonly cacheService: CacheService,
    ) {}

    async runBenchmark(
        timestamp: number,
        swapArgs: AutoRouterArgs,
    ): Promise<{
        snapshot: BenchmarkSnapshotResponse;
        current: AutoRouteModel;
        optimized: {
            name: string;
            multiHop: MultiHopRouteModel;
        }[];
    }> {
        const { pairs, tokensMetadata, tokensPriceUSD } =
            await this.snapshotService.getSnapshot(timestamp);
        const paths = await this.getAllPaths(
            pairs,
            swapArgs.tokenInID,
            swapArgs.tokenOutID,
        );

        const multiSwapArgs: MultiSwapArgs = {
            args: swapArgs,
            paths,
            pairs,
            allTokensMetadata: tokensMetadata,
            allTokensPriceUSD: tokensPriceUSD,
            swapType: SWAP_TYPE.fixedInput,
            tokenInID: swapArgs.tokenInID,
            tokenOutID: swapArgs.tokenOutID,
        };

        // for (const path of paths) {
        //     console.log(path.map((token) => token.split('-')[0]).join('-'));
        // }
        this.logger.log(`TOTAL PATHS: ${paths.length}`);
        const perfDuration: Record<string, string> = {};

        const currentPerf = new PerformanceProfiler();
        const current = await this.benchmarkMultiSwap(
            swapArgs,
            paths,
            swapArgs.tokenInID,
            swapArgs.tokenOutID,
            pairs,
            tokensMetadata,
            tokensPriceUSD,
            SWAP_TYPE.fixedInput,
        );
        currentPerf.stop();
        perfDuration['current'] = `${currentPerf.duration}ms`;

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

        const routers = [
            // {
            //     routerName: 'O1V3',
            //     service: this.o1SmartRouterV3,
            // },
            // {
            //     routerName: 'RC1',
            //     service: this.rc1SmartRouter,
            // },
            // {
            //     routerName: 'RC2-iterative',
            //     service: this.rc2SmartRouter,
            // },
            // {
            //     routerName: 'RC3-lagrange',
            //     service: this.rc3SmartRouter,
            // },
            {
                routerName: 'RC4-lagrange',
                service: this.rc4SmartRouter,
            },
            // {
            //     routerName: 'O1V4',
            //     service: this.o1SmartRouterV4,
            // },
            // {
            //     routerName: 'ClaudeV2',
            //     service: this.claudeV2SmartRouter,
            // },
            // {
            //     routerName: 'ClaudeV4',
            //     service: this.claudeV4SmartRouter,
            // },
            // {
            //     routerName: 'Gemini',  // iterative
            //     service: this.geminiSmartRouter,
            // },
        ];

        const result: { name: string; multiHop: MultiHopRouteModel }[] = [];
        for (const router of routers) {
            const profiler = new PerformanceProfiler();
            const multiHop = await this.computeBestSwapRoute(
                router.service,
                multiSwapArgs,
            );
            profiler.stop();

            perfDuration[router.routerName] = `${profiler.duration}ms`;
            result.push({
                name: router.routerName,
                multiHop,
            });
        }

        this.logger.log(perfDuration);

        return {
            snapshot: {
                pairs,
                tokensMetadata: uniqueTokens,
            },
            current,
            optimized: result,
        };
    }

    async benchmarkMultiSwap(
        args: AutoRouterArgs,
        paths: string[][],
        tokenInID: string,
        tokenOutID: string,
        pairs: PairModel[],
        allTokensMetadata: Map<string, BaseEsdtToken>,
        allTokensPriceUSD: Map<string, string>,
        swapType: SWAP_TYPE,
    ): Promise<AutoRouteModel> {
        let swapRoute: BestSwapRoute;
        const pairsMap = new Map(pairs.map((pair) => [pair.address, pair]));
        try {
            swapRoute = isFixedInput(swapType)
                ? await this.autoRouterComputeService.computeBestSwapRoute(
                      paths,
                      pairs,
                      args.amountIn,
                      swapType,
                  )
                : await this.autoRouterComputeService.computeBestSwapRoute(
                      paths,
                      pairs,
                      args.amountOut,
                      swapType,
                  );
        } catch (error) {
            this.logger.error(
                'Error when computing the swap auto route.',
                error,
            );
            throw error;
        }

        const [tokenInMetadata, tokenOutMetadata] = [
            allTokensMetadata.get(tokenInID),
            allTokensMetadata.get(tokenOutID),
        ];

        const [tokenInExchangeRate, tokenOutExchangeRate] =
            calculateExchangeRate(
                tokenInMetadata.decimals,
                tokenOutMetadata.decimals,
                isFixedInput(swapType) ? args.amountIn : swapRoute.bestResult,
                isFixedInput(swapType) ? swapRoute.bestResult : args.amountOut,
            );

        const priceDeviationPercent = calculateTokenPriceDeviationPercent(
            swapRoute.tokenRoute,
            swapRoute.intermediaryAmounts,
            swapRoute.tokenRoute.map((tokenID) =>
                allTokensMetadata.get(tokenID),
            ),
            swapRoute.tokenRoute.map((tokenID) =>
                allTokensPriceUSD.get(tokenID),
            ),
        );

        return new AutoRouteModel({
            swapType: swapType,
            tokenInID: args.tokenInID,
            tokenOutID: args.tokenOutID,
            tokenInExchangeRate: tokenInExchangeRate,
            tokenOutExchangeRate: tokenOutExchangeRate,
            tokenInExchangeRateDenom: denominateAmount(
                tokenInExchangeRate,
                tokenOutMetadata.decimals,
            ).toString(),
            tokenOutExchangeRateDenom: denominateAmount(
                tokenOutExchangeRate,
                tokenInMetadata.decimals,
            ).toString(),
            tokenInPriceUSD: allTokensPriceUSD.get(tokenInID),
            tokenOutPriceUSD: allTokensPriceUSD.get(tokenOutID),
            amountIn:
                args.amountIn ||
                addTolerance(swapRoute.bestResult, args.tolerance),
            amountOut: args.amountOut || swapRoute.bestResult,
            intermediaryAmounts: swapRoute.intermediaryAmounts,
            tokenRoute: swapRoute.tokenRoute,
            pairs: getPairsRoute(swapRoute.addressRoute, pairs),
            pricesImpact: getPriceImpactPercents(
                swapRoute.intermediaryAmounts,
                swapRoute.tokenRoute,
                swapRoute.addressRoute.map((address) => pairsMap.get(address)),
            ),
            tolerance: args.tolerance,
            maxPriceDeviationPercent: constantsConfig.MAX_SWAP_SPREAD,
            tokensPriceDeviationPercent: priceDeviationPercent,
        });
    }

    async computeBestSwapRoute(
        routerService: ISmartRouterService,
        multiSwapArgs: MultiSwapArgs,
    ): Promise<MultiHopRouteModel> {
        try {
            const swapRoute = isFixedInput(multiSwapArgs.swapType)
                ? await routerService.computeBestSwapRoute(
                      multiSwapArgs.paths,
                      multiSwapArgs.pairs,
                      multiSwapArgs.args.amountIn,
                      multiSwapArgs.swapType,
                  )
                : await routerService.computeBestSwapRoute(
                      multiSwapArgs.paths,
                      multiSwapArgs.pairs,
                      multiSwapArgs.args.amountOut,
                      multiSwapArgs.swapType,
                  );
            return this.computeMultiHopResult(
                multiSwapArgs.args,
                swapRoute,
                multiSwapArgs.tokenInID,
                multiSwapArgs.tokenOutID,
                multiSwapArgs.pairs,
                multiSwapArgs.allTokensMetadata,
                multiSwapArgs.allTokensPriceUSD,
                multiSwapArgs.swapType,
            );
        } catch (error) {
            this.logger.error(
                'Error when computing the swap auto route.',
                error,
            );
            throw error;
        }
    }

    computeMultiHopResult(
        args: AutoRouterArgs,
        swapRoutes: {
            allocations: ParallelRouteAllocation[];
            totalResult: string;
        },
        tokenInID: string,
        tokenOutID: string,
        pairs: PairModel[],
        allTokensMetadata: Map<string, BaseEsdtToken>,
        allTokensPriceUSD: Map<string, string>,
        swapType: SWAP_TYPE,
    ): MultiHopRouteModel {
        const pairsMap = new Map(pairs.map((pair) => [pair.address, pair]));

        const [tokenInMetadata, tokenOutMetadata] = [
            allTokensMetadata.get(tokenInID),
            allTokensMetadata.get(tokenOutID),
        ];

        const [tokenInExchangeRate, tokenOutExchangeRate] =
            calculateExchangeRate(
                tokenInMetadata.decimals,
                tokenOutMetadata.decimals,
                isFixedInput(swapType) ? args.amountIn : swapRoutes.totalResult,
                isFixedInput(swapType)
                    ? swapRoutes.totalResult
                    : args.amountOut,
            );

        const routeAllocations = swapRoutes.allocations.map(
            (allocation) =>
                new RouteAllocation({
                    tokenRoute: allocation.tokenRoute,
                    addressRoute: allocation.addressRoute,
                    inputAmount: allocation.inputAmount,
                    outputAmount: allocation.outputAmount,
                    intermediaryAmounts: allocation.intermediaryAmounts,
                    pricesImpact: getPriceImpactPercents(
                        allocation.intermediaryAmounts,
                        allocation.tokenRoute,
                        allocation.addressRoute.map((address) =>
                            pairsMap.get(address),
                        ),
                    ),
                    tokensPriceDeviationPercent:
                        calculateTokenPriceDeviationPercent(
                            allocation.tokenRoute,
                            allocation.intermediaryAmounts,
                            allocation.tokenRoute.map((tokenID) =>
                                allTokensMetadata.get(tokenID),
                            ),
                            allocation.tokenRoute.map((tokenID) =>
                                allTokensPriceUSD.get(tokenID),
                            ),
                        ),
                    pairs: allocation.addressRoute.map((address) =>
                        pairsMap.get(address),
                    ),
                }),
        );

        return new MultiHopRouteModel({
            swapType: swapType,
            tokenInID: args.tokenInID,
            tokenOutID: args.tokenOutID,
            tokenInExchangeRate: tokenInExchangeRate,
            tokenOutExchangeRate: tokenOutExchangeRate,
            tokenInExchangeRateDenom: denominateAmount(
                tokenInExchangeRate,
                tokenOutMetadata.decimals,
            ).toString(),
            tokenOutExchangeRateDenom: denominateAmount(
                tokenOutExchangeRate,
                tokenInMetadata.decimals,
            ).toString(),
            tokenInPriceUSD: allTokensPriceUSD.get(tokenInID),
            tokenOutPriceUSD: allTokensPriceUSD.get(tokenOutID),
            amountIn:
                args.amountIn ||
                addTolerance(swapRoutes.totalResult, args.tolerance),
            amountOut: args.amountOut || swapRoutes.totalResult,
            intermediaryAmounts: [],
            tokenRoute: [],
            pairs: [],
            tolerance: args.tolerance,
            maxPriceDeviationPercent: constantsConfig.MAX_SWAP_SPREAD,
            tokensPriceDeviationPercent: 0,
            routeAllocations,
        });
    }

    private async getAllPaths(
        pairs: PairModel[],
        source: string,
        destination: string,
    ): Promise<string[][]> {
        const cacheKey = generateCacheKeyFromParams(
            'benchmark.auto.route.paths',
            source,
            destination,
        );
        try {
            return await this.cacheService.getOrSet(
                cacheKey,
                async () =>
                    GraphService.getInstance(pairs).getAllPaths(
                        source,
                        destination,
                    ),
                Constants.oneWeek(),
                Constants.oneHour(),
            );
        } catch (error) {}
    }
}
