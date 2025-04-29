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
import { SwapsEvaluationParams } from '../dtos/swaps.evaluation.params';
import { TokenService } from 'src/modules/tokens/services/token.service';
import { BaseEsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { mxConfig } from 'src/config';

@Injectable()
export class SmartRouterEvaluationService {
    private readonly logger = new OriginLogger(
        SmartRouterEvaluationService.name,
    );

    constructor(
        private readonly swapRouteRepository: SwapRouteRepositoryService,
        private readonly tokenService: TokenService,
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
                smartRouterAmountOut: swap.smartRouterAmountOut,
                smartRouterTokenRoutes: swap.smartRouterTokenRoutes,
                smartRouterIntermediaryAmounts:
                    swap.smartRouterIntermediaryAmounts,
                outputDelta: swap.outputDelta,
                outputDeltaPercentage: swap.outputDeltaPercentage,
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

    async getComparisonSwapRoutes(
        params: SwapsEvaluationParams,
    ): Promise<{ totalCount: number; swaps: SwapRoute[] }> {
        const model = this.swapRouteRepository.getModel();

        const filterObj: FilterQuery<SwapRoute> = {
            outputDeltaPercentage: this.computeDeltaPercentageFilter(params),
            txHash: { $ne: null },
        };
        if (params.tokenIn) {
            filterObj.tokenIn = params.tokenIn;
        }

        if (params.tokenOut) {
            filterObj.tokenOut = params.tokenOut;
        }

        if (params.start) {
            const timestampQuery = {
                $gte: params.start,
            };

            if (params.end) {
                timestampQuery['$lte'] = params.end;
            }
            filterObj.timestamp = timestampQuery;
        }

        const totalCount = await model.find(filterObj).count();

        const result = await model
            .find(filterObj)
            .sort({ timestamp: -1, _id: 1 })
            .skip(params.offset)
            .limit(params.size)
            .exec();

        return { swaps: result, totalCount };
    }

    async getDistinctTokens(): Promise<{
        tokensIn: BaseEsdtToken[];
        tokensOut: BaseEsdtToken[];
    }> {
        const model = this.swapRouteRepository.getModel();

        const [distinctTokensIn, distinctTokensOut] = await Promise.all([
            model.distinct('tokenIn'),
            model.distinct('tokenOut'),
        ]);

        const uniqueTokens = [
            ...new Set([...distinctTokensIn, ...distinctTokensOut]),
        ].filter((token) => token !== mxConfig.EGLDIdentifier);

        const tokensMap = (
            await this.tokenService.getAllBaseTokensMetadata(uniqueTokens)
        ).reduce(
            (m, t) => m.set(t.identifier, t),
            new Map<string, BaseEsdtToken>([
                [
                    mxConfig.EGLDIdentifier,
                    {
                        identifier: mxConfig.EGLDIdentifier,
                        decimals: mxConfig.EGLDDecimals,
                    },
                ],
            ]),
        );

        return {
            tokensIn: distinctTokensIn.map((token) => tokensMap.get(token)),
            tokensOut: distinctTokensOut.map((token) => tokensMap.get(token)),
        };
    }

    private computeDeltaPercentageFilter(params: SwapsEvaluationParams) {
        if (params.deltaComparison === 'eq') {
            return params.delta;
        }
        if (params.deltaComparison === 'gt') {
            return { $gt: params.delta };
        }
        return { $lt: params.delta };
    }
}
