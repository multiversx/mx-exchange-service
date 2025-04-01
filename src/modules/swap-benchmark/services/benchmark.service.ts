import { Injectable } from '@nestjs/common';
import { SwapBenchmarkSnapshotService } from './snapshot.service';
import { AutoRouterArgs } from 'src/modules/auto-router/models/auto-router.args';
import {
    AutoRouteModel,
    SWAP_TYPE,
} from 'src/modules/auto-router/models/auto-route.model';
import { BaseEsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { Constants, OriginLogger } from '@multiversx/sdk-nestjs-common';
import { denominateAmount } from 'src/utils/token.converters';
import { constantsConfig } from 'src/config';
import { PairModel } from 'src/modules/pair/models/pair.model';
import {
    AutoRouterComputeService,
    BestSwapRoute,
} from 'src/modules/auto-router/services/auto-router.compute.service';
import {
    ParallelRouteSwap,
    ParallelRouteAllocation,
} from '../../auto-router/models/parallel.router.models';
import { CacheService } from 'src/services/caching/cache.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { GraphService } from 'src/modules/auto-router/services/graph.service';
import { SmartRouterService } from '../../auto-router/services/smart.router.service';
import {
    MultiHopRouteModel,
    RouteAllocation,
} from '../models/benchmark.models';
import {
    addTolerance,
    calculateExchangeRate,
    calculateTokenPriceDeviationPercent,
    getPairsRoute,
    getPriceImpactPercents,
} from 'src/modules/auto-router/router.utils';

interface ISmartRouterService {
    computeBestSwapRoute(
        paths: string[][],
        pairs: PairModel[],
        amount: string,
    ): Promise<ParallelRouteSwap>;
}

type MultiSwapArgs = {
    args: AutoRouterArgs;
    paths: string[][];
    tokenInID: string;
    tokenOutID: string;
    pairs: PairModel[];
    allTokensMetadata: Map<string, BaseEsdtToken>;
    allTokensPriceUSD: Map<string, string>;
};

@Injectable()
export class SwapBenchmarkService {
    private readonly logger = new OriginLogger(SwapBenchmarkService.name);
    constructor(
        private readonly snapshotService: SwapBenchmarkSnapshotService,
        private readonly autoRouterComputeService: AutoRouterComputeService,
        private readonly smartRouterService: SmartRouterService,
        private readonly cacheService: CacheService,
    ) {}

    async runBenchmark(
        timestamp: number,
        swapArgs: AutoRouterArgs,
    ): Promise<{
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
            tokenInID: swapArgs.tokenInID,
            tokenOutID: swapArgs.tokenOutID,
        };

        // for (const path of paths) {
        //     this.logger.log(path.map((token) => token.split('-')[0]).join('-'));
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
        );
        currentPerf.stop();
        perfDuration['current'] = `${currentPerf.duration}ms`;

        const routers = [
            {
                routerName: 'Smart Router',
                service: this.smartRouterService,
            },
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
    ): Promise<AutoRouteModel> {
        let swapRoute: BestSwapRoute;
        const pairsMap = new Map(pairs.map((pair) => [pair.address, pair]));
        try {
            swapRoute =
                await this.autoRouterComputeService.computeBestSwapRoute(
                    paths,
                    pairs,
                    args.amountIn,
                    SWAP_TYPE.fixedInput,
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
                args.amountIn,
                swapRoute.bestResult,
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
            swapType: SWAP_TYPE.fixedInput,
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
            const swapRoute = await routerService.computeBestSwapRoute(
                multiSwapArgs.paths,
                multiSwapArgs.pairs,
                multiSwapArgs.args.amountIn,
            );

            return this.computeMultiHopResult(
                multiSwapArgs.args,
                swapRoute,
                multiSwapArgs.tokenInID,
                multiSwapArgs.tokenOutID,
                multiSwapArgs.pairs,
                multiSwapArgs.allTokensMetadata,
                multiSwapArgs.allTokensPriceUSD,
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
                args.amountIn,
                swapRoutes.totalResult,
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
            swapType: SWAP_TYPE.fixedInput,
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
