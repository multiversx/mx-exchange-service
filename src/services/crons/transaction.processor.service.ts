import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CacheService } from 'src/services/caching/cache.service';
import { Address } from '@multiversx/sdk-core';
import { MXApiService } from '../multiversx-communication/mx.api.service';
import { cacheConfig, constantsConfig } from 'src/config';
import { MetricsCollector } from 'src/utils/metrics.collector';

@Injectable()
export class TransactionProcessorService {
    isProcessing = false;

    constructor(
        private readonly cachingService: CacheService,
        private readonly apiService: MXApiService,
    ) {}

    @Cron(CronExpression.EVERY_10_SECONDS)
    async handleNewTransactions() {
        if (this.isProcessing) {
            return;
        }

        try {
            this.isProcessing = true;
            let lastProcessedTimestamp: number = await this.cachingService.get(
                'lastProcessedTimestamp',
            );
            let currentTimestamp: number;

            if (
                !lastProcessedTimestamp ||
                lastProcessedTimestamp === undefined
            ) {
                lastProcessedTimestamp =
                    await this.apiService.getShardTimestamp(1);
                currentTimestamp = lastProcessedTimestamp;
            } else {
                currentTimestamp = await this.apiService.getShardTimestamp(1);
            }

            if (currentTimestamp === lastProcessedTimestamp) {
                await this.cachingService.set(
                    'lastProcessedTimestamp',
                    currentTimestamp,
                    cacheConfig.default,
                );
                return;
            }

            const transactions = await this.apiService.getTransactions(
                lastProcessedTimestamp + 1,
                currentTimestamp,
                1,
            );
            for (const transaction of transactions) {
                if (transaction.data === undefined) {
                    continue;
                }
                const decodedInputData: string[] = Buffer.from(
                    transaction.data,
                    'base64',
                )
                    .toString()
                    .split('@');

                let endpoint: string;
                let receiver: string;
                let gasUsed: number;

                const functionName = decodedInputData[0];
                const functionArgs = decodedInputData.slice(1);

                switch (functionName) {
                    case 'ESDTTransfer':
                        endpoint = this.ESDTTransferEndpoint(functionArgs);
                        receiver = transaction.receiver;
                        gasUsed = transaction.gasUsed;
                        break;
                    case 'ESDTNFTTransfer':
                        endpoint = this.ESDTNFTTransferEndpoint(functionArgs);
                        receiver = this.ESDTNFTTransferReceiver(functionArgs);
                        gasUsed = transaction.gasUsed;
                        break;
                    case 'MultiESDTNFTTransfer':
                        endpoint =
                            this.MultiESDTNFTTransferEndpoint(functionArgs);
                        receiver =
                            this.MultiESDTNFTTransferReceiver(functionArgs);
                        gasUsed = transaction.gasUsed;
                        break;
                    default:
                        endpoint = functionName;
                        receiver = transaction.receiver;
                        gasUsed = transaction.gasUsed;
                        break;
                }
                if (
                    constantsConfig.endpoints.find(
                        (predefinedEndpoint) => predefinedEndpoint === endpoint,
                    )
                ) {
                    MetricsCollector.setGasDifference(
                        endpoint,
                        receiver,
                        transaction.gasLimit - gasUsed,
                    );
                }
            }
            await this.cachingService.set(
                'lastProcessedTimestamp',
                currentTimestamp,
                cacheConfig.default,
            );
        } catch (error) {
            console.log(error);
        } finally {
            this.isProcessing = false;
        }
    }

    private ESDTTransferEndpoint(functionArgs: string[]): string | undefined {
        if (functionArgs.length < 3) {
            return undefined;
        }
        return Buffer.from(functionArgs[2], 'hex').toString();
    }

    private ESDTNFTTransferEndpoint(
        functionArgs: string[],
    ): string | undefined {
        if (functionArgs.length < 5) {
            return undefined;
        }
        return Buffer.from(functionArgs[4], 'hex').toString();
    }

    private MultiESDTNFTTransferEndpoint(functionArgs: string[]): string {
        const tokensLength = parseInt(functionArgs[1], 16);
        if (functionArgs.length < 2 + tokensLength * 3) {
            return undefined;
        }
        return Buffer.from(
            functionArgs[2 + tokensLength * 3],
            'hex',
        ).toString();
    }

    private ESDTNFTTransferReceiver(functionArgs: string[]): string {
        return new Address(functionArgs[3]).bech32();
    }

    private MultiESDTNFTTransferReceiver(functionArgs: string[]): string {
        return new Address(functionArgs[0]).bech32();
    }
}
