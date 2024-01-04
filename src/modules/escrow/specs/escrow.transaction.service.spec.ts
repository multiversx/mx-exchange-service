import { Test, TestingModule } from '@nestjs/testing';
import { EscrowTransactionService } from '../services/escrow.transaction.service';
import { MXProxyServiceProvider } from 'src/services/multiversx-communication/mx.proxy.service.mock';
import { Address } from '@multiversx/sdk-core/out';
import { TransactionModel } from 'src/models/transaction.model';
import { encodeTransactionData } from 'src/helpers/helpers';
import { gasConfig, mxConfig, scAddress } from 'src/config';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { ApiConfigService } from 'src/helpers/api.config.service';
import winston from 'winston';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { MXApiServiceProvider } from 'src/services/multiversx-communication/mx.api.service.mock';
import { ContextGetterServiceProvider } from 'src/services/context/mocks/context.getter.service.mock';
import { MXGatewayServiceProvider } from 'src/services/multiversx-communication/mx.gateway.service.mock';
import { EscrowSetterService } from '../services/escrow.setter.service';
import { EscrowAbiServiceProvider } from '../mocks/escrow.abi.service.mock';

describe('EscrowTransactionService', () => {
    let module: TestingModule;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [
                WinstonModule.forRoot({
                    transports: [new winston.transports.Console({})],
                }),
                ConfigModule.forRoot({}),
                DynamicModuleUtils.getCacheModule(),
            ],
            providers: [
                EscrowTransactionService,
                EscrowAbiServiceProvider,
                EscrowSetterService,
                MXProxyServiceProvider,
                MXApiServiceProvider,
                MXGatewayServiceProvider,
                ContextGetterServiceProvider,
                ApiConfigService,
            ],
        }).compile();
    });

    it('should be defined', () => {
        const service: EscrowTransactionService =
            module.get<EscrowTransactionService>(EscrowTransactionService);
        expect(service).toBeDefined();
    });

    it('should return error on lock transction with same address', async () => {
        const service: EscrowTransactionService =
            module.get<EscrowTransactionService>(EscrowTransactionService);

        const senderAddress = Address.Zero().bech32();
        const receiverAddress = Address.Zero().bech32();
        await expect(
            service.lockFunds(senderAddress, receiverAddress, [
                {
                    tokenID: 'XMEX-123456',
                    nonce: 1,
                    amount: '1000000000000000000',
                },
            ]),
        ).rejects.toThrowError('Sender and receiver cannot be the same');
    });

    it('should return a lock funds transaction', async () => {
        const service: EscrowTransactionService =
            module.get<EscrowTransactionService>(EscrowTransactionService);

        const senderAddress = Address.Zero().bech32();
        const receiverAddress = Address.fromHex(
            '0000000000000000000000000000000000000000000000000000000000000001',
        ).bech32();
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

    it('should return error on withdraw transaction after unlock epoch', async () => {
        const service = module.get<EscrowTransactionService>(
            EscrowTransactionService,
        );
        const mxApi = module.get<MXApiService>(MXApiService);
        jest.spyOn(
            mxApi,
            'getNftAttributesByTokenIdentifier',
        ).mockResolvedValue('AAAACk1FWC00NTVjNTcAAAAAAAAAAAAAAAAAAAAB');

        await expect(
            service.withdraw(
                Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000001',
                ).bech32(),
                Address.Zero().bech32(),
            ),
        ).rejects.toThrowError('Cannot withdraw funds after unlock epoch');
    });

    it('should return a withdraw transaction', async () => {
        const service = module.get<EscrowTransactionService>(
            EscrowTransactionService,
        );
        const mxApi = module.get<MXApiService>(MXApiService);
        jest.spyOn(
            mxApi,
            'getNftAttributesByTokenIdentifier',
        ).mockResolvedValue('AAAACk1FWC00NTVjNTcAAAAAAAAAAAAAAAAAAAAC');

        const transaction = await service.withdraw(
            Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000001',
            ).bech32(),
            Address.Zero().bech32(),
        );

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
                sender: '',
                receiverUsername: undefined,
                senderUsername: undefined,
                options: undefined,
                signature: undefined,
                version: 1,
                guardian: undefined,
                guardianSignature: undefined,
            }),
        );
    });

    it('should return a cancel transfer transaction', async () => {
        const service = module.get<EscrowTransactionService>(
            EscrowTransactionService,
        );
        const transaction = await service.cancelTransfer(
            Address.Zero().bech32(),
            Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000001',
            ).bech32(),
        );

        expect(transaction).toEqual(
            new TransactionModel({
                chainID: mxConfig.chainID,
                nonce: 0,
                data: encodeTransactionData(
                    `cancelTransfer@${Address.Zero().bech32()}@${Address.fromHex(
                        '0000000000000000000000000000000000000000000000000000000000000001',
                    ).bech32()}`,
                ),
                gasPrice: 1000000000,
                gasLimit: gasConfig.escrow.cancelTransfer,
                value: '0',
                receiver: scAddress.escrow,
                sender: '',
                receiverUsername: undefined,
                senderUsername: undefined,
                options: undefined,
                signature: undefined,
                version: 1,
                guardian: undefined,
                guardianSignature: undefined,
            }),
        );
    });
});
