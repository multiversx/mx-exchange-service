import { Test, TestingModule } from '@nestjs/testing';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { ContextGetterServiceMock } from 'src/services/context/mocks/context.getter.service.mock';
import { RouterTransactionService } from '../services/router.transactions.service';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { WrapTransactionsService } from 'src/modules/wrapping/services/wrap.transactions.service';
import { RouterService } from '../services/router.service';
import { Address } from '@multiversx/sdk-core';
import { encodeTransactionData } from 'src/helpers/helpers';
import { EsdtLocalRole } from '../models/router.args';
import { mxConfig, gasConfig } from 'src/config';
import { PairService } from 'src/modules/pair/services/pair.service';
import { WrapAbiServiceProvider } from 'src/modules/wrapping/mocks/wrap.abi.service.mock';
import { WrapService } from 'src/modules/wrapping/services/wrap.service';
import { TokenServiceProvider } from 'src/modules/tokens/mocks/token.service.mock';
import { PairAbiServiceProvider } from 'src/modules/pair/mocks/pair.abi.service.mock';
import { PairComputeServiceProvider } from 'src/modules/pair/mocks/pair.compute.service.mock';
import { RouterAbiServiceProvider } from '../mocks/router.abi.service.mock';
import { InputTokenModel } from 'src/models/inputToken.model';
import { WinstonModule } from 'nest-winston';
import { ConfigModule } from '@nestjs/config';
import winston from 'winston';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { MXApiServiceProvider } from 'src/services/multiversx-communication/mx.api.service.mock';
import { PairFilteringService } from 'src/modules/pair/services/pair.filtering.service';

describe('RouterService', () => {
    let module: TestingModule;
    const senderAddress = Address.newFromHex(
        '0000000000000000000000000000000000000000000000000000000000000001',
    ).toBech32();

    const ContextGetterServiceProvider = {
        provide: ContextGetterService,
        useClass: ContextGetterServiceMock,
    };

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
                ContextGetterServiceProvider,
                PairAbiServiceProvider,
                PairComputeServiceProvider,
                PairService,
                RouterAbiServiceProvider,
                WrapAbiServiceProvider,
                WrapService,
                WrapTransactionsService,
                ApiConfigService,
                MXProxyService,
                RouterTransactionService,
                TokenServiceProvider,
                RouterService,
                MXApiServiceProvider,
                PairFilteringService,
            ],
        }).compile();
    });

    it('should be defined', () => {
        const service = module.get<RouterTransactionService>(
            RouterTransactionService,
        );

        expect(service).toBeDefined();
    });

    it('should get create pair transaction', async () => {
        const service = module.get<RouterTransactionService>(
            RouterTransactionService,
        );

        const transaction = await service.createPair(
            senderAddress,
            'TOK3-3333',
            'TOK4-123456',
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver: Address.newFromHex(
                '0000000000000000000000000000000000000000000000000000000000000011',
            ).toBech32(),
            sender: senderAddress,
            receiverUsername: undefined,
            senderUsername: undefined,
            gasPrice: 1000000000,
            gasLimit: gasConfig.router.createPair,
            data: encodeTransactionData(
                `createPair@TOK3-3333@TOK4-123456@${senderAddress}`,
            ),
            chainID: mxConfig.chainID,
            version: 2,
            options: undefined,
            signature: undefined,
            guardian: undefined,
            guardianSignature: undefined,
        });
    });

    it('should get upgrade pair transaction', async () => {
        const service = module.get<RouterTransactionService>(
            RouterTransactionService,
        );

        const transaction = await service.upgradePair(
            senderAddress,
            'WEGLD-123456',
            'USDC-123456',
            [300, 100],
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver: Address.newFromHex(
                '0000000000000000000000000000000000000000000000000000000000000011',
            ).toBech32(),
            sender: senderAddress,
            receiverUsername: undefined,
            senderUsername: undefined,
            gasPrice: 1000000000,
            gasLimit: gasConfig.router.admin.upgradePair,
            data: encodeTransactionData(
                `upgradePair@WEGLD-123456@USDC-123456@${senderAddress}@300@100`,
            ),
            chainID: mxConfig.chainID,
            version: 2,
            options: undefined,
            signature: undefined,
            guardian: undefined,
            guardianSignature: undefined,
        });
    });

    it('should get issue LP token transaction', async () => {
        const service = module.get<RouterTransactionService>(
            RouterTransactionService,
        );

        const transaction = await service.issueLpToken(
            senderAddress,
            'erd1sea63y47u569ns3x5mqjf4vnygn9whkk7p6ry4rfpqyd6rd5addqyd9lf2',
            'LiquidityPoolToken3',
            'LPT-3333',
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '50000000000000000',
            receiver: Address.newFromHex(
                '0000000000000000000000000000000000000000000000000000000000000011',
            ).toBech32(),
            sender: senderAddress,
            receiverUsername: undefined,
            senderUsername: undefined,
            gasPrice: 1000000000,
            gasLimit: gasConfig.router.issueToken,
            data: encodeTransactionData(
                'issueLpToken@erd1sea63y47u569ns3x5mqjf4vnygn9whkk7p6ry4rfpqyd6rd5addqyd9lf2@LiquidityPoolToken3@LPT-3333',
            ),
            chainID: mxConfig.chainID,
            version: 2,
            options: undefined,
            signature: undefined,
            guardian: undefined,
            guardianSignature: undefined,
        });
    });

    it('should get issue LP token duplication error', async () => {
        const service = module.get<RouterTransactionService>(
            RouterTransactionService,
        );

        try {
            await service.issueLpToken(
                senderAddress,
                Address.newFromHex(
                    '0000000000000000000000000000000000000000000000000000000000000012',
                ).toBech32(),
                'LiquidityPoolTokenT1T4',
                'EGLDMEXLP-abcdef',
            );
        } catch (error) {
            expect(error).toEqual(new Error('LP Token already issued'));
        }
    });

    it('should get set local roles transaction', async () => {
        const service = module.get<RouterTransactionService>(
            RouterTransactionService,
        );

        const pairAddress = Address.newFromHex(
            '0000000000000000000000000000000000000000000000000000000000000012',
        ).toBech32();

        const transaction = await service.setLocalRoles(
            senderAddress,
            pairAddress,
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver: Address.newFromHex(
                '0000000000000000000000000000000000000000000000000000000000000011',
            ).toBech32(),
            sender: senderAddress,
            receiverUsername: undefined,
            senderUsername: undefined,
            gasPrice: 1000000000,
            gasLimit: gasConfig.router.setLocalRoles,
            data: encodeTransactionData(`setLocalRoles@${pairAddress}`),
            chainID: mxConfig.chainID,
            version: 2,
            options: undefined,
            signature: undefined,
            guardian: undefined,
            guardianSignature: undefined,
        });
    });

    it('should get set pause state transaction', async () => {
        const service = module.get<RouterTransactionService>(
            RouterTransactionService,
        );

        const transaction = await service.setState(
            senderAddress,
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            false,
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver: Address.newFromHex(
                '0000000000000000000000000000000000000000000000000000000000000011',
            ).toBech32(),
            sender: senderAddress,
            receiverUsername: undefined,
            senderUsername: undefined,
            gasPrice: 1000000000,
            gasLimit: gasConfig.router.admin.setState,
            data: encodeTransactionData(
                'pause@erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            ),
            chainID: mxConfig.chainID,
            version: 2,
            options: undefined,
            signature: undefined,
            guardian: undefined,
            guardianSignature: undefined,
        });
    });

    it('should get set resume state transaction', async () => {
        const service = module.get<RouterTransactionService>(
            RouterTransactionService,
        );

        const transaction = await service.setState(
            senderAddress,
            Address.newFromHex(
                '0000000000000000000000000000000000000000000000000000000000000012',
            ).toBech32(),
            true,
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver: Address.newFromHex(
                '0000000000000000000000000000000000000000000000000000000000000011',
            ).toBech32(),
            sender: senderAddress,
            receiverUsername: undefined,
            senderUsername: undefined,
            gasPrice: 1000000000,
            gasLimit: gasConfig.router.admin.setState,
            data: encodeTransactionData(
                `resume@${Address.newFromHex(
                    '0000000000000000000000000000000000000000000000000000000000000012',
                ).toBech32()}`,
            ),
            chainID: mxConfig.chainID,
            version: 2,
            options: undefined,
            signature: undefined,
            guardian: undefined,
            guardianSignature: undefined,
        });
    });

    it('should get set fee OFF transaction', async () => {
        const service = module.get<RouterTransactionService>(
            RouterTransactionService,
        );
        const pairAddress = Address.newFromHex(
            '0000000000000000000000000000000000000000000000000000000000000012',
        ).toBech32();
        const transaction = await service.setFee(
            senderAddress,
            pairAddress,
            Address.Zero().toBech32(),
            'WEGLD-123456',
            false,
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver: Address.newFromHex(
                '0000000000000000000000000000000000000000000000000000000000000011',
            ).toBech32(),
            sender: senderAddress,
            receiverUsername: undefined,
            senderUsername: undefined,
            gasPrice: 1000000000,
            gasLimit: gasConfig.router.admin.setFee,
            data: encodeTransactionData(
                `setFeeOff@${pairAddress}@erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu@WEGLD-123456`,
            ),
            chainID: mxConfig.chainID,
            version: 2,
            options: undefined,
            signature: undefined,
            guardian: undefined,
            guardianSignature: undefined,
        });
    });

    it('should get set fee ON transaction', async () => {
        const service = module.get<RouterTransactionService>(
            RouterTransactionService,
        );
        const pairAddress = Address.newFromHex(
            '0000000000000000000000000000000000000000000000000000000000000012',
        ).toBech32();
        const transaction = await service.setFee(
            senderAddress,
            pairAddress,
            Address.Zero().bech32(),
            'WEGLD-123456',
            true,
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver: Address.newFromHex(
                '0000000000000000000000000000000000000000000000000000000000000011',
            ).toBech32(),
            sender: senderAddress,
            receiverUsername: undefined,
            senderUsername: undefined,
            gasPrice: 1000000000,
            gasLimit: gasConfig.router.admin.setFee,
            data: encodeTransactionData(
                `setFeeOn@${pairAddress}@erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu@WEGLD-123456`,
            ),
            chainID: mxConfig.chainID,
            version: 2,
            options: undefined,
            signature: undefined,
            guardian: undefined,
            guardianSignature: undefined,
        });
    });

    it('should get set local roles owner', async () => {
        const service = module.get<RouterTransactionService>(
            RouterTransactionService,
        );

        const transaction = await service.setLocalRolesOwner(senderAddress, {
            tokenID: 'WEGLD-123456',
            address: Address.Zero().bech32(),
            roles: [EsdtLocalRole.Mint],
        });
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver: Address.newFromHex(
                '0000000000000000000000000000000000000000000000000000000000000011',
            ).toBech32(),
            sender: senderAddress,
            receiverUsername: undefined,
            senderUsername: undefined,
            gasPrice: 1000000000,
            gasLimit: gasConfig.router.admin.setLocalRolesOwner,
            data: encodeTransactionData(
                'setLocalRolesOwner@WEGLD-123456@erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu@01',
            ),
            chainID: mxConfig.chainID,
            version: 2,
            options: undefined,
            signature: undefined,
            guardian: undefined,
            guardianSignature: undefined,
        });
    });

    it('should get remove pair transaction', async () => {
        const service = module.get<RouterTransactionService>(
            RouterTransactionService,
        );

        const transaction = await service.removePair(
            senderAddress,
            'WEGLD-123456',
            'USDC-123456',
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver: Address.newFromHex(
                '0000000000000000000000000000000000000000000000000000000000000011',
            ).toBech32(),
            sender: senderAddress,
            receiverUsername: undefined,
            senderUsername: undefined,
            gasPrice: 1000000000,
            gasLimit: gasConfig.router.admin.removePair,
            data: encodeTransactionData('removePair@WEGLD-123456@USDC-123456'),
            chainID: mxConfig.chainID,
            version: 2,
            options: undefined,
            signature: undefined,
            guardian: undefined,
            guardianSignature: undefined,
        });
    });

    it('should get set pair creation enabled ON transaction', async () => {
        const service = module.get<RouterTransactionService>(
            RouterTransactionService,
        );

        const transaction = await service.setPairCreationEnabled(
            senderAddress,
            true,
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver: Address.newFromHex(
                '0000000000000000000000000000000000000000000000000000000000000011',
            ).toBech32(),
            sender: senderAddress,
            receiverUsername: undefined,
            senderUsername: undefined,
            gasPrice: 1000000000,
            gasLimit: gasConfig.router.admin.setPairCreationEnabled,
            data: encodeTransactionData('setPairCreationEnabled@01'),
            chainID: mxConfig.chainID,
            version: 2,
            options: undefined,
            signature: undefined,
            guardian: undefined,
            guardianSignature: undefined,
        });
    });

    it('should get set pair creation enabled OFF transaction', async () => {
        const service = module.get<RouterTransactionService>(
            RouterTransactionService,
        );

        const transaction = await service.setPairCreationEnabled(
            senderAddress,
            false,
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver: Address.newFromHex(
                '0000000000000000000000000000000000000000000000000000000000000011',
            ).toBech32(),
            sender: senderAddress,
            receiverUsername: undefined,
            senderUsername: undefined,
            gasPrice: 1000000000,
            gasLimit: gasConfig.router.admin.setPairCreationEnabled,
            data: encodeTransactionData('setPairCreationEnabled@'),
            chainID: mxConfig.chainID,
            version: 2,
            options: undefined,
            signature: undefined,
            guardian: undefined,
            guardianSignature: undefined,
        });
    });

    it('should get clear pair temporary owner storage transaction', async () => {
        const service = module.get<RouterTransactionService>(
            RouterTransactionService,
        );

        const transaction = await service.clearPairTemporaryOwnerStorage(
            senderAddress,
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver: Address.newFromHex(
                '0000000000000000000000000000000000000000000000000000000000000011',
            ).toBech32(),
            sender: senderAddress,
            receiverUsername: undefined,
            senderUsername: undefined,
            gasPrice: 1000000000,
            gasLimit: gasConfig.router.admin.clearPairTemporaryOwnerStorage,
            data: 'Y2xlYXJQYWlyVGVtcG9yYXJ5T3duZXJTdG9yYWdl',
            chainID: mxConfig.chainID,
            version: 2,
            options: undefined,
            signature: undefined,
            guardian: undefined,
            guardianSignature: undefined,
        });
    });

    it('should get set temporary owner period transaction', async () => {
        const service = module.get<RouterTransactionService>(
            RouterTransactionService,
        );

        const transaction = await service.setTemporaryOwnerPeriod(
            senderAddress,
            '1000000000000000000000000000000000',
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver: Address.newFromHex(
                '0000000000000000000000000000000000000000000000000000000000000011',
            ).toBech32(),
            sender: senderAddress,
            receiverUsername: undefined,
            senderUsername: undefined,
            gasPrice: 1000000000,
            gasLimit: gasConfig.router.admin.setTemporaryOwnerPeriod,
            data: encodeTransactionData(
                'setTemporaryOwnerPeriod@1000000000000000000000000000000000',
            ),
            chainID: mxConfig.chainID,
            version: 2,
            options: undefined,
            signature: undefined,
            guardian: undefined,
            guardianSignature: undefined,
        });
    });

    it('should get set pair template address transaction', async () => {
        const service = module.get<RouterTransactionService>(
            RouterTransactionService,
        );

        const transaction = await service.setPairTemplateAddress(
            senderAddress,
            Address.Zero().bech32(),
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver: Address.newFromHex(
                '0000000000000000000000000000000000000000000000000000000000000011',
            ).toBech32(),
            sender: senderAddress,
            receiverUsername: undefined,
            senderUsername: undefined,
            gasPrice: 1000000000,
            gasLimit: gasConfig.router.admin.setPairTemplateAddress,
            data: encodeTransactionData(
                'setPairTemplateAddress@erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            ),
            chainID: mxConfig.chainID,
            version: 2,
            options: undefined,
            signature: undefined,
            guardian: undefined,
            guardianSignature: undefined,
        });
    });

    it('should get user swap enable transaction', async () => {
        const service = module.get<RouterTransactionService>(
            RouterTransactionService,
        );

        const transaction = await service.setSwapEnabledByUser(
            senderAddress,
            new InputTokenModel({
                tokenID: 'LKESDT-123456',
                nonce: 1,
                amount: '10000000000',
                attributes:
                    'AAAAEUVHTERVU0RDTFAtYWJjZGVmAAAAAAAAAAAAAAAAAAAAAg==',
            }),
        );

        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver: senderAddress,
            sender: senderAddress,
            gasPrice: 1000000000,
            gasLimit: gasConfig.router.swapEnableByUser,
            data: encodeTransactionData(
                `ESDTNFTTransfer@LKESDT-123456@01@10000000000@${Address.newFromHex(
                    '0000000000000000000000000000000000000000000000000000000000000011',
                ).toBech32()}@setSwapEnabledByUser@${Address.newFromHex(
                    '0000000000000000000000000000000000000000000000000000000000000013',
                ).toBech32()}`,
            ),
            chainID: mxConfig.chainID,
            version: 2,
            options: undefined,
            signature: undefined,
        });
    });

    it(
        'should get error on user swap enable transaction ' + 'lock period',
        async () => {
            const service = module.get<RouterTransactionService>(
                RouterTransactionService,
            );

            await expect(
                service.setSwapEnabledByUser(
                    Address.Zero().bech32(),
                    new InputTokenModel({
                        tokenID: 'LKESDT-123456',
                        nonce: 1,
                        amount: '1000000000000000000',
                        attributes:
                            'AAAAEUVHTERVU0RDTFAtYWJjZGVmAAAAAAAAAAAAAAAAAAAAAQ==',
                    }),
                ),
            ).rejects.toThrow('Token not locked for long enough');
        },
    );

    it(
        'should get error on user swap enable transaction ' +
            'invalid locked token',
        async () => {
            const service = module.get<RouterTransactionService>(
                RouterTransactionService,
            );

            await expect(
                service.setSwapEnabledByUser(
                    Address.Zero().bech32(),
                    new InputTokenModel({
                        tokenID: 'LKESDT-abcdef',
                        nonce: 1,
                        amount: '1000000000000000000',
                        attributes:
                            'AAAAEUVHTERVU0RDTFAtYWJjZGVmAAAAAAAAAAAAAAAAAAAAAQ==',
                    }),
                ),
            ).rejects.toThrow('Invalid input token');
        },
    );

    it(
        'should get error on user swap enable transaction ' +
            'invalid LP token locked',
        async () => {
            const service = module.get<RouterTransactionService>(
                RouterTransactionService,
            );

            await expect(
                service.setSwapEnabledByUser(
                    Address.Zero().bech32(),
                    new InputTokenModel({
                        tokenID: 'LKESDT-abcdef',
                        nonce: 1,
                        amount: '1000000000000000000',
                        attributes: 'AAAAClRPSzJUT0szTFAAAAAAAAAAAAAAAAAAAAAA',
                    }),
                ),
            ).rejects.toThrow('Invalid locked LP token');
        },
    );

    it(
        'should get error on user swap enable transaction ' +
            'wrong common token',
        async () => {
            const service = module.get<RouterTransactionService>(
                RouterTransactionService,
            );

            await expect(
                service.setSwapEnabledByUser(
                    Address.Zero().bech32(),
                    new InputTokenModel({
                        tokenID: 'LKESDT-123456',
                        nonce: 1,
                        amount: '1000000000000000000',
                        attributes:
                            'AAAAEVRPSzVUT0s2TFAtYWJjZGVmAAAAAAAAAAAAAAAAAAAAAQ==',
                    }),
                ),
            ).rejects.toThrow('Not a valid user defined pair');
        },
    );

    it(
        'should get error on user swap enable transaction ' +
            'min value locked',
        async () => {
            const service = module.get<RouterTransactionService>(
                RouterTransactionService,
            );

            await expect(
                service.setSwapEnabledByUser(
                    Address.Zero().bech32(),
                    new InputTokenModel({
                        tokenID: 'LKESDT-123456',
                        nonce: 1,
                        amount: '1000',
                        attributes:
                            'AAAAEVRPSzVVU0RDTFAtYWJjZGVmAAAAAAAAAAAAAAAAAAAAAg==',
                    }),
                ),
            ).rejects.toThrow('Not enough value locked');
        },
    );
});
