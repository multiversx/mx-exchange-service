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
import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';

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
        this.logger.info('Start process unconfirmed swaps', {
            context: 'SmartRouterEvaluationCron',
        });
        const performance = new PerformanceProfiler();

        const cutoffTimestamp = await this.getCutoffTimestamp();

        const uniqueSwaps =
            await this.evaluationService.getGroupedUnconfirmedSwapRoutes(
                cutoffTimestamp,
            );

        let updatedSwapsCount = 0;

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

            const updated = await this.updateSwapGroup(swapGroup, operations);
            updatedSwapsCount += updated;
        }

        await this.evaluationService.purgeStaleComparisonSwapRoutes(
            cutoffTimestamp,
        );

        await this.redisCacheService.set(
            `${SMART_ROUTER_BASE_KEY}.lastProcessedTimestamp`,
            moment().unix(),
            Constants.oneHour(),
        );

        performance.stop();

        this.logger.info(
            `Updated txHash field for ${updatedSwapsCount} swaps in ${
                performance.duration / 1000
            }s`,
            {
                context: 'SmartRouterEvaluationCron',
            },
        );
    }

    private async updateSwapGroup(
        swapGroup: SwapRouteDocument[],
        operations: Operation[],
    ): Promise<number> {
        if (operations.length === 0) {
            return 0;
        }

        if (operations.length > swapGroup.length) {
            this.logger.warn('Found more transactions than persisted swaps');
        }

        const bulkOps = [];
        let swapIndex = 0;

        for (const operation of operations) {
            const existingSwapRoute =
                await this.evaluationService.getSwapRouteByTxHash(
                    operation._search,
                );

            if (existingSwapRoute !== null) {
                continue;
            }

            bulkOps.push({
                updateOne: {
                    filter: { _id: swapGroup[swapIndex]._id },
                    update: {
                        $set: {
                            txHash: operation._search,
                        },
                    },
                },
            });

            swapIndex += 1;

            if (swapIndex > operations.length - 1) {
                break;
            }
        }

        await this.evaluationService.updateSwapRoutes(bulkOps);

        return bulkOps.length;
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
