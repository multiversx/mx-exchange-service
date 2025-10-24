import {
    TransactionComputer,
    UserSigner,
    Transaction,
    TransactionWatcher,
} from '@multiversx/sdk-core';
import { EsdtTokenPayment } from '@multiversx/sdk-exchange';
import {
    RedisCacheService,
    RedlockService,
} from '@multiversx/sdk-nestjs-cache';
import { Constants } from '@multiversx/sdk-nestjs-common';
import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import BigNumber from 'bignumber.js';
import { promises } from 'fs';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { constantsConfig, scAddress } from 'src/config';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { LockAndRetry } from 'src/helpers/decorators/lock.retry.decorator';
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
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { computeValueUSD } from 'src/utils/token.converters';
import { Logger } from 'winston';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { WeekTimekeepingAbiService } from 'src/submodules/week-timekeeping/services/week-timekeeping.abi.service';

enum BroadcastStatus {
    success = 'success',
    error = 'error',
    fail = 'fail',
    skip = 'skip',
}

const WAIT_MIN = 5_000;
const WAIT_MAX = 25_000;

@Injectable()
export class FeesCollectorTasksService implements OnModuleInit {
    private baseToken: EsdtToken;
    private accountSigner: UserSigner;
    private transactionWatcher: TransactionWatcher;
    private isInitialised = false;
    private currentWeek: number;

    constructor(
        private readonly redLockService: RedlockService,
        private readonly autoRouterService: AutoRouterService,
        private readonly autoRouterTransaction: AutoRouterTransactionService,
        private readonly energyService: EnergyService,
        private readonly feesCollectorAbi: FeesCollectorAbiService,
        private readonly feesCollectorService: FeesCollectorService,
        private readonly feesCollectorTransaction: FeesCollectorTransactionService,
        private readonly tokenCompute: TokenComputeService,
        private readonly mxProxy: MXProxyService,
        private readonly mxApi: MXApiService,
        private readonly apiConfigService: ApiConfigService,
        private readonly redisCacheService: RedisCacheService,
        private readonly contextGetter: ContextGetterService,
        private readonly weekTimekeepingAbi: WeekTimekeepingAbiService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async onModuleInit(): Promise<void> {
        this.baseToken = await this.energyService.getBaseAssetToken();

        const wallet = await promises.readFile(
            this.apiConfigService.getTaskRunnerWallet(),
            { encoding: 'utf8' },
        );
        const walletObject = JSON.parse(wallet);

        this.accountSigner = UserSigner.fromWallet(
            walletObject,
            this.apiConfigService.getTaskRunnerWalletPassword(),
        );

        this.transactionWatcher = new TransactionWatcher({
            getTransaction: async (hash) => {
                return await this.mxProxy
                    .getService()
                    .getTransaction(hash, true);
            },
        });

        this.isInitialised = true;

        this.logger.info(`The module has been initialized.`, {
            context: FeesCollectorTasksService.name,
        });
    }

    @Cron(CronExpression.EVERY_HOUR)
    @LockAndRetry({
        lockKey: FeesCollectorTasksService.name,
        lockName: 'swapTokens',
    })
    async swapTokens(): Promise<void> {
        if (!this.isInitialised) {
            this.logger.warn('Service not initialised, aborting run', {
                context: FeesCollectorTasksService.name,
            });
            return;
        }

        this.logger.info('Start swaps task for tokens in fees collector', {
            context: FeesCollectorTasksService.name,
        });

        const performance = new PerformanceProfiler();

        const [feesCollector, tokens] = await Promise.all([
            this.feesCollectorService.feesCollector(scAddress.feesCollector),
            this.mxApi.getTokensForUser(scAddress.feesCollector),
        ]);

        this.currentWeek = feesCollector.time.currentWeek;

        const txStats: Record<BroadcastStatus, number> = {
            success: 0,
            fail: 0,
            error: 0,
            skip: 0,
        };

        for (const token of tokens) {
            const waitMs = randomJitter(WAIT_MAX, WAIT_MIN);
            await delay(waitMs);

            const status = await this.performSwap(token);
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

    @Cron(CronExpression.EVERY_4_HOURS)
    @LockAndRetry({
        lockKey: FeesCollectorTasksService.name,
        lockName: 'redistributeRewards',
    })
    async redistributeRewards(): Promise<void> {
        const cacheKey = 'feeCollectorTasks.redistributeRewards.lastEpoch';

        const [currentEpoch, lastProcessedEpoch] = await Promise.all([
            this.contextGetter.getCurrentEpoch(),
            this.redisCacheService.get<number>(cacheKey),
        ]);

        if (lastProcessedEpoch === currentEpoch) {
            this.logger.info(
                `Redistribute rewards task skipped - already processed in epoch ${currentEpoch}`,
                { context: FeesCollectorTasksService.name },
            );
            return;
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
            return;
        }

        const transaction =
            await this.feesCollectorTransaction.redistributeRewards(
                this.accountSigner.getAddress().toBech32(),
            );

        const status = await this.broadcastTransaction(transaction);

        if (status === BroadcastStatus.error) {
            this.logger.error(
                `Encountered an error while broadcasting redistribute rewards transaction`,
                {
                    context: FeesCollectorTasksService.name,
                },
            );

            // throwing will trigger retry (up to 3 times)
            throw new Error('Redistribute Rewards transaction failed');
        }

        await this.redisCacheService.set(
            cacheKey,
            currentEpoch,
            Constants.oneHour() * 25,
        );
    }

    private async performSwap(token: EsdtToken): Promise<BroadcastStatus> {
        if (token.identifier === this.baseToken.identifier) {
            return BroadcastStatus.skip;
        }

        const amount = await this.computeAmountForSwap(token);

        if (amount === '0') {
            return BroadcastStatus.skip;
        }

        const transaction = await this.getSwapTransaction(token, amount);
        if (!transaction) {
            return BroadcastStatus.skip;
        }

        const status = await this.broadcastTransaction(transaction);
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

    private async computeAmountForSwap(token: EsdtToken): Promise<string> {
        try {
            const [availableAmount, tokenPriceUSD] = await Promise.all([
                this.feesCollectorAbi.tokenAvailableAmount(
                    this.currentWeek,
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
    ): Promise<TransactionModel | undefined> {
        try {
            const route = await this.autoRouterService.swap({
                tokenInID: token.identifier,
                tokenOutID: this.baseToken.identifier,
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
                    this.accountSigner.getAddress().toBech32(),
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
                    ` input amount : ${amountIn} ${this.baseToken.identifier}`,
                {
                    context: FeesCollectorTasksService.name,
                },
            );
            this.logger.error(error);

            return undefined;
        }
    }

    private async broadcastTransaction(
        tx: TransactionModel,
    ): Promise<BroadcastStatus> {
        const { nonce } = await this.mxApi.getAccountStats(
            this.accountSigner.getAddress().bech32(),
        );

        const transaction = new Transaction({
            nonce: BigInt(nonce),
            sender: tx.sender,
            receiver: scAddress.feesCollector,
            value: BigInt(tx.value),
            data: Buffer.from(tx.data, 'base64'),
            gasPrice: BigInt(tx.gasPrice),
            gasLimit: BigInt(tx.gasLimit),
            chainID: tx.chainID,
            version: 2,
        });

        try {
            transaction.signature = await this.accountSigner.sign(
                new TransactionComputer().computeBytesForSigning(transaction),
            );

            const txHash = await this.mxProxy
                .getService()
                .sendTransaction(transaction);

            const transactionOnNetwork =
                await this.transactionWatcher.awaitCompleted(txHash);

            if (!transactionOnNetwork.status.isSuccessful()) {
                this.logger.error(`Transaction ${txHash} has failed`, {
                    context: FeesCollectorTasksService.name,
                });

                return BroadcastStatus.fail;
            }

            this.logger.info(`Transaction ${txHash} was successful`, {
                context: FeesCollectorTasksService.name,
            });

            return BroadcastStatus.success;
        } catch (error) {
            this.logger.error(error);

            return BroadcastStatus.error;
        }
    }
}
