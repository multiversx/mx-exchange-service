import { PUB_SUB, RedisPubSubModule } from 'src/services/redis.pubSub.module';
import { MetabondingTransactionService } from '../services/metabonding.transactions.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MetabondingAbiServiceMockProvider } from '../mocks/metabonding.abi.service.mock';
import { MXProxyServiceProvider } from 'src/services/multiversx-communication/mx.proxy.service.mock';
import { Address } from '@multiversx/sdk-core/out';
import { InputTokenModel } from 'src/models/inputToken.model';
import { TransactionModel } from 'src/models/transaction.model';
import { gasConfig, mxConfig, scAddress } from 'src/config';
import { encodeTransactionData } from 'src/helpers/helpers';
import { WinstonModule } from 'nest-winston';
import { ConfigModule } from '@nestjs/config';
import { ApiConfigService } from 'src/helpers/api.config.service';
import winston from 'winston';

describe('MetabondingTransactionsService', () => {
    let module: TestingModule;
    const senderAddress = Address.newFromHex(
        '0000000000000000000000000000000000000000000000000000000000000001',
    ).toBech32();

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [
                RedisPubSubModule,
                WinstonModule.forRoot({
                    transports: [new winston.transports.Console({})],
                }),
                ConfigModule.forRoot({}),
            ],
            providers: [
                MetabondingTransactionService,
                MetabondingAbiServiceMockProvider,
                MXProxyServiceProvider,
                {
                    provide: PUB_SUB,
                    useValue: {
                        publish: jest.fn(),
                    },
                },
                ApiConfigService,
            ],
        }).compile();
    });

    it('should be defined', () => {
        const service: MetabondingTransactionService =
            module.get<MetabondingTransactionService>(
                MetabondingTransactionService,
            );
        expect(service).toBeDefined();
    });

    it('should get stake locked assets transaction', async () => {
        const service: MetabondingTransactionService =
            module.get<MetabondingTransactionService>(
                MetabondingTransactionService,
            );
        const transaction = await service.stakeLockedAsset(
            senderAddress,
            new InputTokenModel({
                tokenID: 'LKMEX-abcdef',
                nonce: 1,
                amount: '1000000000000000000',
            }),
        );
        expect(transaction).toEqual(
            new TransactionModel({
                chainID: mxConfig.chainID,
                data: encodeTransactionData(
                    'ESDTNFTTransfer@LKMEX-abcdef@01@1000000000000000000@erd1qqqqqqqqqqqqqpgq4jvy228nzlcxnwufqzm7hugnv6wl42xj0n4sz7ra7n@stakeLockedAsset',
                ),
                gasLimit: gasConfig.metabonding.stakeLockedAsset.default,
                gasPrice: 1000000000,
                nonce: 0,
                options: undefined,
                receiver: senderAddress,
                sender: senderAddress,
                signature: undefined,
                value: '0',
                version: 2,
            }),
        );
    });

    it('should get unstake transaction', async () => {
        const service: MetabondingTransactionService =
            module.get<MetabondingTransactionService>(
                MetabondingTransactionService,
            );
        const transaction = await service.unstake(
            senderAddress,
            '1000000000000000000',
        );
        expect(transaction).toEqual(
            new TransactionModel({
                chainID: mxConfig.chainID,
                data: encodeTransactionData('unstake@1000000000000000000'),
                gasLimit: gasConfig.metabonding.unstake,
                gasPrice: 1000000000,
                nonce: 0,
                options: undefined,
                receiver: scAddress.metabondingStakingAddress,
                sender: senderAddress,
                receiverUsername: undefined,
                senderUsername: undefined,
                signature: undefined,
                value: '0',
                version: 2,
                guardian: undefined,
                guardianSignature: undefined,
            }),
        );
    });

    it('should get unbond transaction', async () => {
        const service: MetabondingTransactionService =
            module.get<MetabondingTransactionService>(
                MetabondingTransactionService,
            );
        const transaction = await service.unbond(senderAddress);
        expect(transaction).toEqual(
            new TransactionModel({
                chainID: mxConfig.chainID,
                data: encodeTransactionData('unbond'),
                gasLimit: gasConfig.metabonding.unbond,
                gasPrice: 1000000000,
                nonce: 0,
                options: undefined,
                receiver: scAddress.metabondingStakingAddress,
                sender: senderAddress,
                receiverUsername: undefined,
                senderUsername: undefined,
                signature: undefined,
                value: '0',
                version: 2,
                guardian: undefined,
                guardianSignature: undefined,
            }),
        );
    });
});
