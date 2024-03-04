import { Test, TestingModule } from '@nestjs/testing';
import { ComposableTasksTransactionService } from '../services/composable.tasks.transaction';
import { MXProxyServiceProvider } from 'src/services/multiversx-communication/mx.proxy.service.mock';
import { WrapAbiServiceProvider } from 'src/modules/wrapping/mocks/wrap.abi.service.mock';
import { WinstonModule } from 'nest-winston';
import winston from 'winston';
import { ConfigModule } from '@nestjs/config';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { EsdtTokenPayment } from '@multiversx/sdk-exchange';
import { EgldOrEsdtTokenPayment } from 'src/models/esdtTokenPayment.model';
import { ComposableTaskType } from '../models/composable.tasks.model';
import { Address } from '@multiversx/sdk-core/out';
import { gasConfig } from 'src/config';

describe('Composable Tasks Transaction', () => {
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
                ComposableTasksTransactionService,
                MXProxyServiceProvider,
                WrapAbiServiceProvider,
                ApiConfigService,
            ],
        }).compile();
    });

    it('should be defined', () => {
        const service = module.get<ComposableTasksTransactionService>(
            ComposableTasksTransactionService,
        );
        expect(service).toBeDefined();
    });

    it('should get compose tasks transaction', async () => {
        const service = module.get<ComposableTasksTransactionService>(
            ComposableTasksTransactionService,
        );

        const payment = new EsdtTokenPayment({
            tokenIdentifier: 'EGLD',
            tokenNonce: 0,
            amount: '1000000000000000000',
        });
        const tokenOut = new EgldOrEsdtTokenPayment({
            tokenIdentifier: 'WEGLD-123456',
            nonce: 0,
            amount: '1000000000000000000',
        });

        const transaction = await service.getComposeTasksTransaction(
            payment,
            tokenOut,
            [
                {
                    type: ComposableTaskType.WRAP_EGLD,
                    arguments: [],
                },
            ],
        );

        expect(transaction).toEqual({
            chainID: 'T',
            data: 'Y29tcG9zZVRhc2tzQDAwMDAwMDBjNTc0NTQ3NGM0NDJkMzEzMjMzMzQzNTM2MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA4MGRlMGI2YjNhNzY0MDAwMEBA',
            gasLimit: gasConfig.composableTasks.default,
            gasPrice: 1000000000,
            guardian: undefined,
            guardianSignature: undefined,
            nonce: 0,
            options: undefined,
            receiver: Address.Zero().bech32(),
            receiverUsername: undefined,
            sender: '',
            senderUsername: undefined,
            signature: undefined,
            value: '1000000000000000000',
            version: 1,
        });
    });

    it('should get wrap and swap fixed input compose transaction', async () => {
        const service = module.get<ComposableTasksTransactionService>(
            ComposableTasksTransactionService,
        );

        const transaction = await service.wrapEgldAndSwapFixedInputTransaction(
            '1000000000000000000',
            'USDC-123456',
            '20000000',
        );

        expect(transaction).toEqual({
            chainID: 'T',
            data: 'Y29tcG9zZVRhc2tzQDAwMDAwMDBiNTU1MzQ0NDMyZDMxMzIzMzM0MzUzNjAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwNDAxMzEyZDAwQEBAMDJAMDAwMDAwMGI1NTUzNDQ0MzJkMzEzMjMzMzQzNTM2MDAwMDAwMDQwMTMxMmQwMA==',
            gasLimit: gasConfig.composableTasks.default,
            gasPrice: 1000000000,
            guardian: undefined,
            guardianSignature: undefined,
            nonce: 0,
            options: undefined,
            receiver: Address.Zero().bech32(),
            receiverUsername: undefined,
            sender: '',
            senderUsername: undefined,
            signature: undefined,
            value: '1000000000000000000',
            version: 1,
        });
    });

    it('should get swap fixed input and unwrap compose transaction', async () => {
        const service = module.get<ComposableTasksTransactionService>(
            ComposableTasksTransactionService,
        );

        const transaction =
            await service.swapFixedInputAndUnwrapEgldTransaction(
                new EsdtTokenPayment({
                    tokenIdentifier: 'USDC-123456',
                    tokenNonce: 0,
                    amount: '20000000',
                }),
                '1000000000000000000',
            );

        expect(transaction).toEqual({
            chainID: 'T',
            data: 'RVNEVFRyYW5zZmVyQDU1NTM0NDQzMmQzMTMyMzMzNDM1MzZAMDEzMTJkMDBANjM2ZjZkNzA2ZjczNjU1NDYxNzM2YjczQDAwMDAwMDA0NDU0NzRjNDQwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDgwZGUwYjZiM2E3NjQwMDAwQDAyQDAwMDAwMDBjNTc0NTQ3NGM0NDJkMzEzMjMzMzQzNTM2MDAwMDAwMDgwZGUwYjZiM2E3NjQwMDAwQDAxQA==',
            gasLimit: gasConfig.composableTasks.default,
            gasPrice: 1000000000,
            guardian: undefined,
            guardianSignature: undefined,
            nonce: 0,
            options: undefined,
            receiver: Address.Zero().bech32(),
            receiverUsername: undefined,
            sender: '',
            senderUsername: undefined,
            signature: undefined,
            value: '0',
            version: 1,
        });
    });
});
