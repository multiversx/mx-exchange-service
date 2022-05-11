import { Inject } from '@nestjs/common';
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

export class AutoRouterService {
    constructor(
        private readonly contextService: ContextService,
        private readonly pairGetterService: PairGetterService,
        private readonly autoRouterComputeService: AutoRouterComputeService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    public async getAutoRouteFixedInput(
        amountIn: string,
        tokenInID: string,
        tokenOutID: string,
    ): Promise<AutoRouteModel> {
        const pairs: PairModel[] = await this.getAllActivePairs();

        try {
            const [
                tokenRoute,
                addressRoute,
                amountOut,
            ] = await this.autoRouterComputeService.computeBestSwapRoute(
                tokenInID,
                tokenOutID,
                pairs,
                amountIn,
                PRIORITY_MODES.maxOutput,
            );

            return new AutoRouteModel({
                tokenInID: tokenInID,
                tokenOutID: tokenOutID,
                amountIn: amountIn,
                amountOut: new BigNumber(amountOut).toString(),
                tokenRoute: tokenRoute,
                addressRoute: addressRoute,
            });
        } catch (error) {
            this.logger.error(
                'Error when computing the swap auto route.',
                error,
            );
        }
    }

    public async getAutoRouteFixedOutput(
        amountOut: string,
        tokenInID: string,
        tokenOutID: string,
    ): Promise<AutoRouteModel> {
        const pairs: PairModel[] = await this.getAllActivePairs();

        try {
            const [
                tokenRoute,
                addressRoute,
                amountIn,
            ] = await this.autoRouterComputeService.computeBestSwapRoute(
                tokenOutID,
                tokenInID,
                pairs,
                amountOut,
                PRIORITY_MODES.minInput,
            );

            return new AutoRouteModel({
                tokenInID: tokenInID,
                tokenOutID: tokenOutID,
                amountIn: new BigNumber(amountIn).toString(),
                amountOut: amountOut,
                tokenRoute: tokenRoute,
                addressRoute: addressRoute,
            });
        } catch (error) {
            this.logger.error(
                'Error when computing the swap auto route.',
                error,
            );
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
}
