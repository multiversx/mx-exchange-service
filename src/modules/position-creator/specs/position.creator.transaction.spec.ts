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
import { StakingProxyAbiService } from 'src/modules/staking-proxy/services/staking.proxy.abi.service';
import { ComposableTasksTransactionService } from 'src/modules/composable-tasks/services/composable.tasks.transaction';
import { ProxyFarmAbiServiceProvider } from 'src/modules/proxy/mocks/proxy.abi.service.mock';
import { EnergyAbiServiceProvider } from 'src/modules/energy/mocks/energy.abi.service.mock';
import { constantsConfig, gasConfig, scAddress } from 'src/config';
import { StakingAbiService } from 'src/modules/staking/services/staking.abi.service';
import { MXApiServiceProvider } from 'src/services/multiversx-communication/mx.api.service.mock';
import { SwapRouteModel } from 'src/modules/auto-router/models/auto-route.model';
import { PairFilteringService } from 'src/modules/pair/services/pair.filtering.service';
import { FarmVersion } from 'src/modules/farm/models/farm.model';
import { TokenComputeServiceProvider } from 'src/modules/tokens/mocks/token.compute.service.mock';

describe('PositionCreatorTransaction', () => {
    let module: TestingModule;
    const senderAddress = Address.newFromHex(
        '0000000000000000000000000000000000000000000000000000000000000001',
    ).toBech32();

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
                PairFilteringService,
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
                TokenComputeServiceProvider,
                RemoteConfigGetterServiceProvider,
                ComposableTasksTransactionService,
                ProxyFarmAbiServiceProvider,
                EnergyAbiServiceProvider,
                MXProxyServiceProvider,
                ConfigService,
                ApiConfigService,
                ContextGetterServiceProvider,
                MXApiServiceProvider,
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
                    [],
                ),
            ).rejects.toThrowError('Invalid ESDT token payment');
        });

        it('should return transaction with single token', async () => {
            const service = module.get<PositionCreatorTransactionService>(
                PositionCreatorTransactionService,
            );
            const posCreatorCompute = module.get<PositionCreatorComputeService>(
                PositionCreatorComputeService,
            );

            const swapRoutes =
                await posCreatorCompute.computeSingleTokenPairInput(
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

            const transactions =
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
                    swapRoutes,
                );

            const gasLimit =
                gasConfig.positionCreator.singleToken.liquidityPosition +
                gasConfig.pairs.addLiquidity +
                gasConfig.pairs.swapTokensFixedInput.withFeeSwap *
                    (swapRoutes[0].pairs.length + 1);

            expect(transactions).toEqual([
                {
                    nonce: 0,
                    value: '0',
                    receiver:
                        'erd1qqqqqqqqqqqqqpgqh3zcutxk3wmfvevpyymaehvc3k0knyq70n4sg6qcj6',
                    sender: Address.Zero().bech32(),
                    senderUsername: undefined,
                    receiverUsername: undefined,
                    gasPrice: 1000000000,
                    gasLimit: gasLimit,
                    data: encodeTransactionData(
                        `ESDTTransfer@USDC-123456@100000000000000000000@createLpPosFromSingleToken@0000000000000000000000000000000000000000000000000000000000000012@329339339317295273252@329339339317295273252718@0000000000000000000000000000000000000000000000000000000000000013@swapTokensFixedInput@WEGLD-123456@989999999900702106327`,
                    ),
                    chainID: 'T',
                    version: 2,
                    options: undefined,
                    guardian: undefined,
                    signature: undefined,
                    guardianSignature: undefined,
                },
            ]);
        });
    });

    describe('Create liquidity position locked token', () => {
        it('should return transaction with ESDT payment', async () => {
            const service = module.get<PositionCreatorTransactionService>(
                PositionCreatorTransactionService,
            );
            const posCreatorCompute = module.get<PositionCreatorComputeService>(
                PositionCreatorComputeService,
            );

            const swapRoutes =
                await posCreatorCompute.computeSingleTokenPairInput(
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

            const transactions =
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
                    swapRoutes,
                    1440,
                );

            const gasLimit =
                gasConfig.positionCreator.singleToken.liquidityPosition +
                gasConfig.pairs.addLiquidity +
                gasConfig.pairs.swapTokensFixedInput.withFeeSwap *
                    (swapRoutes[0].pairs.length + 1);

            expect(transactions).toEqual([
                {
                    nonce: 0,
                    value: '0',
                    receiver:
                        'erd1qqqqqqqqqqqqqpgqh3zcutxk3wmfvevpyymaehvc3k0knyq70n4sg6qcj6',
                    sender: Address.Zero().bech32(),
                    senderUsername: undefined,
                    receiverUsername: undefined,
                    gasPrice: 1000000000,
                    gasLimit: gasLimit,
                    data: encodeTransactionData(
                        `ESDTTransfer@USDC-123456@100000000000000000000@createPairPosFromSingleToken@1440@329339339317295273252@329339339317295273252718@0000000000000000000000000000000000000000000000000000000000000013@swapTokensFixedInput@WEGLD-123456@989999999900702106327`,
                    ),
                    chainID: 'T',
                    version: 2,
                    options: undefined,
                    guardian: undefined,
                    signature: undefined,
                    guardianSignature: undefined,
                },
            ]);
        });

        it('should return transaction with EGLD payment', async () => {
            const service = module.get<PositionCreatorTransactionService>(
                PositionCreatorTransactionService,
            );
            const posCreatorCompute = module.get<PositionCreatorComputeService>(
                PositionCreatorComputeService,
            );

            const swapRoutes =
                await posCreatorCompute.computeSingleTokenPairInput(
                    Address.fromHex(
                        '0000000000000000000000000000000000000000000000000000000000000012',
                    ).bech32(),
                    new EsdtTokenPayment({
                        tokenIdentifier: 'EGLD',
                        tokenNonce: 0,
                        amount: '100000000000000000000',
                    }),
                    0.01,
                );

            const transactions =
                await service.createLiquidityPositionSingleToken(
                    Address.Zero().bech32(),
                    Address.fromHex(
                        '0000000000000000000000000000000000000000000000000000000000000012',
                    ).bech32(),
                    new EsdtTokenPayment({
                        tokenIdentifier: 'EGLD',
                        tokenNonce: 0,
                        amount: '100000000000000000000',
                    }),
                    swapRoutes,
                    1440,
                );

            const gasLimit =
                gasConfig.positionCreator.singleToken.liquidityPosition +
                gasConfig.pairs.addLiquidity +
                gasConfig.pairs.swapTokensFixedInput.withFeeSwap *
                    swapRoutes[0].pairs.length;

            expect(transactions).toEqual([
                {
                    nonce: 0,
                    value: '100000000000000000000',
                    receiver:
                        'erd1qqqqqqqqqqqqqpgqh3zcutxk3wmfvevpyymaehvc3k0knyq70n4sg6qcj6',
                    sender: Address.Zero().bech32(),
                    senderUsername: undefined,
                    receiverUsername: undefined,
                    gasPrice: 1000000000,
                    gasLimit: gasLimit,
                    data: encodeTransactionData(
                        `createPairPosFromSingleToken@1440@47008144020574367766@47008144020574367766823`,
                    ),
                    chainID: 'T',
                    version: 2,
                    options: undefined,
                    guardian: undefined,
                    signature: undefined,
                    guardianSignature: undefined,
                },
            ]);
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
                    [],
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
                    [],
                ),
            ).rejects.toThrowError('Invalid farm token payment');
        });

        it('should return transaction with EGLD and no merge farm tokens', async () => {
            const service = module.get<PositionCreatorTransactionService>(
                PositionCreatorTransactionService,
            );
            const posCreatorCompute = module.get<PositionCreatorComputeService>(
                PositionCreatorComputeService,
            );

            const swapRoutes =
                await posCreatorCompute.computeSingleTokenPairInput(
                    Address.fromHex(
                        '0000000000000000000000000000000000000000000000000000000000000012',
                    ).bech32(),
                    new EsdtTokenPayment({
                        tokenIdentifier: 'EGLD',
                        tokenNonce: 0,
                        amount: '100000000000000000000',
                    }),
                    0.01,
                );

            const transactions = await service.createFarmPositionSingleToken(
                Address.Zero().bech32(),
                Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000021',
                ).bech32(),
                [
                    new EsdtTokenPayment({
                        tokenIdentifier: 'EGLD',
                        tokenNonce: 0,
                        amount: '100000000000000000000',
                    }),
                ],
                swapRoutes,
            );

            const gasLimit =
                gasConfig.positionCreator.singleToken.farmPosition +
                gasConfig.pairs.addLiquidity +
                gasConfig.farms[FarmVersion.V2].enterFarm.withTokenMerge +
                gasConfig.pairs.swapTokensFixedInput.withFeeSwap *
                    swapRoutes[0].pairs.length;

            expect(transactions).toEqual([
                {
                    nonce: 0,
                    value: '100000000000000000000',
                    receiver:
                        'erd1qqqqqqqqqqqqqpgqh3zcutxk3wmfvevpyymaehvc3k0knyq70n4sg6qcj6',
                    sender: Address.Zero().bech32(),
                    senderUsername: undefined,
                    receiverUsername: undefined,
                    gasPrice: 1000000000,
                    gasLimit: gasLimit,
                    data: encodeTransactionData(
                        `createFarmPosFromSingleToken@0000000000000000000000000000000000000000000000000000000000000021@47008144020574367766@47008144020574367766823`,
                    ),
                    chainID: 'T',
                    version: 2,
                    options: undefined,
                    guardian: undefined,
                    signature: undefined,
                    guardianSignature: undefined,
                },
            ]);
        });

        it('should return transaction no merge farm tokens', async () => {
            const service = module.get<PositionCreatorTransactionService>(
                PositionCreatorTransactionService,
            );
            const posCreatorCompute = module.get<PositionCreatorComputeService>(
                PositionCreatorComputeService,
            );

            const swapRoutes =
                await posCreatorCompute.computeSingleTokenPairInput(
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

            const transactions = await service.createFarmPositionSingleToken(
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
                swapRoutes,
            );

            const gasLimit =
                gasConfig.positionCreator.singleToken.farmPosition +
                gasConfig.pairs.addLiquidity +
                gasConfig.farms[FarmVersion.V2].enterFarm.withTokenMerge +
                gasConfig.pairs.swapTokensFixedInput.withFeeSwap *
                    (swapRoutes[0].pairs.length + 1);

            expect(transactions).toEqual([
                {
                    nonce: 0,
                    value: '0',
                    receiver:
                        'erd1qqqqqqqqqqqqqpgqh3zcutxk3wmfvevpyymaehvc3k0knyq70n4sg6qcj6',
                    sender: Address.Zero().bech32(),
                    senderUsername: undefined,
                    receiverUsername: undefined,
                    gasPrice: 1000000000,
                    gasLimit: gasLimit,
                    data: encodeTransactionData(
                        `ESDTTransfer@USDC-123456@100000000000000000000@createFarmPosFromSingleToken@0000000000000000000000000000000000000000000000000000000000000021@329339339317295273252@329339339317295273252718@0000000000000000000000000000000000000000000000000000000000000013@swapTokensFixedInput@WEGLD-123456@989999999900702106327`,
                    ),
                    chainID: 'T',
                    version: 2,
                    options: undefined,
                    guardian: undefined,
                    signature: undefined,
                    guardianSignature: undefined,
                },
            ]);
        });

        it('should return transaction with EGLD and merge farm tokens', async () => {
            const service = module.get<PositionCreatorTransactionService>(
                PositionCreatorTransactionService,
            );
            const posCreatorCompute = module.get<PositionCreatorComputeService>(
                PositionCreatorComputeService,
            );

            const swapRoutes =
                await posCreatorCompute.computeSingleTokenPairInput(
                    Address.fromHex(
                        '0000000000000000000000000000000000000000000000000000000000000012',
                    ).bech32(),
                    new EsdtTokenPayment({
                        tokenIdentifier: 'EGLD',
                        tokenNonce: 0,
                        amount: '100000000000000000000',
                    }),
                    0.01,
                );

            const transactions = await service.createFarmPositionSingleToken(
                senderAddress,
                Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000021',
                ).bech32(),
                [
                    new EsdtTokenPayment({
                        tokenIdentifier: 'EGLD',
                        tokenNonce: 0,
                        amount: '100000000000000000000',
                    }),
                    new EsdtTokenPayment({
                        tokenIdentifier: 'EGLDMEXFL-abcdef',
                        tokenNonce: 1,
                        amount: '100000000000000000000',
                    }),
                ],
                swapRoutes,
            );

            const gasLimit =
                gasConfig.positionCreator.singleToken.farmPosition +
                gasConfig.pairs.addLiquidity +
                gasConfig.farms[FarmVersion.V2].enterFarm.withTokenMerge +
                gasConfig.pairs.swapTokensFixedInput.withFeeSwap *
                    swapRoutes[0].pairs.length;

            expect(transactions).toEqual([
                {
                    nonce: 0,
                    value: '100000000000000000000',
                    receiver:
                        'erd1qqqqqqqqqqqqqpgqd77fnev2sthnczp2lnfx0y5jdycynjfhzzgq6p3rax',
                    sender: senderAddress,
                    senderUsername: undefined,
                    receiverUsername: undefined,
                    gasPrice: 1000000000,
                    gasLimit: 4200000,
                    data: encodeTransactionData('wrapEgld'),
                    chainID: 'T',
                    version: 2,
                    options: undefined,
                    guardian: undefined,
                    signature: undefined,
                    guardianSignature: undefined,
                },
                {
                    nonce: 0,
                    value: '0',
                    receiver: senderAddress,
                    sender: senderAddress,
                    senderUsername: undefined,
                    receiverUsername: undefined,
                    gasPrice: 1000000000,
                    gasLimit: gasLimit,
                    data: encodeTransactionData(
                        `MultiESDTNFTTransfer@00000000000000000500bc458e2cd68bb69665812137dcdd988d9f69901e7ceb@02@WEGLD-123456@@100000000000000000000@EGLDMEXFL-abcdef@01@100000000000000000000@createFarmPosFromSingleToken@0000000000000000000000000000000000000000000000000000000000000021@47008144020574367766@47008144020574367766823`,
                    ),
                    chainID: 'T',
                    version: 2,
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
            const posCreatorCompute = module.get<PositionCreatorComputeService>(
                PositionCreatorComputeService,
            );

            const swapRoutes =
                await posCreatorCompute.computeSingleTokenPairInput(
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

            const transactions = await service.createFarmPositionSingleToken(
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
                swapRoutes,
            );

            const gasLimit =
                gasConfig.positionCreator.singleToken.farmPosition +
                gasConfig.pairs.addLiquidity +
                gasConfig.farms[FarmVersion.V2].enterFarm.withTokenMerge +
                gasConfig.pairs.swapTokensFixedInput.withFeeSwap *
                    (swapRoutes[0].pairs.length + 1);

            expect(transactions).toEqual([
                {
                    nonce: 0,
                    value: '0',
                    receiver: Address.Zero().bech32(),
                    sender: Address.Zero().bech32(),
                    senderUsername: undefined,
                    receiverUsername: undefined,
                    gasPrice: 1000000000,
                    gasLimit: gasLimit,
                    data: encodeTransactionData(
                        `MultiESDTNFTTransfer@00000000000000000500bc458e2cd68bb69665812137dcdd988d9f69901e7ceb@02@USDC-123456@@100000000000000000000@EGLDMEXFL-abcdef@01@100000000000000000000@createFarmPosFromSingleToken@0000000000000000000000000000000000000000000000000000000000000021@329339339317295273252@329339339317295273252718@0000000000000000000000000000000000000000000000000000000000000013@swapTokensFixedInput@WEGLD-123456@989999999900702106327`,
                    ),
                    chainID: 'T',
                    version: 2,
                    options: undefined,
                    guardian: undefined,
                    signature: undefined,
                    guardianSignature: undefined,
                },
            ]);
        });
    });

    describe('Create farm position single token with locked token', () => {
        it('should return transaction with ESDT payment', async () => {
            const service = module.get<PositionCreatorTransactionService>(
                PositionCreatorTransactionService,
            );
            const posCreatorCompute = module.get<PositionCreatorComputeService>(
                PositionCreatorComputeService,
            );

            const swapRoutes =
                await posCreatorCompute.computeSingleTokenPairInput(
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

            const transactions = await service.createFarmPositionSingleToken(
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
                swapRoutes,
                1440,
            );

            const gasLimit =
                gasConfig.positionCreator.singleToken.farmPosition +
                gasConfig.pairs.addLiquidity +
                gasConfig.farms[FarmVersion.V2].enterFarm.withTokenMerge +
                gasConfig.pairs.swapTokensFixedInput.withFeeSwap *
                    (swapRoutes[0].pairs.length + 1);

            expect(transactions).toEqual([
                {
                    nonce: 0,
                    value: '0',
                    receiver:
                        'erd1qqqqqqqqqqqqqpgqh3zcutxk3wmfvevpyymaehvc3k0knyq70n4sg6qcj6',
                    sender: Address.Zero().bech32(),
                    senderUsername: undefined,
                    receiverUsername: undefined,
                    gasPrice: 1000000000,
                    gasLimit: gasLimit,
                    data: encodeTransactionData(
                        `ESDTTransfer@USDC-123456@100000000000000000000@createFarmPosFromSingleToken@1440@329339339317295273252@329339339317295273252718@0000000000000000000000000000000000000000000000000000000000000013@swapTokensFixedInput@WEGLD-123456@989999999900702106327`,
                    ),
                    chainID: 'T',
                    version: 2,
                    options: undefined,
                    guardian: undefined,
                    signature: undefined,
                    guardianSignature: undefined,
                },
            ]);
        });

        it('should return transaction with EGLD payment', async () => {
            const service = module.get<PositionCreatorTransactionService>(
                PositionCreatorTransactionService,
            );
            const posCreatorCompute = module.get<PositionCreatorComputeService>(
                PositionCreatorComputeService,
            );

            const swapRoutes =
                await posCreatorCompute.computeSingleTokenPairInput(
                    Address.fromHex(
                        '0000000000000000000000000000000000000000000000000000000000000012',
                    ).bech32(),
                    new EsdtTokenPayment({
                        tokenIdentifier: 'EGLD',
                        tokenNonce: 0,
                        amount: '100000000000000000000',
                    }),
                    0.01,
                );

            const transaction = await service.createFarmPositionSingleToken(
                Address.Zero().bech32(),
                Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000021',
                ).bech32(),
                [
                    new EsdtTokenPayment({
                        tokenIdentifier: 'EGLD',
                        tokenNonce: 0,
                        amount: '100000000000000000000',
                    }),
                ],
                swapRoutes,
                1440,
            );

            const gasLimit =
                gasConfig.positionCreator.singleToken.farmPosition +
                gasConfig.pairs.addLiquidity +
                gasConfig.farms[FarmVersion.V2].enterFarm.withTokenMerge +
                gasConfig.pairs.swapTokensFixedInput.withFeeSwap *
                    swapRoutes[0].pairs.length;

            expect(transaction).toEqual([
                {
                    nonce: 0,
                    value: '100000000000000000000',
                    receiver:
                        'erd1qqqqqqqqqqqqqpgqh3zcutxk3wmfvevpyymaehvc3k0knyq70n4sg6qcj6',
                    sender: Address.Zero().bech32(),
                    senderUsername: undefined,
                    receiverUsername: undefined,
                    gasPrice: 1000000000,
                    gasLimit: gasLimit,
                    data: encodeTransactionData(
                        `createFarmPosFromSingleToken@1440@47008144020574367766@47008144020574367766823`,
                    ),
                    chainID: 'T',
                    version: 2,
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
                    [],
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
                    [],
                ),
            ).rejects.toThrowError('Invalid dual yield token payment');
        });

        it('should return transaction with EGLD no merge dual farm tokens', async () => {
            const service = module.get<PositionCreatorTransactionService>(
                PositionCreatorTransactionService,
            );
            const stakingProxyAbi = module.get<StakingProxyAbiService>(
                StakingProxyAbiService,
            );
            const posCreatorCompute = module.get<PositionCreatorComputeService>(
                PositionCreatorComputeService,
            );

            jest.spyOn(stakingProxyAbi, 'pairAddress').mockResolvedValue(
                Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000012',
                ).bech32(),
            );

            const swapRoutes =
                await posCreatorCompute.computeSingleTokenPairInput(
                    Address.fromHex(
                        '0000000000000000000000000000000000000000000000000000000000000012',
                    ).bech32(),
                    new EsdtTokenPayment({
                        tokenIdentifier: 'EGLD',
                        tokenNonce: 0,
                        amount: '100000000000000000000',
                    }),
                    0.01,
                );

            const transaction = await service.createDualFarmPositionSingleToken(
                Address.Zero().bech32(),
                Address.Zero().bech32(),
                [
                    new EsdtTokenPayment({
                        tokenIdentifier: 'EGLD',
                        tokenNonce: 0,
                        amount: '100000000000000000000',
                    }),
                ],
                swapRoutes,
            );

            const gasLimit =
                gasConfig.positionCreator.singleToken.dualFarmPosition +
                gasConfig.pairs.addLiquidity +
                gasConfig.farms[FarmVersion.V2].enterFarm.withTokenMerge +
                gasConfig.stakeProxy.stakeFarmTokens.withTokenMerge +
                gasConfig.pairs.swapTokensFixedInput.withFeeSwap *
                    swapRoutes[0].pairs.length;

            expect(transaction).toEqual([
                {
                    nonce: 0,
                    value: '100000000000000000000',
                    receiver: scAddress.positionCreator,
                    sender: Address.Zero().bech32(),
                    senderUsername: undefined,
                    receiverUsername: undefined,
                    gasPrice: 1000000000,
                    gasLimit: gasLimit,
                    data: encodeTransactionData(
                        'createMetastakingPosFromSingleToken@0000000000000000000000000000000000000000000000000000000000000000@47008144020574367766@47008144020574367766823',
                    ),
                    chainID: 'T',
                    version: 2,
                    options: undefined,
                    guardian: undefined,
                    signature: undefined,
                    guardianSignature: undefined,
                },
            ]);
        });

        it('should return transaction no merge dual farm tokens', async () => {
            const service = module.get<PositionCreatorTransactionService>(
                PositionCreatorTransactionService,
            );
            const stakingProxyAbi = module.get<StakingProxyAbiService>(
                StakingProxyAbiService,
            );
            const posCreatorCompute = module.get<PositionCreatorComputeService>(
                PositionCreatorComputeService,
            );

            const swapRoutes =
                await posCreatorCompute.computeSingleTokenPairInput(
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
                swapRoutes,
            );

            const gasLimit =
                gasConfig.positionCreator.singleToken.dualFarmPosition +
                gasConfig.pairs.addLiquidity +
                gasConfig.farms[FarmVersion.V2].enterFarm.withTokenMerge +
                gasConfig.stakeProxy.stakeFarmTokens.withTokenMerge +
                gasConfig.pairs.swapTokensFixedInput.withFeeSwap *
                    (swapRoutes[0].pairs.length + 1);

            expect(transaction).toEqual([
                {
                    nonce: 0,
                    value: '0',
                    receiver:
                        'erd1qqqqqqqqqqqqqpgqh3zcutxk3wmfvevpyymaehvc3k0knyq70n4sg6qcj6',
                    sender: Address.Zero().bech32(),
                    senderUsername: undefined,
                    receiverUsername: undefined,
                    gasPrice: 1000000000,
                    gasLimit: gasLimit,
                    data: encodeTransactionData(
                        'ESDTTransfer@USDC-123456@100000000000000000000@createMetastakingPosFromSingleToken@0000000000000000000000000000000000000000000000000000000000000000@329339339317295273252@329339339317295273252718@0000000000000000000000000000000000000000000000000000000000000013@swapTokensFixedInput@WEGLD-123456@989999999900702106327',
                    ),
                    chainID: 'T',
                    version: 2,
                    options: undefined,
                    guardian: undefined,
                    signature: undefined,
                    guardianSignature: undefined,
                },
            ]);
        });

        it('should return transaction with EGLD and merge dual farm tokens', async () => {
            const service = module.get<PositionCreatorTransactionService>(
                PositionCreatorTransactionService,
            );
            const stakingProxyAbi = module.get<StakingProxyAbiService>(
                StakingProxyAbiService,
            );
            const posCreatorCompute = module.get<PositionCreatorComputeService>(
                PositionCreatorComputeService,
            );

            const swapRoutes =
                await posCreatorCompute.computeSingleTokenPairInput(
                    Address.fromHex(
                        '0000000000000000000000000000000000000000000000000000000000000012',
                    ).bech32(),
                    new EsdtTokenPayment({
                        tokenIdentifier: 'EGLD',
                        tokenNonce: 0,
                        amount: '100000000000000000000',
                    }),
                    0.01,
                );

            jest.spyOn(stakingProxyAbi, 'pairAddress').mockResolvedValue(
                Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000012',
                ).bech32(),
            );

            const transaction = await service.createDualFarmPositionSingleToken(
                senderAddress,
                Address.Zero().bech32(),
                [
                    new EsdtTokenPayment({
                        tokenIdentifier: 'EGLD',
                        tokenNonce: 0,
                        amount: '100000000000000000000',
                    }),
                    new EsdtTokenPayment({
                        tokenIdentifier: 'METASTAKE-123456',
                        tokenNonce: 1,
                        amount: '100000000000000000000',
                    }),
                ],
                swapRoutes,
            );

            const gasLimit =
                gasConfig.positionCreator.singleToken.dualFarmPosition +
                gasConfig.pairs.addLiquidity +
                gasConfig.farms[FarmVersion.V2].enterFarm.withTokenMerge +
                gasConfig.stakeProxy.stakeFarmTokens.withTokenMerge +
                gasConfig.pairs.swapTokensFixedInput.withFeeSwap *
                    swapRoutes[0].pairs.length;

            expect(transaction).toEqual([
                {
                    nonce: 0,
                    value: '100000000000000000000',
                    receiver:
                        'erd1qqqqqqqqqqqqqpgqd77fnev2sthnczp2lnfx0y5jdycynjfhzzgq6p3rax',
                    sender: senderAddress,
                    senderUsername: undefined,
                    receiverUsername: undefined,
                    gasPrice: 1000000000,
                    gasLimit: 4200000,
                    data: encodeTransactionData('wrapEgld'),
                    chainID: 'T',
                    version: 2,
                    options: undefined,
                    guardian: undefined,
                    signature: undefined,
                    guardianSignature: undefined,
                },
                {
                    nonce: 0,
                    value: '0',
                    receiver: senderAddress,
                    sender: senderAddress,
                    senderUsername: undefined,
                    receiverUsername: undefined,
                    gasPrice: 1000000000,
                    gasLimit: gasLimit,
                    data: encodeTransactionData(
                        'MultiESDTNFTTransfer@00000000000000000500bc458e2cd68bb69665812137dcdd988d9f69901e7ceb@02@WEGLD-123456@@100000000000000000000@METASTAKE-123456@01@100000000000000000000@createMetastakingPosFromSingleToken@0000000000000000000000000000000000000000000000000000000000000000@47008144020574367766@47008144020574367766823',
                    ),
                    chainID: 'T',
                    version: 2,
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
            const posCreatorCompute = module.get<PositionCreatorComputeService>(
                PositionCreatorComputeService,
            );

            const swapRoutes =
                await posCreatorCompute.computeSingleTokenPairInput(
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
                        tokenIdentifier: 'METASTAKE-123456',
                        tokenNonce: 1,
                        amount: '100000000000000000000',
                    }),
                ],
                swapRoutes,
            );

            const gasLimit =
                gasConfig.positionCreator.singleToken.dualFarmPosition +
                gasConfig.pairs.addLiquidity +
                gasConfig.farms[FarmVersion.V2].enterFarm.withTokenMerge +
                gasConfig.stakeProxy.stakeFarmTokens.withTokenMerge +
                gasConfig.pairs.swapTokensFixedInput.withFeeSwap *
                    (swapRoutes[0].pairs.length + 1);

            expect(transaction).toEqual([
                {
                    nonce: 0,
                    value: '0',
                    receiver: Address.Zero().bech32(),
                    sender: Address.Zero().bech32(),
                    senderUsername: undefined,
                    receiverUsername: undefined,
                    gasPrice: 1000000000,
                    gasLimit: gasLimit,
                    data: encodeTransactionData(
                        'MultiESDTNFTTransfer@00000000000000000500bc458e2cd68bb69665812137dcdd988d9f69901e7ceb@02@USDC-123456@@100000000000000000000@METASTAKE-123456@01@100000000000000000000@createMetastakingPosFromSingleToken@0000000000000000000000000000000000000000000000000000000000000000@329339339317295273252@329339339317295273252718@0000000000000000000000000000000000000000000000000000000000000013@swapTokensFixedInput@WEGLD-123456@989999999900702106327',
                    ),
                    chainID: 'T',
                    version: 2,
                    options: undefined,
                    guardian: undefined,
                    signature: undefined,
                    guardianSignature: undefined,
                },
            ]);
        });

        it('should return transaction with LP token and merge dual farm tokens', async () => {
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
                        tokenIdentifier: 'EGLDMEXLP-abcdef',
                        tokenNonce: 0,
                        amount: '100000000000000000000',
                    }),
                    new EsdtTokenPayment({
                        tokenIdentifier: 'METASTAKE-123456',
                        tokenNonce: 1,
                        amount: '100000000000000000000',
                    }),
                ],
                [],
            );

            const gasLimit =
                gasConfig.positionCreator.singleToken.dualFarmPosition +
                gasConfig.pairs.addLiquidity +
                gasConfig.farms[FarmVersion.V2].enterFarm.withTokenMerge +
                gasConfig.stakeProxy.stakeFarmTokens.withTokenMerge;

            expect(transaction).toEqual([
                {
                    nonce: 0,
                    value: '0',
                    receiver: Address.Zero().bech32(),
                    sender: Address.Zero().bech32(),
                    senderUsername: undefined,
                    receiverUsername: undefined,
                    gasPrice: 1000000000,
                    gasLimit: gasLimit,
                    data: encodeTransactionData(
                        'MultiESDTNFTTransfer@00000000000000000500bc458e2cd68bb69665812137dcdd988d9f69901e7ceb@02@EGLDMEXLP-abcdef@@100000000000000000000@METASTAKE-123456@01@100000000000000000000@createMetastakingPosFromSingleToken@0000000000000000000000000000000000000000000000000000000000000000@@',
                    ),
                    chainID: 'T',
                    version: 2,
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
                    new SwapRouteModel(),
                    [
                        new EsdtTokenPayment({
                            tokenIdentifier: 'USDC-abcdef',
                            tokenNonce: 0,
                            amount: '100000000000000000000',
                        }),
                    ],
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
                    new SwapRouteModel(),
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
                ),
            ).rejects.toThrowError('Invalid staking token payment');
        });

        it('should return transaction with EGLD no merge staking tokens', async () => {
            const service = module.get<PositionCreatorTransactionService>(
                PositionCreatorTransactionService,
            );
            const stakingAbi = module.get<StakingAbiService>(StakingAbiService);
            const posCreatorCompute = module.get<PositionCreatorComputeService>(
                PositionCreatorComputeService,
            );

            jest.spyOn(stakingAbi, 'farmingTokenID').mockResolvedValue(
                'MEX-123456',
            );

            const swapRoutes =
                await posCreatorCompute.computeStakingPositionSingleToken(
                    Address.Zero().bech32(),
                    new EsdtTokenPayment({
                        tokenIdentifier: 'EGLD',
                        tokenNonce: 0,
                        amount: '100000000000000000000',
                    }),
                    0.01,
                );

            const transaction = await service.createStakingPositionSingleToken(
                Address.Zero().bech32(),
                Address.Zero().bech32(),
                swapRoutes.swaps[0],
                [
                    new EsdtTokenPayment({
                        tokenIdentifier: 'EGLD',
                        tokenNonce: 0,
                        amount: '100000000000000000000',
                    }),
                ],
            );

            const gasLimit =
                gasConfig.positionCreator.singleToken.stakingPosition +
                gasConfig.stake.stakeFarm.withTokenMerge +
                gasConfig.pairs.swapTokensFixedInput.withFeeSwap *
                    swapRoutes.swaps.length;

            expect(transaction).toEqual([
                {
                    nonce: 0,
                    value: '100000000000000000000',
                    receiver: scAddress.positionCreator,
                    sender: Address.Zero().bech32(),
                    senderUsername: undefined,
                    receiverUsername: undefined,
                    gasPrice: 1000000000,
                    gasLimit: gasLimit,
                    data: encodeTransactionData(
                        'createFarmStakingPosFromSingleToken@0000000000000000000000000000000000000000000000000000000000000000@90661089388014913158134@0000000000000000000000000000000000000000000000000000000000000012@swapTokensFixedInput@MEX-123456@89754478494134764026552',
                    ),
                    chainID: 'T',
                    version: 2,
                    options: undefined,
                    guardian: undefined,
                    signature: undefined,
                    guardianSignature: undefined,
                },
            ]);
        });

        it('should return transaction no merge staking tokens', async () => {
            const service = module.get<PositionCreatorTransactionService>(
                PositionCreatorTransactionService,
            );
            const posCreatorCompute = module.get<PositionCreatorComputeService>(
                PositionCreatorComputeService,
            );
            const swapRoutes =
                await posCreatorCompute.computeStakingPositionSingleToken(
                    Address.Zero().bech32(),
                    new EsdtTokenPayment({
                        tokenIdentifier: 'USDC-123456',
                        tokenNonce: 0,
                        amount: '100000000000000000000',
                    }),
                    0.01,
                );

            const transaction = await service.createStakingPositionSingleToken(
                Address.Zero().bech32(),
                Address.Zero().bech32(),
                swapRoutes.swaps[0],
                [
                    new EsdtTokenPayment({
                        tokenIdentifier: 'USDC-123456',
                        tokenNonce: 0,
                        amount: '100000000000000000000',
                    }),
                ],
            );

            const gasLimit =
                gasConfig.positionCreator.singleToken.stakingPosition +
                gasConfig.stake.stakeFarm.withTokenMerge +
                gasConfig.pairs.swapTokensFixedInput.withFeeSwap *
                    swapRoutes.swaps.length;

            expect(transaction).toEqual([
                {
                    nonce: 0,
                    value: '0',
                    receiver:
                        'erd1qqqqqqqqqqqqqpgqh3zcutxk3wmfvevpyymaehvc3k0knyq70n4sg6qcj6',
                    sender: Address.Zero().bech32(),
                    senderUsername: undefined,
                    receiverUsername: undefined,
                    gasPrice: 1000000000,
                    gasLimit: gasLimit,
                    data: encodeTransactionData(
                        'ESDTTransfer@USDC-123456@100000000000000000000@createFarmStakingPosFromSingleToken@0000000000000000000000000000000000000000000000000000000000000000@999999999899699097301@0000000000000000000000000000000000000000000000000000000000000013@swapTokensFixedInput@WEGLD-123456@989999999900702106327',
                    ),
                    chainID: 'T',
                    version: 2,
                    options: undefined,
                    guardian: undefined,
                    signature: undefined,
                    guardianSignature: undefined,
                },
            ]);
        });

        it('should return transaction with EGLD and merge staking tokens', async () => {
            const service = module.get<PositionCreatorTransactionService>(
                PositionCreatorTransactionService,
            );
            const stakingAbi = module.get<StakingAbiService>(StakingAbiService);
            const posCreatorCompute = module.get<PositionCreatorComputeService>(
                PositionCreatorComputeService,
            );

            jest.spyOn(stakingAbi, 'farmingTokenID').mockResolvedValue(
                'MEX-123456',
            );

            const swapRoutes =
                await posCreatorCompute.computeStakingPositionSingleToken(
                    Address.Zero().bech32(),
                    new EsdtTokenPayment({
                        tokenIdentifier: 'EGLD',
                        tokenNonce: 0,
                        amount: '100000000000000000000',
                    }),
                    0.01,
                );

            const transaction = await service.createStakingPositionSingleToken(
                senderAddress,
                Address.Zero().bech32(),
                swapRoutes.swaps[0],
                [
                    new EsdtTokenPayment({
                        tokenIdentifier: 'EGLD',
                        tokenNonce: 0,
                        amount: '100000000000000000000',
                    }),
                    new EsdtTokenPayment({
                        tokenIdentifier: 'STAKETOK-111111',
                        tokenNonce: 1,
                        amount: '100000000000000000000',
                    }),
                ],
            );

            const gasLimit =
                gasConfig.positionCreator.singleToken.stakingPosition +
                gasConfig.stake.stakeFarm.withTokenMerge +
                gasConfig.pairs.swapTokensFixedInput.withFeeSwap *
                    swapRoutes.swaps.length;

            expect(transaction).toEqual([
                {
                    nonce: 0,
                    value: '100000000000000000000',
                    receiver:
                        'erd1qqqqqqqqqqqqqpgqd77fnev2sthnczp2lnfx0y5jdycynjfhzzgq6p3rax',
                    sender: senderAddress,
                    senderUsername: undefined,
                    receiverUsername: undefined,
                    gasPrice: 1000000000,
                    gasLimit: 4200000,
                    data: encodeTransactionData('wrapEgld'),
                    chainID: 'T',
                    version: 2,
                    options: undefined,
                    guardian: undefined,
                    signature: undefined,
                    guardianSignature: undefined,
                },
                {
                    nonce: 0,
                    value: '0',
                    receiver: senderAddress,
                    sender: senderAddress,
                    senderUsername: undefined,
                    receiverUsername: undefined,
                    gasPrice: 1000000000,
                    gasLimit: gasLimit,
                    data: encodeTransactionData(
                        'MultiESDTNFTTransfer@00000000000000000500bc458e2cd68bb69665812137dcdd988d9f69901e7ceb@02@WEGLD-123456@@100000000000000000000@STAKETOK-111111@01@100000000000000000000@createFarmStakingPosFromSingleToken@0000000000000000000000000000000000000000000000000000000000000000@90661089388014913158134@0000000000000000000000000000000000000000000000000000000000000012@swapTokensFixedInput@MEX-123456@89754478494134764026552',
                    ),
                    chainID: 'T',
                    version: 2,
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
            const posCreatorCompute = module.get<PositionCreatorComputeService>(
                PositionCreatorComputeService,
            );

            const swapRoutes =
                await posCreatorCompute.computeStakingPositionSingleToken(
                    Address.Zero().bech32(),
                    new EsdtTokenPayment({
                        tokenIdentifier: 'USDC-123456',
                        tokenNonce: 0,
                        amount: '100000000000000000000',
                    }),
                    0.01,
                );

            const transaction = await service.createStakingPositionSingleToken(
                Address.Zero().bech32(),
                Address.Zero().bech32(),
                swapRoutes.swaps[0],
                [
                    new EsdtTokenPayment({
                        tokenIdentifier: 'USDC-123456',
                        tokenNonce: 0,
                        amount: '100000000000000000000',
                    }),
                    new EsdtTokenPayment({
                        tokenIdentifier: 'STAKETOK-111111',
                        tokenNonce: 1,
                        amount: '100000000000000000000',
                    }),
                ],
            );

            const gasLimit =
                gasConfig.positionCreator.singleToken.stakingPosition +
                gasConfig.stake.stakeFarm.withTokenMerge +
                gasConfig.pairs.swapTokensFixedInput.withFeeSwap *
                    swapRoutes.swaps.length;

            expect(transaction).toEqual([
                {
                    nonce: 0,
                    value: '0',
                    receiver: Address.Zero().bech32(),
                    sender: Address.Zero().bech32(),
                    senderUsername: undefined,
                    receiverUsername: undefined,
                    gasPrice: 1000000000,
                    gasLimit: gasLimit,
                    data: encodeTransactionData(
                        'MultiESDTNFTTransfer@00000000000000000500bc458e2cd68bb69665812137dcdd988d9f69901e7ceb@02@USDC-123456@@100000000000000000000@STAKETOK-111111@01@100000000000000000000@createFarmStakingPosFromSingleToken@0000000000000000000000000000000000000000000000000000000000000000@999999999899699097301@0000000000000000000000000000000000000000000000000000000000000013@swapTokensFixedInput@WEGLD-123456@989999999900702106327',
                    ),
                    chainID: 'T',
                    version: 2,
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
            const transactions = await service.createFarmPositionDualTokens(
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

            expect(transactions).toEqual([
                {
                    nonce: 0,
                    value: '0',
                    receiver: Address.Zero().bech32(),
                    sender: Address.Zero().bech32(),
                    senderUsername: undefined,
                    receiverUsername: undefined,
                    gasPrice: 1000000000,
                    gasLimit: gasConfig.positionCreator.dualTokens.farmPosition,
                    data: encodeTransactionData(
                        'MultiESDTNFTTransfer@00000000000000000500bc458e2cd68bb69665812137dcdd988d9f69901e7ceb@02@WEGLD-123456@@100000000000000000000@MEX-123456@@100000000000000000000@createFarmPosFromTwoTokens@0000000000000000000000000000000000000000000000000000000000000021@99000000000000000000@99000000000000000000',
                    ),
                    chainID: 'T',
                    version: 2,
                    options: undefined,
                    guardian: undefined,
                    signature: undefined,
                    guardianSignature: undefined,
                },
            ]);
        });

        it('should return transaction no merge farm tokens', async () => {
            const service = module.get<PositionCreatorTransactionService>(
                PositionCreatorTransactionService,
            );
            const transactions = await service.createFarmPositionDualTokens(
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

            expect(transactions).toEqual([
                {
                    nonce: 0,
                    value: '0',
                    receiver: Address.Zero().bech32(),
                    sender: Address.Zero().bech32(),
                    senderUsername: undefined,
                    receiverUsername: undefined,
                    gasPrice: 1000000000,
                    gasLimit: gasConfig.positionCreator.dualTokens.farmPosition,
                    data: encodeTransactionData(
                        'MultiESDTNFTTransfer@00000000000000000500bc458e2cd68bb69665812137dcdd988d9f69901e7ceb@03@WEGLD-123456@@100000000000000000000@MEX-123456@@100000000000000000000@EGLDMEXFL-abcdef@01@100000000000000000000@createFarmPosFromTwoTokens@0000000000000000000000000000000000000000000000000000000000000021@99000000000000000000@99000000000000000000',
                    ),
                    chainID: 'T',
                    version: 2,
                    options: undefined,
                    guardian: undefined,
                    signature: undefined,
                    guardianSignature: undefined,
                },
            ]);
        });

        it('should return transactions with egld wrap', async () => {
            const service = module.get<PositionCreatorTransactionService>(
                PositionCreatorTransactionService,
            );
            const transactions = await service.createFarmPositionDualTokens(
                senderAddress,
                Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000021',
                ).bech32(),
                [
                    new EsdtTokenPayment({
                        tokenIdentifier: 'EGLD',
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

            expect(transactions).toEqual([
                {
                    nonce: 0,
                    value: '100000000000000000000',
                    receiver:
                        'erd1qqqqqqqqqqqqqpgqd77fnev2sthnczp2lnfx0y5jdycynjfhzzgq6p3rax',
                    sender: senderAddress,
                    senderUsername: undefined,
                    receiverUsername: undefined,
                    gasPrice: 1000000000,
                    gasLimit: 4200000,
                    data: encodeTransactionData('wrapEgld'),
                    chainID: 'T',
                    version: 2,
                    options: undefined,
                    guardian: undefined,
                    signature: undefined,
                    guardianSignature: undefined,
                },
                {
                    nonce: 0,
                    value: '0',
                    receiver: senderAddress,
                    sender: senderAddress,
                    senderUsername: undefined,
                    receiverUsername: undefined,
                    gasPrice: 1000000000,
                    gasLimit: gasConfig.positionCreator.dualTokens.farmPosition,
                    data: encodeTransactionData(
                        'MultiESDTNFTTransfer@00000000000000000500bc458e2cd68bb69665812137dcdd988d9f69901e7ceb@03@WEGLD-123456@@100000000000000000000@MEX-123456@@100000000000000000000@EGLDMEXFL-abcdef@01@100000000000000000000@createFarmPosFromTwoTokens@0000000000000000000000000000000000000000000000000000000000000021@99000000000000000000@99000000000000000000',
                    ),
                    chainID: 'T',
                    version: 2,
                    options: undefined,
                    guardian: undefined,
                    signature: undefined,
                    guardianSignature: undefined,
                },
            ]);
        });
    });

    describe('Create farm position dual token with locked token', () => {
        it('should return error on invalid locked token', async () => {
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
                            tokenIdentifier: 'ELKMEX-123456',
                            tokenNonce: 0,
                            amount: '100000000000000000000',
                        }),
                    ],
                    0.01,
                ),
            ).rejects.toThrowError('Invalid locked tokens payments');

            expect(
                service.createFarmPositionDualTokens(
                    Address.Zero().bech32(),
                    Address.fromHex(
                        '0000000000000000000000000000000000000000000000000000000000000021',
                    ).bech32(),
                    [
                        new EsdtTokenPayment({
                            tokenIdentifier: 'ELKMEX-123456',
                            tokenNonce: 1,
                            amount: '100000000000000000000',
                        }),
                        new EsdtTokenPayment({
                            tokenIdentifier: 'WEGLD-123456',
                            tokenNonce: 1,
                            amount: '100000000000000000000',
                        }),
                    ],
                    0.01,
                ),
            ).rejects.toThrowError('Invalid locked tokens payments');

            expect(
                service.createFarmPositionDualTokens(
                    Address.Zero().bech32(),
                    Address.fromHex(
                        '0000000000000000000000000000000000000000000000000000000000000021',
                    ).bech32(),
                    [
                        new EsdtTokenPayment({
                            tokenIdentifier: 'ELKMEX-123456',
                            tokenNonce: 1,
                            amount: '100000000000000000000',
                        }),
                        new EsdtTokenPayment({
                            tokenIdentifier: 'USDC-123456',
                            tokenNonce: 0,
                            amount: '100000000000000000000',
                        }),
                    ],
                    0.01,
                ),
            ).rejects.toThrowError('Invalid locked tokens payments');
        });

        it('should return error on wrapped farm token', async () => {
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
                            tokenIdentifier: 'ELKMEX-123456',
                            tokenNonce: 1,
                            amount: '100000000000000000000',
                        }),
                        new EsdtTokenPayment({
                            tokenIdentifier: 'WEGLD-123456',
                            tokenNonce: 0,
                            amount: '100000000000000000000',
                        }),
                        new EsdtTokenPayment({
                            tokenIdentifier: 'LKFARM-abcdef',
                            tokenNonce: 0,
                            amount: '100000000000000000000',
                        }),
                    ],
                    0.01,
                ),
            ).rejects.toThrowError('Invalid wrapped farm token payment');
        });

        it('should return transaction without consolidate', async () => {
            const service = module.get<PositionCreatorTransactionService>(
                PositionCreatorTransactionService,
            );
            const transactions = await service.createFarmPositionDualTokens(
                Address.Zero().bech32(),
                Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000021',
                ).bech32(),
                [
                    new EsdtTokenPayment({
                        tokenIdentifier: 'ELKMEX-123456',
                        tokenNonce: 1,
                        amount: '100000000000000000000',
                    }),
                    new EsdtTokenPayment({
                        tokenIdentifier: 'WEGLD-123456',
                        tokenNonce: 0,
                        amount: '100000000000000000000',
                    }),
                ],
                0.01,
            );

            expect(transactions).toEqual([
                {
                    nonce: 0,
                    value: '0',
                    receiver: Address.Zero().bech32(),
                    sender: Address.Zero().bech32(),
                    senderUsername: undefined,
                    receiverUsername: undefined,
                    gasPrice: 1000000000,
                    gasLimit:
                        gasConfig.positionCreator.dualTokens.farmPositionProxy,
                    data: encodeTransactionData(
                        'MultiESDTNFTTransfer@00000000000000000500bc458e2cd68bb69665812137dcdd988d9f69901e7ceb@02@WEGLD-123456@@100000000000000000000@ELKMEX-123456@01@100000000000000000000@createFarmPosFromTwoTokens@99000000000000000000@99000000000000000000',
                    ),
                    chainID: 'T',
                    version: 2,
                    options: undefined,
                    guardian: undefined,
                    signature: undefined,
                    guardianSignature: undefined,
                },
            ]);
        });

        it('should return transaction with consolidate', async () => {
            const service = module.get<PositionCreatorTransactionService>(
                PositionCreatorTransactionService,
            );
            const transactions = await service.createFarmPositionDualTokens(
                Address.Zero().bech32(),
                Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000021',
                ).bech32(),
                [
                    new EsdtTokenPayment({
                        tokenIdentifier: 'ELKMEX-123456',
                        tokenNonce: 1,
                        amount: '100000000000000000000',
                    }),
                    new EsdtTokenPayment({
                        tokenIdentifier: 'WEGLD-123456',
                        tokenNonce: 0,
                        amount: '100000000000000000000',
                    }),
                    new EsdtTokenPayment({
                        tokenIdentifier: 'LKFARM-123456',
                        tokenNonce: 1,
                        amount: '100000000000000000000',
                    }),
                ],
                0.01,
            );

            expect(transactions).toEqual([
                {
                    nonce: 0,
                    value: '0',
                    receiver: Address.Zero().bech32(),
                    sender: Address.Zero().bech32(),
                    senderUsername: undefined,
                    receiverUsername: undefined,
                    gasPrice: 1000000000,
                    gasLimit:
                        gasConfig.positionCreator.dualTokens.farmPositionProxy,
                    data: encodeTransactionData(
                        'MultiESDTNFTTransfer@00000000000000000500bc458e2cd68bb69665812137dcdd988d9f69901e7ceb@03@WEGLD-123456@@100000000000000000000@ELKMEX-123456@01@100000000000000000000@LKFARM-123456@01@100000000000000000000@createFarmPosFromTwoTokens@99000000000000000000@99000000000000000000',
                    ),
                    chainID: 'T',
                    version: 2,
                    options: undefined,
                    guardian: undefined,
                    signature: undefined,
                    guardianSignature: undefined,
                },
            ]);
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

            const transactions = await service.createDualFarmPositionDualTokens(
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

            expect(transactions).toEqual([
                {
                    nonce: 0,
                    value: '0',
                    receiver: Address.Zero().bech32(),
                    sender: Address.Zero().bech32(),
                    senderUsername: undefined,
                    receiverUsername: undefined,
                    gasPrice: 1000000000,
                    gasLimit:
                        gasConfig.positionCreator.dualTokens.dualFarmPosition,
                    data: encodeTransactionData(
                        'MultiESDTNFTTransfer@00000000000000000500bc458e2cd68bb69665812137dcdd988d9f69901e7ceb@02@WEGLD-123456@@100000000000000000000@MEX-123456@@100000000000000000000@createMetastakingPosFromTwoTokens@0000000000000000000000000000000000000000000000000000000000000000@99000000000000000000@99000000000000000000',
                    ),
                    chainID: 'T',
                    version: 2,
                    options: undefined,
                    guardian: undefined,
                    signature: undefined,
                    guardianSignature: undefined,
                },
            ]);
        });

        it('should return transaction with egld wrap', async () => {
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

            const transactions = await service.createDualFarmPositionDualTokens(
                senderAddress,
                Address.Zero().bech32(),
                [
                    new EsdtTokenPayment({
                        tokenIdentifier: 'EGLD',
                        tokenNonce: 0,
                        amount: '100000000000000000000',
                    }),
                    new EsdtTokenPayment({
                        tokenIdentifier: 'MEX-123456',
                        tokenNonce: 0,
                        amount: '100000000000000000000',
                    }),
                    new EsdtTokenPayment({
                        tokenIdentifier: 'METASTAKE-123456',
                        tokenNonce: 1,
                        amount: '100000000000000000000',
                    }),
                ],
                0.01,
            );

            expect(transactions).toEqual([
                {
                    nonce: 0,
                    value: '100000000000000000000',
                    receiver:
                        'erd1qqqqqqqqqqqqqpgqd77fnev2sthnczp2lnfx0y5jdycynjfhzzgq6p3rax',
                    sender: senderAddress,
                    senderUsername: undefined,
                    receiverUsername: undefined,
                    gasPrice: 1000000000,
                    gasLimit: 4200000,
                    data: encodeTransactionData('wrapEgld'),
                    chainID: 'T',
                    version: 2,
                    options: undefined,
                    guardian: undefined,
                    signature: undefined,
                    guardianSignature: undefined,
                },
                {
                    nonce: 0,
                    value: '0',
                    receiver: senderAddress,
                    sender: senderAddress,
                    senderUsername: undefined,
                    receiverUsername: undefined,
                    gasPrice: 1000000000,
                    gasLimit:
                        gasConfig.positionCreator.dualTokens.dualFarmPosition,
                    data: encodeTransactionData(
                        'MultiESDTNFTTransfer@00000000000000000500bc458e2cd68bb69665812137dcdd988d9f69901e7ceb@03@WEGLD-123456@@100000000000000000000@MEX-123456@@100000000000000000000@METASTAKE-123456@01@100000000000000000000@createMetastakingPosFromTwoTokens@0000000000000000000000000000000000000000000000000000000000000000@99000000000000000000@99000000000000000000',
                    ),
                    chainID: 'T',
                    version: 2,
                    options: undefined,
                    guardian: undefined,
                    signature: undefined,
                    guardianSignature: undefined,
                },
            ]);
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

            const transactions = await service.createDualFarmPositionDualTokens(
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
                        tokenIdentifier: 'METASTAKE-123456',
                        tokenNonce: 1,
                        amount: '100000000000000000000',
                    }),
                ],
                0.01,
            );

            expect(transactions).toEqual([
                {
                    nonce: 0,
                    value: '0',
                    receiver: Address.Zero().bech32(),
                    sender: Address.Zero().bech32(),
                    senderUsername: undefined,
                    receiverUsername: undefined,
                    gasPrice: 1000000000,
                    gasLimit:
                        gasConfig.positionCreator.dualTokens.dualFarmPosition,
                    data: encodeTransactionData(
                        'MultiESDTNFTTransfer@00000000000000000500bc458e2cd68bb69665812137dcdd988d9f69901e7ceb@03@WEGLD-123456@@100000000000000000000@MEX-123456@@100000000000000000000@METASTAKE-123456@01@100000000000000000000@createMetastakingPosFromTwoTokens@0000000000000000000000000000000000000000000000000000000000000000@99000000000000000000@99000000000000000000',
                    ),
                    chainID: 'T',
                    version: 2,
                    options: undefined,
                    guardian: undefined,
                    signature: undefined,
                    guardianSignature: undefined,
                },
            ]);
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
                gasLimit: gasConfig.positionCreator.dualTokens.exitFarm,
                data: encodeTransactionData(
                    'ESDTNFTTransfer@EGLDMEXFL-abcdef@01@100000000000000000000@00000000000000000500bc458e2cd68bb69665812137dcdd988d9f69901e7ceb@exitFarmPos@0000000000000000000000000000000000000000000000000000000000000021@99000000000000000000@99000000000000000000000',
                ),
                chainID: 'T',
                version: 2,
                options: undefined,
                guardian: undefined,
                signature: undefined,
                guardianSignature: undefined,
            });
        });
    });

    describe('Energy position creator', () => {
        it('should return error on invalid ESDT payment', async () => {
            const service = module.get<PositionCreatorTransactionService>(
                PositionCreatorTransactionService,
            );

            expect(
                service.createEnergyPosition(
                    Address.Zero().bech32(),
                    new EsdtTokenPayment({
                        tokenIdentifier: 'WEGLD-abcdef',
                        tokenNonce: 0,
                        amount: '1000000000000000000',
                    }),
                    new SwapRouteModel(),
                    1440,
                ),
            ).rejects.toThrowError('Invalid ESDT token payment');
        });

        it('should return transaction with ESDT payment', async () => {
            const service = module.get<PositionCreatorTransactionService>(
                PositionCreatorTransactionService,
            );
            const posCreatorCompute = module.get<PositionCreatorComputeService>(
                PositionCreatorComputeService,
            );

            const swapRoute = await posCreatorCompute.computeSingleTokenInput(
                new EsdtTokenPayment({
                    tokenIdentifier: 'WEGLD-123456',
                    tokenNonce: 0,
                    amount: '1000000000000000000',
                }),
                constantsConfig.MEX_TOKEN_ID,
                0.01,
            );

            const transactions = await service.createEnergyPosition(
                Address.Zero().bech32(),
                new EsdtTokenPayment({
                    tokenIdentifier: 'WEGLD-123456',
                    tokenNonce: 0,
                    amount: '1000000000000000000',
                }),
                swapRoute,
                1440,
            );

            expect(transactions).toEqual([
                {
                    chainID: 'T',
                    data: encodeTransactionData(
                        'ESDTTransfer@WEGLD-123456@1000000000000000000@createEnergyPosition@1440@986046911229504184328@0000000000000000000000000000000000000000000000000000000000000012@swapTokensFixedInput@MEX-123456@986046911229504184328',
                    ),
                    gasLimit: 43000000,
                    gasPrice: 1000000000,
                    guardian: undefined,
                    guardianSignature: undefined,
                    nonce: 0,
                    options: undefined,
                    receiver:
                        'erd1qqqqqqqqqqqqqpgqh3zcutxk3wmfvevpyymaehvc3k0knyq70n4sg6qcj6',
                    receiverUsername: undefined,
                    sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
                    senderUsername: undefined,
                    signature: undefined,
                    value: '0',
                    version: 2,
                },
            ]);
        });

        it('should return transaction with EGLD payment', async () => {
            const service = module.get<PositionCreatorTransactionService>(
                PositionCreatorTransactionService,
            );
            const posCreatorCompute = module.get<PositionCreatorComputeService>(
                PositionCreatorComputeService,
            );
            const swapRoute = await posCreatorCompute.computeSingleTokenInput(
                new EsdtTokenPayment({
                    tokenIdentifier: 'EGLD',
                    tokenNonce: 0,
                    amount: '1000000000000000000',
                }),
                constantsConfig.MEX_TOKEN_ID,
                0.01,
            );

            const transactions = await service.createEnergyPosition(
                Address.Zero().bech32(),
                new EsdtTokenPayment({
                    tokenIdentifier: 'EGLD',
                    tokenNonce: 0,
                    amount: '1000000000000000000',
                }),
                swapRoute,
                1440,
            );

            expect(transactions).toEqual([
                {
                    chainID: 'T',
                    data: encodeTransactionData(
                        'createEnergyPosition@1440@986046911229504184328@0000000000000000000000000000000000000000000000000000000000000012@swapTokensFixedInput@MEX-123456@986046911229504184328',
                    ),
                    gasLimit: 43000000,
                    gasPrice: 1000000000,
                    guardian: undefined,
                    guardianSignature: undefined,
                    nonce: 0,
                    options: undefined,
                    receiver:
                        'erd1qqqqqqqqqqqqqpgqh3zcutxk3wmfvevpyymaehvc3k0knyq70n4sg6qcj6',
                    receiverUsername: undefined,
                    sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
                    senderUsername: undefined,
                    signature: undefined,
                    value: '1000000000000000000',
                    version: 2,
                },
            ]);
        });
    });
});
