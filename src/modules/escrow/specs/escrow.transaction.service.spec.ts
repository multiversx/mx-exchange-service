import { Test, TestingModule } from '@nestjs/testing';
import { EscrowTransactionService } from '../services/escrow.transaction.service';
import { MXProxyServiceProvider } from 'src/services/multiversx-communication/mx.proxy.service.mock';
import { Address } from '@multiversx/sdk-core/out';
import { TransactionModel } from 'src/models/transaction.model';
import { encodeTransactionData } from 'src/helpers/helpers';
import { gasConfig, mxConfig, scAddress } from 'src/config';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { CacheModule } from '@nestjs/cache-manager';
import { CachingService } from 'src/services/caching/cache.service';
import { ApiConfigService } from 'src/helpers/api.config.service';
import winston from 'winston';

describe('EscrowTransactionService', () => {
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
                EscrowTransactionService,
                MXProxyServiceProvider,
                CachingService,
                ApiConfigService,
            ],
        }).compile();
    });

    it('should be defined', () => {
        const service: EscrowTransactionService =
            module.get<EscrowTransactionService>(EscrowTransactionService);
        expect(service).toBeDefined();
    });

    it('should return a lock funds transaction', async () => {
        const service: EscrowTransactionService =
            module.get<EscrowTransactionService>(EscrowTransactionService);

        const senderAddress = Address.Zero().bech32();
        const receiverAddress = Address.Zero().bech32();
        const transaction = await service.lockFunds(
            senderAddress,
            receiverAddress,
            [
                {
                    tokenID: 'XMEX-123456',
                    nonce: 1,
                    amount: '1000000000000000000',
                },
            ],
        );

        expect(transaction).toEqual(
            new TransactionModel({
                chainID: mxConfig.chainID,
                nonce: 0,
                data: encodeTransactionData(
                    `MultiESDTNFTTransfer@${scAddress.escrow}@01@XMEX-123456@01@1000000000000000000@lockFunds@${receiverAddress}`,
                ),
                gasPrice: 1000000000,
                gasLimit: gasConfig.escrow.lockFunds,
                value: '0',
                receiver: senderAddress,
                sender: senderAddress,
                options: undefined,
                signature: undefined,
                version: 1,
            }),
        );
    });

    it('should return a withdraw transaction', async () => {
        const service = module.get<EscrowTransactionService>(
            EscrowTransactionService,
        );
        const transaction = await service.withdraw(Address.Zero().bech32());

        expect(transaction).toEqual(
            new TransactionModel({
                chainID: mxConfig.chainID,
                nonce: 0,
                data: encodeTransactionData(
                    `withdraw@${Address.Zero().bech32()}`,
                ),
                gasPrice: 1000000000,
                gasLimit: gasConfig.escrow.withdraw,
                value: '0',
                receiver: scAddress.escrow,
                sender: Address.Zero().bech32(),
                options: undefined,
                signature: undefined,
                version: 1,
            }),
        );
    });

    it('should return a cancel transfer transaction', async () => {
        const service = module.get<EscrowTransactionService>(
            EscrowTransactionService,
        );
        const transaction = await service.cancelTransfer(
            Address.Zero().bech32(),
            Address.Zero().bech32(),
        );

        expect(transaction).toEqual(
            new TransactionModel({
                chainID: mxConfig.chainID,
                nonce: 0,
                data: encodeTransactionData(
                    `cancelTransfer@${Address.Zero().bech32()}@${Address.Zero().bech32()}`,
                ),
                gasPrice: 1000000000,
                gasLimit: gasConfig.escrow.cancelTransfer,
                value: '0',
                receiver: scAddress.escrow,
                sender: Address.Zero().bech32(),
                options: undefined,
                signature: undefined,
                version: 1,
            }),
        );
    });
});
