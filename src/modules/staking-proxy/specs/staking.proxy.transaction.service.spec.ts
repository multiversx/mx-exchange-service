import { Test, TestingModule } from '@nestjs/testing';
import { StakingProxyTransactionService } from '../services/staking.proxy.transactions.service';
import { StakingProxyService } from '../services/staking.proxy.service';
import { PairService } from 'src/modules/pair/services/pair.service';
import { MXProxyServiceProvider } from 'src/services/multiversx-communication/mx.proxy.service.mock';
import { MXApiServiceProvider } from 'src/services/multiversx-communication/mx.api.service.mock';
import { WrapAbiServiceProvider } from 'src/modules/wrapping/mocks/wrap.abi.service.mock';
import { StakingProxyAbiServiceProvider } from '../mocks/staking.proxy.abi.service.mock';
import { FarmFactoryService } from 'src/modules/farm/farm.factory';
import { FarmServiceV1_2 } from 'src/modules/farm/v1.2/services/farm.v1.2.service';
import { FarmServiceV1_3 } from 'src/modules/farm/v1.3/services/farm.v1.3.service';
import { FarmServiceV2 } from 'src/modules/farm/v2/services/farm.v2.service';
import { FarmComputeServiceV1_2 } from 'src/modules/farm/v1.2/services/farm.v1.2.compute.service';
import { FarmComputeServiceV1_3 } from 'src/modules/farm/v1.3/services/farm.v1.3.compute.service';
import { FarmAbiServiceV2 } from 'src/modules/farm/v2/services/farm.v2.abi.service';
import { FarmAbiServiceMock } from 'src/modules/farm/mocks/farm.abi.service.mock';
import { FarmComputeServiceV2 } from 'src/modules/farm/v2/services/farm.v2.compute.service';
import { ContextGetterServiceProvider } from 'src/services/context/mocks/context.getter.service.mock';
import { WeekTimekeepingAbiServiceProvider } from 'src/submodules/week-timekeeping/mocks/week.timekeeping.abi.service.mock';
import { WeeklyRewardsSplittingAbiServiceProvider } from 'src/submodules/weekly-rewards-splitting/mocks/weekly.rewards.splitting.abi.mock';
import { TokenServiceProvider } from 'src/modules/tokens/mocks/token.service.mock';
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
import { PairAbiServiceProvider } from 'src/modules/pair/mocks/pair.abi.service.mock';
import { PairComputeServiceProvider } from 'src/modules/pair/mocks/pair.compute.service.mock';
import { FarmAbiServiceProviderV1_2 } from 'src/modules/farm/mocks/farm.v1.2.abi.service.mock';
import { FarmAbiServiceProviderV1_3 } from 'src/modules/farm/mocks/farm.v1.3.abi.service.mock';
import { WeeklyRewardsSplittingComputeService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.compute.service';
import { EnergyAbiServiceProvider } from 'src/modules/energy/mocks/energy.abi.service.mock';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { ApiConfigService } from 'src/helpers/api.config.service';
import winston from 'winston';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { AnalyticsQueryServiceProvider } from 'src/services/analytics/mocks/analytics.query.service.mock';
import { ElasticSearchModule } from 'src/services/elastic-search/elastic.search.module';
import { StakingProxyFilteringService } from '../services/staking.proxy.filtering.service';

describe('StakingProxyTransactionService', () => {
    let module: TestingModule;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [
                WinstonModule.forRoot({
                    transports: [new winston.transports.Console({})],
                }),
                ConfigModule.forRoot({}),
                DynamicModuleUtils.getCacheModule(),
                ElasticSearchModule,
            ],
            providers: [
                StakingProxyTransactionService,
                StakingProxyAbiServiceProvider,
                StakingProxyService,
                {
                    provide: StakingService,
                    useClass: StakingServiceMock,
                },
                StakingProxyFilteringService,
                PairService,
                PairAbiServiceProvider,
                PairComputeServiceProvider,
                RouterAbiServiceProvider,
                WrapAbiServiceProvider,
                FarmFactoryService,
                FarmServiceV1_2,
                FarmServiceV1_3,
                FarmServiceV2,
                FarmComputeServiceV1_2,
                FarmComputeServiceV1_3,
                FarmComputeServiceV2,
                FarmAbiServiceProviderV1_2,
                FarmAbiServiceProviderV1_3,
                {
                    provide: FarmAbiServiceV2,
                    useClass: FarmAbiServiceMock,
                },
                ContextGetterServiceProvider,
                WeekTimekeepingAbiServiceProvider,
                WeekTimekeepingComputeService,
                WeeklyRewardsSplittingAbiServiceProvider,
                WeeklyRewardsSplittingComputeService,
                EnergyAbiServiceProvider,
                TokenServiceProvider,
                TokenComputeService,
                MXProxyServiceProvider,
                MXApiServiceProvider,
                MXDataApiServiceProvider,
                RemoteConfigGetterServiceProvider,
                AnalyticsQueryServiceProvider,
                ApiConfigService,
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
                        tokenID: 'EGLDTOK4FL-abcdef',
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
                    `MultiESDTNFTTransfer@${Address.Zero().bech32()}@01@EGLDTOK4FL-abcdef@01@1@stakeFarmTokens`,
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
                        tokenID: 'EGLDTOK4FL-abcdef',
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
                    `MultiESDTNFTTransfer@${Address.Zero().bech32()}@02@EGLDTOK4FL-abcdef@01@1@METASTAKE-1234@01@1@stakeFarmTokens`,
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
                            tokenID: 'EGLDTOK4FL-abcdef',
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
