import { Test, TestingModule } from '@nestjs/testing';
import { LockedTokenWrapperTransactionService } from '../services/locked-token-wrapper.transaction.service';
import { MXProxyServiceProvider } from 'src/services/multiversx-communication/mx.proxy.service.mock';
import { Address } from '@multiversx/sdk-core/out';
import { TransactionModel } from 'src/models/transaction.model';
import { gasConfig, mxConfig, scAddress } from 'src/config';
import { encodeTransactionData } from 'src/helpers/helpers';
import { WinstonModule } from 'nest-winston';
import { ConfigModule } from '@nestjs/config';
import { ApiConfigService } from 'src/helpers/api.config.service';
import winston from 'winston';

describe('LockedTokenWrapperTransactionService', () => {
    let module: TestingModule;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [
                WinstonModule.forRoot({
                    transports: [new winston.transports.Console({})],
                }),
                ConfigModule.forRoot({}),
            ],
            providers: [
                LockedTokenWrapperTransactionService,
                MXProxyServiceProvider,
                ApiConfigService,
            ],
        }).compile();
    });

    it('should be defined', () => {
        const service = module.get<LockedTokenWrapperTransactionService>(
            LockedTokenWrapperTransactionService,
        );
        expect(service).toBeDefined();
    });

    it('should get unwrapLockedToken transaction', async () => {
        const service = module.get<LockedTokenWrapperTransactionService>(
            LockedTokenWrapperTransactionService,
        );
        const transaction = await service.unwrapLockedToken(
            Address.Zero().bech32(),
            {
                tokenID: 'WXMEX-123456',
                nonce: 1,
                amount: '1',
            },
        );
        expect(transaction).toEqual(
            new TransactionModel({
                chainID: mxConfig.chainID,
                nonce: 0,
                receiver: Address.Zero().bech32(),
                sender: Address.Zero().bech32(),
                gasLimit: gasConfig.lockedTokenWrapper.unwrapLockedToken,
                gasPrice: 1000000000,
                value: '0',
                data: encodeTransactionData(
                    `ESDTNFTTransfer@WXMEX-123456@1@1@${scAddress.lockedTokenWrapper}@unwrapLockedToken`,
                ),
                options: undefined,
                signature: undefined,
                version: 1,
            }),
        );
    });

    it('should get wrapLockedToken transaction', async () => {
        const service = module.get<LockedTokenWrapperTransactionService>(
            LockedTokenWrapperTransactionService,
        );
        const transaction = await service.wrapLockedToken(
            Address.Zero().bech32(),
            {
                tokenID: 'XMEX-123456',
                nonce: 1,
                amount: '1',
            },
        );
        expect(transaction).toEqual(
            new TransactionModel({
                chainID: mxConfig.chainID,
                nonce: 0,
                receiver: Address.Zero().bech32(),
                sender: Address.Zero().bech32(),
                gasLimit: gasConfig.lockedTokenWrapper.wrapLockedToken,
                gasPrice: 1000000000,
                value: '0',
                data: encodeTransactionData(
                    `ESDTNFTTransfer@XMEX-123456@1@1@${scAddress.lockedTokenWrapper}@wrapLockedToken`,
                ),
                options: undefined,
                signature: undefined,
                version: 1,
            }),
        );
    });
});
