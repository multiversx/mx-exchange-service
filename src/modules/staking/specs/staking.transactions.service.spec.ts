import { Test, TestingModule } from '@nestjs/testing';
import { ContextGetterServiceProvider } from 'src/services/context/mocks/context.getter.service.mock';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { MXGatewayService } from 'src/services/multiversx-communication/mx.gateway.service';
import { StakingTransactionService } from '../services/staking.transactions.service';

import { Address } from '@multiversx/sdk-core';
import { InputTokenModel } from 'src/models/inputToken.model';
import { encodeTransactionData } from 'src/helpers/helpers';
import { mxConfig, gasConfig } from 'src/config';
import { StakingAbiServiceProvider } from '../mocks/staking.abi.service.mock';
import { MXProxyServiceProvider } from 'src/services/multiversx-communication/mx.proxy.service.mock';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import winston from 'winston';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { MXApiServiceProvider } from 'src/services/multiversx-communication/mx.api.service.mock';

describe('StakingTransactionService', () => {
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
                StakingTransactionService,
                StakingAbiServiceProvider,
                ContextGetterServiceProvider,
                MXProxyServiceProvider,
                MXGatewayService,
                ApiConfigService,
                MXApiServiceProvider,
            ],
        }).compile();
    });

    it('should be defined', () => {
        const service = module.get<StakingTransactionService>(
            StakingTransactionService,
        );
        expect(service).toBeDefined();
    });

    it('should get stake farm transaction', async () => {
        const service = module.get<StakingTransactionService>(
            StakingTransactionService,
        );

        const transaction = await service.stakeFarm(
            Address.Zero().bech32(),
            Address.Zero().bech32(),
            [
                new InputTokenModel({
                    tokenID: 'WEGLD-123456',
                    nonce: 0,
                    amount: '1000',
                }),
            ],
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.stake.stakeFarm.default,
            data: encodeTransactionData(
                'MultiESDTNFTTransfer@erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu@01@WEGLD-123456@@1000@stakeFarm',
            ),
            chainID: mxConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get unstake farm transaction', async () => {
        const service = module.get<StakingTransactionService>(
            StakingTransactionService,
        );

        const transaction = await service.unstakeFarm(
            Address.Zero().bech32(),
            Address.Zero().bech32(),
            new InputTokenModel({
                tokenID: 'WEGLD-123456',
                nonce: 0,
                amount: '1000',
            }),
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.stake.unstakeFarm,
            data: encodeTransactionData(
                'ESDTNFTTransfer@WEGLD-123456@@1000@erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu@unstakeFarm',
            ),
            chainID: 'T',
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get unbound farm transaction', async () => {
        const service = module.get<StakingTransactionService>(
            StakingTransactionService,
        );

        const transaction = await service.unbondFarm(
            Address.Zero().bech32(),
            Address.Zero().bech32(),
            new InputTokenModel({
                tokenID: 'WEGLD-123456',
                nonce: 0,
                amount: '1000000',
            }),
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.stake.unbondFarm,
            data: encodeTransactionData(
                'ESDTNFTTransfer@WEGLD-123456@@01000000@erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu@unbondFarm',
            ),
            chainID: 'T',
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get claim rewards transaction', async () => {
        const service = module.get<StakingTransactionService>(
            StakingTransactionService,
        );

        const transaction = await service.claimRewards(
            Address.Zero().bech32(),
            Address.Zero().bech32(),
            new InputTokenModel({
                tokenID: 'WEGLD-123456',
                nonce: 0,
                amount: '1000000',
            }),
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.stake.claimRewards,
            data: encodeTransactionData(
                'ESDTNFTTransfer@WEGLD-123456@@01000000@erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu@claimRewards',
            ),
            chainID: 'T',
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get compound rewards transaction', async () => {
        const service = module.get<StakingTransactionService>(
            StakingTransactionService,
        );

        const transaction = await service.compoundRewards(
            Address.Zero().bech32(),
            Address.Zero().bech32(),
            new InputTokenModel({
                tokenID: 'WEGLD-123456',
                nonce: 0,
                amount: '1000000',
            }),
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.stake.compoundRewards,
            data: encodeTransactionData(
                'ESDTNFTTransfer@WEGLD-123456@@01000000@erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu@compoundRewards',
            ),
            chainID: 'T',
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get top up rewards transaction', async () => {
        const service = module.get<StakingTransactionService>(
            StakingTransactionService,
        );

        const transaction = await service.topUpRewards(
            Address.Zero().bech32(),
            new InputTokenModel({
                tokenID: 'WEGLD-123456',
                nonce: 0,
                amount: '1000000',
            }),
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            sender: '',
            senderUsername: undefined,
            receiverUsername: undefined,
            gasPrice: 1000000000,
            gasLimit: gasConfig.stake.admin.topUpRewards,
            data: encodeTransactionData(
                'ESDTTransfer@WEGLD-123456@01000000@topUpRewards',
            ),
            chainID: 'T',
            version: 1,
            options: undefined,
            signature: undefined,
            guardian: undefined,
            guardianSignature: undefined,
        });
    });

    it('should get merge farm tokens transaction', async () => {
        const service = module.get<StakingTransactionService>(
            StakingTransactionService,
        );

        const transaction = await service.mergeFarmTokens(
            Address.Zero().bech32(),
            Address.Zero().bech32(),
            [
                new InputTokenModel({
                    tokenID: 'EGLDMEXFL-abcdef',
                    nonce: 0,
                    amount: '1000000',
                }),
                new InputTokenModel({
                    tokenID: 'EGLDMEXFL-abcdef',
                    nonce: 0,
                    amount: '1000000',
                }),
            ],
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.stake.mergeTokens,
            data: encodeTransactionData(
                'MultiESDTNFTTransfer@erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu@02@EGLDMEXFL-abcdef@@01000000@EGLDMEXFL-abcdef@@01000000@mergeFarmTokens',
            ),
            chainID: 'T',
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get set penalty percent transaction', async () => {
        const service = module.get<StakingTransactionService>(
            StakingTransactionService,
        );

        const transaction = await service.setPenaltyPercent(
            Address.Zero().bech32(),
            5,
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            sender: '',
            receiverUsername: undefined,
            senderUsername: undefined,
            gasPrice: 1000000000,
            gasLimit: gasConfig.stake.admin.set_penalty_percent,
            data: encodeTransactionData('set_penalty_percent@05'),
            chainID: 'T',
            version: 1,
            options: undefined,
            signature: undefined,
            guardian: undefined,
            guardianSignature: undefined,
        });
    });

    it('should get set minimum farming epochs transaction', async () => {
        const service = module.get<StakingTransactionService>(
            StakingTransactionService,
        );

        const transaction = await service.setMinimumFarmingEpochs(
            Address.Zero().bech32(),
            10,
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            sender: '',
            receiverUsername: undefined,
            senderUsername: undefined,
            gasPrice: 1000000000,
            gasLimit: gasConfig.stake.admin.set_minimum_farming_epochs,
            data: encodeTransactionData('set_minimum_farming_epochs@10'),
            chainID: 'T',
            version: 1,
            options: undefined,
            signature: undefined,
            guardian: undefined,
            guardianSignature: undefined,
        });
    });

    it('should get set burn gas limit transaction', async () => {
        const service = module.get<StakingTransactionService>(
            StakingTransactionService,
        );

        const transaction = await service.setBurnGasLimit(
            Address.Zero().bech32(),
            1000000,
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            sender: '',
            receiverUsername: undefined,
            senderUsername: undefined,
            gasPrice: 1000000000,
            gasLimit: gasConfig.stake.admin.set_burn_gas_limit,
            data: encodeTransactionData('set_burn_gas_limit@01000000'),
            chainID: 'T',
            version: 1,
            options: undefined,
            signature: undefined,
            guardian: undefined,
            guardianSignature: undefined,
        });
    });

    it('should get set transfer exec gas limit transaction', async () => {
        const service = module.get<StakingTransactionService>(
            StakingTransactionService,
        );

        const transaction = await service.setTransferExecGasLimit(
            Address.Zero().bech32(),
            1000000,
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            sender: '',
            receiverUsername: undefined,
            senderUsername: undefined,
            gasPrice: 1000000000,
            gasLimit: gasConfig.stake.admin.set_transfer_exec_gas_limit,
            data: encodeTransactionData('set_transfer_exec_gas_limit@01000000'),
            chainID: 'T',
            version: 1,
            options: undefined,
            signature: undefined,
            guardian: undefined,
            guardianSignature: undefined,
        });
    });

    it('should get add address to whitelist transaction', async () => {
        const service = module.get<StakingTransactionService>(
            StakingTransactionService,
        );

        const transaction = await service.setAddressWhitelist(
            Address.Zero().bech32(),
            Address.Zero().bech32(),
            true,
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            sender: '',
            receiverUsername: undefined,
            senderUsername: undefined,
            gasPrice: 1000000000,
            gasLimit: gasConfig.stake.admin.whitelist,
            data: encodeTransactionData(
                'addAddressToWhitelist@erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            ),
            chainID: 'T',
            version: 1,
            options: undefined,
            signature: undefined,
            guardian: undefined,
            guardianSignature: undefined,
        });
    });

    it('should get remove address from whitelist transaction', async () => {
        const service = module.get<StakingTransactionService>(
            StakingTransactionService,
        );

        const transaction = await service.setAddressWhitelist(
            Address.Zero().bech32(),
            Address.Zero().bech32(),
            false,
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            sender: '',
            receiverUsername: undefined,
            senderUsername: undefined,
            gasPrice: 1000000000,
            gasLimit: gasConfig.stake.admin.whitelist,
            data: encodeTransactionData(
                'removeAddressFromWhitelist@erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            ),
            chainID: 'T',
            version: 1,
            options: undefined,
            signature: undefined,
            guardian: undefined,
            guardianSignature: undefined,
        });
    });

    it('should get pause transaction', async () => {
        const service = module.get<StakingTransactionService>(
            StakingTransactionService,
        );

        const transaction = await service.setState(
            Address.Zero().bech32(),
            false,
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            sender: '',
            receiverUsername: undefined,
            senderUsername: undefined,
            gasPrice: 1000000000,
            gasLimit: gasConfig.stake.admin.setState,
            data: encodeTransactionData('pause'),
            chainID: 'T',
            version: 1,
            options: undefined,
            signature: undefined,
            guardian: undefined,
            guardianSignature: undefined,
        });
    });

    it('should get resume transaction', async () => {
        const service = module.get<StakingTransactionService>(
            StakingTransactionService,
        );

        const transaction = await service.setState(
            Address.Zero().bech32(),
            true,
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            sender: '',
            receiverUsername: undefined,
            senderUsername: undefined,
            gasPrice: 1000000000,
            gasLimit: gasConfig.stake.admin.setState,
            data: encodeTransactionData('resume'),
            chainID: 'T',
            version: 1,
            options: undefined,
            signature: undefined,
            guardian: undefined,
            guardianSignature: undefined,
        });
    });

    it('should get register farm token transaction', async () => {
        const service = module.get<StakingTransactionService>(
            StakingTransactionService,
        );

        const transaction = await service.registerFarmToken(
            Address.Zero().bech32(),
            'TokenToRegisterName',
            'TokenToRegisterID',
            18,
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            sender: '',
            receiverUsername: undefined,
            senderUsername: undefined,
            gasPrice: 1000000000,
            gasLimit: gasConfig.stake.admin.registerFarmToken,
            data: encodeTransactionData(
                'registerFarmToken@TokenToRegisterName@TokenToRegisterID@18',
            ),
            chainID: 'T',
            version: 1,
            options: undefined,
            signature: undefined,
            guardian: undefined,
            guardianSignature: undefined,
        });
    });

    it('should get set local roles farm token transaction', async () => {
        const service = module.get<StakingTransactionService>(
            StakingTransactionService,
        );

        const transaction = await service.setLocalRolesFarmToken(
            Address.Zero().bech32(),
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            sender: '',
            receiverUsername: undefined,
            senderUsername: undefined,
            gasPrice: 1000000000,
            gasLimit: gasConfig.stake.admin.setLocalRolesFarmToken,
            data: encodeTransactionData('setLocalRolesFarmToken'),
            chainID: 'T',
            version: 1,
            options: undefined,
            signature: undefined,
            guardian: undefined,
            guardianSignature: undefined,
        });
    });

    it('should get set per block reward amount transaction', async () => {
        const service = module.get<StakingTransactionService>(
            StakingTransactionService,
        );

        const transaction = await service.setPerBlockRewardAmount(
            Address.Zero().bech32(),
            '100',
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            sender: '',
            receiverUsername: undefined,
            senderUsername: undefined,
            gasPrice: 1000000000,
            gasLimit: gasConfig.stake.admin.setPerBlockRewardAmount,
            data: encodeTransactionData('setPerBlockRewardAmount@0100'),
            chainID: 'T',
            version: 1,
            options: undefined,
            signature: undefined,
            guardian: undefined,
            guardianSignature: undefined,
        });
    });

    it('should get set max APR transaction', async () => {
        const service = module.get<StakingTransactionService>(
            StakingTransactionService,
        );

        const transaction = await service.setMaxApr(
            Address.Zero().bech32(),
            100,
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            sender: '',
            receiverUsername: undefined,
            senderUsername: undefined,
            gasPrice: 1000000000,
            gasLimit: gasConfig.stake.admin.setMaxApr,
            data: encodeTransactionData('setMaxApr@0100'),
            chainID: 'T',
            version: 1,
            options: undefined,
            signature: undefined,
            guardian: undefined,
            guardianSignature: undefined,
        });
    });

    it('should get set min unbound epochs transaction', async () => {
        const service = module.get<StakingTransactionService>(
            StakingTransactionService,
        );

        const transaction = await service.setMinUnbondEpochs(
            Address.Zero().bech32(),
            100,
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            sender: '',
            receiverUsername: undefined,
            senderUsername: undefined,
            gasPrice: 1000000000,
            gasLimit: gasConfig.stake.admin.setMinUnbondEpochs,
            data: encodeTransactionData('setMinUnbondEpochs@0100'),
            chainID: 'T',
            version: 1,
            options: undefined,
            signature: undefined,
            guardian: undefined,
            guardianSignature: undefined,
        });
    });

    it('should get start produce rewards transaction', async () => {
        const service = module.get<StakingTransactionService>(
            StakingTransactionService,
        );

        const transaction = await service.setRewardsState(
            Address.Zero().bech32(),
            true,
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            sender: '',
            receiverUsername: undefined,
            senderUsername: undefined,
            gasPrice: 1000000000,
            gasLimit: gasConfig.stake.admin.setRewardsState,
            data: encodeTransactionData('startProduceRewards'),
            chainID: 'T',
            version: 1,
            options: undefined,
            signature: undefined,
            guardian: undefined,
            guardianSignature: undefined,
        });
    });

    it('should get end produce rewards transaction', async () => {
        const service = module.get<StakingTransactionService>(
            StakingTransactionService,
        );

        const transaction = await service.setRewardsState(
            Address.Zero().bech32(),
            false,
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            sender: '',
            receiverUsername: undefined,
            senderUsername: undefined,
            gasPrice: 1000000000,
            gasLimit: gasConfig.stake.admin.setRewardsState,
            data: encodeTransactionData('end_produce_rewards'),
            chainID: 'T',
            version: 1,
            options: undefined,
            signature: undefined,
            guardian: undefined,
            guardianSignature: undefined,
        });
    });
});
