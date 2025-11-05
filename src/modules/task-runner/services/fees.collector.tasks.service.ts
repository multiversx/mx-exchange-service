import { EsdtTokenPayment } from '@multiversx/sdk-exchange';
import { RedisCacheService } from '@multiversx/sdk-nestjs-cache';
import { Constants } from '@multiversx/sdk-nestjs-common';
import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { constantsConfig, scAddress } from 'src/config';
import { delay, randomJitter } from 'src/helpers/helpers';
import { TransactionModel } from 'src/models/transaction.model';
import { AutoRouterService } from 'src/modules/auto-router/services/auto-router.service';
import { AutoRouterTransactionService } from 'src/modules/auto-router/services/auto-router.transactions.service';
import { EnergyService } from 'src/modules/energy/services/energy.service';
import { FeesCollectorAbiService } from 'src/modules/fees-collector/services/fees-collector.abi.service';
import { FeesCollectorService } from 'src/modules/fees-collector/services/fees-collector.service';
import { FeesCollectorTransactionService } from 'src/modules/fees-collector/services/fees-collector.transaction.service';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { computeValueUSD } from 'src/utils/token.converters';
import { Logger } from 'winston';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { WeekTimekeepingAbiService } from 'src/submodules/week-timekeeping/services/week-timekeeping.abi.service';
import { TaskRunnerTransactionService } from './task.runner.transaction.service';
import { BroadcastStatus } from '../constants';

const WAIT_MIN = 5_000;
const WAIT_MAX = 25_000;
const REDISTRIBUTE_REWARDS_CACHE_KEY =
    'feeCollectorTasks.redistributeRewards.lastEpoch';

@Injectable()
export class FeesCollectorTasksService {
    constructor(
        private readonly autoRouterService: AutoRouterService,
        private readonly autoRouterTransaction: AutoRouterTransactionService,
        private readonly energyService: EnergyService,
        private readonly feesCollectorAbi: FeesCollectorAbiService,
        private readonly feesCollectorService: FeesCollectorService,
        private readonly feesCollectorTransaction: FeesCollectorTransactionService,
        private readonly tokenCompute: TokenComputeService,
        private readonly mxApi: MXApiService,
        private readonly redisCacheService: RedisCacheService,
        private readonly contextGetter: ContextGetterService,
        private readonly weekTimekeepingAbi: WeekTimekeepingAbiService,
        private readonly transactionService: TaskRunnerTransactionService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async executeSwapTokensTask(): Promise<void> {
        this.logger.info('Start swaps task for tokens in fees collector', {
            context: FeesCollectorTasksService.name,
        });

        const performance = new PerformanceProfiler();

        const [feesCollector, tokens, tokenOut] = await Promise.all([
            this.feesCollectorService.feesCollector(scAddress.feesCollector),
            this.mxApi.getTokensForUser(scAddress.feesCollector),
            this.energyService.getBaseAssetToken(),
        ]);

        const txStats: Record<BroadcastStatus, number> = {
            success: 0,
            fail: 0,
            error: 0,
            skip: 0,
        };

        for (const token of tokens) {
            const waitMs = randomJitter(WAIT_MAX, WAIT_MIN);
            await delay(waitMs);

            const status = await this.performSwap(
                token,
                tokenOut,
                feesCollector.time.currentWeek,
            );
            txStats[status]++;
        }

        performance.stop();

        this.logger.info(
            `Finished performing swaps for ${tokens.length} tokens in ${performance.duration}ms ` +
                `| ${JSON.stringify(txStats)}`,
            {
                context: FeesCollectorTasksService.name,
            },
        );
    }

    async executeRedistributeRewardsTask(forceExecute = false): Promise<void> {
        this.logger.info('Start redistribute rewards task in fees collector', {
            context: FeesCollectorTasksService.name,
        });

        const [currentEpoch, lastProcessedEpoch] = await Promise.all([
            this.contextGetter.getCurrentEpoch(),
            this.redisCacheService.get<number>(REDISTRIBUTE_REWARDS_CACHE_KEY),
        ]);

        const shouldExecute = forceExecute
            ? true
            : await this.shouldExecuteRedistributeRewards(
                  currentEpoch,
                  lastProcessedEpoch,
              );

        if (!shouldExecute) {
            return;
        }

        const transaction =
            await this.feesCollectorTransaction.redistributeRewards(
                this.transactionService.getSenderAddress(),
            );

        const status = await this.transactionService.broadcastTransaction(
            transaction,
        );

        if (status === BroadcastStatus.success) {
            await this.redisCacheService.set(
                REDISTRIBUTE_REWARDS_CACHE_KEY,
                currentEpoch,
                Constants.oneHour() * 25,
            );
        }

        if (status === BroadcastStatus.error) {
            throw new Error('Redistribute Rewards task failed');
        }

        this.logger.info(
            `Task 'redistributeRewards' for epoch ${currentEpoch} was completed with status: ${status}`,
            {
                context: FeesCollectorTasksService.name,
            },
        );
    }

    private async shouldExecuteRedistributeRewards(
        currentEpoch: number,
        lastProcessedEpoch: number,
    ): Promise<boolean> {
        if (lastProcessedEpoch === currentEpoch) {
            this.logger.info(
                `Redistribute rewards task skipped - already processed in epoch ${currentEpoch}`,
                { context: FeesCollectorTasksService.name },
            );
            return false;
        }

        const firstWeekStartEpoch =
            await this.weekTimekeepingAbi.firstWeekStartEpoch(
                scAddress.feesCollector,
            );

        if (
            (currentEpoch - firstWeekStartEpoch) %
                constantsConfig.EPOCHS_IN_WEEK !==
            0
        ) {
            this.logger.info(
                `Redistribute rewards task skipped for epoch ${currentEpoch}`,
                { context: FeesCollectorTasksService.name },
            );
            return false;
        }

        return true;
    }

    private async performSwap(
        token: EsdtToken,
        tokenOut: EsdtToken,
        currentWeek: number,
    ): Promise<BroadcastStatus> {
        if (token.identifier === tokenOut.identifier) {
            return BroadcastStatus.skip;
        }

        const amount = await this.computeAmountForSwap(token, currentWeek);

        if (amount === '0') {
            return BroadcastStatus.skip;
        }

        const transaction = await this.getSwapTransaction(
            token,
            amount,
            tokenOut,
        );
        if (!transaction) {
            return BroadcastStatus.skip;
        }

        const status = await this.transactionService.broadcastTransaction(
            transaction,
        );

        if (status === BroadcastStatus.error) {
            this.logger.error(
                `Encountered an error while broadcasting swap transaction for ${token.identifier}`,
                {
                    context: FeesCollectorTasksService.name,
                },
            );
        }

        return status;
    }

    private async computeAmountForSwap(
        token: EsdtToken,
        currentWeek: number,
    ): Promise<string> {
        try {
            const [availableAmount, tokenPriceUSD] = await Promise.all([
                this.feesCollectorAbi.tokenAvailableAmount(
                    currentWeek,
                    token.identifier,
                ),
                this.tokenCompute.computeTokenPriceDerivedUSD(token.identifier),
            ]);

            const availableAmountUSD = computeValueUSD(
                availableAmount,
                token.decimals,
                tokenPriceUSD,
            );

            this.logger.info(
                `Available : ${availableAmount} ${token.identifier}` +
                    ` | $${availableAmountUSD.toFixed()}`,
                {
                    context: FeesCollectorTasksService.name,
                },
            );

            if (
                availableAmountUSD.lt(
                    constantsConfig.FEES_COLLECTOR_MIN_SWAP_AMOUNT_USD,
                )
            ) {
                this.logger.warn(
                    `Available USD amount below minimum. Skipping swap for ${token.identifier}`,
                    {
                        context: FeesCollectorTasksService.name,
                    },
                );
                return '0';
            }

            if (
                availableAmountUSD.lte(
                    constantsConfig.FEES_COLLECTOR_MAX_SWAP_AMOUNT_USD,
                )
            ) {
                return availableAmount;
            }

            this.logger.warn(
                `Available USD amount above maximum. Capping swap amount for ${token.identifier}`,
                {
                    context: FeesCollectorTasksService.name,
                },
            );

            const cappedInputTokenAmount = new BigNumber(
                constantsConfig.FEES_COLLECTOR_MAX_SWAP_AMOUNT_USD,
            )
                .dividedBy(tokenPriceUSD)
                .multipliedBy(`1e${token.decimals}`)
                .integerValue();

            return cappedInputTokenAmount.toFixed();
        } catch (error) {
            this.logger.error(
                `Encountered an error while computing swap amount for token ${token.identifier}`,
                {
                    context: FeesCollectorTasksService.name,
                },
            );
            this.logger.error(error);

            return '0';
        }
    }

    private async getSwapTransaction(
        token: EsdtToken,
        amountIn: string,
        tokenOut: EsdtToken,
    ): Promise<TransactionModel | undefined> {
        try {
            const route = await this.autoRouterService.swap({
                tokenInID: token.identifier,
                tokenOutID: tokenOut.identifier,
                tolerance: constantsConfig.FEES_COLLECTOR_SWAP_TOLERANCE,
                amountIn,
            });

            const args = this.autoRouterTransaction.multiPairFixedInputSwaps({
                swapType: route.swapType,
                tokenInID: route.tokenInID,
                tokenOutID: route.tokenOutID,
                addressRoute: route.pairs.map((p) => p.address),
                intermediaryAmounts: route.intermediaryAmounts,
                tokenRoute: route.tokenRoute,
                tolerance: route.tolerance,
            });

            const transaction =
                await this.feesCollectorTransaction.swapTokenToBaseToken(
                    this.transactionService.getSenderAddress(),
                    new EsdtTokenPayment({
                        tokenIdentifier: token.identifier,
                        tokenNonce: 0,
                        amount: amountIn,
                    }),
                    args,
                );

            return transaction;
        } catch (error) {
            this.logger.error(
                `Encountered an error while computing swap transaction for token ${token.identifier} |` +
                    ` input amount : ${amountIn} ${tokenOut.identifier}`,
                {
                    context: FeesCollectorTasksService.name,
                },
            );
            this.logger.error(error);

            return undefined;
        }
    }
}
