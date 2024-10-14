import { Test, TestingModule } from '@nestjs/testing';
import { PairService } from '../../pair/services/pair.service';
import { Address } from '@multiversx/sdk-core';
import { ApiConfigService } from '../../../helpers/api.config.service';
import { MXProxyServiceProvider } from '../../../services/multiversx-communication/mx.proxy.service.mock';
import { MXApiService } from '../../../services/multiversx-communication/mx.api.service';
import { encodeTransactionData } from '../../../helpers/helpers';
import { mxConfig, gasConfig } from '../../../config';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { TokenServiceProvider } from 'src/modules/tokens/mocks/token.service.mock';
import { FarmTransactionServiceV1_2 } from '../v1.2/services/farm.v1.2.transaction.service';
import { MXDataApiServiceProvider } from 'src/services/multiversx-communication/mx.data.api.service.mock';
import { WrapAbiServiceProvider } from 'src/modules/wrapping/mocks/wrap.abi.service.mock';
import { ContextGetterServiceProvider } from 'src/services/context/mocks/context.getter.service.mock';
import { PairAbiServiceProvider } from 'src/modules/pair/mocks/pair.abi.service.mock';
import { PairComputeServiceProvider } from 'src/modules/pair/mocks/pair.compute.service.mock';
import { RouterAbiServiceProvider } from 'src/modules/router/mocks/router.abi.service.mock';
import { FarmAbiServiceProviderV1_2 } from '../mocks/farm.v1.2.abi.service.mock';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import winston from 'winston';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { AnalyticsQueryServiceProvider } from 'src/services/analytics/mocks/analytics.query.service.mock';
import { ElasticSearchModule } from 'src/services/elastic-search/elastic.search.module';

describe('FarmService', () => {
    let module: TestingModule;
    const senderAddress = Address.newFromHex(
        '0000000000000000000000000000000000000000000000000000000000000001',
    ).toBech32();

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({}),
                WinstonModule.forRoot({
                    transports: [new winston.transports.Console({})],
                }),
                DynamicModuleUtils.getCacheModule(),
                ElasticSearchModule,
            ],
            providers: [
                ApiConfigService,
                MXApiService,
                ContextGetterServiceProvider,
                PairService,
                PairAbiServiceProvider,
                PairComputeServiceProvider,
                TokenComputeService,
                TokenServiceProvider,
                RouterAbiServiceProvider,
                WrapAbiServiceProvider,
                MXProxyServiceProvider,
                FarmTransactionServiceV1_2,
                FarmAbiServiceProviderV1_2,
                MXDataApiServiceProvider,
                AnalyticsQueryServiceProvider,
                ApiConfigService,
            ],
        }).compile();
    });

    it('should be defined', () => {
        const transactionV1_2 = module.get<FarmTransactionServiceV1_2>(
            FarmTransactionServiceV1_2,
        );

        expect(transactionV1_2).toBeDefined();
    });

    it('should get enter farm transaction', async () => {
        const transactionV1_2 = module.get<FarmTransactionServiceV1_2>(
            FarmTransactionServiceV1_2,
        );

        const transaction = await transactionV1_2.enterFarm(
            Address.Zero().bech32(),
            {
                farmAddress:
                    'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqssfuwnk5',
                tokens: [
                    {
                        tokenID: 'EGLDMEXLP-abcdef',
                        nonce: 0,
                        amount: '1000000000000',
                    },
                ],
                lockRewards: true,
            },
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqssfuwnk5',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.farms['v1.2'].enterFarm.default,
            data: encodeTransactionData(
                'ESDTTransfer@EGLDMEXLP-abcdef@1000000000000@enterFarmAndLockRewards',
            ),
            chainID: mxConfig.chainID,
            version: 2,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get exit farm transaction', async () => {
        const transactionV1_2 = module.get<FarmTransactionServiceV1_2>(
            FarmTransactionServiceV1_2,
        );

        const transaction = await transactionV1_2.exitFarm(
            Address.Zero().bech32(),
            {
                farmAddress:
                    'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqssfuwnk5',
                farmTokenID: 'EGLDMEXFL-abcdef',
                farmTokenNonce: 1,
                amount: '1000000000000',
                withPenalty: false,
                lockRewards: true,
            },
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit:
                gasConfig.farms['v1.2']['lockedRewards'].exitFarm.default +
                gasConfig.lockedAssetCreate,
            data: encodeTransactionData(
                'ESDTNFTTransfer@EGLDMEXFL-abcdef@01@1000000000000@erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqssfuwnk5@07311709943153914477',
            ),
            chainID: mxConfig.chainID,
            version: 2,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get claim rewards transaction', async () => {
        const transactionV1_2 = module.get<FarmTransactionServiceV1_2>(
            FarmTransactionServiceV1_2,
        );

        const transaction = await transactionV1_2.claimRewards(
            Address.Zero().bech32(),
            {
                farmAddress:
                    'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqes9lzxht',
                farmTokenID: 'EGLDTOK4FL-abcdef',
                farmTokenNonce: 1,
                amount: '1000000000000',
                lockRewards: true,
            },
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit:
                gasConfig.farms['v1.2']['lockedRewards'].claimRewards +
                gasConfig.lockedAssetCreate,
            data: encodeTransactionData(
                'ESDTNFTTransfer@EGLDTOK4FL-abcdef@01@1000000000000@erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqes9lzxht@claimRewards',
            ),
            chainID: mxConfig.chainID,
            version: 2,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get compound rewards transaction error', async () => {
        const transactionV1_2 = module.get<FarmTransactionServiceV1_2>(
            FarmTransactionServiceV1_2,
        );

        let error: any;
        try {
            await transactionV1_2.compoundRewards(Address.Zero().bech32(), {
                farmAddress:
                    'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u',
                farmTokenID: 'farmTokenID',
                farmTokenNonce: 1,
                amount: '1000000000000',
                lockRewards: true,
            });
        } catch (err) {
            error = err;
        }
        expect(error).toBeDefined();
    });

    it('should get migrate to new farm transaction', async () => {
        const transactionV1_2 = module.get<FarmTransactionServiceV1_2>(
            FarmTransactionServiceV1_2,
        );

        const transaction = await transactionV1_2.migrateToNewFarm(
            Address.Zero().bech32(),
            {
                farmAddress:
                    'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqssfuwnk5',
                farmTokenID: 'EGLDMEXFL-abcdef',
                farmTokenNonce: 1,
                amount: '1000000000000',
                withPenalty: false,
                lockRewards: true,
            },
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.farms['v1.2'].migrateToNewFarm,
            data: encodeTransactionData(
                'ESDTNFTTransfer@EGLDMEXFL-abcdef@01@1000000000000@erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqssfuwnk5@migrateToNewFarm@erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            ),
            chainID: mxConfig.chainID,
            version: 2,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get set farm migration config transaction', async () => {
        const transactionV1_2 = module.get<FarmTransactionServiceV1_2>(
            FarmTransactionServiceV1_2,
        );

        const transaction = await transactionV1_2.setFarmMigrationConfig(
            senderAddress,
            {
                oldFarmAddress:
                    'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqssfuwnk5',
                oldFarmTokenID: 'EGLDMEXFL-abcdef',
                newFarmAddress: Address.Zero().bech32(),
                newLockedFarmAddress: Address.Zero().bech32(),
            },
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqssfuwnk5',
            sender: senderAddress,
            receiverUsername: undefined,
            senderUsername: undefined,
            gasPrice: 1000000000,
            gasLimit: gasConfig.farms.admin.setFarmMigrationConfig,
            data: encodeTransactionData(
                'setFarmMigrationConfig@erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqssfuwnk5@EGLDMEXFL-abcdef@erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu@erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            ),
            chainID: mxConfig.chainID,
            version: 2,
            options: undefined,
            signature: undefined,
            guardian: undefined,
            guardianSignature: undefined,
        });
    });

    it('should get stop rewards and migrate Rps transaction', async () => {
        const transactionV1_2 = module.get<FarmTransactionServiceV1_2>(
            FarmTransactionServiceV1_2,
        );

        const transaction = await transactionV1_2.stopRewardsAndMigrateRps(
            senderAddress,
            'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqssfuwnk5',
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqssfuwnk5',
            sender: senderAddress,
            receiverUsername: undefined,
            senderUsername: undefined,
            gasPrice: 1000000000,
            gasLimit: gasConfig.farms['v1.2'].stopRewards,
            data: encodeTransactionData('stopRewardsAndMigrateRps'),
            chainID: mxConfig.chainID,
            version: 2,
            options: undefined,
            signature: undefined,
            guardian: undefined,
            guardianSignature: undefined,
        });
    });

    it('should get end produce rewards transaction', async () => {
        const transactionV1_2 = module.get<FarmTransactionServiceV1_2>(
            FarmTransactionServiceV1_2,
        );

        let error = null;
        try {
            await transactionV1_2.endProduceRewards(
                senderAddress,
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqssfuwnk5',
            );
        } catch (e) {
            error = e;
        }
        expect(error).toBeDefined();

        const transaction = await transactionV1_2.endProduceRewards(
            senderAddress,
            'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqcs2zduud',
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqcs2zduud',
            sender: senderAddress,
            receiverUsername: undefined,
            senderUsername: undefined,
            gasPrice: 1000000000,
            gasLimit: gasConfig.farms.admin.end_produce_rewards,
            data: encodeTransactionData('end_produce_rewards'),
            chainID: mxConfig.chainID,
            version: 2,
            options: undefined,
            signature: undefined,
            guardian: undefined,
            guardianSignature: undefined,
        });
    });

    it('should get start produce rewards transaction', async () => {
        const transactionV1_2 = module.get<FarmTransactionServiceV1_2>(
            FarmTransactionServiceV1_2,
        );

        let error = null;
        try {
            await transactionV1_2.startProduceRewards(
                senderAddress,
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqssfuwnk5',
            );
        } catch (e) {
            error = e;
        }
        expect(error).toBeDefined();

        const transaction = await transactionV1_2.startProduceRewards(
            senderAddress,
            'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqssfuwnk5',
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqssfuwnk5',
            sender: senderAddress,
            receiverUsername: undefined,
            senderUsername: undefined,
            gasPrice: 1000000000,
            gasLimit: gasConfig.farms.admin.start_produce_rewards,
            data: encodeTransactionData('start_produce_rewards'),
            chainID: mxConfig.chainID,
            version: 2,
            options: undefined,
            signature: undefined,
            guardian: undefined,
            guardianSignature: undefined,
        });
    });

    it('should get set per block reward amount transaction', async () => {
        const transactionV1_2 = module.get<FarmTransactionServiceV1_2>(
            FarmTransactionServiceV1_2,
        );

        let error = null;
        try {
            await transactionV1_2.setPerBlockRewardAmount(
                senderAddress,
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqssfuwnk5',
                '1000000000000',
            );
        } catch (e) {
            error = e;
        }
        expect(error).toBeDefined();

        const transaction = await transactionV1_2.setPerBlockRewardAmount(
            senderAddress,
            'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqssfuwnk5',
            '1000000000000',
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqssfuwnk5',
            sender: senderAddress,
            receiverUsername: undefined,
            senderUsername: undefined,
            gasPrice: 1000000000,
            gasLimit: gasConfig.farms.admin.setPerBlockRewardAmount,
            data: encodeTransactionData(
                'setPerBlockRewardAmount@1000000000000',
            ),
            chainID: mxConfig.chainID,
            version: 2,
            options: undefined,
            signature: undefined,
            guardian: undefined,
            guardianSignature: undefined,
        });
    });

    it('should get set penalty percent transaction', async () => {
        const transactionV1_2 = module.get<FarmTransactionServiceV1_2>(
            FarmTransactionServiceV1_2,
        );

        let error = null;
        try {
            await transactionV1_2.setPenaltyPercent(
                senderAddress,
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqssfuwnk5',
                5,
            );
        } catch (e) {
            error = e;
        }
        expect(error).toBeDefined();

        const transaction = await transactionV1_2.setPenaltyPercent(
            senderAddress,
            'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqssfuwnk5',
            5,
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqssfuwnk5',
            sender: senderAddress,
            receiverUsername: undefined,
            senderUsername: undefined,
            gasPrice: 1000000000,
            gasLimit: gasConfig.farms.admin.set_penalty_percent,
            data: encodeTransactionData('set_penalty_percent@05'),
            chainID: mxConfig.chainID,
            version: 2,
            options: undefined,
            signature: undefined,
            guardian: undefined,
            guardianSignature: undefined,
        });
    });

    it('should get set minimum farming epochs transaction', async () => {
        const transactionV1_2 = module.get<FarmTransactionServiceV1_2>(
            FarmTransactionServiceV1_2,
        );

        let error = null;
        try {
            await transactionV1_2.setMinimumFarmingEpochs(
                senderAddress,
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqssfuwnk5',
                10,
            );
        } catch (e) {
            error = e;
        }
        expect(error).toBeDefined();

        const transaction = await transactionV1_2.setMinimumFarmingEpochs(
            senderAddress,
            'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqssfuwnk5',
            10,
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqssfuwnk5',
            sender: senderAddress,
            receiverUsername: undefined,
            senderUsername: undefined,
            gasPrice: 1000000000,
            gasLimit: gasConfig.farms.admin.set_minimum_farming_epochs,
            data: encodeTransactionData('set_minimum_farming_epochs@10'),
            chainID: mxConfig.chainID,
            version: 2,
            options: undefined,
            signature: undefined,
            guardian: undefined,
            guardianSignature: undefined,
        });
    });

    it('should get set transfer exec gas limit transaction', async () => {
        const transactionV1_2 = module.get<FarmTransactionServiceV1_2>(
            FarmTransactionServiceV1_2,
        );

        let error = null;
        try {
            await transactionV1_2.setTransferExecGasLimit(
                senderAddress,
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqssfuwnk5',
                100000000,
            );
        } catch (e) {
            error = e;
        }
        expect(error).toBeDefined();

        const transaction = await transactionV1_2.setTransferExecGasLimit(
            senderAddress,
            'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqssfuwnk5',
            100000000,
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqssfuwnk5',
            sender: senderAddress,
            receiverUsername: undefined,
            senderUsername: undefined,
            gasPrice: 1000000000,
            gasLimit: gasConfig.farms.admin.set_transfer_exec_gas_limit,
            data: encodeTransactionData(
                'set_transfer_exec_gas_limit@0100000000',
            ),
            chainID: mxConfig.chainID,
            version: 2,
            options: undefined,
            signature: undefined,
            guardian: undefined,
            guardianSignature: undefined,
        });
    });

    it('should get set burn gas limit transaction', async () => {
        const transactionV1_2 = module.get<FarmTransactionServiceV1_2>(
            FarmTransactionServiceV1_2,
        );

        let error = null;
        try {
            await transactionV1_2.setBurnGasLimit(
                senderAddress,
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqssfuwnk5',
                100000000,
            );
        } catch (e) {
            error = e;
        }
        expect(error).toBeDefined();

        const transaction = await transactionV1_2.setBurnGasLimit(
            senderAddress,
            'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqcs2zduud',
            100000000,
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqcs2zduud',
            sender: senderAddress,
            receiverUsername: undefined,
            senderUsername: undefined,
            gasPrice: 1000000000,
            gasLimit: gasConfig.farms.admin.set_burn_gas_limit,
            data: encodeTransactionData('set_burn_gas_limit@0100000000'),
            chainID: mxConfig.chainID,
            version: 2,
            options: undefined,
            signature: undefined,
            guardian: undefined,
            guardianSignature: undefined,
        });
    });

    it('should get pause transaction', async () => {
        const transactionV1_2 = module.get<FarmTransactionServiceV1_2>(
            FarmTransactionServiceV1_2,
        );

        let error = null;
        try {
            await transactionV1_2.pause(
                senderAddress,
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqssfuwnk5',
            );
        } catch (e) {
            error = e;
        }
        expect(error).toBeDefined();

        const transaction = await transactionV1_2.pause(
            senderAddress,
            'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqssfuwnk5',
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqssfuwnk5',
            sender: senderAddress,
            receiverUsername: undefined,
            senderUsername: undefined,
            gasPrice: 1000000000,
            gasLimit: gasConfig.farms.admin.pause,
            data: encodeTransactionData('pause'),
            chainID: mxConfig.chainID,
            version: 2,
            options: undefined,
            signature: undefined,
            guardian: undefined,
            guardianSignature: undefined,
        });
    });

    it('should get resume transaction', async () => {
        const transactionV1_2 = module.get<FarmTransactionServiceV1_2>(
            FarmTransactionServiceV1_2,
        );

        let error = null;
        try {
            await transactionV1_2.resume(
                senderAddress,
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqssfuwnk5',
            );
        } catch (e) {
            error = e;
        }
        expect(error).toBeDefined();

        const transaction = await transactionV1_2.resume(
            senderAddress,
            'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqssfuwnk5',
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqssfuwnk5',
            sender: senderAddress,
            receiverUsername: undefined,
            senderUsername: undefined,
            gasPrice: 1000000000,
            gasLimit: gasConfig.farms.admin.resume,
            data: encodeTransactionData('resume'),
            chainID: mxConfig.chainID,
            version: 2,
            options: undefined,
            signature: undefined,
            guardian: undefined,
            guardianSignature: undefined,
        });
    });

    it('should get register farm token transaction', async () => {
        const transactionV1_2 = module.get<FarmTransactionServiceV1_2>(
            FarmTransactionServiceV1_2,
        );

        let error = null;
        try {
            await transactionV1_2.registerFarmToken(
                senderAddress,
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqssfuwnk5',
                'FarmingToken12',
                'T1T2-1234',
                18,
            );
        } catch (e) {
            error = e;
        }
        expect(error).toBeDefined();

        const transaction = await transactionV1_2.registerFarmToken(
            senderAddress,
            'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqssfuwnk5',
            'FarmingToken12',
            'T1T2-1234',
            18,
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqssfuwnk5',
            sender: senderAddress,
            receiverUsername: undefined,
            senderUsername: undefined,
            gasPrice: 1000000000,
            gasLimit: gasConfig.farms.admin.registerFarmToken,
            data: encodeTransactionData(
                'registerFarmToken@FarmingToken12@T1T2-1234@18',
            ),
            chainID: mxConfig.chainID,
            version: 2,
            options: undefined,
            signature: undefined,
            guardian: undefined,
            guardianSignature: undefined,
        });
    });

    it('should get set local roles farm token transaction', async () => {
        const transactionV1_2 = module.get<FarmTransactionServiceV1_2>(
            FarmTransactionServiceV1_2,
        );

        let error = null;
        try {
            await transactionV1_2.setLocalRolesFarmToken(
                senderAddress,
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqssfuwnk5',
            );
        } catch (e) {
            error = e;
        }
        expect(error).toBeDefined();

        const transaction = await transactionV1_2.setLocalRolesFarmToken(
            senderAddress,
            'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqssfuwnk5',
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqssfuwnk5',
            sender: senderAddress,
            receiverUsername: undefined,
            senderUsername: undefined,
            gasPrice: 1000000000,
            gasLimit: gasConfig.farms.admin.setLocalRolesFarmToken,
            data: encodeTransactionData('setLocalRolesFarmToken'),
            chainID: mxConfig.chainID,
            version: 2,
            options: undefined,
            signature: undefined,
            guardian: undefined,
            guardianSignature: undefined,
        });
    });

    it('should get merge farm tokens transaction', async () => {
        const transactionV1_2 = module.get<FarmTransactionServiceV1_2>(
            FarmTransactionServiceV1_2,
        );

        let error = null;
        try {
            await transactionV1_2.mergeFarmTokens(
                Address.Zero().bech32(),
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqssfuwnk5',
                [
                    {
                        tokenID: 'EGLDTOK4FL-abcdef',
                        nonce: 0,
                        amount: '1000000000000',
                    },
                    {
                        tokenID: 'EGLDTOK4FL-abcdef',
                        nonce: 0,
                        amount: '1000000000000',
                    },
                ],
            );
        } catch (e) {
            error = e;
        }
        expect(error).toBeDefined();

        const transaction = await transactionV1_2.mergeFarmTokens(
            Address.Zero().bech32(),
            'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqssfuwnk5',
            [
                {
                    tokenID: 'EGLDMEXFL-abcdef',
                    nonce: 0,
                    amount: '1000000000000',
                },
                {
                    tokenID: 'EGLDMEXFL-abcdef',
                    nonce: 0,
                    amount: '1000000000000',
                },
            ],
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.farms['v1.3'].mergeFarmTokensMultiplier * 2,
            data: encodeTransactionData(
                'MultiESDTNFTTransfer@erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqssfuwnk5@02@EGLDMEXFL-abcdef@@01000000000000@EGLDMEXFL-abcdef@@01000000000000@mergeFarmTokens',
            ),
            chainID: mxConfig.chainID,
            version: 2,
            options: undefined,
            signature: undefined,
        });
    });
});
