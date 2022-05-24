import { Inject, Injectable } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ContextService } from 'src/services/context/context.service';
import { EsdtToken } from 'src/models/tokens/esdtToken.model';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import {
    AutoRouterComputeService,
    BestSwapRoute,
    PRIORITY_MODES,
} from './auto-router.compute.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { TransactionRouterService } from '../transactions.router.service';
import { elrondConfig } from 'src/config';
import { WrapService } from 'src/modules/wrapping/wrap.service';
import { AutoRouterModel } from '../../models/auto-router.model';
import { AutoRouterArgs } from '../../models/auto-router.args';
import { RouterGetterService } from '../router.getter.service';

@Injectable()
export class AutoRouterService {
    constructor(
        private readonly routerGetterService: RouterGetterService,
        private readonly contextService: ContextService,
        private readonly contextGetterService: ContextGetterService,
        private readonly pairGetterService: PairGetterService,
        private readonly autoRouterComputeService: AutoRouterComputeService,
        private readonly transactionService: TransactionRouterService,
        private readonly wrapService: WrapService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    public async getAutoRouteFixedInput(
        sender: string,
        args: AutoRouterArgs,
    ): Promise<AutoRouterModel> {
        const [pairs, wrappedEgldTokenID] = await Promise.all([
            this.getAllActivePairs(),
            this.wrapService.getWrappedEgldTokenID(),
        ]);
        let swapRoute: BestSwapRoute;

        try {
            swapRoute = await this.autoRouterComputeService.computeBestSwapRoute(
                this.toWrappedIfEGLD(args.tokenInID, wrappedEgldTokenID),
                this.toWrappedIfEGLD(args.tokenOutID, wrappedEgldTokenID),
                pairs,
                args.amount,
                PRIORITY_MODES.maxOutput,
            );
        } catch (error) {
            this.logger.error(
                'Error when computing the swap auto route.',
                error,
            );
            throw error;
        }

        const transactions = await this.transactionService.multiPairSwap(
            sender,
            {
                tokenInID: args.tokenInID,
                tokenOutID: args.tokenOutID,
                addressRoute: swapRoute.addressRoute,
                intermediaryAmounts: swapRoute.intermediaryAmounts,
                tokenRoute: swapRoute.tokenRoute,
                tolerance: args.tolerance,
            },
        );

        return new AutoRouterModel({
            tokenInID: args.tokenInID,
            tokenOutID: args.tokenOutID,
            amountIn: args.amount,
            amountOut: new BigNumber(swapRoute.bestResult).toString(),
            tokenRoute: swapRoute.tokenRoute,
            intermediaryAmounts: swapRoute.intermediaryAmounts,
            addressRoute: swapRoute.addressRoute,
            tolerance: args.tolerance,
            transactions: transactions,
        });
    }

    public async getAutoRouteFixedOutput(
        sender: string,
        args: AutoRouterArgs,
    ): Promise<AutoRouterModel> {
        const [pairs, wrappedEgldTokenID] = await Promise.all([
            this.getAllActivePairs(),
            this.wrapService.getWrappedEgldTokenID(),
        ]);
        let swapRoute: BestSwapRoute;

        try {
            swapRoute = await this.autoRouterComputeService.computeBestSwapRoute(
                this.toWrappedIfEGLD(args.tokenOutID, wrappedEgldTokenID),
                this.toWrappedIfEGLD(args.tokenInID, wrappedEgldTokenID),
                pairs,
                args.amount,
                PRIORITY_MODES.minInput,
            );
        } catch (error) {
            this.logger.error(
                'Error when computing the swap auto route.',
                error,
            );
            throw error;
        }

        const transactions = await this.transactionService.multiPairSwap(
            sender,
            {
                tokenInID: args.tokenInID,
                tokenOutID: args.tokenOutID,
                addressRoute: swapRoute.addressRoute,
                intermediaryAmounts: swapRoute.intermediaryAmounts,
                tokenRoute: swapRoute.tokenRoute,
                tolerance: args.tolerance,
            },
        );

        return new AutoRouterModel({
            tokenInID: args.tokenInID,
            tokenOutID: args.tokenOutID,
            amountIn: new BigNumber(swapRoute.bestResult).toString(),
            amountOut: args.amount,
            tokenRoute: swapRoute.tokenRoute,
            intermediaryAmounts: swapRoute.intermediaryAmounts,
            addressRoute: swapRoute.addressRoute,
            tolerance: args.tolerance,
            transactions: transactions,
        });
    }

    public async getExchangeRate(
        tokenInID: string,
        tokenOutID: string,
    ): Promise<string> {
        const [pairs, tokenInMetadata] = await Promise.all([
            this.getAllActivePairs(),
            this.contextGetterService.getTokenMetadata(tokenInID),
        ]);

        try {
            const swapRoute = await this.autoRouterComputeService.computeBestSwapRoute(
                tokenInID,
                tokenOutID,
                pairs,
                new BigNumber(10).pow(tokenInMetadata.decimals).toString(),
                PRIORITY_MODES.maxOutput,
            );

            return swapRoute.bestResult;
        } catch (error) {
            this.logger.error('Error when computing the exchange rate.', error);
            throw error;
        }
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
}
