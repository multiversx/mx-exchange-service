import { Test, TestingModule } from '@nestjs/testing';
import { DistributionTransactionsService } from '../services/distribution.transactions.service';
import { MXProxyServiceProvider } from 'src/services/multiversx-communication/mx.proxy.service.mock';
import { TransactionModel } from 'src/models/transaction.model';
import { encodeTransactionData } from 'src/helpers/helpers';
import { gasConfig, mxConfig } from 'src/config';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { CacheModule } from '@nestjs/cache-manager';
import { CachingService } from 'src/services/caching/cache.service';
import { ApiConfigService } from 'src/helpers/api.config.service';
import winston from 'winston';

describe('DistributionTransactionsService', () => {
    let module: TestingModule;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [
                CacheModule.register(),
                WinstonModule.forRoot({
                    transports: [new winston.transports.Console({})],
                }),
                ConfigModule.forRoot({}),
            ],
            providers: [
                DistributionTransactionsService,
                MXProxyServiceProvider,
                CachingService,
                ApiConfigService,
            ],
        }).compile();
    });

    it('should be defined', () => {
        const service: DistributionTransactionsService =
            module.get<DistributionTransactionsService>(
                DistributionTransactionsService,
            );
        expect(service).toBeDefined();
    });

    it('should return claim locked assets transaction', async () => {
        const service: DistributionTransactionsService =
            module.get<DistributionTransactionsService>(
                DistributionTransactionsService,
            );
        const transaction = await service.claimLockedAssets();
        expect(transaction).toEqual(
            new TransactionModel({
                chainID: mxConfig.chainID,
                data: encodeTransactionData('claimLockedAssets'),
                gasLimit: gasConfig.claimLockedAssets,
                gasPrice: 1000000000,
                nonce: 0,
                options: undefined,
                receiver:
                    'erd1qqqqqqqqqqqqqpgq29s98mhxwyknmxcpdtdx6nm0wkvnkvwe0n4sjpdhyq',
                sender: '',
                receiverUsername: undefined,
                senderUsername: undefined,
                signature: undefined,
                value: '0',
                version: 1,
                guardian: undefined,
                guardianSignature: undefined,
            }),
        );
    });
});
