import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { BaseEsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import {
    AutoRouterComputeService,
    BestSwapRoute,
} from './auto-router.compute.service';
import { constantsConfig, mxConfig } from 'src/config';
import { AutoRouterArgs } from '../models/auto-router.args';
import { AutoRouteModel, SWAP_TYPE } from '../models/auto-route.model';
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
            [swapRoute, tokenInPriceUSD, tokenOutPriceUSD] = await Promise.all([
                this.isFixedInput(swapType)
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
                      ),
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

        const activePairs = pairMetadata.filter(
            (_pair, index) => states[index] === 'Active',
        );

        const pairAddresses: string[] = [];
        let tokenIDs: string[] = [];
        activePairs.forEach((pair) => {
            pairAddresses.push(pair.address);
            tokenIDs.push(...[pair.firstTokenID, pair.secondTokenID]);
        });
        tokenIDs = [...new Set(tokenIDs)];

        const [allInfo, allTotalFeePercent, allTokens] = await Promise.all([
            this.pairAbi.getAllPairsInfoMetadata(pairAddresses),
            this.pairAbi.getAllPairsTotalFeePercent(pairAddresses),
            this.tokenService.getAllBaseTokensMetadata(tokenIDs),
        ]);

        const tokenMap = new Map(
            allTokens.map((token) => [token.identifier, token]),
        );

        return activePairs.map((pair, index) => {
            return new PairModel({
                address: pair.address,
                firstToken: BaseEsdtToken.toEsdtToken(
                    tokenMap.get(pair.firstTokenID),
                ),
                secondToken: BaseEsdtToken.toEsdtToken(
                    tokenMap.get(pair.secondTokenID),
                ),
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

        return this.autoRouterTransactionService.multiPairSwap(sender, {
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

                return priceDeviationPercent.toNumber();
            }
        }
    }
}
