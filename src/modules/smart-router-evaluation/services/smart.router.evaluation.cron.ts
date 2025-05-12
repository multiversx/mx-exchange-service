import { Inject, Injectable } from '@nestjs/common';
import { SmartRouterEvaluationService } from './smart.router.evaluation.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Constants } from '@multiversx/sdk-nestjs-common';
import { SwapRouteDocument } from '../schemas/swap.route.schema';
import {
    ESOperationsService,
    Operation,
} from 'src/services/elastic-search/services/es.operations.service';
import moment from 'moment';
import { LockAndRetry } from 'src/helpers/decorators/lock.retry.decorator';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import {
    RedisCacheService,
    RedlockService,
} from '@multiversx/sdk-nestjs-cache';
import { Logger } from 'winston';

const SMART_ROUTER_BASE_KEY = 'smartRouter';

@Injectable()
export class SmartRouterEvaluationCronService {
    constructor(
        private readonly evaluationService: SmartRouterEvaluationService,
        private readonly esOperationsService: ESOperationsService,
        private readonly redLockService: RedlockService,
        private readonly redisCacheService: RedisCacheService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    @Cron(CronExpression.EVERY_MINUTE)
    @LockAndRetry({
        lockKey: 'processUnconfirmedSwaps',
        lockName: 'SmartRouterEvaluationCron',
    })
    async processUnconfirmedSwaps(): Promise<void> {
        const cutoffTimestamp = await this.getCutoffTimestamp();

        const uniqueSwaps =
            await this.evaluationService.getGroupedUnconfirmedSwapRoutes(
                cutoffTimestamp,
            );

        for (const swapGroup of uniqueSwaps.values()) {
            const newestSwap = swapGroup[0];
            const oldestSwap = swapGroup[swapGroup.length - 1];

            let operations =
                await this.esOperationsService.getTransactionsBySenderAndData(
                    newestSwap.sender,
                    newestSwap.txData,
                    oldestSwap.timestamp,
                );

            operations = operations.filter(
                (operation) => operation.data === newestSwap.txData,
            );

            await this.updateSwapGroup(swapGroup, operations);
        }

        await this.evaluationService.purgeStaleComparisonSwapRoutes(
            cutoffTimestamp,
        );

        await this.redisCacheService.set(
            `${SMART_ROUTER_BASE_KEY}.lastProcessedTimestamp`,
            moment().unix(),
            Constants.oneHour(),
        );
    }

    private async updateSwapGroup(
        swapGroup: SwapRouteDocument[],
        operations: Operation[],
    ): Promise<void> {
        if (operations.length === 0) {
            return;
        }

        if (operations.length > swapGroup.length) {
            this.logger.warn('Found more transactions than persisted swaps');
        }

        const deleteIds = [];
        const bulkOps = [];
        for (let index = 0; index < swapGroup.length; index++) {
            if (index > operations.length - 1) {
                deleteIds.push(swapGroup[index]._id);
                continue;
            }

            const existingSwapRoute =
                await this.evaluationService.getSwapRouteByTxHash(
                    operations[index]._search,
                );

            if (existingSwapRoute === null) {
                bulkOps.push({
                    updateOne: {
                        filter: { _id: swapGroup[index]._id },
                        update: { $set: { txHash: operations[index]._search } },
                    },
                });
                continue;
            }

            if (existingSwapRoute._id !== swapGroup[index]._id) {
                deleteIds.push(swapGroup[index]._id);
            }
        }

        this.logger.info(
            `Updating txHash for ${bulkOps.length} swap routes. Deleting ${deleteIds} redunant swap routes.`,
        );

        if (deleteIds.length > 0) {
            bulkOps.push({
                deleteMany: { filter: { _id: deleteIds } },
            });
        }

        await this.evaluationService.updateSwapRoutes(bulkOps);
    }

    private async getCutoffTimestamp(): Promise<number | undefined> {
        const lastProcessedTimestamp = await this.redisCacheService.get<number>(
            `${SMART_ROUTER_BASE_KEY}.lastProcessedTimestamp`,
        );

        if (!lastProcessedTimestamp) {
            return undefined;
        }

        const cutoffTimestamp = moment().subtract(10, 'minutes').unix();

        if (lastProcessedTimestamp < cutoffTimestamp) {
            return lastProcessedTimestamp;
        }

        return cutoffTimestamp;
    }
}
