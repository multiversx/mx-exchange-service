import { Inject, Injectable } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { AutoRouteModel } from '../../models/auto-router.model';
import { ContextService } from 'src/services/context/context.service';
import { EsdtToken } from 'src/models/tokens/esdtToken.model';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import {
    AutoRouterComputeService,
    PRIORITY_MODES,
} from './auto-router.compute.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { TransactionRouterService } from '../transactions.router.service';
import { elrondConfig, tokenProviderUSD } from 'src/config';
import { WrapService } from 'src/modules/wrapping/wrap.service';

@Injectable()
export class AutoRouterService {
    constructor(
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
        amountIn: string,
        tokenInID: string,
        tokenOutID: string,
        tolerance: number,
    ): Promise<AutoRouteModel> {
        const pairs: PairModel[] = await this.getAllActivePairs();

        try {
            const swapRoute = await this.autoRouterComputeService.computeBestSwapRoute(
                await this.toWrapped(tokenInID),
                await this.toWrapped(tokenOutID),
                pairs,
                amountIn,
                PRIORITY_MODES.maxOutput,
            );

            const transactions = await this.transactionService.multiPairSwap(
                sender,
                {
                    tokenInID: tokenInID,
                    tokenOutID: tokenOutID,
                    addressRoute: swapRoute.addressRoute,
                    intermediaryAmounts: swapRoute.intermediaryAmounts,
                    tokenRoute: swapRoute.tokenRoute,
                    tolerance: tolerance,
                },
            );

            return new AutoRouteModel({
                tokenInID: tokenInID,
                tokenOutID: tokenOutID,
                amountIn: amountIn,
                amountOut: new BigNumber(swapRoute.bestResult).toString(),
                tokenRoute: swapRoute.tokenRoute,
                intermediaryAmounts: swapRoute.intermediaryAmounts,
                addressRoute: swapRoute.addressRoute,
                tolerance: tolerance,
                transactions: transactions,
            });
        } catch (error) {
            this.logger.error(
                'Error when computing the swap auto route.',
                error,
            );
        }
    }

    public async getAutoRouteFixedOutput(
        sender: string,
        amountOut: string,
        tokenInID: string,
        tokenOutID: string,
        tolerance: number,
    ): Promise<AutoRouteModel> {
        const pairs: PairModel[] = await this.getAllActivePairs();

        try {
            const swapRoute = await this.autoRouterComputeService.computeBestSwapRoute(
                await this.toWrapped(tokenOutID),
                await this.toWrapped(tokenInID),
                pairs,
                amountOut,
                PRIORITY_MODES.minInput,
            );

            const transactions = await this.transactionService.multiPairSwap(
                sender,
                {
                    tokenInID: tokenInID,
                    tokenOutID: tokenOutID,
                    addressRoute: swapRoute.addressRoute,
                    intermediaryAmounts: swapRoute.intermediaryAmounts,
                    tokenRoute: swapRoute.tokenRoute,
                    tolerance: tolerance,
                },
            );

            return new AutoRouteModel({
                tokenInID: tokenInID,
                tokenOutID: tokenOutID,
                amountIn: new BigNumber(swapRoute.bestResult).toString(),
                amountOut: amountOut,
                tokenRoute: swapRoute.tokenRoute,
                intermediaryAmounts: swapRoute.intermediaryAmounts,
                addressRoute: swapRoute.addressRoute,
                tolerance: tolerance,
                transactions: transactions,
            });
        } catch (error) {
            this.logger.error(
                'Error when computing the swap auto route.',
                error,
            );
        }
    }

    public async getExchangeRate(
        tokenInID: string,
        tokenOutID: string,
    ): Promise<string> {
        const pairs: PairModel[] = await this.getAllActivePairs();

        const tokenInMetadata = await this.contextGetterService.getTokenMetadata(
            tokenInID,
        );

        try {
            const swapRoute = await this.autoRouterComputeService.computeBestSwapRoute(
                tokenInID,
                tokenOutID,
                pairs,
                new BigNumber(
                    1 * Math.pow(10, tokenInMetadata.decimals),
                ).toString(),
                PRIORITY_MODES.maxOutput,
            );

            return swapRoute.bestResult;
        } catch (error) {
            this.logger.error('Error when computing the exchange rate.', error);
            throw error;
        }
    }

    private async getAllActivePairs() {
        let pairs: PairModel[] = [];

        const pairAddresses = await this.contextService.getAllPairsAddress();
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

    private async toWrapped(tokenID) {
        return elrondConfig.EGLDIdentifier === tokenID
            ? await this.wrapService.getWrappedEgldTokenID()
            : tokenID;
    }
}
