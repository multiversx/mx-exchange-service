import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ApiConfigService } from 'src/helpers/api.config.service';
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
    SmartSwapPairModel,
    SmartSwapRoute,
    SmartSwapSource,
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
import { PairAbiService } from 'src/modules/pair/services/pair.abi.service';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';
import { RouterAbiService } from 'src/modules/router/services/router.abi.service';
import { TokenService } from 'src/modules/tokens/services/token.service';
import { TransactionModel } from 'src/models/transaction.model';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { SmartRouterService } from './smart.router.service';
import {
    ParallelRouteAllocation,
    ParallelRouteSwap,
} from '../models/smart.router.types';
import { SmartRouterEvaluationService } from 'src/modules/smart-router-evaluation/services/smart.router.evaluation.service';
import { ComposableTasksAbiService } from 'src/modules/composable-tasks/services/composable.tasks.abi.service';
import { XoxnoAggregatorService } from './xoxno-aggregator.service';
import {
    XoxnoQuoteModel,
    XoxnoPathModel,
} from '../models/xoxno-aggregator.model';
import { Address } from '@multiversx/sdk-core/out';

@Injectable()
export class AutoRouterService {
    constructor(
        private readonly routerAbi: RouterAbiService,
        private readonly tokenService: TokenService,
        private readonly tokenCompute: TokenComputeService,
        private readonly pairAbi: PairAbiService,
        private readonly pairCompute: PairComputeService,
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
        private readonly xoxnoAggregatorService: XoxnoAggregatorService,
        private readonly apiConfigService: ApiConfigService,
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
                this.tokenService.baseTokenMetadata(tokenInID),
                this.tokenService.baseTokenMetadata(tokenOutID),
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
        tokenInMetadata: BaseEsdtToken,
        tokenOutMetadata: BaseEsdtToken,
        swapType: SWAP_TYPE,
    ): Promise<AutoRouteModel> {
        const [result, tokenInPriceUSD, tokenOutPriceUSD] = await Promise.all([
            this.isFixedInput(swapType)
                ? this.pairService.getAmountOut(
                      pair.address,
                      tokenInID,
                      args.amountIn,
                  )
                : this.pairService.getAmountIn(
                      pair.address,
                      tokenOutID,
                      args.amountOut,
                  ),
            this.pairCompute.tokenPriceUSD(tokenInID),
            this.pairCompute.tokenPriceUSD(tokenOutID),
        ]);

        if (result === '0') {
            throw new BadRequestException('Invalid amounts');
        }

        let [amountIn, amountOut] = this.isFixedInput(swapType)
            ? [args.amountIn, result]
            : [result, args.amountOut];

        const [tokenInExchangeRate, tokenOutExchangeRate] =
            this.calculateExchangeRate(
                tokenInMetadata.decimals,
                tokenOutMetadata.decimals,
                amountIn,
                amountOut,
            );

        if (!this.isFixedInput(swapType))
            amountIn = this.addTolerance(amountIn, args.tolerance);

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
            tokenInPriceUSD: tokenInPriceUSD,
            tokenOutPriceUSD: tokenOutPriceUSD,
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
        tokenInMetadata: BaseEsdtToken,
        tokenOutMetadata: BaseEsdtToken,
        swapType: SWAP_TYPE,
    ): Promise<AutoRouteModel> {
        let swapRoute: BestSwapRoute,
            tokenInPriceUSD: string,
            tokenOutPriceUSD: string;

        const paths = await this.getAllPaths(pairs, tokenInID, tokenOutID);

        try {
            swapRoute = this.isFixedInput(swapType)
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

            [tokenInPriceUSD, tokenOutPriceUSD] = await Promise.all([
                this.pairCompute.tokenPriceUSD(tokenInID),
                this.pairCompute.tokenPriceUSD(tokenOutID),
            ]);
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
                this.isFixedInput(swapType)
                    ? args.amountIn
                    : swapRoute.bestResult,
                this.isFixedInput(swapType)
                    ? swapRoute.bestResult
                    : args.amountOut,
            );

        const priceDeviationPercent = await this.getTokenPriceDeviationPercent(
            swapRoute.tokenRoute,
            swapRoute.intermediaryAmounts,
        );

        let parallelRouteSwap: ParallelRouteSwap;
        let smartSwap: SmartSwapModel | undefined;
        let xoxnoQuote: XoxnoQuoteModel | undefined;

        if (this.isFixedInput(swapType)) {
            parallelRouteSwap = this.getSmartRouterSwap(
                paths,
                pairs,
                args.amountIn,
            );

            [smartSwap, xoxnoQuote] = await Promise.all([
                this.computeSmartSwap(
                    args.amountIn,
                    swapRoute.bestResult,
                    parallelRouteSwap,
                    tokenInMetadata,
                    tokenOutMetadata,
                    pairs,
                ),
                this.getXoxnoQuote(
                    args.tokenInID,
                    args.tokenOutID,
                    args.amountIn,
                    args.tolerance,
                    args.sender,
                ),
            ]);

            smartSwap = await this.pickBestSmartSwap(
                smartSwap,
                xoxnoQuote,
                swapRoute.bestResult,
                tokenInMetadata,
                tokenOutMetadata,
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
            tokenInPriceUSD: tokenInPriceUSD,
            tokenOutPriceUSD: tokenOutPriceUSD,
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
            transactions:
                smartSwap?.source === SmartSwapSource.XOXNO &&
                xoxnoQuote?.transaction
                    ? [xoxnoQuote.transaction]
                    : undefined,
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
        const pairMetadata = await this.routerAbi.pairsMetadata();

        const states = await this.pairService.getAllStates(
            pairMetadata.map((pair) => pair.address),
        );

        const tokenIDs: string[] = [];
        const pairAddresses: string[] = [];

        let activePairs = pairMetadata.filter(
            (_pair, index) => states[index] === 'Active',
        );

        activePairs.forEach((pair) => {
            tokenIDs.push(...[pair.firstTokenID, pair.secondTokenID]);
        });

        const tokens = await this.tokenService.getAllTokensMetadata([
            ...new Set(tokenIDs),
        ]);

        const tokenMap = new Map(
            tokens
                .filter((token) => !token.isPaused)
                .map((token) => [token.identifier, token]),
        );

        activePairs = activePairs.filter(
            (pair) =>
                tokenMap.has(pair.firstTokenID) &&
                tokenMap.has(pair.secondTokenID),
        );
        activePairs.forEach((pair) => {
            pairAddresses.push(pair.address);
        });

        const [allInfo, allTotalFeePercent] = await Promise.all([
            this.pairAbi.getAllPairsInfoMetadata(pairAddresses),
            this.pairAbi.getAllPairsTotalFeePercent(pairAddresses),
        ]);

        return activePairs.map((pair, index) => {
            const firstToken = tokenMap.get(pair.firstTokenID);
            const secondToken = tokenMap.get(pair.secondTokenID);
            return new PairModel({
                address: pair.address,
                firstToken,
                secondToken,
                info: allInfo[index],
                totalFeePercent: allTotalFeePercent[index],
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
            if (parent.smartSwap.source === SmartSwapSource.XOXNO) {
                if (!parent.transactions?.[0] || !Address.isValid(sender)) {
                    throw new Error(
                        'XOXNO smart swap selected but transaction or sender is missing',
                    );
                }

                const transaction = new TransactionModel(
                    parent.transactions[0],
                );

                if (transaction.sender !== sender) {
                    throw new Error(
                        'different sender on XOXNO aggregator transaction',
                    );
                }

                await this.smartRouterEvaluationService.addFixedInputSwapComparison(
                    parent,
                    transaction,
                );
                return [transaction];
            }

            if (
                parent.smartSwap.source === SmartSwapSource.INTERNAL &&
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
        const [tokensMetadata, tokensPriceUSD] = await Promise.all([
            this.tokenService.getAllBaseTokensMetadata(tokenRoute),
            this.tokenCompute.getAllTokensPriceDerivedUSD(tokenRoute),
        ]);

        for (let index = 0; index < tokenRoute.length - 1; index++) {
            const [tokenInID, amountIn, tokenOutID, amountOut] = [
                tokenRoute[index],
                intermediaryAmounts[index],
                tokenRoute[index + 1],
                intermediaryAmounts[index + 1],
            ];

            const [
                tokenIn,
                tokenInPriceUSD,
                intermediaryTokenOut,
                intermediaryTokenOutPriceUSD,
            ] = [
                tokensMetadata[index],
                tokensPriceUSD[index],
                tokensMetadata[index + 1],
                tokensPriceUSD[index + 1],
            ];

            const amountInUSD = computeValueUSD(
                amountIn,
                tokenIn.decimals,
                tokenInPriceUSD,
            );
            const amountOutUSD = computeValueUSD(
                amountOut,
                intermediaryTokenOut.decimals,
                intermediaryTokenOutPriceUSD,
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

        const [allTokensMetadata, allTokensPriceUSD] = await Promise.all([
            this.tokenService.getAllBaseTokensMetadata(tokenIDs),
            this.tokenCompute.getAllTokensPriceDerivedUSD(tokenIDs),
        ]);

        const tokensMetadata = new Map<string, BaseEsdtToken>();
        const tokensPriceUSD = new Map<string, string>();

        tokenIDs.forEach((tokenID, index) => {
            tokensMetadata.set(tokenID, allTokensMetadata[index]);
            tokensPriceUSD.set(tokenID, allTokensPriceUSD[index]);
        });

        for (const [routeIndex, route] of tokenRoutes.entries()) {
            for (let index = 0; index < route.length - 1; index++) {
                const [tokenInID, amountIn, tokenOutID, amountOut] = [
                    route[index],
                    intermediaryAmounts[routeIndex][index],
                    route[index + 1],
                    intermediaryAmounts[routeIndex][index + 1],
                ];

                const [
                    tokenIn,
                    tokenInPriceUSD,
                    intermediaryTokenOut,
                    intermediaryTokenOutPriceUSD,
                ] = [
                    tokensMetadata.get(tokenInID),
                    tokensPriceUSD.get(tokenInID),
                    tokensMetadata.get(tokenOutID),
                    tokensPriceUSD.get(tokenOutID),
                ];

                const amountInUSD = computeValueUSD(
                    amountIn,
                    tokenIn.decimals,
                    tokenInPriceUSD,
                );
                const amountOutUSD = computeValueUSD(
                    amountOut,
                    intermediaryTokenOut.decimals,
                    intermediaryTokenOutPriceUSD,
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
        tokenInMetadata: BaseEsdtToken,
        tokenOutMetadata: BaseEsdtToken,
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

        const [priceDeviationPercent, feePercentage, tokenOut] =
            await Promise.all([
                this.getSmartRouterAllocationsPriceDeviationPercent(
                    parallelRouteSwap.allocations,
                ),
                this.composeTasksAbi.smartSwapFeePercentage(),
                this.tokenService.tokenMetadata(tokenOutMetadata.identifier),
            ]);

        const smartSwapAmountOut = new BigNumber(parallelRouteSwap.totalResult);
        const feeAmount = smartSwapAmountOut.multipliedBy(feePercentage);

        return new SmartSwapModel({
            amountOut: smartSwapAmountOut
                .minus(feeAmount)
                .integerValue()
                .toFixed(),
            source: SmartSwapSource.INTERNAL,
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
                    pairs: routePairs.map(
                        (pair, i) =>
                            new SmartSwapPairModel({
                                address: pair.address,
                                dex: 'XExchange',
                                firstToken:
                                    pair.firstToken.identifier ===
                                    allocation.tokenRoute[i]
                                        ? pair.firstToken
                                        : pair.secondToken,
                                secondToken:
                                    pair.firstToken.identifier ===
                                    allocation.tokenRoute[i]
                                        ? pair.secondToken
                                        : pair.firstToken,
                            }),
                    ),
                });
            }),
            feePercentage,
            feeAmount: feeAmount.integerValue().toFixed(),
            feeToken: tokenOut,
        });
    }

    private async getXoxnoQuote(
        tokenInID: string,
        tokenOutID: string,
        amountIn: string,
        tolerance: number,
        sender?: string,
    ): Promise<XoxnoQuoteModel | undefined> {
        if (!this.apiConfigService.isXoxnoAggregatorEnabled()) {
            return undefined;
        }

        const isEnabled =
            await this.remoteConfigGetterService.getXoxnoAggregatorEnabled();
        if (!isEnabled) {
            return undefined;
        }

        return this.xoxnoAggregatorService.getQuote(
            tokenInID,
            tokenOutID,
            amountIn,
            tolerance,
            sender,
        );
    }

    private async pickBestSmartSwap(
        internalSmartSwap: SmartSwapModel | undefined,
        xoxnoQuote: XoxnoQuoteModel | undefined,
        autoRouterAmountOut: string,
        tokenInMetadata: BaseEsdtToken,
        tokenOutMetadata: BaseEsdtToken,
    ): Promise<SmartSwapModel | undefined> {
        const internalOutput = internalSmartSwap
            ? new BigNumber(internalSmartSwap.amountOut)
            : new BigNumber(0);
        const xoxnoOutput = xoxnoQuote?.amountOut
            ? new BigNumber(xoxnoQuote.amountOut)
            : new BigNumber(0);
        const autoRouterOutput = new BigNumber(autoRouterAmountOut);

        if (
            xoxnoOutput.gt(0) &&
            xoxnoOutput.gt(internalOutput) &&
            xoxnoOutput.gt(autoRouterOutput)
        ) {
            return await this.mapXoxnoToSmartSwapModel(
                xoxnoQuote,
                tokenInMetadata,
                tokenOutMetadata,
            );
        }

        if (internalOutput.gt(0) && internalOutput.gt(autoRouterOutput)) {
            return internalSmartSwap;
        }

        return undefined; // auto-router wins, no smart swap
    }

    private async mapXoxnoToSmartSwapModel(
        quote: XoxnoQuoteModel,
        tokenInMetadata: BaseEsdtToken,
        tokenOutMetadata: BaseEsdtToken,
    ): Promise<SmartSwapModel> {
        const [tokenInExchangeRate, tokenOutExchangeRate] =
            this.calculateExchangeRate(
                tokenInMetadata.decimals,
                tokenOutMetadata.decimals,
                quote.amountIn,
                quote.amountOut,
            );
        const feeTokenID = await this.toWrappedIfEGLD([quote.feeToken]);
        const feeToken = await this.tokenService.tokenMetadata(feeTokenID[0]);

        return new SmartSwapModel({
            amountOut: quote.amountOut,
            source: SmartSwapSource.XOXNO,
            feePercentage: quote.feePercentage,
            feeAmount: quote.feeAmount,
            feeToken,
            tokenInExchangeRate,
            tokenOutExchangeRate,
            tokenInExchangeRateDenom: denominateAmount(
                tokenInExchangeRate,
                tokenOutMetadata.decimals,
            ).toString(),
            tokenOutExchangeRateDenom: denominateAmount(
                tokenOutExchangeRate,
                tokenInMetadata.decimals,
            ).toString(),
            tokensPriceDeviationPercent: quote.priceImpact / 100,
            routes: await this.mapXoxnoPathsToRoutes(quote.paths),
        });
    }

    private async mapXoxnoPathsToRoutes(
        paths: XoxnoPathModel[],
    ): Promise<SmartSwapRoute[]> {
        if (!paths || paths.length === 0) {
            return [];
        }

        // Collect all unique token IDs across all paths
        const tokenIDs = [
            ...new Set(
                paths.flatMap((p) => p.swaps.flatMap((s) => [s.from, s.to])),
            ),
        ];
        const esdtTokenIDs = await this.toWrappedIfEGLD(tokenIDs);

        // Batch fetch all token metadata (cached)
        const tokensMetadata = await this.tokenService.getAllTokensMetadata(
            esdtTokenIDs,
        );
        const tokenMap = new Map(
            tokenIDs.map((id, i) => [id, tokensMetadata[i]]),
        );

        return paths.map((path) => {
            const swaps = path.swaps;

            // Token route: [first swap's from, each swap's to]
            const tokenRoute = [swaps[0].from, ...swaps.map((s) => s.to)];

            // Intermediary amounts: [path.amountIn, each swap's amountOut]
            const intermediaryAmounts = [
                path.amountIn,
                ...swaps.map((s) => s.amountOut),
            ];

            // Per-hop fees and price impact not available from XOXNO
            const fees = swaps.map(() => '0');
            const pricesImpact = swaps.map(() => '0');

            return new SmartSwapRoute({
                intermediaryAmounts,
                tokenRoute,
                fees,
                pricesImpact,
                pairs: swaps.map(
                    (swap) =>
                        new SmartSwapPairModel({
                            address: swap.address,
                            dex: swap.dex,
                            firstToken: tokenMap.get(swap.from),
                            secondToken: tokenMap.get(swap.to),
                        }),
                ),
            });
        });
    }
}
