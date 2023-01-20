import { Test, TestingModule } from '@nestjs/testing';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { ContextGetterServiceMock } from 'src/services/context/mocks/context.getter.service.mock';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { ConfigModule } from '@nestjs/config';
import winston from 'winston';
import {
    utilities as nestWinstonModuleUtilities,
    WinstonModule,
} from 'nest-winston';
import * as Transport from 'winston-transport';
import { StakingGetterService } from '../services/staking.getter.service';
import { StakingGetterServiceMock } from '../mocks/staking.getter.service.mock';
import { MXProxyServiceMock } from 'src/services/multiversx-communication/mx.proxy.service.mock';
import { MXGatewayService } from 'src/services/multiversx-communication/mx.gateway.service';
import { StakingTransactionService } from '../services/staking.transactions.service';

import { Address } from '@multiversx/sdk-core';
import { InputTokenModel } from 'src/models/inputToken.model';
import { encodeTransactionData } from 'src/helpers/helpers';
import { mxConfig, gasConfig } from 'src/config';

describe('StakingTransactionService', () => {
    let service: StakingTransactionService;

    const StakingGetterServiceProvider = {
        provide: StakingGetterService,
        useClass: StakingGetterServiceMock,
    };

    const ContextGetterServiceProvider = {
        provide: ContextGetterService,
        useClass: ContextGetterServiceMock,
    };

    const MXProxyServiceProvider = {
        provide: MXProxyService,
        useClass: MXProxyServiceMock,
    };

    const logTransports: Transport[] = [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.timestamp(),
                nestWinstonModuleUtilities.format.nestLike(),
            ),
        }),
    ];

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                WinstonModule.forRoot({
                    transports: logTransports,
                }),
                ConfigModule,
            ],
            providers: [
                StakingTransactionService,
                StakingGetterServiceProvider,
                ContextGetterServiceProvider,
                MXProxyServiceProvider,
                MXGatewayService,
                ApiConfigService,
            ],
        }).compile();

        service = module.get<StakingTransactionService>(
            StakingTransactionService,
        );
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should get stake farm transaction', async () => {
        const transaction = await service.stakeFarm(
            Address.Zero().bech32(),
            Address.Zero().bech32(),
            [
                new InputTokenModel({
                    tokenID: 'TOK1-1111',
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
                'MultiESDTNFTTransfer@erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu@01@TOK1-1111@@1000@stakeFarm',
            ),
            chainID: mxConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get unstake farm transaction', async () => {
        const transaction = await service.unstakeFarm(
            Address.Zero().bech32(),
            Address.Zero().bech32(),
            new InputTokenModel({
                tokenID: 'TOK1-1111',
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
                'ESDTNFTTransfer@TOK1-1111@@1000@erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu@unstakeFarm',
            ),
            chainID: 'T',
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get unbound farm transaction', async () => {
        const transaction = await service.unbondFarm(
            Address.Zero().bech32(),
            Address.Zero().bech32(),
            new InputTokenModel({
                tokenID: 'TOK1-1111',
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
                'ESDTNFTTransfer@TOK1-1111@@01000000@erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu@unbondFarm',
            ),
            chainID: 'T',
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get claim rewards transaction', async () => {
        const transaction = await service.claimRewards(
            Address.Zero().bech32(),
            Address.Zero().bech32(),
            new InputTokenModel({
                tokenID: 'TOK1-1111',
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
                'ESDTNFTTransfer@TOK1-1111@@01000000@erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu@claimRewards',
            ),
            chainID: 'T',
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get compound rewards transaction', async () => {
        const transaction = await service.compoundRewards(
            Address.Zero().bech32(),
            Address.Zero().bech32(),
            new InputTokenModel({
                tokenID: 'TOK1-1111',
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
                'ESDTNFTTransfer@TOK1-1111@@01000000@erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu@compoundRewards',
            ),
            chainID: 'T',
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get top up rewards transaction', async () => {
        const transaction = await service.topUpRewards(
            Address.Zero().bech32(),
            new InputTokenModel({
                tokenID: 'TOK1-1111',
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
            gasLimit: gasConfig.stake.admin.topUpRewards,
            data: encodeTransactionData(
                'ESDTTransfer@TOK1-1111@01000000@topUpRewards',
            ),
            chainID: 'T',
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get merge farm tokens transaction', async () => {
        const transaction = await service.mergeFarmTokens(
            Address.Zero().bech32(),
            Address.Zero().bech32(),
            [
                new InputTokenModel({
                    tokenID: 'TOK1TOK2LPStaked',
                    nonce: 0,
                    amount: '1000000',
                }),
                new InputTokenModel({
                    tokenID: 'TOK1TOK2LPStaked',
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
                'MultiESDTNFTTransfer@erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu@02@TOK1TOK2LPStaked@@01000000@TOK1TOK2LPStaked@@01000000@mergeFarmTokens',
            ),
            chainID: 'T',
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get set penalty percent transaction', async () => {
        const transaction = await service.setPenaltyPercent(
            Address.Zero().bech32(),
            5,
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.stake.admin.set_penalty_percent,
            data: encodeTransactionData('set_penalty_percent@05'),
            chainID: 'T',
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get set minimum farming epochs transaction', async () => {
        const transaction = await service.setMinimumFarmingEpochs(
            Address.Zero().bech32(),
            10,
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.stake.admin.set_minimum_farming_epochs,
            data: encodeTransactionData('set_minimum_farming_epochs@10'),
            chainID: 'T',
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get set burn gas limit transaction', async () => {
        const transaction = await service.setBurnGasLimit(
            Address.Zero().bech32(),
            1000000,
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.stake.admin.set_burn_gas_limit,
            data: encodeTransactionData('set_burn_gas_limit@01000000'),
            chainID: 'T',
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get set transfer exec gas limit transaction', async () => {
        const transaction = await service.setTransferExecGasLimit(
            Address.Zero().bech32(),
            1000000,
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.stake.admin.set_transfer_exec_gas_limit,
            data: encodeTransactionData('set_transfer_exec_gas_limit@01000000'),
            chainID: 'T',
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get add address to whitelist transaction', async () => {
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
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.stake.admin.whitelist,
            data: encodeTransactionData(
                'addAddressToWhitelist@erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            ),
            chainID: 'T',
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get remove address from whitelist transaction', async () => {
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
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.stake.admin.whitelist,
            data: encodeTransactionData(
                'removeAddressFromWhitelist@erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            ),
            chainID: 'T',
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get pause transaction', async () => {
        const transaction = await service.setState(
            Address.Zero().bech32(),
            false,
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.stake.admin.setState,
            data: encodeTransactionData('pause'),
            chainID: 'T',
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get resume transaction', async () => {
        const transaction = await service.setState(
            Address.Zero().bech32(),
            true,
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.stake.admin.setState,
            data: encodeTransactionData('resume'),
            chainID: 'T',
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get register farm token transaction', async () => {
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
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.stake.admin.registerFarmToken,
            data: encodeTransactionData(
                'registerFarmToken@TokenToRegisterName@TokenToRegisterID@18',
            ),
            chainID: 'T',
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get set local roles farm token transaction', async () => {
        const transaction = await service.setLocalRolesFarmToken(
            Address.Zero().bech32(),
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.stake.admin.setLocalRolesFarmToken,
            data: encodeTransactionData('setLocalRolesFarmToken'),
            chainID: 'T',
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get set per block reward amount transaction', async () => {
        const transaction = await service.setPerBlockRewardAmount(
            Address.Zero().bech32(),
            '100',
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.stake.admin.setPerBlockRewardAmount,
            data: encodeTransactionData('setPerBlockRewardAmount@0100'),
            chainID: 'T',
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get set max APR transaction', async () => {
        const transaction = await service.setMaxApr(
            Address.Zero().bech32(),
            100,
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.stake.admin.setMaxApr,
            data: encodeTransactionData('setMaxApr@0100'),
            chainID: 'T',
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get set min unbound epochs transaction', async () => {
        const transaction = await service.setMinUnbondEpochs(
            Address.Zero().bech32(),
            100,
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.stake.admin.setMinUnbondEpochs,
            data: encodeTransactionData('setMinUnbondEpochs@0100'),
            chainID: 'T',
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get start produce rewards transaction', async () => {
        const transaction = await service.setRewardsState(
            Address.Zero().bech32(),
            true,
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.stake.admin.setRewardsState,
            data: encodeTransactionData('startProduceRewards'),
            chainID: 'T',
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get end produce rewards transaction', async () => {
        const transaction = await service.setRewardsState(
            Address.Zero().bech32(),
            false,
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.stake.admin.setRewardsState,
            data: encodeTransactionData('end_produce_rewards'),
            chainID: 'T',
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });
});
