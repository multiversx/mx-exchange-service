import { Test, TestingModule } from '@nestjs/testing';
import { StakingProxyTransactionService } from '../services/staking.proxy.transactions.service';
import { StakingProxyService } from '../services/staking.proxy.service';
import { PairService } from 'src/modules/pair/services/pair.service';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { PairGetterServiceMock } from 'src/modules/pair/mocks/pair-getter-service-mock.service';
import { MXProxyServiceProvider } from 'src/services/multiversx-communication/mx.proxy.service.mock';
import { MXApiServiceProvider } from 'src/services/multiversx-communication/mx.api.service.mock';
import { WrapAbiServiceProvider } from 'src/modules/wrapping/mocks/wrap.abi.service.mock';
import { CommonAppModule } from 'src/common.app.module';
import { CachingModule } from 'src/services/caching/cache.module';
import { StakingProxyAbiServiceProvider } from '../mocks/staking.proxy.abi.service.mock';
import { FarmFactoryService } from 'src/modules/farm/farm.factory';
import { FarmServiceV1_2 } from 'src/modules/farm/v1.2/services/farm.v1.2.service';
import { FarmServiceV1_3 } from 'src/modules/farm/v1.3/services/farm.v1.3.service';
import { FarmServiceV2 } from 'src/modules/farm/v2/services/farm.v2.service';
import { FarmGetterService } from 'src/modules/farm/base-module/services/farm.getter.service';
import { FarmGetterServiceMock } from 'src/modules/farm/mocks/farm.getter.service.mock';
import {
    FarmGetterServiceMockV1_2,
    FarmGetterServiceProviderV1_2,
} from 'src/modules/farm/mocks/farm.v1.2.getter.service.mock';
import { FarmComputeServiceV1_2 } from 'src/modules/farm/v1.2/services/farm.v1.2.compute.service';
import { FarmGetterServiceProviderV1_3 } from 'src/modules/farm/mocks/farm.v1.3.getter.service.mock';
import { FarmComputeServiceV1_3 } from 'src/modules/farm/v1.3/services/farm.v1.3.compute.service';
import { FarmAbiServiceV2 } from 'src/modules/farm/v2/services/farm.v2.abi.service';
import { AbiFarmServiceMock } from 'src/modules/farm/mocks/abi.farm.service.mock';
import { FarmGetterServiceV2 } from 'src/modules/farm/v2/services/farm.v2.getter.service';
import { FarmComputeServiceV2 } from 'src/modules/farm/v2/services/farm.v2.compute.service';
import { FarmGetterServiceV1_2 } from 'src/modules/farm/v1.2/services/farm.v1.2.getter.service';
import { FarmAbiServiceV1_3 } from 'src/modules/farm/v1.3/services/farm.v1.3.abi.service';
import { FarmAbiServiceV1_2 } from 'src/modules/farm/v1.2/services/farm.v1.2.abi.service';
import { ContextGetterServiceProvider } from 'src/services/context/mocks/context.getter.service.mock';
import { WeekTimekeepingAbiServiceProvider } from 'src/submodules/week-timekeeping/mocks/week.timekeeping.abi.service.mock';
import { WeeklyRewardsSplittingAbiServiceProvider } from 'src/submodules/weekly-rewards-splitting/mocks/weekly.rewards.splitting.abi.mock';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';
import { TokenGetterServiceProvider } from 'src/modules/tokens/mocks/token.getter.service.mock';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { MXDataApiServiceProvider } from 'src/services/multiversx-communication/mx.data.api.service.mock';
import { WeekTimekeepingComputeService } from 'src/submodules/week-timekeeping/services/week-timekeeping.compute.service';
import { StakingService } from 'src/modules/staking/services/staking.service';
import { RemoteConfigGetterServiceProvider } from 'src/modules/remote-config/mocks/remote-config.getter.mock';
import { StakingServiceMock } from 'src/modules/staking/mocks/staking.service.mock';
import { Address } from '@multiversx/sdk-core/out';
import { TransactionModel } from 'src/models/transaction.model';
import { gasConfig, mxConfig } from 'src/config';
import { encodeTransactionData } from 'src/helpers/helpers';
import { RouterAbiServiceProvider } from 'src/modules/router/mocks/router.abi.service.mock';

describe('StakingProxyTransactionService', () => {
    let module: TestingModule;

    beforeEach(async () => {
        module = await Test.createTestingModule({
            imports: [CommonAppModule, CachingModule],
            providers: [
                StakingProxyTransactionService,
                StakingProxyAbiServiceProvider,
                StakingProxyService,
                {
                    provide: StakingService,
                    useClass: StakingServiceMock,
                },
                PairService,
                {
                    provide: PairGetterService,
                    useClass: PairGetterServiceMock,
                },
                PairComputeService,
                RouterAbiServiceProvider,
                WrapAbiServiceProvider,
                FarmFactoryService,
                FarmServiceV1_2,
                FarmServiceV1_3,
                FarmServiceV2,
                {
                    provide: FarmGetterService,
                    useClass: FarmGetterServiceMock,
                },
                {
                    provide: FarmGetterServiceV1_2,
                    useClass: FarmGetterServiceMockV1_2,
                },
                FarmGetterServiceProviderV1_2,
                FarmComputeServiceV1_2,
                {
                    provide: FarmAbiServiceV1_2,
                    useClass: AbiFarmServiceMock,
                },
                {
                    provide: FarmAbiServiceV1_3,
                    useClass: AbiFarmServiceMock,
                },
                FarmGetterServiceProviderV1_3,
                FarmComputeServiceV1_3,
                {
                    provide: FarmAbiServiceV2,
                    useClass: AbiFarmServiceMock,
                },
                {
                    provide: FarmGetterServiceV2,
                    useClass: FarmGetterServiceMock,
                },
                FarmComputeServiceV2,
                ContextGetterServiceProvider,
                WeekTimekeepingAbiServiceProvider,
                WeekTimekeepingComputeService,
                WeeklyRewardsSplittingAbiServiceProvider,
                TokenGetterServiceProvider,
                TokenComputeService,
                MXProxyServiceProvider,
                MXApiServiceProvider,
                MXDataApiServiceProvider,
                RemoteConfigGetterServiceProvider,
            ],
        }).compile();
    });

    it('should be defined', () => {
        const service = module.get<StakingProxyTransactionService>(
            StakingProxyTransactionService,
        );
        expect(service).toBeDefined();
    });

    it('stake farm tokens transaction' + ' without merge tokens', async () => {
        const service = module.get<StakingProxyTransactionService>(
            StakingProxyTransactionService,
        );

        const transaction = await service.stakeFarmTokens(
            Address.Zero().bech32(),
            {
                proxyStakingAddress: Address.Zero().bech32(),
                payments: [
                    {
                        tokenID: 'TOK1TOK4LPStaked',
                        nonce: 1,
                        amount: '1',
                    },
                ],
            },
        );

        expect(transaction).toEqual(
            new TransactionModel({
                chainID: mxConfig.chainID,
                nonce: 0,
                gasLimit: gasConfig.stakeProxy.stakeFarmTokens.default,
                gasPrice: 1000000000,
                value: '0',
                sender: Address.Zero().bech32(),
                receiver: Address.Zero().bech32(),
                data: encodeTransactionData(
                    `MultiESDTNFTTransfer@${Address.Zero().bech32()}@01@TOK1TOK4LPStaked@01@1@stakeFarmTokens`,
                ),
                options: undefined,
                signature: undefined,
                version: 1,
            }),
        );
    });

    it('stake farm tokens transaction' + ' with merge tokens', async () => {
        const service = module.get<StakingProxyTransactionService>(
            StakingProxyTransactionService,
        );

        const transaction = await service.stakeFarmTokens(
            Address.Zero().bech32(),
            {
                proxyStakingAddress: Address.Zero().bech32(),
                payments: [
                    {
                        tokenID: 'TOK1TOK4LPStaked',
                        nonce: 1,
                        amount: '1',
                    },
                    {
                        tokenID: 'METASTAKE-1234',
                        nonce: 1,
                        amount: '1',
                    },
                ],
            },
        );

        expect(transaction).toEqual(
            new TransactionModel({
                chainID: mxConfig.chainID,
                nonce: 0,
                gasLimit: gasConfig.stakeProxy.stakeFarmTokens.withTokenMerge,
                gasPrice: 1000000000,
                value: '0',
                sender: Address.Zero().bech32(),
                receiver: Address.Zero().bech32(),
                data: encodeTransactionData(
                    `MultiESDTNFTTransfer@${Address.Zero().bech32()}@02@TOK1TOK4LPStaked@01@1@METASTAKE-1234@01@1@stakeFarmTokens`,
                ),
                options: undefined,
                signature: undefined,
                version: 1,
            }),
        );
    });

    it('stake farm tokens transaction' + ' invalid lp farm token', async () => {
        const service = module.get<StakingProxyTransactionService>(
            StakingProxyTransactionService,
        );

        try {
            await service.stakeFarmTokens(Address.Zero().bech32(), {
                proxyStakingAddress: Address.Zero().bech32(),
                payments: [
                    {
                        tokenID: 'TOK2TOK4LPStaked',
                        nonce: 1,
                        amount: '1',
                    },
                ],
            });
        } catch (error) {
            expect(error).toEqual(new Error('invalid lp farm token provided'));
        }
    });

    it(
        'stake farm tokens transaction' + ' invalid dual yield token',
        async () => {
            const service = module.get<StakingProxyTransactionService>(
                StakingProxyTransactionService,
            );

            try {
                await service.stakeFarmTokens(Address.Zero().bech32(), {
                    proxyStakingAddress: Address.Zero().bech32(),
                    payments: [
                        {
                            tokenID: 'TOK1TOK4LPStaked',
                            nonce: 1,
                            amount: '1',
                        },
                        {
                            tokenID: 'METASTAKE-abcdef',
                            nonce: 1,
                            amount: '1',
                        },
                    ],
                });
            } catch (error) {
                expect(error).toEqual(
                    new Error('invalid dual yield token provided'),
                );
            }
        },
    );
});
