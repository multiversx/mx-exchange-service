import {
    Transaction,
    TransactionComputer,
    TransactionWatcher,
    UserSigner,
} from '@multiversx/sdk-core';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { promises } from 'fs';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { TransactionModel } from 'src/models/transaction.model';
import { BroadcastStatus } from '../constants';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { RedlockService } from '@multiversx/sdk-nestjs-cache';
import { LockAndRetry } from 'src/helpers/decorators/lock.retry.decorator';

@Injectable()
export class TaskRunnerTransactionService implements OnModuleInit {
    private accountSigner: UserSigner;
    private transactionWatcher: TransactionWatcher;

    constructor(
        private readonly mxProxy: MXProxyService,
        private readonly mxApi: MXApiService,
        private readonly apiConfigService: ApiConfigService,
        private readonly redLockService: RedlockService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async onModuleInit(): Promise<void> {
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

        this.logger.info(`The provider has been initialized.`, {
            context: TaskRunnerTransactionService.name,
        });
    }

    @LockAndRetry({
        lockKey: TaskRunnerTransactionService.name,
        lockName: 'broadcastTransaction',
        maxLockRetries: 30,
        lockRetryInterval: 2000,
        maxOperationRetries: 1,
    })
    async broadcastTransaction(tx: TransactionModel): Promise<BroadcastStatus> {
        try {
            const { nonce } = await this.mxApi.getAccountStats(
                this.accountSigner.getAddress().bech32(),
            );

            const transaction = new Transaction({
                nonce: BigInt(nonce),
                sender: tx.sender,
                receiver: tx.receiver,
                value: BigInt(tx.value),
                data: Buffer.from(tx.data, 'base64'),
                gasPrice: BigInt(tx.gasPrice),
                gasLimit: BigInt(tx.gasLimit),
                chainID: tx.chainID,
                version: 2,
            });

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
                    context: TaskRunnerTransactionService.name,
                });

                return BroadcastStatus.fail;
            }

            this.logger.info(`Transaction ${txHash} was successful`, {
                context: TaskRunnerTransactionService.name,
            });

            return BroadcastStatus.success;
        } catch (error) {
            this.logger.error(error);

            return BroadcastStatus.error;
        }
    }

    getSenderAddress(): string {
        return this.accountSigner.getAddress().toBech32();
    }
}
