import { OriginLogger } from '@multiversx/sdk-nestjs-common';
import { Injectable } from '@nestjs/common';
import {
    AutoRouteModel,
    SWAP_TYPE,
} from 'src/modules/auto-router/models/auto-route.model';
import { SwapRouteRepositoryService } from 'src/services/database/repositories/swap.route.repository';
import { SwapRoute } from '../schemas/swap.route.schema';
import moment from 'moment';
import BigNumber from 'bignumber.js';

@Injectable()
export class SmartRouterEvaluationService {
    private readonly logger = new OriginLogger(
        SmartRouterEvaluationService.name,
    );

    constructor(
        private readonly swapRouteRepository: SwapRouteRepositoryService,
    ) {}

    async addFixedInputSwapComparison(
        autoRouteModel: AutoRouteModel,
    ): Promise<void> {
        if (autoRouteModel.swapType !== SWAP_TYPE.fixedInput) {
            return;
        }

        const {
            tokenInID,
            tokenOutID,
            amountIn,
            amountOut,
            tokenRoute,
            intermediaryAmounts,
            parallelRouteSwap,
        } = autoRouteModel;

        if (!parallelRouteSwap) {
            this.logger.log('Missing parallel routes');
            return;
        }

        const smartRouterOutput = new BigNumber(parallelRouteSwap.totalResult);
        const diff = smartRouterOutput.minus(amountOut);
        const percentage = diff.dividedBy(amountOut).multipliedBy(100);

        const swapRouteDoc: SwapRoute = {
            timestamp: moment().unix(),
            tokenIn: tokenInID,
            tokenOut: tokenOutID,
            amountIn,
            autoRouterAmountOut: amountOut,
            autoRouterTokenRoute: tokenRoute,
            autoRouterIntermediaryAmounts: intermediaryAmounts,
            smartRouterAmountOut: parallelRouteSwap.totalResult,
            smartRouterTokenRoutes: parallelRouteSwap.allocations.map(
                (allocation) => allocation.tokenRoute,
            ),
            smartRouterIntermediaryAmounts: parallelRouteSwap.allocations.map(
                (allocation) => allocation.intermediaryAmounts,
            ),
            outputDelta: diff.toFixed(),
            outputDeltaPercentage: percentage.toNumber(),
        };

        try {
            await this.swapRouteRepository.create(swapRouteDoc);
        } catch (error) {
            this.logger.error(
                'Error when creating swap route comparison',
                error,
            );
        }
    }
}
