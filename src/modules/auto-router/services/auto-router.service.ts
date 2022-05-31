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
import { AutoRouteModel } from '../models/auto-route.model';
import { AutoRouterTransactionService } from './auto-router.transactions.service';
import { RouterService } from 'src/modules/router/services/router.service';
import { PairService } from 'src/modules/pair/services/pair.service';

@Injectable()
export class AutoRouterService {
    constructor(
        private readonly routerGetterService: RouterGetterService,
        private readonly contextService: ContextService,
        private readonly contextGetterService: ContextGetterService,
        private readonly pairGetterService: PairGetterService,
        private readonly autoRouterComputeService: AutoRouterComputeService,
        private readonly transactionService: AutoRouterTransactionService,
        private readonly wrapService: WrapService,
        private readonly routerService: RouterService,
        private readonly pairService: PairService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async getFactory(): Promise<AutoRouteModel> {
        return new AutoRouteModel({ tokenInID: '' });
    }

    async swap(sender: string, args: AutoRouterArgs): Promise<AutoRouteModel> {
        this.validateSwapArgs(args);

        const wrappedEgldTokenID = await this.wrapService.getWrappedEgldTokenID();

        const tokenInID = this.toWrappedIfEGLD(
            args.tokenInID,
            wrappedEgldTokenID,
        );
        const tokenOutID = this.toWrappedIfEGLD(
            args.tokenOutID,
            wrappedEgldTokenID,
        );

        const [
            directPair,
            pairs,
            tokenInMetadata,
            tokenOutMetadata,
        ] = await Promise.all([
            this.routerService.getAllPairs(0, 1, {
                address: null,
                firstTokenID: tokenInID,
                secondTokenID: tokenOutID,
                issuedLpToken: true,
            })[0],
            this.getAllActivePairs(),
            this.contextGetterService.getTokenMetadata(tokenInID),
            this.contextGetterService.getTokenMetadata(tokenOutID),
        ]);

        args.amountIn = this.setDefaultAmountInIfNeeded(args, tokenInMetadata);
        const isFixedInput = this.isFixedInput(args.amountIn, args.amountOut);

        if (directPair) {
            return this.singleSwap(
                sender,
                args,
                tokenInID,
                tokenOutID,
                directPair,
                isFixedInput,
            );
        }

        return await this.multiSwap(
            sender,
            args,
            tokenInID,
            tokenOutID,
            pairs,
            tokenInMetadata,
            tokenOutMetadata,
            isFixedInput,
        );
    }

    async singleSwap(
        sender: string,
        args: AutoRouterArgs,
        tokenInID: string,
        tokenOutID: string,
        pair: PairModel,
        isFixedInput: boolean,
    ): Promise<AutoRouteModel> {
        const [
            pairMetadata,
            amount,
            firstTokenPrice,
            secondTokenPrice,
        ] = await Promise.all([
            this.contextService.getPairMetadata(pair.address),
            isFixedInput
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
            this.pairGetterService.getFirstTokenPrice(pair.address),
            this.pairGetterService.getSecondTokenPrice(pair.address),
        ]);

        let [amountIn, amountOut] = isFixedInput
            ? [args.amountIn, amount]
            : [amount, args.amountOut];

        if (!isFixedInput)
            amountIn = this.addTolerance(amountIn, args.tolerance);

        return new AutoRouteModel({
            sender: sender,
            tokenInID: args.tokenInID,
            tokenOutID: args.tokenOutID,
            tokenInPrice:
                pairMetadata.firstTokenID == tokenInID
                    ? firstTokenPrice
                    : secondTokenPrice,
            tokenOutPrice:
                pairMetadata.secondTokenID == tokenOutID
                    ? secondTokenPrice
                    : firstTokenPrice,
            amountIn: amountIn,
            amountOut: amountOut,
            intermediaryAmounts: [amountIn, amountOut],
            tokenRoute: [tokenInID, tokenOutID],
            pairs: [pair],
            tolerance: args.tolerance,
        });
    }

    async multiSwap(
        sender: string,
        args: AutoRouterArgs,
        tokenInID: string,
        tokenOutID: string,
        pairs: PairModel[],
        tokenInMetadata: EsdtToken,
        tokenOutMetadata: EsdtToken,
        isFixedInput: boolean,
    ): Promise<AutoRouteModel> {
        let swapRoute: BestSwapRoute;
        try {
            swapRoute = await this.autoRouterComputeService.computeBestSwapRoute(
                isFixedInput ? tokenInID : tokenOutID,
                isFixedInput ? tokenOutID : tokenInID,
                pairs,
                isFixedInput ? args.amountIn : args.amountOut,
                isFixedInput
                    ? PRIORITY_MODES.maxOutput
                    : PRIORITY_MODES.minInput,
            );
        } catch (error) {
            this.logger.error(
                'Error when computing the swap auto route.',
                error,
            );
            throw error;
        }

        const [tokenInPrice, tokenOutPrice] = this.calculateExchangeRate(
            tokenInMetadata.decimals,
            tokenOutMetadata.decimals,
            isFixedInput ? args.amountIn : swapRoute.bestResult,
            isFixedInput ? swapRoute.bestResult : args.amountOut,
        );

        return new AutoRouteModel({
            sender: sender,
            tokenInID: args.tokenInID,
            tokenOutID: args.tokenOutID,
            tokenInPrice: tokenInPrice,
            tokenOutPrice: tokenOutPrice,
            amountIn:
                args.amountIn ||
                this.addTolerance(swapRoute.bestResult, args.tolerance),
            amountOut: args.amountOut || swapRoute.bestResult,
            intermediaryAmounts: swapRoute.intermediaryAmounts,
            tokenRoute: swapRoute.tokenRoute,
            pairs: this.addressesToPairs(swapRoute.addressRoute),
            tolerance: args.tolerance,
        });
    }

    validateSwapArgs(args: AutoRouterArgs) {
        if (args.amountIn && args.amountOut)
            throw new Error("Can't have both amountIn & amountOut");
    }

    setDefaultAmountInIfNeeded(
        args: AutoRouterArgs,
        tokenInMetadata: EsdtToken,
    ): string {
        if (!args.amountOut && !args.amountIn) {
            return new BigNumber(10).pow(tokenInMetadata.decimals).toString();
        }

        return args.amountIn;
    }

    isFixedInput(amountIn: string, amountOut: string) {
        if (amountIn && amountOut)
            throw new Error("Can't have both fixedInput & fixedOutput");

        if (amountIn) return true;
        else if (amountOut) return false;

        throw new Error('You should fill amountIn or amountOut');
    }

    addTolerance(amountIn: string, tolerance: number): string {
        return new BigNumber(amountIn)
            .plus(new BigNumber(amountIn).multipliedBy(tolerance))
            .toString();
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
            ] = await Promise.all([
                this.contextService.getPairMetadata(pairAddress),
                this.pairGetterService.getPairInfoMetadata(pairAddress),
                this.pairGetterService.getTotalFeePercent(pairAddress),
                this.pairGetterService.getState(pairAddress),
            ]);

            if (pairState === 'Active')
                pairs.push(
                    new PairModel({
                        address: pairMetadata.address,
                        firstToken: new EsdtToken({
                            identifier: pairMetadata.firstTokenID,
                        }),
                        secondToken: new EsdtToken({
                            identifier: pairMetadata.secondTokenID,
                        }),
                        info: pairInfo,
                        totalFeePercent: pairTotalFeePercent,
                        state: pairState,
                    }),
                );
        }

        return pairs;
    }

    private toWrappedIfEGLD(tokenID: string, wrappedEgldTokenID: string) {
        return elrondConfig.EGLDIdentifier === tokenID
            ? wrappedEgldTokenID
            : tokenID;
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
        return [tokenInPrice.toString(), tokenOutPrice.toString()];
    }

    private addressesToPairs(addresses: string[]): PairModel[] {
        const pairs: PairModel[] = [];
        for (const address of addresses) {
            pairs.push(new PairModel({ address: address }));
        }
        return pairs;
    }

    async getTransactions(sender: string, parent: AutoRouteModel) {
        return await this.transactionService.multiPairSwap(sender, {
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
