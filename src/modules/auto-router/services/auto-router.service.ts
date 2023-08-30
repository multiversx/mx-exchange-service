import { Inject, Injectable } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
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
import { CachingService } from 'src/services/caching/cache.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { oneMinute } from 'src/helpers/helpers';
import { WrapAbiService } from 'src/modules/wrapping/services/wrap.abi.service';
import { PairAbiService } from 'src/modules/pair/services/pair.abi.service';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';
import { RouterAbiService } from 'src/modules/router/services/router.abi.service';
import { TokenService } from 'src/modules/tokens/services/token.service';

@Injectable()
export class AutoRouterService {
    constructor(
        private readonly routerAbi: RouterAbiService,
        private readonly tokenService: TokenService,
        private readonly pairAbi: PairAbiService,
        private readonly pairCompute: PairComputeService,
        private readonly autoRouterComputeService: AutoRouterComputeService,
        private readonly autoRouterTransactionService: AutoRouterTransactionService,
        private readonly pairTransactionService: PairTransactionService,
        private readonly wrapAbi: WrapAbiService,
        private readonly pairService: PairService,
        private readonly remoteConfigGetterService: RemoteConfigGetterService,
        private readonly cacheService: CachingService,
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
                oneMinute() * 10,
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
                this.tokenService.getTokenMetadata(tokenInID),
                this.tokenService.getTokenMetadata(tokenOutID),
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
                return await this.singleSwap(
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

        return await this.multiSwap(
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
        tokenInMetadata: EsdtToken,
        tokenOutMetadata: EsdtToken,
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
        tokenInMetadata: EsdtToken,
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

    private async getAllActivePairs() {
        const pairAddresses = await this.routerAbi.pairsAddress();
        const statesPromises = pairAddresses.map((address) =>
            this.pairAbi.state(address),
        );
        const states = await Promise.all(statesPromises);
        const activePairs: string[] = [];
        states.forEach((value, index) => {
            if (value === 'Active') activePairs.push(pairAddresses[index]);
        });

        const pairsPromises = activePairs.map((address) =>
            this.getPair(address),
        );

        return await Promise.all(pairsPromises);
    }

    private async getPair(pairAddress: string): Promise<PairModel> {
        const [info, totalFeePercent, firstToken, secondToken] =
            await Promise.all([
                this.pairAbi.pairInfoMetadata(pairAddress),
                this.pairAbi.totalFeePercent(pairAddress),
                this.pairService.getFirstToken(pairAddress),
                this.pairService.getSecondToken(pairAddress),
            ]);

        return new PairModel({
            address: pairAddress,
            firstToken,
            secondToken,
            info,
            totalFeePercent,
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

    async getTransactions(sender: string, parent: AutoRouteModel) {
        if (parent.pairs.length == 1) {
            if (parent.swapType === SWAP_TYPE.fixedInput)
                return await this.pairTransactionService.swapTokensFixedInput(
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

            return await this.pairTransactionService.swapTokensFixedOutput(
                sender,
                {
                    pairAddress: parent.pairs[0].address,
                    tokenInID: parent.tokenInID,
                    tokenOutID: parent.tokenOutID,
                    amountIn: parent.amountIn,
                    amountOut: parent.amountOut,
                },
            );
        }

        if (
            parent.tokensPriceDeviationPercent > parent.maxPriceDeviationPercent
        ) {
            throw new Error('Spread too big!');
        }

        return await this.autoRouterTransactionService.multiPairSwap(sender, {
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
            ] = await Promise.all([
                this.tokenService.getTokenMetadata(tokenInID),
                this.pairCompute.tokenPriceUSD(tokenInID),
                this.tokenService.getTokenMetadata(tokenOutID),
                this.pairCompute.tokenPriceUSD(tokenOutID),
            ]);

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
