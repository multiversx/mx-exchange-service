import {
    TransactionComputer,
    VariadicValue,
    UserSigner,
    Transaction,
    TransactionWatcher,
} from '@multiversx/sdk-core';
import {
    RedisCacheService,
    RedlockService,
} from '@multiversx/sdk-nestjs-cache';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { promises } from 'fs';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { scAddress } from 'src/config';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { LockAndRetry } from 'src/helpers/decorators/lock.retry.decorator';
import { AutoRouterService } from 'src/modules/auto-router/services/auto-router.service';
import { AutoRouterTransactionService } from 'src/modules/auto-router/services/auto-router.transactions.service';
import { EnergyService } from 'src/modules/energy/services/energy.service';
import { FeesCollectorComputeService } from 'src/modules/fees-collector/services/fees-collector.compute.service';
import { FeesCollectorService } from 'src/modules/fees-collector/services/fees-collector.service';
import { FeesCollectorTransactionService } from 'src/modules/fees-collector/services/fees-collector.transaction.service';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { Logger } from 'winston';

const TOLERANCE = 0.01;

@Injectable()
export class FeesCollectorTasksService implements OnModuleInit {
    private currentNonce: number;
    private isInitialised = false;
    private baseToken: EsdtToken;
    private accountSigner: UserSigner;

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
        private readonly mxApi: MXApiService,
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

        this.isInitialised = true;

        this.logger.info(`The module has been initialized.`, {
            context: FeesCollectorTasksService.name,
        });
    }

    @Cron(CronExpression.EVERY_MINUTE)
    @LockAndRetry({
        lockKey: 'swapTokenToBaseToken',
        lockName: FeesCollectorTasksService.name,
    })
    async swapTokenToBaseToken(): Promise<void> {
        if (!this.isInitialised) {
            this.logger.warn('Service not initialised, aborting run', {
                context: FeesCollectorTasksService.name,
            });
            return;
        }

        this.logger.info('Start', {
            context: FeesCollectorTasksService.name,
        });

        const [feesCollector, tokens, accountStats] = await Promise.all([
            this.feesCollectorService.feesCollector(scAddress.feesCollector),
            this.mxApi.getTokensForUser(scAddress.feesCollector),
            this.mxApi.getAccountStats(
                this.accountSigner.getAddress().bech32(),
            ),
        ]);

        this.currentNonce = accountStats.nonce;

        for (const token of tokens) {
            await this.processToken(
                token,
                feesCollector.startWeek,
                feesCollector.endWeek,
            );
        }
    }

    private async processToken(
        token: EsdtToken,
        startWeek: number,
        endWeek: number,
    ): Promise<void> {
        if (token.identifier === this.baseToken.identifier) {
            // skip MEX
            return;
        }

        const [availableAmountUSD, baseTokenPriceUSD] = await Promise.all([
            this.feesCollectorCompute.computeTokenAvailableAmountUSD(
                token,
                startWeek,
                endWeek,
            ),
            this.tokenCompute.tokenPriceDerivedUSD(this.baseToken.identifier),
        ]);

        if (availableAmountUSD.lt(10)) {
            // TODO log token and amount
            return;
        }

        const baseTokenAmount = availableAmountUSD
            .dividedBy(baseTokenPriceUSD)
            .integerValue()
            .toFixed();

        const swapRoute = await this.autoRouterService.swap({
            tokenInID: token.identifier,
            tokenOutID: this.baseToken.identifier,
            tolerance: TOLERANCE,
            amountOut: baseTokenAmount,
        });

        const swapArgs = VariadicValue.fromItems(
            ...this.autoRouterTransaction.multiPairFixedOutputSwaps({
                swapType: swapRoute.swapType,
                tokenInID: swapRoute.tokenInID,
                tokenOutID: swapRoute.tokenOutID,
                addressRoute: swapRoute.pairs.map((p) => p.address),
                intermediaryAmounts: swapRoute.intermediaryAmounts,
                tokenRoute: swapRoute.tokenRoute,
                tolerance: swapRoute.tolerance,
            }),
        );

        const sender = this.accountSigner.getAddress().bech32();

        const swapTransaction =
            await this.feesCollectorTransaction.swapTokenToBaseToken(
                sender,
                token.identifier,
                swapArgs,
            );

        const transaction = new Transaction({
            nonce: this.currentNonce,
            sender: sender,
            receiver: scAddress.feesCollector,
            value: 0,
            data: Buffer.from(swapTransaction.data),
            gasPrice: swapTransaction.gasPrice,
            gasLimit: swapTransaction.gasLimit,
            chainID: swapTransaction.chainID,
            version: 2,
        });

        const computer = new TransactionComputer();
        const serializedTx = computer.computeBytesForSigning(transaction);

        transaction.signature = await this.accountSigner.sign(serializedTx);

        const txHash = await this.mxApi
            .getService()
            .sendTransaction(transaction);

        const transactionOnNetwork = await new TransactionWatcher(
            this.mxApi.getService(),
        ).awaitCompleted(txHash);

        // this.currentNonce += 1;

        console.log(transactionOnNetwork);
    }
}
