import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import {
    BaseEsdtToken,
    EsdtToken,
} from 'src/modules/tokens/models/esdtToken.model';
import {
    AutoRouterComputeService,
    BestSwapRoute,
} from './auto-router.compute.service';
import { constantsConfig, mxConfig } from 'src/config';
import { AutoRouterArgs } from '../models/auto-router.args';
import {
    AutoRouteModel,
    SmartSwapModel,
    SmartSwapRoute,
    SwapRouteModel,
    SWAP_TYPE,
} from '../models/auto-route.model';
import { AutoRouterTransactionService } from './auto-router.transactions.service';
import { PairService } from 'src/modules/pair/services/pair.service';
import { PairTransactionService } from 'src/modules/pair/services/pair.transactions.service';
import { computeValueUSD, denominateAmount } from 'src/utils/token.converters';
import { RemoteConfigGetterService } from 'src/modules/remote-config/remote-config.getter.service';
import { GraphService } from './graph.service';
import { CacheService } from 'src/services/caching/cache.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { Constants } from '@multiversx/sdk-nestjs-common';
import { WrapAbiService } from 'src/modules/wrapping/services/wrap.abi.service';
import { TokenService } from 'src/modules/tokens/services/token.service';
import { TransactionModel } from 'src/models/transaction.model';
import { SmartRouterService } from './smart.router.service';
import {
    ParallelRouteAllocation,
    ParallelRouteSwap,
} from '../models/smart.router.types';
import { SmartRouterEvaluationService } from 'src/modules/smart-router-evaluation/services/smart.router.evaluation.service';
import { ComposableTasksAbiService } from 'src/modules/composable-tasks/services/composable.tasks.abi.service';
import { PairPopulate } from 'src/modules/persistence/entities';

@Injectable()
export class AutoRouterService {
    constructor(
        private readonly tokenService: TokenService,
        private readonly autoRouterComputeService: AutoRouterComputeService,
        private readonly autoRouterTransactionService: AutoRouterTransactionService,
        private readonly pairTransactionService: PairTransactionService,
        private readonly wrapAbi: WrapAbiService,
        private readonly pairService: PairService,
        private readonly remoteConfigGetterService: RemoteConfigGetterService,
        private readonly cacheService: CacheService,
        private readonly smartRouterService: SmartRouterService,
        private readonly smartRouterEvaluationService: SmartRouterEvaluationService,
        private readonly composeTasksAbi: ComposableTasksAbiService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    private async getAllPaths(
        pairs: PairModel[],
        source: string,
        destination: string,
    ): Promise<string[][]> {
        const cacheKey = generateCacheKeyFromParams(
            'auto.route.paths',
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
                Constants.oneMinute() * 10,
            );
        } catch (error) {}
    }

    async swap(args: AutoRouterArgs): Promise<AutoRouteModel> {
        if (args.amountIn && args.amountOut)
            throw new Error("Can't have both amountIn & amountOut");

        const [tokenInID, tokenOutID] = await this.toWrappedIfEGLD([
            args.tokenInID,
            args.tokenOutID,
        ]);

        const [multiSwapStatus, pairs, tokenInMetadata, tokenOutMetadata] =
            await Promise.all([
                this.remoteConfigGetterService.getMultiSwapStatus(),
                this.getAllActivePairs(),
                this.tokenService.tokenMetadata(tokenInID, [
                    'identifier',
                    'decimals',
                    'price',
                ]),
                this.tokenService.tokenMetadata(tokenOutID, [
                    'identifier',
                    'decimals',
                    'price',
                ]),
            ]);

        args.amountIn = this.setDefaultAmountInIfNeeded(args, tokenInMetadata);
        const swapType = this.getSwapType(args.amountIn, args.amountOut);

        if (!multiSwapStatus) {
            const directPair = pairs.find(
                (pair) =>
                    (pair.firstToken.identifier === tokenInID &&
                        pair.secondToken.identifier === tokenOutID) ||
                    (pair.firstToken.identifier === tokenOutID &&
                        pair.secondToken.identifier === tokenInID),
            );

            if (directPair !== undefined) {
                return this.singleSwap(
                    args,
                    tokenInID,
                    tokenOutID,
                    directPair,
                    tokenInMetadata,
                    tokenOutMetadata,
                    swapType,
                );
            } else {
                throw new Error('Multi swap disabled!');
            }
        }

        return this.multiSwap(
            args,
            tokenInID,
            tokenOutID,
            pairs,
            tokenInMetadata,
            tokenOutMetadata,
            swapType,
        );
    }

    async singleSwap(
        args: AutoRouterArgs,
        tokenInID: string,
        tokenOutID: string,
        pair: PairModel,
        tokenInMetadata: EsdtToken,
        tokenOutMetadata: EsdtToken,
        swapType: SWAP_TYPE,
    ): Promise<AutoRouteModel> {
        const isFixedInput = this.isFixedInput(swapType);

        const result = isFixedInput
            ? await this.pairService.getAmountOut(
                  pair.address,
                  tokenInID,
                  args.amountIn,
              )
            : await this.pairService.getAmountIn(
                  pair.address,
                  tokenOutID,
                  args.amountOut,
              );

        if (result === '0') {
            throw new BadRequestException('Invalid amounts');
        }

        let amountIn = isFixedInput ? args.amountIn : result;
        const amountOut = isFixedInput ? result : args.amountOut;

        const [tokenInExchangeRate, tokenOutExchangeRate] =
            this.calculateExchangeRate(
                tokenInMetadata.decimals,
                tokenOutMetadata.decimals,
                amountIn,
                amountOut,
            );

        if (!isFixedInput) {
            amountIn = this.addTolerance(amountIn, args.tolerance);
        }

        const priceDeviationPercent = await this.getTokenPriceDeviationPercent(
            [tokenInID, tokenOutID],
            [amountIn, amountOut],
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
            tokenInPriceUSD: tokenInMetadata.price,
            tokenOutPriceUSD: tokenOutMetadata.price,
            amountIn: amountIn,
            amountOut: amountOut,
            intermediaryAmounts: [amountIn, amountOut],
            tokenRoute: [tokenInID, tokenOutID],
            pairs: [pair],
            tolerance: args.tolerance,
            maxPriceDeviationPercent: constantsConfig.MAX_SWAP_SPREAD,
            tokensPriceDeviationPercent: priceDeviationPercent,
        });
    }

    async multiSwap(
        args: AutoRouterArgs,
        tokenInID: string,
        tokenOutID: string,
        pairs: PairModel[],
        tokenInMetadata: EsdtToken,
        tokenOutMetadata: EsdtToken,
        swapType: SWAP_TYPE,
    ): Promise<AutoRouteModel> {
        let swapRoute: BestSwapRoute;

        const paths = await this.getAllPaths(pairs, tokenInID, tokenOutID);

        const isFixedInput = this.isFixedInput(swapType);

        try {
            swapRoute = isFixedInput
                ? this.autoRouterComputeService.computeBestSwapRoute(
                      paths,
                      pairs,
                      args.amountIn,
                      swapType,
                  )
                : this.autoRouterComputeService.computeBestSwapRoute(
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

        for (const address of swapRoute.addressRoute) {
            const lockedTokensInfo = await this.pairService.getLockedTokensInfo(
                address,
            );
            if (
                lockedTokensInfo !== undefined &&
                swapRoute.addressRoute.length > 1
            ) {
                throw new Error('No swap route found');
            }
        }

        const [tokenInExchangeRate, tokenOutExchangeRate] =
            this.calculateExchangeRate(
                tokenInMetadata.decimals,
                tokenOutMetadata.decimals,
                isFixedInput ? args.amountIn : swapRoute.bestResult,
                isFixedInput ? swapRoute.bestResult : args.amountOut,
            );

        const priceDeviationPercent = await this.getTokenPriceDeviationPercent(
            swapRoute.tokenRoute,
            swapRoute.intermediaryAmounts,
        );

        let parallelRouteSwap: ParallelRouteSwap;
        let smartSwap: SmartSwapModel;

        if (this.isFixedInput(swapType)) {
            parallelRouteSwap = this.getSmartRouterSwap(
                paths,
                pairs,
                args.amountIn,
            );

            smartSwap = await this.computeSmartSwap(
                args.amountIn,
                swapRoute.bestResult,
                parallelRouteSwap,
                tokenInMetadata,
                tokenOutMetadata,
                pairs,
            );
        }

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
            tokenInPriceUSD: tokenInMetadata.price,
            tokenOutPriceUSD: tokenOutMetadata.price,
            amountIn:
                args.amountIn ||
                this.addTolerance(swapRoute.bestResult, args.tolerance),
            amountOut: args.amountOut || swapRoute.bestResult,
            intermediaryAmounts: swapRoute.intermediaryAmounts,
            tokenRoute: swapRoute.tokenRoute,
            pairs: this.getPairsRoute(swapRoute.addressRoute, pairs),
            tolerance: args.tolerance,
            maxPriceDeviationPercent: constantsConfig.MAX_SWAP_SPREAD,
            tokensPriceDeviationPercent: priceDeviationPercent,
            parallelRouteSwap: parallelRouteSwap ?? undefined,
            smartSwap: smartSwap ?? undefined,
        });
    }

    setDefaultAmountInIfNeeded(
        args: AutoRouterArgs,
        tokenInMetadata: BaseEsdtToken,
    ): string {
        if (!args.amountOut && !args.amountIn) {
            return new BigNumber(10)
                .pow(tokenInMetadata.decimals)
                .integerValue()
                .toFixed();
        }

        return args.amountIn;
    }

    getSwapType(amountIn: string, amountOut: string): SWAP_TYPE {
        if (amountIn && amountOut)
            throw new Error("Can't have both fixedInput & fixedOutput");

        if (amountIn) return SWAP_TYPE.fixedInput;
        else if (amountOut) return SWAP_TYPE.fixedOutput;

        throw new Error("Can't get SWAP_TYPE");
    }

    isFixedInput(swapType: SWAP_TYPE): boolean {
        if (swapType === SWAP_TYPE.fixedInput) return true;
        return false;
    }

    addTolerance(amountIn: string, tolerance: number): string {
        return new BigNumber(amountIn)
            .plus(new BigNumber(amountIn).multipliedBy(tolerance))
            .integerValue()
            .toFixed();
    }

    private async getAllActivePairs(): Promise<PairModel[]> {
        const pairs = await this.pairService.getPairs(
            { state: 'Active' },
            [
                'address',
                'firstTokenId',
                'firstToken',
                'secondTokenId',
                'secondToken',
                'info',
                'totalFeePercent',
            ],
            new PairPopulate({
                fields: ['firstToken', 'secondToken'],
                select: ['identifier', 'decimals', 'isPaused'],
            }),
        );

        const activePairs = pairs.filter(
            (pair) => !pair.firstToken.isPaused && !pair.secondToken.isPaused,
        );

        return activePairs.map((pair) => {
            return new PairModel({
                address: pair.address,
                firstToken: new EsdtToken({
                    identifier: pair.firstToken.identifier,
                    decimals: pair.firstToken.decimals,
                }),
                secondToken: new EsdtToken({
                    identifier: pair.secondToken.identifier,
                    decimals: pair.secondToken.decimals,
                }),
                info: pair.info,
                totalFeePercent: pair.totalFeePercent,
            });
        });
    }

    private async toWrappedIfEGLD(tokensIDs: string[]) {
        const wrappedEgldTokenID = await this.wrapAbi.wrappedEgldTokenID();

        return tokensIDs.map((t) => {
            return mxConfig.EGLDIdentifier === t ? wrappedEgldTokenID : t;
        });
    }

    private calculateExchangeRate(
        tokenInDecimals: number,
        tokenOutDecimals: number,
        amountIn: string,
        amountOut: string,
    ): string[] {
        if (amountIn === '0' || amountOut === '0') {
            return ['0', '0'];
        }

        const tokenInPrice = new BigNumber(10)
            .pow(tokenInDecimals)
            .multipliedBy(amountOut)
            .dividedBy(amountIn);
        const tokenOutPrice = new BigNumber(10)
            .pow(tokenOutDecimals)
            .multipliedBy(amountIn)
            .dividedBy(amountOut);
        return [
            tokenInPrice.integerValue().toFixed(),
            tokenOutPrice.integerValue().toFixed(),
        ];
    }

    getFeesDenom(
        intermediaryAmounts: string[],
        tokenRoute: string[],
        pairs: PairModel[],
    ): string[] {
        return pairs.map((pair: PairModel, index: number) => {
            return this.autoRouterComputeService.computeFeeDenom(
                pair.totalFeePercent,
                intermediaryAmounts[index],
                pair.firstToken.identifier === tokenRoute[index]
                    ? pair.firstToken.decimals
                    : pair.secondToken.decimals,
            );
        });
    }

    getPriceImpactPercents(
        intermediaryAmounts: string[],
        tokenRoute: string[],
        pairs: PairModel[],
    ): string[] {
        return pairs.map((pair, index) => {
            return this.autoRouterComputeService.computePriceImpactPercent(
                pair.firstToken.identifier === tokenRoute[index + 1]
                    ? pair.info.reserves0
                    : pair.info.reserves1,
                intermediaryAmounts[index + 1],
            );
        });
    }

    private getPairsRoute(
        addresses: string[],
        pairs: PairModel[],
    ): PairModel[] {
        const routePairs: PairModel[] = [];
        for (const address of addresses) {
            const pair = pairs.find((pair) => pair.address === address);
            if (pair !== undefined) {
                routePairs.push(pair);
            }
        }

        return routePairs;
    }

    async getTransactions(
        sender: string,
        parent: AutoRouteModel,
    ): Promise<TransactionModel[]> {
        if (parent.smartSwap !== undefined) {
            if (
                parent.smartSwap.tokensPriceDeviationPercent >
                parent.maxPriceDeviationPercent
            ) {
                throw new Error('Spread too big!');
            }

            try {
                const transactions =
                    await this.autoRouterTransactionService.smartSwap(sender, {
                        tokenInID: parent.tokenInID,
                        tokenOutID: parent.tokenOutID,
                        amountIn: parent.amountIn,
                        allocations: parent.parallelRouteSwap.allocations.map(
                            (allocation) => {
                                return {
                                    addressRoute: allocation.addressRoute,
                                    intermediaryAmounts:
                                        allocation.intermediaryAmounts,
                                    tokenRoute: allocation.tokenRoute,
                                };
                            },
                        ),
                        tolerance: parent.tolerance,
                    });

                await this.smartRouterEvaluationService.addFixedInputSwapComparison(
                    parent,
                    transactions[0],
                );

                return transactions;
            } catch (error) {
                this.logger.error(
                    'Error when computing the smart swap transactions.',
                    error,
                );
            }
        }

        if (parent.pairs.length == 1) {
            if (parent.swapType === SWAP_TYPE.fixedInput) {
                const transaction =
                    await this.pairTransactionService.swapTokensFixedInput(
                        sender,
                        {
                            pairAddress: parent.pairs[0].address,
                            tokenInID: parent.tokenInID,
                            tokenOutID: parent.tokenOutID,
                            amountIn: parent.amountIn,
                            amountOut: parent.amountOut,
                            tolerance: parent.tolerance,
                        },
                    );

                if (parent.parallelRouteSwap) {
                    await this.smartRouterEvaluationService.addFixedInputSwapComparison(
                        parent,
                        transaction,
                    );
                }

                return [transaction];
            }

            const transaction =
                await this.pairTransactionService.swapTokensFixedOutput(
                    sender,
                    {
                        pairAddress: parent.pairs[0].address,
                        tokenInID: parent.tokenInID,
                        tokenOutID: parent.tokenOutID,
                        amountIn: parent.amountIn,
                        amountOut: parent.amountOut,
                    },
                );

            return [transaction];
        }

        if (
            parent.tokensPriceDeviationPercent > parent.maxPriceDeviationPercent
        ) {
            throw new Error('Spread too big!');
        }

        const transactions =
            await this.autoRouterTransactionService.multiPairSwap(sender, {
                swapType: parent.swapType,
                tokenInID: parent.tokenInID,
                tokenOutID: parent.tokenOutID,
                addressRoute: parent.pairs.map((p) => {
                    return p.address;
                }),
                intermediaryAmounts: parent.intermediaryAmounts,
                tokenRoute: parent.tokenRoute,
                tolerance: parent.tolerance,
            });

        if (
            parent.parallelRouteSwap &&
            parent.swapType === SWAP_TYPE.fixedInput
        ) {
            await this.smartRouterEvaluationService.addFixedInputSwapComparison(
                parent,
                transactions[0],
            );
        }

        return transactions;
    }

    async getTokenPriceDeviationPercent(
        tokenRoute: string[],
        intermediaryAmounts: string[],
    ): Promise<number> {
        const tokensMetadata = await this.tokenService.getAllTokensMetadata(
            tokenRoute,
            ['identifier', 'price', 'decimals'],
        );

        for (let index = 0; index < tokenRoute.length - 1; index++) {
            const [tokenInID, amountIn, tokenOutID, amountOut] = [
                tokenRoute[index],
                intermediaryAmounts[index],
                tokenRoute[index + 1],
                intermediaryAmounts[index + 1],
            ];

            const [tokenIn, intermediaryTokenOut] = [
                tokensMetadata[index],
                tokensMetadata[index + 1],
            ];

            const amountInUSD = computeValueUSD(
                amountIn,
                tokenIn.decimals,
                tokenIn.price,
            );
            const amountOutUSD = computeValueUSD(
                amountOut,
                intermediaryTokenOut.decimals,
                intermediaryTokenOut.price,
            );

            const priceDeviationPercent = amountInUSD.isLessThan(amountOutUSD)
                ? new BigNumber(1).minus(amountInUSD.dividedBy(amountOutUSD))
                : new BigNumber(1).minus(amountOutUSD.dividedBy(amountInUSD));

            if (
                priceDeviationPercent.toNumber() >
                constantsConfig.MAX_SWAP_SPREAD
            ) {
                this.logger
                    .error(`Spread too big validating auto route swap transaction ${tokenInID} => ${tokenOutID}.
                amount in = ${amountIn}, usd value = ${amountInUSD};
                amount out = ${amountOut}, usd value = ${amountOutUSD}`);
            }

            return priceDeviationPercent.toNumber();
        }
    }

    async getSmartRouterAllocationsPriceDeviationPercent(
        allocations: ParallelRouteAllocation[],
    ): Promise<number> {
        const tokenRoutes = allocations.map(
            (allocation) => allocation.tokenRoute,
        );
        const intermediaryAmounts = allocations.map(
            (allocation) => allocation.intermediaryAmounts,
        );

        const tokenIDs = [...new Set(tokenRoutes.flat())];

        const allTokensMetadata = await this.tokenService.getAllTokensMetadata(
            tokenIDs,
            ['identifier', 'decimals', 'price'],
        );

        const tokensMetadata = new Map<string, EsdtToken>();

        tokenIDs.forEach((tokenID, index) => {
            tokensMetadata.set(tokenID, allTokensMetadata[index]);
        });

        for (const [routeIndex, route] of tokenRoutes.entries()) {
            for (let index = 0; index < route.length - 1; index++) {
                const [tokenInID, amountIn, tokenOutID, amountOut] = [
                    route[index],
                    intermediaryAmounts[routeIndex][index],
                    route[index + 1],
                    intermediaryAmounts[routeIndex][index + 1],
                ];

                const [tokenIn, intermediaryTokenOut] = [
                    tokensMetadata.get(tokenInID),
                    tokensMetadata.get(tokenOutID),
                ];

                const amountInUSD = computeValueUSD(
                    amountIn,
                    tokenIn.decimals,
                    tokenIn.price,
                );
                const amountOutUSD = computeValueUSD(
                    amountOut,
                    intermediaryTokenOut.decimals,
                    intermediaryTokenOut.price,
                );

                const priceDeviationPercent = amountInUSD.isLessThan(
                    amountOutUSD,
                )
                    ? new BigNumber(1).minus(
                          amountInUSD.dividedBy(amountOutUSD),
                      )
                    : new BigNumber(1).minus(
                          amountOutUSD.dividedBy(amountInUSD),
                      );

                if (
                    priceDeviationPercent.toNumber() >
                    constantsConfig.MAX_SWAP_SPREAD
                ) {
                    this.logger
                        .error(`Spread too big validating smart swap transaction ${tokenInID} => ${tokenOutID}.
                amount in = ${amountIn}, usd value = ${amountInUSD};
                amount out = ${amountOut}, usd value = ${amountOutUSD}`);
                }

                return priceDeviationPercent.toNumber();
            }
        }
    }

    private getSmartRouterSwap(
        paths: string[][],
        pairs: PairModel[],
        amountIn: string,
    ): ParallelRouteSwap {
        try {
            return this.smartRouterService.computeBestSwapRoute(
                paths,
                pairs,
                amountIn,
            );
        } catch (error) {
            this.logger.error('Smart router error.', error);
            return undefined;
        }
    }

    private async shouldPerformSmartSwap(
        parallelRouteSwap: ParallelRouteSwap,
        autoRouterAmountOut: string,
    ): Promise<boolean> {
        if (!parallelRouteSwap) {
            return false;
        }

        const [minSmartSwapDeltaPercentage, smartSwapFlag] = await Promise.all([
            this.remoteConfigGetterService.getMinSmartSwapDeltaPercentage(),
            this.remoteConfigGetterService.getSmartSwapFlagValue(),
        ]);

        if (smartSwapFlag === false) {
            return false;
        }

        const smartRouterOutput = new BigNumber(parallelRouteSwap.totalResult);
        const diff = smartRouterOutput.minus(autoRouterAmountOut);
        const percentage = diff
            .dividedBy(autoRouterAmountOut)
            .multipliedBy(100);

        return percentage.gte(minSmartSwapDeltaPercentage);
    }

    private async computeSmartSwap(
        amountIn: string,
        amountOut: string,
        parallelRouteSwap: ParallelRouteSwap,
        tokenInMetadata: EsdtToken,
        tokenOutMetadata: EsdtToken,
        pairs: PairModel[],
    ): Promise<SmartSwapModel | undefined> {
        const shouldPerformSmartSwap = await this.shouldPerformSmartSwap(
            parallelRouteSwap,
            amountOut,
        );

        if (!shouldPerformSmartSwap) {
            return undefined;
        }

        const [tokenInExchangeRate, tokenOutExchangeRate] =
            this.calculateExchangeRate(
                tokenInMetadata.decimals,
                tokenOutMetadata.decimals,
                amountIn,
                parallelRouteSwap.totalResult,
            );

        const [priceDeviationPercent, feePercentage] = await Promise.all([
            this.getSmartRouterAllocationsPriceDeviationPercent(
                parallelRouteSwap.allocations,
            ),
            this.composeTasksAbi.smartSwapFeePercentage(),
        ]);

        const smartSwapAmountOut = new BigNumber(parallelRouteSwap.totalResult);
        const feeAmount = smartSwapAmountOut.multipliedBy(feePercentage);

        return new SmartSwapModel({
            amountOut: smartSwapAmountOut
                .minus(feeAmount)
                .integerValue()
                .toFixed(),
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
            tokensPriceDeviationPercent: priceDeviationPercent,
            routes: parallelRouteSwap.allocations.map((allocation) => {
                const routePairs = this.getPairsRoute(
                    allocation.addressRoute,
                    pairs,
                );

                return new SmartSwapRoute({
                    intermediaryAmounts: allocation.intermediaryAmounts,
                    tokenRoute: allocation.tokenRoute,
                    fees: this.getFeesDenom(
                        allocation.intermediaryAmounts,
                        allocation.tokenRoute,
                        routePairs,
                    ),
                    pricesImpact: this.getPriceImpactPercents(
                        allocation.intermediaryAmounts,
                        allocation.tokenRoute,
                        routePairs,
                    ),
                    pairs: routePairs,
                });
            }),
            feePercentage,
            feeAmount: feeAmount.integerValue().toFixed(),
        });
    }

    async getSwapRoutePairs(route: SwapRouteModel): Promise<PairModel[]> {
        return this.pairService.getPairs({
            address: { $in: route.pairs.map((pair) => pair.address) },
        });
    }
}
