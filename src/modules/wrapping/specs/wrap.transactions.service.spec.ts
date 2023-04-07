import { Test, TestingModule } from '@nestjs/testing';
import { WrapTransactionsService } from '../services/wrap.transactions.service';
import { WrapAbiServiceProvider } from '../mocks/wrap.abi.service.mock';
import { WrapService } from '../services/wrap.service';
import { TokenGetterServiceProvider } from 'src/modules/tokens/mocks/token.getter.service.mock';
import { MXProxyServiceProvider } from 'src/services/multiversx-communication/mx.proxy.service.mock';
import { CommonAppModule } from 'src/common.app.module';
import { Address } from '@multiversx/sdk-core/out';
import { TransactionModel } from 'src/models/transaction.model';
import { gasConfig, mxConfig } from 'src/config';
import { encodeTransactionData } from 'src/helpers/helpers';

describe('WrapTransactionsService', () => {
    let module: TestingModule;

    beforeEach(async () => {
        module = await Test.createTestingModule({
            imports: [CommonAppModule],
            providers: [
                WrapTransactionsService,
                WrapAbiServiceProvider,
                WrapService,
                TokenGetterServiceProvider,
                MXProxyServiceProvider,
            ],
        }).compile();
    });

    it('should be defined', () => {
        const service: WrapTransactionsService =
            module.get<WrapTransactionsService>(WrapTransactionsService);
        expect(service).toBeDefined();
    });

    it('should return wrap transaction', async () => {
        const service: WrapTransactionsService =
            module.get<WrapTransactionsService>(WrapTransactionsService);
        const egldValue = '1000000000000000000';
        const transaction = await service.wrapEgld(
            Address.Zero().bech32(),
            egldValue,
        );

        expect(transaction).toEqual(
            new TransactionModel({
                nonce: 0,
                chainID: mxConfig.chainID,
                gasLimit: gasConfig.wrapeGLD,
                value: egldValue,
                data: encodeTransactionData('wrapEgld'),
                receiver:
                    'erd1qqqqqqqqqqqqqpgqd77fnev2sthnczp2lnfx0y5jdycynjfhzzgq6p3rax',
                sender: Address.Zero().bech32(),
                gasPrice: 1000000000,
                options: undefined,
                version: 1,
                signature: undefined,
            }),
        );
    });

    it('should return unwrap transaction', async () => {
        const service: WrapTransactionsService =
            module.get<WrapTransactionsService>(WrapTransactionsService);
        const esdtValue = '1000000000000000000';
        const transaction = await service.unwrapEgld(
            Address.Zero().bech32(),
            esdtValue,
        );

        expect(transaction).toEqual(
            new TransactionModel({
                nonce: 0,
                chainID: mxConfig.chainID,
                gasLimit: gasConfig.wrapeGLD,
                value: '0',
                data: encodeTransactionData(
                    `ESDTTransfer@TOK1-1111@${esdtValue}@unwrapEgld`,
                ),
                receiver:
                    'erd1qqqqqqqqqqqqqpgqd77fnev2sthnczp2lnfx0y5jdycynjfhzzgq6p3rax',
                sender: Address.Zero().bech32(),
                gasPrice: 1000000000,
                options: undefined,
                version: 1,
                signature: undefined,
            }),
        );
    });
});
