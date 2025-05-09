import * as crypto from 'crypto';
import { OriginLogger } from '@multiversx/sdk-nestjs-common';
import { Injectable } from '@nestjs/common';
import {
    AutoRouteModel,
    SWAP_TYPE,
} from 'src/modules/auto-router/models/auto-route.model';
import { SwapRouteRepositoryService } from 'src/services/database/repositories/swap.route.repository';
import { SwapRoute, SwapRouteDocument } from '../schemas/swap.route.schema';
import moment from 'moment';
import BigNumber from 'bignumber.js';
import { FilterQuery } from 'mongoose';
import { TransactionModel } from 'src/models/transaction.model';

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
        transaction: TransactionModel,
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
            sender: transaction.sender,
            txData: transaction.data,
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
                error.message,
            );
        }
    }

    async getSwapRouteByTxHash(
        txHash: string,
    ): Promise<SwapRouteDocument | null> {
        return await this.swapRouteRepository.findOne({ txHash });
    }

    async getGroupedUnconfirmedSwapRoutes(
        cutoffTimestamp: number | undefined,
    ): Promise<Map<string, SwapRouteDocument[]>> {
        const filterQuery: FilterQuery<SwapRoute> = {
            txHash: null,
        };

        if (cutoffTimestamp !== undefined) {
            filterQuery.timestamp = { $gte: cutoffTimestamp };
        }

        const swaps = await this.swapRouteRepository
            .getModel()
            .find(filterQuery)
            .sort({ timestamp: 'desc', _id: 1 })
            .exec();

        const uniqueSwaps = new Map<string, SwapRouteDocument[]>();
        for (const swap of swaps) {
            const tempSwap = {
                sender: swap.sender,
                txData: swap.txData,
                tokenIn: swap.tokenIn,
                tokenOut: swap.tokenOut,
                amountIn: swap.amountIn,
                autoRouterAmountOut: swap.autoRouterAmountOut,
                autoRouterTokenRoute: swap.autoRouterTokenRoute,
                autoRouterIntermediaryAmounts:
                    swap.autoRouterIntermediaryAmounts,
            };

            const optionsHash = crypto
                .createHash('md5')
                .update(JSON.stringify(tempSwap))
                .digest('hex');

            if (!uniqueSwaps.has(optionsHash)) {
                uniqueSwaps.set(optionsHash, []);
            }

            const currentSwaps = uniqueSwaps.get(optionsHash);
            currentSwaps.push(swap);
        }

        return uniqueSwaps;
    }

    async updateSwapRoutes(bulkOps: any[]): Promise<void> {
        try {
            await this.swapRouteRepository.getModel().bulkWrite(bulkOps);
        } catch (error) {
            this.logger.error(error);
        }
    }

    async purgeStaleComparisonSwapRoutes(
        cutoffTimestamp: number | undefined,
    ): Promise<void> {
        if (cutoffTimestamp === undefined) {
            return;
        }

        await this.swapRouteRepository.deleteMany({
            txHash: null,
            timestamp: { $lt: cutoffTimestamp },
        });
    }
}
