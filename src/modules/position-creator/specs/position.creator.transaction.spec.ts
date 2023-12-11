import { Test, TestingModule } from '@nestjs/testing';
import { PositionCreatorTransactionService } from '../services/position.creator.transaction';
import { PositionCreatorComputeService } from '../services/position.creator.compute';
import { PairAbiServiceProvider } from 'src/modules/pair/mocks/pair.abi.service.mock';
import { PairService } from 'src/modules/pair/services/pair.service';
import { RouterAbiServiceProvider } from 'src/modules/router/mocks/router.abi.service.mock';
import { RouterService } from 'src/modules/router/services/router.service';
import { AutoRouterService } from 'src/modules/auto-router/services/auto-router.service';
import { AutoRouterTransactionService } from 'src/modules/auto-router/services/auto-router.transactions.service';
import { FarmAbiServiceProviderV2 } from 'src/modules/farm/mocks/farm.v2.abi.service.mock';
import { StakingAbiServiceProvider } from 'src/modules/staking/mocks/staking.abi.service.mock';
import { StakingProxyAbiServiceProvider } from 'src/modules/staking-proxy/mocks/staking.proxy.abi.service.mock';
import { TokenServiceProvider } from 'src/modules/tokens/mocks/token.service.mock';
import { MXProxyServiceProvider } from 'src/services/multiversx-communication/mx.proxy.service.mock';
import { PairComputeServiceProvider } from 'src/modules/pair/mocks/pair.compute.service.mock';
import { WrapAbiServiceProvider } from 'src/modules/wrapping/mocks/wrap.abi.service.mock';
import { WinstonModule } from 'nest-winston';
import winston from 'winston';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { ContextGetterServiceProvider } from 'src/services/context/mocks/context.getter.service.mock';
import { AutoRouterComputeService } from 'src/modules/auto-router/services/auto-router.compute.service';
import { PairTransactionService } from 'src/modules/pair/services/pair.transactions.service';
import { WrapTransactionsService } from 'src/modules/wrapping/services/wrap.transactions.service';
import { WrapService } from 'src/modules/wrapping/services/wrap.service';
import { RemoteConfigGetterServiceProvider } from 'src/modules/remote-config/mocks/remote-config.getter.mock';
import { Address } from '@multiversx/sdk-core/out';
import { EsdtTokenPayment } from '@multiversx/sdk-exchange';
import { encodeTransactionData } from 'src/helpers/helpers';
import exp from 'constants';
import { StakingProxyAbiService } from 'src/modules/staking-proxy/services/staking.proxy.abi.service';

describe('PositionCreatorTransaction', () => {
    let module: TestingModule;

    beforeEach(async () => {
        module = await Test.createTestingModule({
            imports: [
                WinstonModule.forRoot({
                    transports: [new winston.transports.Console({})],
                }),
                ConfigModule.forRoot({}),
                DynamicModuleUtils.getCacheModule(),
            ],
            providers: [
                PositionCreatorTransactionService,
                PositionCreatorComputeService,
                PairAbiServiceProvider,
                PairService,
                PairComputeServiceProvider,
                PairTransactionService,
                WrapService,
                WrapAbiServiceProvider,
                WrapTransactionsService,
                RouterAbiServiceProvider,
                RouterService,
                AutoRouterService,
                AutoRouterTransactionService,
                AutoRouterComputeService,
                FarmAbiServiceProviderV2,
                StakingAbiServiceProvider,
                StakingProxyAbiServiceProvider,
                TokenServiceProvider,
                RemoteConfigGetterServiceProvider,
                MXProxyServiceProvider,
                ConfigService,
                ApiConfigService,
                ContextGetterServiceProvider,
            ],
        }).compile();
    });

    it('should be defined', () => {
        expect(module).toBeDefined();
    });

    describe('Create liquidity position single token', () => {
        it('should return error on ESDT token', async () => {
            const service = module.get<PositionCreatorTransactionService>(
                PositionCreatorTransactionService,
            );
            expect(
                service.createLiquidityPositionSingleToken(
                    Address.Zero().bech32(),
                    Address.fromHex(
                        '0000000000000000000000000000000000000000000000000000000000000012',
                    ).bech32(),
                    new EsdtTokenPayment({
                        tokenIdentifier: 'MEX-abcdef',
                        tokenNonce: 0,
                        amount: '100000000000000000000',
                    }),
                    0.01,
                ),
            ).rejects.toThrowError('Invalid ESDT token payment');
        });

        it('should return transaction with single token', async () => {
            const service = module.get<PositionCreatorTransactionService>(
                PositionCreatorTransactionService,
            );
            const transaction =
                await service.createLiquidityPositionSingleToken(
                    Address.Zero().bech32(),
                    Address.fromHex(
                        '0000000000000000000000000000000000000000000000000000000000000012',
                    ).bech32(),
                    new EsdtTokenPayment({
                        tokenIdentifier: 'USDC-123456',
                        tokenNonce: 0,
                        amount: '100000000000000000000',
                    }),
                    0.01,
                );

            expect(transaction).toEqual({
                nonce: 0,
                value: '0',
                receiver:
                    'erd1qqqqqqqqqqqqqpgqh3zcutxk3wmfvevpyymaehvc3k0knyq70n4sg6qcj6',
                sender: Address.Zero().bech32(),
                senderUsername: undefined,
                receiverUsername: undefined,
                gasPrice: 1000000000,
                gasLimit: 50000000,
                data: encodeTransactionData(
                    `ESDTTransfer@USDC-123456@100000000000000000000@createLpPosFromSingleToken@0000000000000000000000000000000000000000000000000000000000000012@494999999950351053163@329339339317295273252718@0000000000000000000000000000000000000000000000000000000000000013@swapTokensFixedInput@WEGLD-123456@989999999900702106327`,
                ),
                chainID: 'T',
                version: 1,
                options: undefined,
                guardian: undefined,
                signature: undefined,
                guardianSignature: undefined,
            });
        });
    });

    describe('Create farm position single token', () => {
        it('should return error on ESDT token', async () => {
            const service = module.get<PositionCreatorTransactionService>(
                PositionCreatorTransactionService,
            );
            expect(
                service.createFarmPositionSingleToken(
                    Address.Zero().bech32(),
                    Address.fromHex(
                        '0000000000000000000000000000000000000000000000000000000000000021',
                    ).bech32(),
                    [
                        new EsdtTokenPayment({
                            tokenIdentifier: 'MEX-abcdef',
                            tokenNonce: 0,
                            amount: '100000000000000000000',
                        }),
                    ],
                    0.01,
                ),
            ).rejects.toThrowError('Invalid ESDT token payment');
        });

        it('should return error on farm token', async () => {
            const service = module.get<PositionCreatorTransactionService>(
                PositionCreatorTransactionService,
            );
            expect(
                service.createFarmPositionSingleToken(
                    Address.Zero().bech32(),
                    Address.fromHex(
                        '0000000000000000000000000000000000000000000000000000000000000021',
                    ).bech32(),
                    [
                        new EsdtTokenPayment({
                            tokenIdentifier: 'USDC-123456',
                            tokenNonce: 0,
                            amount: '100000000000000000000',
                        }),
                        new EsdtTokenPayment({
                            tokenIdentifier: 'EGLDMEXFL-123456',
                            tokenNonce: 1,
                            amount: '100000000000000000000',
                        }),
                    ],
                    0.01,
                ),
            ).rejects.toThrowError('Invalid farm token payment');
        });

        it('should return transaction no merge farm tokens', async () => {
            const service = module.get<PositionCreatorTransactionService>(
                PositionCreatorTransactionService,
            );
            const transaction = await service.createFarmPositionSingleToken(
                Address.Zero().bech32(),
                Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000021',
                ).bech32(),
                [
                    new EsdtTokenPayment({
                        tokenIdentifier: 'USDC-123456',
                        tokenNonce: 0,
                        amount: '100000000000000000000',
                    }),
                ],
                0.01,
            );

            expect(transaction).toEqual([
                {
                    nonce: 0,
                    value: '0',
                    receiver: Address.Zero().bech32(),
                    sender: Address.Zero().bech32(),
                    senderUsername: undefined,
                    receiverUsername: undefined,
                    gasPrice: 1000000000,
                    gasLimit: 50000000,
                    data: encodeTransactionData(
                        `MultiESDTNFTTransfer@00000000000000000500bc458e2cd68bb69665812137dcdd988d9f69901e7ceb@01@USDC-123456@@100000000000000000000@createFarmPosFromSingleToken@0000000000000000000000000000000000000000000000000000000000000021@494999999950351053163@329339339317295273252718@0000000000000000000000000000000000000000000000000000000000000013@swapTokensFixedInput@WEGLD-123456@989999999900702106327`,
                    ),
                    chainID: 'T',
                    version: 1,
                    options: undefined,
                    guardian: undefined,
                    signature: undefined,
                    guardianSignature: undefined,
                },
            ]);
        });

        it('should return transaction with merge farm tokens', async () => {
            const service = module.get<PositionCreatorTransactionService>(
                PositionCreatorTransactionService,
            );
            const transaction = await service.createFarmPositionSingleToken(
                Address.Zero().bech32(),
                Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000021',
                ).bech32(),
                [
                    new EsdtTokenPayment({
                        tokenIdentifier: 'USDC-123456',
                        tokenNonce: 0,
                        amount: '100000000000000000000',
                    }),
                    new EsdtTokenPayment({
                        tokenIdentifier: 'EGLDMEXFL-abcdef',
                        tokenNonce: 1,
                        amount: '100000000000000000000',
                    }),
                ],
                0.01,
            );

            expect(transaction).toEqual([
                {
                    nonce: 0,
                    value: '0',
                    receiver: Address.Zero().bech32(),
                    sender: Address.Zero().bech32(),
                    senderUsername: undefined,
                    receiverUsername: undefined,
                    gasPrice: 1000000000,
                    gasLimit: 50000000,
                    data: encodeTransactionData(
                        `MultiESDTNFTTransfer@00000000000000000500bc458e2cd68bb69665812137dcdd988d9f69901e7ceb@02@USDC-123456@@100000000000000000000@EGLDMEXFL-abcdef@01@100000000000000000000@createFarmPosFromSingleToken@0000000000000000000000000000000000000000000000000000000000000021@494999999950351053163@329339339317295273252718@0000000000000000000000000000000000000000000000000000000000000013@swapTokensFixedInput@WEGLD-123456@989999999900702106327`,
                    ),
                    chainID: 'T',
                    version: 1,
                    options: undefined,
                    guardian: undefined,
                    signature: undefined,
                    guardianSignature: undefined,
                },
            ]);
        });
    });

    describe('Create dual farm position single token', () => {
        it('should return error on ESDT token', async () => {
            const service = module.get<PositionCreatorTransactionService>(
                PositionCreatorTransactionService,
            );
            expect(
                service.createDualFarmPositionSingleToken(
                    Address.Zero().bech32(),
                    Address.Zero().bech32(),
                    [
                        new EsdtTokenPayment({
                            tokenIdentifier: 'USDC-abcdef',
                            tokenNonce: 0,
                            amount: '100000000000000000000',
                        }),
                    ],
                    0.01,
                ),
            ).rejects.toThrowError('Invalid ESDT token payment');
        });

        it('should return error on dual farm token', async () => {
            const service = module.get<PositionCreatorTransactionService>(
                PositionCreatorTransactionService,
            );
            expect(
                service.createDualFarmPositionSingleToken(
                    Address.Zero().bech32(),
                    Address.Zero().bech32(),
                    [
                        new EsdtTokenPayment({
                            tokenIdentifier: 'USDC-123456',
                            tokenNonce: 0,
                            amount: '100000000000000000000',
                        }),
                        new EsdtTokenPayment({
                            tokenIdentifier: 'METASTAKE-abcdef',
                            tokenNonce: 1,
                            amount: '100000000000000000000',
                        }),
                    ],
                    0.01,
                ),
            ).rejects.toThrowError('Invalid dual yield token payment');
        });

        it('should return transaction no merge dual farm tokens', async () => {
            const service = module.get<PositionCreatorTransactionService>(
                PositionCreatorTransactionService,
            );
            const stakingProxyAbi = module.get<StakingProxyAbiService>(
                StakingProxyAbiService,
            );
            jest.spyOn(stakingProxyAbi, 'pairAddress').mockResolvedValue(
                Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000012',
                ).bech32(),
            );

            const transaction = await service.createDualFarmPositionSingleToken(
                Address.Zero().bech32(),
                Address.Zero().bech32(),
                [
                    new EsdtTokenPayment({
                        tokenIdentifier: 'USDC-123456',
                        tokenNonce: 0,
                        amount: '100000000000000000000',
                    }),
                ],
                0.01,
            );

            expect(transaction).toEqual([
                {
                    nonce: 0,
                    value: '0',
                    receiver: Address.Zero().bech32(),
                    sender: Address.Zero().bech32(),
                    senderUsername: undefined,
                    receiverUsername: undefined,
                    gasPrice: 1000000000,
                    gasLimit: 50000000,
                    data: encodeTransactionData(
                        'MultiESDTNFTTransfer@00000000000000000500bc458e2cd68bb69665812137dcdd988d9f69901e7ceb@01@USDC-123456@@100000000000000000000@createMetastakingPosFromSingleToken@0000000000000000000000000000000000000000000000000000000000000000@494999999950351053163@329339339317295273252718@0000000000000000000000000000000000000000000000000000000000000013@swapTokensFixedInput@WEGLD-123456@989999999900702106327',
                    ),
                    chainID: 'T',
                    version: 1,
                    options: undefined,
                    guardian: undefined,
                    signature: undefined,
                    guardianSignature: undefined,
                },
            ]);
        });

        it('should return transaction with merge dual farm tokens', async () => {
            const service = module.get<PositionCreatorTransactionService>(
                PositionCreatorTransactionService,
            );
            const stakingProxyAbi = module.get<StakingProxyAbiService>(
                StakingProxyAbiService,
            );
            jest.spyOn(stakingProxyAbi, 'pairAddress').mockResolvedValue(
                Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000012',
                ).bech32(),
            );

            const transaction = await service.createDualFarmPositionSingleToken(
                Address.Zero().bech32(),
                Address.Zero().bech32(),
                [
                    new EsdtTokenPayment({
                        tokenIdentifier: 'USDC-123456',
                        tokenNonce: 0,
                        amount: '100000000000000000000',
                    }),
                    new EsdtTokenPayment({
                        tokenIdentifier: 'METASTAKE-1234',
                        tokenNonce: 1,
                        amount: '100000000000000000000',
                    }),
                ],
                0.01,
            );

            expect(transaction).toEqual([
                {
                    nonce: 0,
                    value: '0',
                    receiver: Address.Zero().bech32(),
                    sender: Address.Zero().bech32(),
                    senderUsername: undefined,
                    receiverUsername: undefined,
                    gasPrice: 1000000000,
                    gasLimit: 50000000,
                    data: encodeTransactionData(
                        'MultiESDTNFTTransfer@00000000000000000500bc458e2cd68bb69665812137dcdd988d9f69901e7ceb@02@USDC-123456@@100000000000000000000@METASTAKE-1234@01@100000000000000000000@createMetastakingPosFromSingleToken@0000000000000000000000000000000000000000000000000000000000000000@494999999950351053163@329339339317295273252718@0000000000000000000000000000000000000000000000000000000000000013@swapTokensFixedInput@WEGLD-123456@989999999900702106327',
                    ),
                    chainID: 'T',
                    version: 1,
                    options: undefined,
                    guardian: undefined,
                    signature: undefined,
                    guardianSignature: undefined,
                },
            ]);
        });
    });

    describe('Create staking position single token', () => {
        it('should return error on ESDT token', async () => {
            const service = module.get<PositionCreatorTransactionService>(
                PositionCreatorTransactionService,
            );
            expect(
                service.createStakingPositionSingleToken(
                    Address.Zero().bech32(),
                    Address.Zero().bech32(),
                    [
                        new EsdtTokenPayment({
                            tokenIdentifier: 'USDC-abcdef',
                            tokenNonce: 0,
                            amount: '100000000000000000000',
                        }),
                    ],
                    0.01,
                ),
            ).rejects.toThrowError('Invalid ESDT token payment');
        });

        it('should return error on staking token', async () => {
            const service = module.get<PositionCreatorTransactionService>(
                PositionCreatorTransactionService,
            );
            expect(
                service.createStakingPositionSingleToken(
                    Address.Zero().bech32(),
                    Address.Zero().bech32(),
                    [
                        new EsdtTokenPayment({
                            tokenIdentifier: 'USDC-123456',
                            tokenNonce: 0,
                            amount: '100000000000000000000',
                        }),
                        new EsdtTokenPayment({
                            tokenIdentifier: 'STAKETOK-abcdef',
                            tokenNonce: 1,
                            amount: '100000000000000000000',
                        }),
                    ],
                    0.01,
                ),
            ).rejects.toThrowError('Invalid staking token payment');
        });

        it('should return transaction no merge staking tokens', async () => {
            const service = module.get<PositionCreatorTransactionService>(
                PositionCreatorTransactionService,
            );
            const transaction = await service.createStakingPositionSingleToken(
                Address.Zero().bech32(),
                Address.Zero().bech32(),
                [
                    new EsdtTokenPayment({
                        tokenIdentifier: 'USDC-123456',
                        tokenNonce: 0,
                        amount: '100000000000000000000',
                    }),
                ],
                0.01,
            );

            expect(transaction).toEqual([
                {
                    nonce: 0,
                    value: '0',
                    receiver: Address.Zero().bech32(),
                    sender: Address.Zero().bech32(),
                    senderUsername: undefined,
                    receiverUsername: undefined,
                    gasPrice: 1000000000,
                    gasLimit: 50000000,
                    data: encodeTransactionData(
                        'MultiESDTNFTTransfer@00000000000000000500bc458e2cd68bb69665812137dcdd988d9f69901e7ceb@01@USDC-123456@@100000000000000000000@createFarmStakingPosFromSingleToken@0000000000000000000000000000000000000000000000000000000000000000@999999999899699097301@0000000000000000000000000000000000000000000000000000000000000013@swapTokensFixedInput@WEGLD-123456@989999999900702106327',
                    ),
                    chainID: 'T',
                    version: 1,
                    options: undefined,
                    guardian: undefined,
                    signature: undefined,
                    guardianSignature: undefined,
                },
            ]);
        });

        it('should return transaction with merge staking tokens', async () => {
            const service = module.get<PositionCreatorTransactionService>(
                PositionCreatorTransactionService,
            );
            const transaction = await service.createStakingPositionSingleToken(
                Address.Zero().bech32(),
                Address.Zero().bech32(),
                [
                    new EsdtTokenPayment({
                        tokenIdentifier: 'USDC-123456',
                        tokenNonce: 0,
                        amount: '100000000000000000000',
                    }),
                    new EsdtTokenPayment({
                        tokenIdentifier: 'STAKETOK-1111',
                        tokenNonce: 1,
                        amount: '100000000000000000000',
                    }),
                ],
                0.01,
            );

            expect(transaction).toEqual([
                {
                    nonce: 0,
                    value: '0',
                    receiver: Address.Zero().bech32(),
                    sender: Address.Zero().bech32(),
                    senderUsername: undefined,
                    receiverUsername: undefined,
                    gasPrice: 1000000000,
                    gasLimit: 50000000,
                    data: encodeTransactionData(
                        'MultiESDTNFTTransfer@00000000000000000500bc458e2cd68bb69665812137dcdd988d9f69901e7ceb@02@USDC-123456@@100000000000000000000@STAKETOK-1111@01@100000000000000000000@createFarmStakingPosFromSingleToken@0000000000000000000000000000000000000000000000000000000000000000@999999999899699097301@0000000000000000000000000000000000000000000000000000000000000013@swapTokensFixedInput@WEGLD-123456@989999999900702106327',
                    ),
                    chainID: 'T',
                    version: 1,
                    options: undefined,
                    guardian: undefined,
                    signature: undefined,
                    guardianSignature: undefined,
                },
            ]);
        });
    });

    describe('Create farm position dual tokens', () => {
        it('should return error on invalid payments', async () => {
            const service = module.get<PositionCreatorTransactionService>(
                PositionCreatorTransactionService,
            );
            expect(
                service.createFarmPositionDualTokens(
                    Address.Zero().bech32(),
                    Address.fromHex(
                        '0000000000000000000000000000000000000000000000000000000000000021',
                    ).bech32(),
                    [
                        new EsdtTokenPayment({
                            tokenIdentifier: 'WEGLD-123456',
                            tokenNonce: 0,
                            amount: '100000000000000000000',
                        }),
                        new EsdtTokenPayment({
                            tokenIdentifier: 'MEX-abcdef',
                            tokenNonce: 0,
                            amount: '100000000000000000000',
                        }),
                    ],
                    0.01,
                ),
            ).rejects.toThrowError('Invalid ESDT tokens payments');
        });

        it('should return error on invalid farm token merge', async () => {
            const service = module.get<PositionCreatorTransactionService>(
                PositionCreatorTransactionService,
            );
            expect(
                service.createFarmPositionDualTokens(
                    Address.Zero().bech32(),
                    Address.fromHex(
                        '0000000000000000000000000000000000000000000000000000000000000021',
                    ).bech32(),
                    [
                        new EsdtTokenPayment({
                            tokenIdentifier: 'WEGLD-123456',
                            tokenNonce: 0,
                            amount: '100000000000000000000',
                        }),
                        new EsdtTokenPayment({
                            tokenIdentifier: 'MEX-123456',
                            tokenNonce: 0,
                            amount: '100000000000000000000',
                        }),
                        new EsdtTokenPayment({
                            tokenIdentifier: 'EGLDMEXFL-123456',
                            tokenNonce: 1,
                            amount: '100000000000000000000',
                        }),
                    ],
                    0.01,
                ),
            ).rejects.toThrowError('Invalid farm token payment');
        });

        it('should return transaction no merge farm tokens', async () => {
            const service = module.get<PositionCreatorTransactionService>(
                PositionCreatorTransactionService,
            );
            const transaction = await service.createFarmPositionDualTokens(
                Address.Zero().bech32(),
                Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000021',
                ).bech32(),
                [
                    new EsdtTokenPayment({
                        tokenIdentifier: 'WEGLD-123456',
                        tokenNonce: 0,
                        amount: '100000000000000000000',
                    }),
                    new EsdtTokenPayment({
                        tokenIdentifier: 'MEX-123456',
                        tokenNonce: 0,
                        amount: '100000000000000000000',
                    }),
                ],
                0.01,
            );

            expect(transaction).toEqual({
                nonce: 0,
                value: '0',
                receiver: Address.Zero().bech32(),
                sender: Address.Zero().bech32(),
                senderUsername: undefined,
                receiverUsername: undefined,
                gasPrice: 1000000000,
                gasLimit: 50000000,
                data: encodeTransactionData(
                    'MultiESDTNFTTransfer@00000000000000000500bc458e2cd68bb69665812137dcdd988d9f69901e7ceb@02@WEGLD-123456@@100000000000000000000@MEX-123456@@100000000000000000000@createFarmPosFromTwoTokens@0000000000000000000000000000000000000000000000000000000000000021@99000000000000000000@99000000000000000000',
                ),
                chainID: 'T',
                version: 1,
                options: undefined,
                guardian: undefined,
                signature: undefined,
                guardianSignature: undefined,
            });
        });

        it('should return transaction no merge farm tokens', async () => {
            const service = module.get<PositionCreatorTransactionService>(
                PositionCreatorTransactionService,
            );
            const transaction = await service.createFarmPositionDualTokens(
                Address.Zero().bech32(),
                Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000021',
                ).bech32(),
                [
                    new EsdtTokenPayment({
                        tokenIdentifier: 'WEGLD-123456',
                        tokenNonce: 0,
                        amount: '100000000000000000000',
                    }),
                    new EsdtTokenPayment({
                        tokenIdentifier: 'MEX-123456',
                        tokenNonce: 0,
                        amount: '100000000000000000000',
                    }),
                    new EsdtTokenPayment({
                        tokenIdentifier: 'EGLDMEXFL-abcdef',
                        tokenNonce: 1,
                        amount: '100000000000000000000',
                    }),
                ],
                0.01,
            );

            expect(transaction).toEqual({
                nonce: 0,
                value: '0',
                receiver: Address.Zero().bech32(),
                sender: Address.Zero().bech32(),
                senderUsername: undefined,
                receiverUsername: undefined,
                gasPrice: 1000000000,
                gasLimit: 50000000,
                data: encodeTransactionData(
                    'MultiESDTNFTTransfer@00000000000000000500bc458e2cd68bb69665812137dcdd988d9f69901e7ceb@03@WEGLD-123456@@100000000000000000000@MEX-123456@@100000000000000000000@EGLDMEXFL-abcdef@01@100000000000000000000@createFarmPosFromTwoTokens@0000000000000000000000000000000000000000000000000000000000000021@99000000000000000000@99000000000000000000',
                ),
                chainID: 'T',
                version: 1,
                options: undefined,
                guardian: undefined,
                signature: undefined,
                guardianSignature: undefined,
            });
        });
    });

    describe('Create dual farm position dual tokens', () => {
        it('should return error on invalid payments', async () => {
            const service = module.get<PositionCreatorTransactionService>(
                PositionCreatorTransactionService,
            );
            const stakingProxyAbi = module.get<StakingProxyAbiService>(
                StakingProxyAbiService,
            );
            jest.spyOn(stakingProxyAbi, 'pairAddress').mockResolvedValue(
                Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000012',
                ).bech32(),
            );

            expect(
                service.createDualFarmPositionDualTokens(
                    Address.Zero().bech32(),
                    Address.Zero().bech32(),
                    [
                        new EsdtTokenPayment({
                            tokenIdentifier: 'WEGLD-123456',
                            tokenNonce: 0,
                            amount: '100000000000000000000',
                        }),
                        new EsdtTokenPayment({
                            tokenIdentifier: 'MEX-abcdef',
                            tokenNonce: 0,
                            amount: '100000000000000000000',
                        }),
                    ],
                    0.01,
                ),
            ).rejects.toThrowError('Invalid ESDT tokens payments');
        });

        it('should return error on invalid farm token merge', async () => {
            const service = module.get<PositionCreatorTransactionService>(
                PositionCreatorTransactionService,
            );
            const stakingProxyAbi = module.get<StakingProxyAbiService>(
                StakingProxyAbiService,
            );
            jest.spyOn(stakingProxyAbi, 'pairAddress').mockResolvedValue(
                Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000012',
                ).bech32(),
            );

            expect(
                service.createDualFarmPositionDualTokens(
                    Address.Zero().bech32(),
                    Address.Zero().bech32(),
                    [
                        new EsdtTokenPayment({
                            tokenIdentifier: 'WEGLD-123456',
                            tokenNonce: 0,
                            amount: '100000000000000000000',
                        }),
                        new EsdtTokenPayment({
                            tokenIdentifier: 'MEX-123456',
                            tokenNonce: 0,
                            amount: '100000000000000000000',
                        }),
                        new EsdtTokenPayment({
                            tokenIdentifier: 'METASTAKE-abcdef',
                            tokenNonce: 1,
                            amount: '100000000000000000000',
                        }),
                    ],
                    0.01,
                ),
            ).rejects.toThrowError('Invalid dual farm token payment');
        });

        it('should return transaction no merge farm tokens', async () => {
            const service = module.get<PositionCreatorTransactionService>(
                PositionCreatorTransactionService,
            );
            const stakingProxyAbi = module.get<StakingProxyAbiService>(
                StakingProxyAbiService,
            );
            jest.spyOn(stakingProxyAbi, 'pairAddress').mockResolvedValue(
                Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000012',
                ).bech32(),
            );

            const transaction = await service.createDualFarmPositionDualTokens(
                Address.Zero().bech32(),
                Address.Zero().bech32(),
                [
                    new EsdtTokenPayment({
                        tokenIdentifier: 'WEGLD-123456',
                        tokenNonce: 0,
                        amount: '100000000000000000000',
                    }),
                    new EsdtTokenPayment({
                        tokenIdentifier: 'MEX-123456',
                        tokenNonce: 0,
                        amount: '100000000000000000000',
                    }),
                ],
                0.01,
            );

            expect(transaction).toEqual({
                nonce: 0,
                value: '0',
                receiver: Address.Zero().bech32(),
                sender: Address.Zero().bech32(),
                senderUsername: undefined,
                receiverUsername: undefined,
                gasPrice: 1000000000,
                gasLimit: 50000000,
                data: encodeTransactionData(
                    'MultiESDTNFTTransfer@00000000000000000500bc458e2cd68bb69665812137dcdd988d9f69901e7ceb@02@WEGLD-123456@@100000000000000000000@MEX-123456@@100000000000000000000@createMetastakingPosFromTwoTokens@0000000000000000000000000000000000000000000000000000000000000000@99000000000000000000@99000000000000000000',
                ),
                chainID: 'T',
                version: 1,
                options: undefined,
                guardian: undefined,
                signature: undefined,
                guardianSignature: undefined,
            });
        });

        it('should return transaction no merge farm tokens', async () => {
            const service = module.get<PositionCreatorTransactionService>(
                PositionCreatorTransactionService,
            );
            const stakingProxyAbi = module.get<StakingProxyAbiService>(
                StakingProxyAbiService,
            );
            jest.spyOn(stakingProxyAbi, 'pairAddress').mockResolvedValue(
                Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000012',
                ).bech32(),
            );

            const transaction = await service.createDualFarmPositionDualTokens(
                Address.Zero().bech32(),
                Address.Zero().bech32(),
                [
                    new EsdtTokenPayment({
                        tokenIdentifier: 'WEGLD-123456',
                        tokenNonce: 0,
                        amount: '100000000000000000000',
                    }),
                    new EsdtTokenPayment({
                        tokenIdentifier: 'MEX-123456',
                        tokenNonce: 0,
                        amount: '100000000000000000000',
                    }),
                    new EsdtTokenPayment({
                        tokenIdentifier: 'METASTAKE-1234',
                        tokenNonce: 1,
                        amount: '100000000000000000000',
                    }),
                ],
                0.01,
            );

            expect(transaction).toEqual({
                nonce: 0,
                value: '0',
                receiver: Address.Zero().bech32(),
                sender: Address.Zero().bech32(),
                senderUsername: undefined,
                receiverUsername: undefined,
                gasPrice: 1000000000,
                gasLimit: 50000000,
                data: encodeTransactionData(
                    'MultiESDTNFTTransfer@00000000000000000500bc458e2cd68bb69665812137dcdd988d9f69901e7ceb@03@WEGLD-123456@@100000000000000000000@MEX-123456@@100000000000000000000@METASTAKE-1234@01@100000000000000000000@createMetastakingPosFromTwoTokens@0000000000000000000000000000000000000000000000000000000000000000@99000000000000000000@99000000000000000000',
                ),
                chainID: 'T',
                version: 1,
                options: undefined,
                guardian: undefined,
                signature: undefined,
                guardianSignature: undefined,
            });
        });
    });

    describe('Exit farm position dual tokens', () => {
        it('should return error on invalid farm token', async () => {
            const service = module.get<PositionCreatorTransactionService>(
                PositionCreatorTransactionService,
            );
            expect(
                service.exitFarmPositionDualTokens(
                    Address.Zero().bech32(),
                    Address.fromHex(
                        '0000000000000000000000000000000000000000000000000000000000000021',
                    ).bech32(),
                    new EsdtTokenPayment({
                        tokenIdentifier: 'MEX-abcdef',
                        tokenNonce: 0,
                        amount: '100000000000000000000',
                    }),
                    0.01,
                ),
            ).rejects.toThrowError('Invalid farm token payment');
        });

        it('should return transaction', async () => {
            const service = module.get<PositionCreatorTransactionService>(
                PositionCreatorTransactionService,
            );
            const transaction = await service.exitFarmPositionDualTokens(
                Address.Zero().bech32(),
                Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000021',
                ).bech32(),
                new EsdtTokenPayment({
                    tokenIdentifier: 'EGLDMEXFL-abcdef',
                    tokenNonce: 1,
                    amount: '100000000000000000000',
                }),
                0.01,
            );

            expect(transaction).toEqual({
                nonce: 0,
                value: '0',
                receiver: Address.Zero().bech32(),
                sender: Address.Zero().bech32(),
                senderUsername: undefined,
                receiverUsername: undefined,
                gasPrice: 1000000000,
                gasLimit: 50000000,
                data: encodeTransactionData(
                    'ESDTNFTTransfer@EGLDMEXFL-abcdef@01@100000000000000000000@00000000000000000500bc458e2cd68bb69665812137dcdd988d9f69901e7ceb@exitFarmPos@0000000000000000000000000000000000000000000000000000000000000021@99000000000000000000@99000000000000000000000',
                ),
                chainID: 'T',
                version: 1,
                options: undefined,
                guardian: undefined,
                signature: undefined,
                guardianSignature: undefined,
            });
        });
    });
});
