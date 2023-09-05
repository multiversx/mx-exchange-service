import { Test, TestingModule } from '@nestjs/testing';
import { FeesCollectorTransactionService } from '../services/fees-collector.transaction.service';
import { WeekTimekeepingAbiServiceProvider } from 'src/submodules/week-timekeeping/mocks/week.timekeeping.abi.service.mock';
import { WeeklyRewardsSplittingAbiServiceProvider } from 'src/submodules/weekly-rewards-splitting/mocks/weekly.rewards.splitting.abi.mock';
import { MXProxyServiceProvider } from 'src/services/multiversx-communication/mx.proxy.service.mock';
import { TransactionModel } from 'src/models/transaction.model';
import { encodeTransactionData } from 'src/helpers/helpers';
import { mxConfig, scAddress } from 'src/config';
import { Address } from '@multiversx/sdk-core/out';
import { FeesCollectorTransactionModel } from '../models/fees-collector.model';
import { WeeklyRewardsSplittingAbiService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service';
import { CacheModule } from '@nestjs/cache-manager';
import { WinstonModule } from 'nest-winston';
import { ConfigModule } from '@nestjs/config';
import { CachingService } from 'src/services/caching/cache.service';
import { ApiConfigService } from 'src/helpers/api.config.service';
import winston from 'winston';

describe('FeesCollectorTransactionService', () => {
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
                FeesCollectorTransactionService,
                WeekTimekeepingAbiServiceProvider,
                WeeklyRewardsSplittingAbiServiceProvider,
                MXProxyServiceProvider,
                CachingService,
                ApiConfigService,
            ],
        }).compile();
    });

    it('should be defined', () => {
        const service: FeesCollectorTransactionService =
            module.get<FeesCollectorTransactionService>(
                FeesCollectorTransactionService,
            );
        expect(service).toBeDefined();
    });

    it('should get claim rewards transaction', async () => {
        const service = module.get<FeesCollectorTransactionService>(
            FeesCollectorTransactionService,
        );
        const transaction = await service.claimRewards(100000);
        expect(transaction).toEqual(
            new TransactionModel({
                chainID: mxConfig.chainID,
                gasLimit: 100000,
                gasPrice: 1000000000,
                nonce: 0,
                receiver: scAddress.feesCollector,
                sender: '',
                receiverUsername: undefined,
                senderUsername: undefined,
                value: '0',
                data: encodeTransactionData('claimRewards'),
                options: undefined,
                signature: undefined,
                version: 1,
                guardian: undefined,
                guardianSignature: undefined,
            }),
        );
    });

    it('should get claim rewards batch transaction' + ' count: 0', async () => {
        const service = module.get<FeesCollectorTransactionService>(
            FeesCollectorTransactionService,
        );
        const transaction = await service.claimRewardsBatch(
            scAddress.feesCollector,
            Address.Zero().bech32(),
        );
        expect(transaction).toEqual(
            new FeesCollectorTransactionModel({
                transaction: {
                    chainID: mxConfig.chainID,
                    gasLimit: 100000000,
                    gasPrice: 1000000000,
                    nonce: 0,
                    receiver: scAddress.feesCollector,
                    sender: '',
                    receiverUsername: undefined,
                    senderUsername: undefined,
                    value: '0',
                    data: encodeTransactionData('claimRewards'),
                    options: undefined,
                    signature: undefined,
                    version: 1,
                    guardian: undefined,
                    guardianSignature: undefined,
                },
                count: 0,
            }),
        );
    });

    it('should get claim rewards batch transaction' + ' count: 1', async () => {
        const service = module.get<FeesCollectorTransactionService>(
            FeesCollectorTransactionService,
        );
        const weeklyRewardsSplittingAbi =
            module.get<WeeklyRewardsSplittingAbiService>(
                WeeklyRewardsSplittingAbiService,
            );
        jest.spyOn(
            weeklyRewardsSplittingAbi,
            'lastActiveWeekForUser',
        ).mockReturnValue(Promise.resolve(1));

        const transaction = await service.claimRewardsBatch(
            scAddress.feesCollector,
            Address.Zero().bech32(),
        );
        expect(transaction).toEqual(
            new FeesCollectorTransactionModel({
                transaction: {
                    chainID: mxConfig.chainID,
                    gasLimit: 100000000,
                    gasPrice: 1000000000,
                    nonce: 0,
                    receiver: scAddress.feesCollector,
                    sender: '',
                    receiverUsername: undefined,
                    senderUsername: undefined,
                    value: '0',
                    data: encodeTransactionData('claimRewards'),
                    options: undefined,
                    signature: undefined,
                    version: 1,
                    guardian: undefined,
                    guardianSignature: undefined,
                },
                count: 1,
            }),
        );
    });

    it('should get remove known contract transaction', async () => {
        const service = module.get<FeesCollectorTransactionService>(
            FeesCollectorTransactionService,
        );
        const transaction = await service.handleKnownContracts(
            [
                Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000001',
                ).bech32(),
                Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000002',
                ).bech32(),
            ],
            true,
        );

        expect(transaction).toEqual(
            new TransactionModel({
                chainID: mxConfig.chainID,
                gasLimit: 10000000,
                gasPrice: 1000000000,
                nonce: 0,
                receiver: scAddress.feesCollector,
                sender: '',
                receiverUsername: undefined,
                senderUsername: undefined,
                value: '0',
                data: encodeTransactionData(
                    `removeKnownContracts@${Address.fromHex(
                        '0000000000000000000000000000000000000000000000000000000000000001',
                    ).bech32()}@${Address.fromHex(
                        '0000000000000000000000000000000000000000000000000000000000000002',
                    ).bech32()}`,
                ),
                options: undefined,
                signature: undefined,
                version: 1,
                guardian: undefined,
                guardianSignature: undefined,
            }),
        );
    });

    it('should get add known token transaction', async () => {
        const service = module.get<FeesCollectorTransactionService>(
            FeesCollectorTransactionService,
        );
        const transaction = await service.handleKnownTokens([
            'WEGLD-123456',
            'MEX-123456',
        ]);

        expect(transaction).toEqual(
            new TransactionModel({
                chainID: mxConfig.chainID,
                gasLimit: 10000000,
                gasPrice: 1000000000,
                nonce: 0,
                receiver: scAddress.feesCollector,
                sender: '',
                receiverUsername: undefined,
                senderUsername: undefined,
                value: '0',
                data: encodeTransactionData(
                    `addKnownTokens@${'WEGLD-123456'}@${'MEX-123456'}`,
                ),
                options: undefined,
                signature: undefined,
                version: 1,
                guardian: undefined,
                guardianSignature: undefined,
            }),
        );
    });
});
