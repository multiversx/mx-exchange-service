import { Test, TestingModule } from '@nestjs/testing';
import { DistributionTransactionsService } from '../services/distribution.transactions.service';
import { MXProxyServiceProvider } from 'src/services/multiversx-communication/mx.proxy.service.mock';
import { CommonAppModule } from 'src/common.app.module';
import { TransactionModel } from 'src/models/transaction.model';
import { encodeTransactionData } from 'src/helpers/helpers';
import { gasConfig, mxConfig } from 'src/config';

describe('DistributionTransactionsService', () => {
    let module: TestingModule;

    beforeEach(async () => {
        module = await Test.createTestingModule({
            imports: [CommonAppModule],
            providers: [
                DistributionTransactionsService,
                MXProxyServiceProvider,
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
                sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
                signature: undefined,
                value: '0',
                version: 1,
            }),
        );
    });
});
