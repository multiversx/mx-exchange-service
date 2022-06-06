import { Inject, Injectable } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ContextService } from 'src/services/context/context.service';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import {
    AutoRouterComputeService,
    BestSwapRoute,
    PRIORITY_MODES,
} from './auto-router.compute.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { elrondConfig } from 'src/config';
import { WrapService } from 'src/modules/wrapping/wrap.service';
import { AutoRouterArgs } from '../models/auto-router.args';
import { RouterGetterService } from '../../router/services/router.getter.service';
import { AutoRouteModel, SWAP_TYPE } from '../models/auto-route.model';
import { AutoRouterTransactionService } from './auto-router.transactions.service';
import { RouterService } from 'src/modules/router/services/router.service';
import { PairService } from 'src/modules/pair/services/pair.service';
import { PairTransactionService } from 'src/modules/pair/services/pair.transactions.service';
import { denominateAmount } from 'src/utils/token.converters';
@Injectable()
export class AutoRouterService {
    constructor(
        private readonly routerGetterService: RouterGetterService,
        private readonly contextService: ContextService,
        private readonly contextGetterService: ContextGetterService,
        private readonly pairGetterService: PairGetterService,
        private readonly autoRouterComputeService: AutoRouterComputeService,
        private readonly autoRouterTransactionService: AutoRouterTransactionService,
        private readonly pairTransactionService: PairTransactionService,
        private readonly wrapService: WrapService,
        private readonly routerService: RouterService,
        private readonly pairService: PairService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async swap(args: AutoRouterArgs): Promise<AutoRouteModel> {
        if (args.amountIn && args.amountOut)
            throw new Error("Can't have both amountIn & amountOut");

        const [tokenInID, tokenOutID] = await this.toWrappedIfEGLD([
            args.tokenInID,
            args.tokenOutID,
        ]);

        const [
            directPair,
            pairs,
            tokenInMetadata,
            tokenOutMetadata,
        ] = await Promise.all([
            this.getDirectPair(tokenInID, tokenOutID),
            this.getAllActivePairs(),
            this.contextGetterService.getTokenMetadata(tokenInID),
            this.contextGetterService.getTokenMetadata(tokenOutID),
        ]);

        args.amountIn = this.setDefaultAmountInIfNeeded(args, tokenInMetadata);
        const swapType = this.getSwapType(args.amountIn, args.amountOut);

        if (directPair) {
            return await this.singleSwap(
                args,
                tokenInID,
                tokenOutID,
                directPair,
                tokenInMetadata,
                tokenOutMetadata,
                swapType,
            );
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
        const [
            result,
            tokenInPriceUSD,
            tokenOutPriceUSD,
            pairTotalFeePercent,
            pairInfo,
            firstToken,
        ] = await Promise.all([
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
            this.pairGetterService.getTokenPriceUSD(tokenInID),
            this.pairGetterService.getTokenPriceUSD(tokenOutID),
            this.pairGetterService.getTotalFeePercent(pair.address),
            this.pairGetterService.getPairInfoMetadata(pair.address),
            this.pairGetterService.getFirstToken(pair.address),
        ]);

        let [amountIn, amountOut] = this.isFixedInput(swapType)
            ? [args.amountIn, result]
            : [result, args.amountOut];

        const [
            tokenInExchangeRate,
            tokenOutExchangeRate,
        ] = this.calculateExchangeRate(
            tokenInMetadata.decimals,
            tokenOutMetadata.decimals,
            amountIn,
            amountOut,
        );

        const fee = this.calculateFeeDenom(
            pairTotalFeePercent,
            amountIn,
            tokenInMetadata.decimals,
        );

        const priceImpact = this.calculatePriceImpactPercent(
            firstToken.identifier === tokenInID
                ? pairInfo.reserves1
                : pairInfo.reserves0,
            amountOut,
        );

        if (!this.isFixedInput(swapType))
            amountIn = this.addTolerance(amountIn, args.tolerance);

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
            fees: [fee],
            pricesImpact: [priceImpact],
            pairs: [pair],
            tolerance: args.tolerance,
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

        try {
            [swapRoute, tokenInPriceUSD, tokenOutPriceUSD] = await Promise.all([
                this.isFixedInput(swapType)
                    ? this.autoRouterComputeService.computeBestSwapRoute(
                          tokenInID,
                          tokenOutID,
                          pairs,
                          args.amountIn,
                          PRIORITY_MODES.maxOutput,
                      )
                    : this.autoRouterComputeService.computeBestSwapRoute(
                          tokenOutID,
                          tokenInID,
                          pairs,
                          args.amountOut,
                          PRIORITY_MODES.minInput,
                      ),
                this.pairGetterService.getTokenPriceUSD(tokenInID),
                this.pairGetterService.getTokenPriceUSD(tokenOutID),
            ]);
        } catch (error) {
            this.logger.error(
                'Error when computing the swap auto route.',
                error,
            );
            throw error;
        }

        const [
            tokenInExchangeRate,
            tokenOutExchangeRate,
        ] = this.calculateExchangeRate(
            tokenInMetadata.decimals,
            tokenOutMetadata.decimals,
            this.isFixedInput(swapType) ? args.amountIn : swapRoute.bestResult,
            this.isFixedInput(swapType) ? swapRoute.bestResult : args.amountOut,
        );

        const fees = this.calculateFeesDenom(swapRoute, pairs);

        const pricesImpact = this.calculatePriceImpactPercents(
            pairs,
            swapRoute,
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
            fees: fees,
            pricesImpact: pricesImpact,
            pairs: this.addressesToPairs(swapRoute.addressRoute),
            tolerance: args.tolerance,
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

    private async getDirectPair(
        tokenInID: string,
        tokenOutID: string,
    ): Promise<PairModel> {
        const pairs = await this.routerService.getAllPairs(0, 1, {
            address: null,
            firstTokenID: tokenInID,
            secondTokenID: tokenOutID,
            issuedLpToken: true,
        });
        return pairs[0];
    }

    private async getAllActivePairs() {
        const pairs: PairModel[] = [];

        const pairAddresses = await this.routerGetterService.getAllPairsAddress();
        for (const pairAddress of pairAddresses) {
            const [
                pairMetadata,
                pairInfo,
                pairTotalFeePercent,
                pairState,
                firstToken,
                secondToken,
            ] = await Promise.all([
                this.contextService.getPairMetadata(pairAddress),
                this.pairGetterService.getPairInfoMetadata(pairAddress),
                this.pairGetterService.getTotalFeePercent(pairAddress),
                this.pairGetterService.getState(pairAddress),
                this.pairGetterService.getFirstToken(pairAddress),
                this.pairGetterService.getSecondToken(pairAddress),
            ]);

            if (pairState === 'Active')
                pairs.push(
                    new PairModel({
                        address: pairMetadata.address,
                        firstToken: new EsdtToken({
                            identifier: firstToken.identifier,
                            decimals: firstToken.decimals,
                        }),
                        secondToken: new EsdtToken({
                            identifier: secondToken.identifier,
                            decimals: secondToken.decimals,
                        }),
                        info: pairInfo,
                        totalFeePercent: pairTotalFeePercent,
                    }),
                );
        }

        return pairs;
    }

    private async toWrappedIfEGLD(tokensIDs: string[]) {
        const wrappedEgldTokenID = await this.wrapService.getWrappedEgldTokenID();

        return tokensIDs.map(t => {
            return elrondConfig.EGLDIdentifier === t ? wrappedEgldTokenID : t;
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

    private calculateFeeDenom(
        feePercent: number,
        amount: string,
        decimals: number,
    ): string {
        return denominateAmount(
            new BigNumber(amount).multipliedBy(feePercent).toFixed(),
            decimals,
        ).toFixed();
    }

    private calculateFeesDenom(
        swapRoute: BestSwapRoute,
        pairs: PairModel[],
    ): string[] {
        return swapRoute.addressRoute.map((pairAddress, index) => {
            const pair = pairs.filter(p => p.address === pairAddress)[0];
            return this.calculateFeeDenom(
                pair.totalFeePercent,
                swapRoute.intermediaryAmounts[index],
                pair.firstToken.identifier === swapRoute.tokenRoute[index]
                    ? pair.firstToken.decimals
                    : pair.secondToken.decimals,
            );
        });
    }

    private calculatePriceImpactPercent(
        reserves: string,
        amount: string,
    ): string {
        return new BigNumber(amount)
            .dividedBy(reserves)
            .times(100)
            .toFixed();
    }

    private calculatePriceImpactPercents(
        pairs: PairModel[],
        swapRoute: BestSwapRoute,
    ): string[] {
        return swapRoute.addressRoute.map((pairAddress, index) => {
            const pair = pairs.filter(p => p.address === pairAddress)[0];
            return this.calculatePriceImpactPercent(
                pair.firstToken.identifier === swapRoute.tokenRoute[index + 1]
                    ? pair.info.reserves0
                    : pair.info.reserves1,
                swapRoute.intermediaryAmounts[index + 1],
            );
        });
    }

    private addressesToPairs(addresses: string[]): PairModel[] {
        const pairs: PairModel[] = [];
        for (const address of addresses) {
            pairs.push(new PairModel({ address: address }));
        }
        return pairs;
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

        return await this.autoRouterTransactionService.multiPairSwap(sender, {
            swapType: parent.swapType,
            tokenInID: parent.tokenInID,
            tokenOutID: parent.tokenOutID,
            addressRoute: parent.pairs.map(p => {
                return p.address;
            }),
            intermediaryAmounts: parent.intermediaryAmounts,
            tokenRoute: parent.tokenRoute,
            tolerance: parent.tolerance,
        });
    }
}
