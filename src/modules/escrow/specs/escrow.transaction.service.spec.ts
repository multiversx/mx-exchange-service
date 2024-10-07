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
    const senderAddress = Address.newFromHex(
        '0000000000000000000000000000000000000000000000000000000000000000',
    ).toBech32();

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

        const receiverAddress = Address.Zero().toBech32();
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

        const receiverAddress = Address.newFromHex(
            '0000000000000000000000000000000000000000000000000000000000000001',
        ).toBech32();
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
                    `ESDTNFTTransfer@XMEX-123456@01@1000000000000000000@${scAddress.escrow}@lockFunds@${receiverAddress}`,
                ),
                gasPrice: 1000000000,
                gasLimit: gasConfig.escrow.lockFunds,
                value: '0',
                receiver: senderAddress,
                sender: senderAddress,
                options: undefined,
                signature: undefined,
                version: 2,
            }),
        );
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

        const userAddress = Address.newFromHex(
            '0000000000000000000000000000000000000000000000000000000000000001',
        ).toBech32();

        const transaction = await service.withdraw(senderAddress, userAddress);

        expect(transaction).toEqual(
            new TransactionModel({
                chainID: mxConfig.chainID,
                nonce: 0,
                data: encodeTransactionData(`withdraw@${senderAddress}`),
                gasPrice: 1000000000,
                gasLimit: gasConfig.escrow.withdraw,
                value: '0',
                receiver: scAddress.escrow,
                sender: userAddress,
                receiverUsername: undefined,
                senderUsername: undefined,
                options: undefined,
                signature: undefined,
                version: 2,
                guardian: undefined,
                guardianSignature: undefined,
            }),
        );
    });

    it('should return a cancel transfer transaction', async () => {
        const service = module.get<EscrowTransactionService>(
            EscrowTransactionService,
        );

        const receiverAddress = Address.newFromHex(
            '0000000000000000000000000000000000000000000000000000000000000001',
        ).toBech32();
        const userAddress = Address.newFromHex(
            '0000000000000000000000000000000000000000000000000000000000000002',
        ).toBech32();
        const transaction = await service.cancelTransfer(
            senderAddress,
            receiverAddress,
            userAddress,
        );

        expect(transaction).toEqual(
            new TransactionModel({
                chainID: mxConfig.chainID,
                nonce: 0,
                data: encodeTransactionData(
                    `cancelTransfer@${senderAddress}@${receiverAddress}`,
                ),
                gasPrice: 1000000000,
                gasLimit: gasConfig.escrow.cancelTransfer,
                value: '0',
                receiver: scAddress.escrow,
                sender: userAddress,
                receiverUsername: undefined,
                senderUsername: undefined,
                options: undefined,
                signature: undefined,
                version: 2,
                guardian: undefined,
                guardianSignature: undefined,
            }),
        );
    });
});
