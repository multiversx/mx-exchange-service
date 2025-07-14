import {
    TransactionComputer,
    UserSigner,
    Transaction,
    TransactionWatcher,
} from '@multiversx/sdk-core';
import {
    RedisCacheService,
    RedlockService,
} from '@multiversx/sdk-nestjs-cache';
import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { promises } from 'fs';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { constantsConfig, scAddress } from 'src/config';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { LockAndRetry } from 'src/helpers/decorators/lock.retry.decorator';
import { delay } from 'src/helpers/helpers';
import { TransactionModel } from 'src/models/transaction.model';
import { AutoRouterService } from 'src/modules/auto-router/services/auto-router.service';
import { AutoRouterTransactionService } from 'src/modules/auto-router/services/auto-router.transactions.service';
import { EnergyService } from 'src/modules/energy/services/energy.service';
import { FeesCollectorComputeService } from 'src/modules/fees-collector/services/fees-collector.compute.service';
import { FeesCollectorService } from 'src/modules/fees-collector/services/fees-collector.service';
import { FeesCollectorTransactionService } from 'src/modules/fees-collector/services/fees-collector.transaction.service';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { computeValueUSD } from 'src/utils/token.converters';
import { Logger } from 'winston';

enum BroadcastStatus {
    success = 'success',
    error = 'error',
    fail = 'fail',
    skip = 'skip',
}

@Injectable()
export class FeesCollectorTasksService implements OnModuleInit {
    private currentNonce: number;
    private baseToken: EsdtToken;
    private accountSigner: UserSigner;
    private transactionWatcher: TransactionWatcher;
    private isInitialised = false;
    private startWeek: number;
    private endWeek: number;

    constructor(
        private readonly redLockService: RedlockService,
        private readonly redisCacheService: RedisCacheService,
        private readonly autoRouterService: AutoRouterService,
        private readonly autoRouterTransaction: AutoRouterTransactionService,
        private readonly energyService: EnergyService,
        private readonly feesCollectorCompute: FeesCollectorComputeService,
        private readonly feesCollectorService: FeesCollectorService,
        private readonly feesCollectorTransaction: FeesCollectorTransactionService,
        private readonly tokenCompute: TokenComputeService,
        private readonly mxProxy: MXProxyService,
        private readonly apiConfigService: ApiConfigService,
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

    @Cron(CronExpression.EVERY_MINUTE)
    @LockAndRetry({
        lockKey: 'swapTokens',
        lockName: FeesCollectorTasksService.name,
    })
    async swapTokens(): Promise<void> {
        if (!this.isInitialised) {
            this.log('warn', 'Service not initialised, aborting run');
            return;
        }

        const performance = new PerformanceProfiler();

        this.log('info', 'Start swaps task for tokens in fees collector');

        const [feesCollector, tokens, accountNonce] = await Promise.all([
            this.feesCollectorService.feesCollector(scAddress.feesCollector),
            this.mxProxy.getAddressTokens(scAddress.feesCollector),
            this.mxProxy.getAddressNonce(
                this.accountSigner.getAddress().bech32(),
            ),
        ]);

        this.currentNonce = accountNonce;
        this.startWeek = feesCollector.startWeek;
        this.endWeek = feesCollector.endWeek;

        const txStats: Record<BroadcastStatus, number> = {
            success: 0,
            fail: 0,
            error: 0,
            skip: 0,
        };

        for (const token of tokens) {
            const status = await this.performSwap(token);
            txStats[status]++;

            await delay(500);
        }

        performance.stop();

        this.log(
            'info',
            `Finished performing swaps for ${tokens.length} tokens in ${performance.duration}ms ` +
                `| ${JSON.stringify(txStats)}`,
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
            this.log(
                'error',
                `Encountered an error while broadcasting swap transaction for ${token.identifier}`,
            );
        }

        return status;
    }

    private async computeAmountForSwap(token: EsdtToken): Promise<string> {
        try {
            const [
                availableAmount,
                tokenPriceUSD,
                tokenPriceEGLD,
                baseTokenPriceEGLD,
            ] = await Promise.all([
                this.feesCollectorCompute.computeTokenAvailableAmount(
                    token,
                    this.startWeek,
                    this.endWeek,
                ),
                this.tokenCompute.tokenPriceDerivedUSD(token.identifier),
                this.tokenCompute.tokenPriceDerivedEGLD(token.identifier),
                this.tokenCompute.tokenPriceDerivedEGLD(
                    this.baseToken.identifier,
                ),
            ]);

            const availableAmountUSD = computeValueUSD(
                availableAmount.toFixed(),
                token.decimals,
                tokenPriceUSD,
            );

            this.log(
                'info',
                `Available : ${availableAmount.toFixed()} ${token.identifier}` +
                    ` | $${availableAmountUSD.toFixed()}`,
            );

            if (
                availableAmountUSD.lt(
                    constantsConfig.FEES_COLLECTOR_SWAP_THRESHOLD_USD,
                )
            ) {
                this.log(
                    'warn',
                    `Threshold not met. Skipping ${token.identifier}`,
                );
                return '0';
            }

            const egldAmount = availableAmount
                .times(`1e-${token.decimals}`)
                .times(tokenPriceEGLD)
                .integerValue();

            return egldAmount
                .dividedBy(baseTokenPriceEGLD)
                .multipliedBy(`1e${this.baseToken.decimals}`)
                .integerValue()
                .toFixed();
        } catch (error) {
            this.log(
                'error',
                `Encountered an error while computing swap amount for token ${token.identifier}`,
            );
            this.logger.error(error);

            return '0';
        }
    }

    private async getSwapTransaction(
        token: EsdtToken,
        amountOut: string,
    ): Promise<TransactionModel | undefined> {
        try {
            const route = await this.autoRouterService.swap({
                tokenInID: token.identifier,
                tokenOutID: this.baseToken.identifier,
                tolerance: constantsConfig.FEES_COLLECTOR_SWAP_TOLERANCE,
                amountOut,
            });

            const args = this.autoRouterTransaction.multiPairFixedOutputSwaps({
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
                    this.accountSigner.getAddress().bech32(),
                    token.identifier,
                    args,
                );

            return transaction;
        } catch (error) {
            this.log(
                'error',
                `Encountered an error while computing swap transaction for token ${token.identifier} |` +
                    ` expected output : ${amountOut} ${this.baseToken.identifier}`,
            );
            this.logger.error(error);

            return undefined;
        }
    }

    private async broadcastTransaction(
        swapTransaction: TransactionModel,
    ): Promise<BroadcastStatus> {
        const transaction = new Transaction({
            nonce: BigInt(this.currentNonce),
            sender: swapTransaction.sender,
            receiver: scAddress.feesCollector,
            value: BigInt(swapTransaction.value),
            data: Buffer.from(swapTransaction.data, 'base64'),
            gasPrice: BigInt(swapTransaction.gasPrice),
            gasLimit: BigInt(swapTransaction.gasLimit),
            chainID: swapTransaction.chainID,
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

            this.currentNonce += 1;

            if (!transactionOnNetwork.status.isSuccessful()) {
                this.log('error', `Swap transaction ${txHash} has failed`);

                return BroadcastStatus.fail;
            }

            this.log('info', `Swap transaction ${txHash} was successful`);

            return BroadcastStatus.success;
        } catch (error) {
            this.logger.error(error);

            return BroadcastStatus.error;
        }
    }

    private log(type: 'info' | 'warn' | 'error', message: string): void {
        switch (type) {
            case 'info':
                this.logger.info(message, {
                    context: FeesCollectorTasksService.name,
                });
                break;
            case 'warn':
                this.logger.warn(message, {
                    context: FeesCollectorTasksService.name,
                });
                break;
            case 'error':
                this.logger.error(message, {
                    context: FeesCollectorTasksService.name,
                });
                break;
        }
    }
}
