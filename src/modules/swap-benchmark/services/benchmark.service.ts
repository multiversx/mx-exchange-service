import { Injectable } from '@nestjs/common';
import { SwapBenchmarkSnapshotService } from './snapshot.service';
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
    getPairsRoute,
    getPriceImpactPercents,
} from 'src/modules/auto-router/router.utils';
import {
    HistoricalSwapRepositoryService,
    HypotheticalSwapRepositoryService,
    HypotheticalSwapResultRepositoryService,
    PairSnapshotRepositoryService,
} from './repository.service';
import BigNumber from 'bignumber.js';
import {
    HypotheticalSwapDocument,
    HypotheticalSwapResult,
} from '../schemas/hypothetical.swap.schema';
import { HypotheticalSwapService } from './hypothetical.swap.service';
import { HOURLY_TIMESTAMPS } from '../benchmark.constants';

interface ISmartRouterService {
    computeBestSwapRoute(
        paths: string[][],
        pairs: PairModel[],
        amount: string,
    ): ParallelRouteSwap;
}

type MultiSwapArgs = {
    args: AutoRouterArgs;
    paths: string[][];
    tokenInID: string;
    tokenOutID: string;
    pairs: PairModel[];
    allTokensMetadata: Map<string, BaseEsdtToken>;
    // allTokensPriceUSD: Map<string, string>;
};

export type DeepHistorySwap = {
    timestamp: number;
    txHash: string;
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    amountOut: {
        actual: string;
        autoRouter: string;
        smartRouter: string;
    };
    tokenRoutes: {
        autoRouter: string[];
        smartRouter: string[][];
    };
    intermediaryAmounts: {
        autoRouter: string[];
        smartRouter: string[][];
    };
};

@Injectable()
export class SwapBenchmarkService {
    private readonly logger = new OriginLogger(SwapBenchmarkService.name);
    constructor(
        private readonly snapshotService: SwapBenchmarkSnapshotService,
        private readonly autoRouterComputeService: AutoRouterComputeService,
        private readonly smartRouterService: SmartRouterService,
        private readonly cacheService: CacheService,
        private readonly historicalSwapRepository: HistoricalSwapRepositoryService,
        private readonly pairSnapshotRepository: PairSnapshotRepositoryService,
        private readonly hypotheticalSwapRepository: HypotheticalSwapRepositoryService,
        private readonly hypotheticalSwapResultRepository: HypotheticalSwapResultRepositoryService,
        private readonly hypotheticalSwapService: HypotheticalSwapService,
    ) {}

    async getDeepHistoryData(): Promise<{
        swaps: DeepHistorySwap[];
        tokens: EsdtToken[];
    }> {
        const tokensMetadata = await this.snapshotService.getTokensMetadata();

        const entity = this.historicalSwapRepository.getEntity();
        const cursor = entity.find({}).cursor();

        const result: DeepHistorySwap[] = [];
        for (
            let doc = await cursor.next();
            doc != null;
            doc = await cursor.next()
        ) {
            const originalTx = JSON.parse(doc.originalTx);
            result.push({
                timestamp: doc.timestamp,
                txHash: originalTx._search,
                tokenIn: doc.tokenIn,
                tokenOut: doc.tokenOut,
                amountIn: doc.amountIn,
                amountOut: {
                    actual: doc.actualAmountOut,
                    autoRouter: doc.autoRouterAmountOut,
                    smartRouter: doc.smartRouterAmountOut,
                },
                tokenRoutes: {
                    autoRouter: doc.autoRouterRoute,
                    smartRouter: doc.smartRouterRoutes,
                },
                intermediaryAmounts: {
                    autoRouter: doc.autoRouterIntermediaryAmounts,
                    smartRouter: doc.smartRouterIntermediaryAmounts,
                },
            });
        }

        const uniqueTokens: EsdtToken[] = [];
        tokensMetadata.forEach((token) =>
            uniqueTokens.push(
                new EsdtToken({
                    identifier: token.identifier,
                    decimals: token.decimals,
                    // price: '0',
                }),
            ),
        );

        return {
            swaps: result,
            tokens: uniqueTokens,
        };
    }

    async pruneHypotheticalSwapResults(): Promise<string> {
        // await this.hypotheticalSwapResultRepository.deleteMany({
        //     timestamp: { $nin: HOURLY_TIMESTAMPS },
        // });

        // const wrongSwaps = await this.hypotheticalSwapRepository.deleteMany({
        //     tokenIn: 'USDC-c76f1f',
        //     tokenOut: 'FOXSY-5d5f3e',
        // });

        // for (const swap of wrongSwaps) {
        //     const results = await this.hypotheticalSwapResultRepository.find({
        //         swap: swap,
        //     });
        //     console.log(results.length);
        // }

        // const model = this.hypotheticalSwapResultRepository.getEntity();
        // const count = await model
        //     .find({ timestamp: { $nin: HOURLY_TIMESTAMPS } })
        //     .count();
        // console.log(count);
        return 'ok';
    }

    async runHypotheticalBenchmark(): Promise<string> {
        const tokensMetadata = await this.snapshotService.getTokensMetadata();

        const hypotheticalSwaps = await this.hypotheticalSwapRepository.find(
            { tokenIn: 'USH-111e09', tokenOut: 'UTK-2f80e9' },
            { _id: 1 },
        );

        const entity = this.pairSnapshotRepository.getEntity();
        const cursor = entity
            .find({ timestamp: { $in: HOURLY_TIMESTAMPS } })
            .cursor();
        // const cursor = entity.find({ timestamp: 1741369536 }).cursor();
        let ct = 1;
        for (
            let snapshot = await cursor.next();
            snapshot != null;
            snapshot = await cursor.next()
        ) {
            console.log(`snapshot : ${ct}`);
            ct += 1;

            const { pairs, timestamp } = snapshot;

            const allPaths = await Promise.all(
                hypotheticalSwaps.map((swap) =>
                    this.getAllPaths(
                        pairs,
                        swap.tokenIn,
                        swap.tokenOut,
                        timestamp,
                    ),
                ),
            );

            const results: HypotheticalSwapResult[] = [];
            for (const [index, swap] of hypotheticalSwaps.entries()) {
                if (allPaths[index].length === 0) {
                    // console.log(
                    //     `Missing paths. Skipping swap [${swap.tokenIn},${swap.tokenOut}] @ ${timestamp}`,
                    // );
                    continue;
                }

                const swapResult = this.simulateSwap(
                    timestamp,
                    swap,
                    allPaths[index],
                    pairs,
                    tokensMetadata,
                );
                results.push(swapResult);
            }

            if (results.length > 0) {
                try {
                    await this.hypotheticalSwapService.createManySwapResults(
                        results,
                    );
                    console.log(
                        `ADDED ${results.length} results for timestamp ${timestamp}`,
                    );
                } catch (error) {
                    if (error.code && error.code === 11000) {
                        console.log(
                            `DUPLICATES. failed to insert @ timestamp : ${timestamp}`,
                        );
                    } else {
                        throw error;
                    }
                }
            }
        }

        return 'ok';
    }

    simulateSwap(
        timestamp: number,
        swap: HypotheticalSwapDocument,
        paths: string[][],
        pairs: PairModel[],
        tokensMetadata: Map<string, BaseEsdtToken>,
    ): HypotheticalSwapResult {
        const swapArgs: AutoRouterArgs = {
            tokenInID: swap.tokenIn,
            tokenOutID: swap.tokenOut,
            amountIn: swap.amountIn,
            tolerance: 0.01,
        };

        const multiSwapArgs: MultiSwapArgs = {
            args: swapArgs,
            paths,
            pairs,
            allTokensMetadata: tokensMetadata,
            tokenInID: swapArgs.tokenInID,
            tokenOutID: swapArgs.tokenOutID,
        };

        const autoRouterResult = this.benchmarkMultiSwap(
            swapArgs,
            paths,
            swapArgs.tokenInID,
            swapArgs.tokenOutID,
            pairs,
            tokensMetadata,
        );
        const smartRouterResult = this.computeBestSwapRoute(
            this.smartRouterService,
            multiSwapArgs,
        );

        const tokenOut = tokensMetadata.get(swap.tokenOut);
        const autoRouterAmountOutNum = new BigNumber(autoRouterResult.amountOut)
            .multipliedBy(`1e-${tokenOut.decimals}`)
            .toNumber();
        const smartRouterAmountOutNum = new BigNumber(
            smartRouterResult.amountOut,
        )
            .multipliedBy(`1e-${tokenOut.decimals}`)
            .toNumber();

        const swapResult: HypotheticalSwapResult = {
            timestamp,
            swap: swap._id,
            autoRouterAmountOut: autoRouterResult.amountOut,
            autoRouterAmountOutNum,
            autoRouterRoute: autoRouterResult.tokenRoute,
            autoRouterIntermediaryAmounts: autoRouterResult.intermediaryAmounts,
            smartRouterAmountOut: smartRouterResult.amountOut,
            smartRouterAmountOutNum,
            smartRouterRoutes: smartRouterResult.routeAllocations.map(
                (allocation) => allocation.tokenRoute,
            ),
            smartRouterIntermediaryAmounts:
                smartRouterResult.routeAllocations.map(
                    (allocation) => allocation.intermediaryAmounts,
                ),
        };

        return swapResult;
    }

    // async getUniquePaths();

    async runDeepHistoryBenchmark(): Promise<string> {
        // get all tokens for current router pairs;
        const tokensMetadata = await this.snapshotService.getTokensMetadata();

        // start + end timestamps

        const entity = this.historicalSwapRepository.getEntity();
        const cursor = entity.find({}).cursor();
        // const cursor = entity
        //     .find({
        //         $and: [
        //             { timestamp: { $gt: 1741096985 } },
        //             { timestamp: { $lt: 1741096987 } },
        //         ],
        //     })
        //     .cursor();

        // loop over all swaps
        for (
            let doc = await cursor.next();
            doc != null;
            doc = await cursor.next()
        ) {
            const timestamp = doc.prevBlockTimestamp;

            const swapArgs: AutoRouterArgs = {
                tokenInID: doc.tokenIn,
                tokenOutID: doc.tokenOut,
                amountIn: doc.amountIn,
                tolerance: 0.01,
            };

            // get pair snapshot
            const pairs = await this.snapshotService.getPairSnapshotFromDb(
                timestamp,
            );

            const paths = await this.getAllPaths(
                pairs,
                swapArgs.tokenInID,
                swapArgs.tokenOutID,
                timestamp,
            );

            const multiSwapArgs: MultiSwapArgs = {
                args: swapArgs,
                paths,
                pairs,
                allTokensMetadata: tokensMetadata,
                tokenInID: swapArgs.tokenInID,
                tokenOutID: swapArgs.tokenOutID,
            };

            const autoRouterResult = await this.benchmarkMultiSwap(
                swapArgs,
                paths,
                swapArgs.tokenInID,
                swapArgs.tokenOutID,
                pairs,
                tokensMetadata,
            );

            const smartRouterResult = await this.computeBestSwapRoute(
                this.smartRouterService,
                multiSwapArgs,
            );

            await this.historicalSwapRepository.findOneAndUpdate(
                { timestamp: doc.timestamp },
                {
                    autoRouterAmountOut: autoRouterResult.amountOut,
                    smartRouterAmountOut: smartRouterResult.amountOut,
                    autoRouterRoute: autoRouterResult.tokenRoute,
                    autoRouterIntermediaryAmounts:
                        autoRouterResult.intermediaryAmounts,
                    smartRouterRoutes: smartRouterResult.routeAllocations.map(
                        (allocation) => allocation.tokenRoute,
                    ),
                    smartRouterIntermediaryAmounts:
                        smartRouterResult.routeAllocations.map(
                            (allocation) => allocation.intermediaryAmounts,
                        ),
                },
            );

            const diff = new BigNumber(smartRouterResult.amountOut).minus(
                autoRouterResult.amountOut,
            );

            if (diff.toFixed() !== '0') {
                console.log('DIFFERENCE FOUND', diff.toFixed(), doc.timestamp);

                // console.log(smartRouterResult);
                // console.log(autoRouterResult);
            } else {
                // console.log('Same', doc.timestamp);
            }
            // console.log({
            //     autoRouterOut: autoRouterResult.amountOut,
            //     smartRouterOut: smartRouterResult.amountOut,
            // });
        }

        return 'ok';
    }

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
        const { pairs, tokensMetadata } =
            await this.snapshotService.getSnapshot(timestamp);
        const paths = await this.getAllPaths(
            pairs,
            swapArgs.tokenInID,
            swapArgs.tokenOutID,
            timestamp,
        );

        const multiSwapArgs: MultiSwapArgs = {
            args: swapArgs,
            paths,
            pairs,
            allTokensMetadata: tokensMetadata,
            // allTokensPriceUSD: tokensPriceUSD,
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
            // tokensPriceUSD,
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

    benchmarkMultiSwap(
        args: AutoRouterArgs,
        paths: string[][],
        tokenInID: string,
        tokenOutID: string,
        pairs: PairModel[],
        allTokensMetadata: Map<string, BaseEsdtToken>,
        // allTokensPriceUSD: Map<string, string>,
    ): AutoRouteModel {
        let swapRoute: BestSwapRoute;
        const pairsMap = new Map(pairs.map((pair) => [pair.address, pair]));
        try {
            swapRoute = this.autoRouterComputeService.computeBestSwapRoute(
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

        // const priceDeviationPercent = calculateTokenPriceDeviationPercent(
        //     swapRoute.tokenRoute,
        //     swapRoute.intermediaryAmounts,
        //     swapRoute.tokenRoute.map((tokenID) =>
        //         allTokensMetadata.get(tokenID),
        //     ),
        //     swapRoute.tokenRoute.map((tokenID) =>
        //         allTokensPriceUSD.get(tokenID),
        //     ),
        // );

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
            // tokenInPriceUSD: allTokensPriceUSD.get(tokenInID),
            // tokenOutPriceUSD: allTokensPriceUSD.get(tokenOutID),
            amountIn: args.amountIn,
            amountOut: swapRoute.bestResult,
            intermediaryAmounts: swapRoute.intermediaryAmounts,
            tokenRoute: swapRoute.tokenRoute,
            pairs: getPairsRoute(swapRoute.addressRoute, pairs),
            pricesImpact: getPriceImpactPercents(
                swapRoute.intermediaryAmounts,
                swapRoute.tokenRoute,
                swapRoute.addressRoute.map((address) => pairsMap.get(address)),
            ),
            tolerance: args.tolerance,
            // maxPriceDeviationPercent: constantsConfig.MAX_SWAP_SPREAD,
            // tokensPriceDeviationPercent: priceDeviationPercent,
        });
    }

    computeBestSwapRoute(
        routerService: ISmartRouterService,
        multiSwapArgs: MultiSwapArgs,
    ): MultiHopRouteModel {
        try {
            const swapRoute = routerService.computeBestSwapRoute(
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
                // multiSwapArgs.allTokensPriceUSD,
            );
        } catch (error) {
            this.logger.error(
                'Error when computing the swap multi route.',
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
        // allTokensPriceUSD: Map<string, string>,
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
                    // tokensPriceDeviationPercent:
                    //     calculateTokenPriceDeviationPercent(
                    //         allocation.tokenRoute,
                    //         allocation.intermediaryAmounts,
                    //         allocation.tokenRoute.map((tokenID) =>
                    //             allTokensMetadata.get(tokenID),
                    //         ),
                    //         allocation.tokenRoute.map((tokenID) =>
                    //             allTokensPriceUSD.get(tokenID),
                    //         ),
                    //     ),
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
            // tokenInPriceUSD: allTokensPriceUSD.get(tokenInID),
            // tokenOutPriceUSD: allTokensPriceUSD.get(tokenOutID),
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
        timestamp: number,
    ): Promise<string[][]> {
        // return GraphService.getInstance(pairs).getAllPaths(source, destination);
        const cacheKey = generateCacheKeyFromParams(
            `benchmark.${timestamp}.auto.route.paths`,
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
                Constants.oneHour(),
                Constants.oneHour(),
            );
        } catch (error) {}
    }
}
