import { Test, TestingModule } from '@nestjs/testing';
import { TokenUnstakeTransactionService } from '../services/token.unstake.transaction.service';
import { TokenUnstakeAbiServiceProvider } from '../mocks/token.unstake.abi.service.mock';
import { MXProxyServiceProvider } from 'src/services/multiversx-communication/mx.proxy.service.mock';
import { Address } from '@multiversx/sdk-core/out';
import { TransactionModel } from 'src/models/transaction.model';
import { mxConfig, scAddress } from 'src/config';
import { encodeTransactionData } from 'src/helpers/helpers';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import winston from 'winston';

describe('TokenUnstakeTransactionService', () => {
    let module: TestingModule;
    const senderAddress = Address.newFromHex(
        '0000000000000000000000000000000000000000000000000000000000000001',
    ).toBech32();

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [
                WinstonModule.forRoot({
                    transports: [new winston.transports.Console({})],
                }),
                ConfigModule.forRoot({}),
            ],
            providers: [
                TokenUnstakeTransactionService,
                TokenUnstakeAbiServiceProvider,
                MXProxyServiceProvider,
                ApiConfigService,
            ],
        }).compile();
    });
    it('should be defined', () => {
        const service: TokenUnstakeTransactionService =
            module.get<TokenUnstakeTransactionService>(
                TokenUnstakeTransactionService,
            );
        expect(service).toBeDefined();
    });

    it('shoud return claim unlocked tokens transaction', async () => {
        const service: TokenUnstakeTransactionService =
            module.get<TokenUnstakeTransactionService>(
                TokenUnstakeTransactionService,
            );
        const transaction = await service.claimUnlockedTokens(senderAddress);

        expect(transaction).toEqual(
            new TransactionModel({
                chainID: mxConfig.chainID,
                data: encodeTransactionData('claimUnlockedTokens'),
                gasLimit: 13500000,
                gasPrice: 1000000000,
                nonce: 0,
                sender: senderAddress,
                receiver: scAddress.tokenUnstake,
                senderUsername: undefined,
                receiverUsername: undefined,
                value: '0',
                signature: undefined,
                options: undefined,
                version: 2,
                guardian: undefined,
                guardianSignature: undefined,
            }),
        );
    });

    it('shoud return cancel unbond transaction', async () => {
        const service: TokenUnstakeTransactionService =
            module.get<TokenUnstakeTransactionService>(
                TokenUnstakeTransactionService,
            );
        const transaction = await service.cancelUnbond(senderAddress);

        expect(transaction).toEqual(
            new TransactionModel({
                chainID: mxConfig.chainID,
                data: encodeTransactionData('cancelUnbond'),
                gasLimit: 9500000,
                gasPrice: 1000000000,
                nonce: 0,
                sender: senderAddress,
                receiver: scAddress.tokenUnstake,
                senderUsername: undefined,
                receiverUsername: undefined,
                value: '0',
                signature: undefined,
                options: undefined,
                version: 2,
                guardian: undefined,
                guardianSignature: undefined,
            }),
        );
    });
});
