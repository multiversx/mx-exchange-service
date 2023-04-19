import { Test, TestingModule } from '@nestjs/testing';
import { PairService } from '../../pair/services/pair.service';
import { AbiFarmServiceMock } from '../mocks/abi.farm.service.mock';
import { MXApiService } from '../../../services/multiversx-communication/mx.api.service';
import { MXApiServiceMock } from '../../../services/multiversx-communication/mx.api.service.mock';
import { CommonAppModule } from '../../../common.app.module';
import { CachingModule } from '../../../services/caching/cache.module';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { PairGetterServiceStub } from 'src/modules/pair/mocks/pair-getter-service-stub.service';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { ContextGetterServiceMock } from 'src/services/context/mocks/context.getter.service.mock';
import { TokenGetterServiceProvider } from 'src/modules/tokens/mocks/token.getter.service.mock';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { RouterGetterServiceProvider } from 'src/modules/router/mocks/router.getter.service.stub';
import { Address } from '@multiversx/sdk-core';
import { FarmServiceV1_2 } from '../v1.2/services/farm.v1.2.service';
import { FarmAbiServiceV1_2 } from '../v1.2/services/farm.v1.2.abi.service';
import { FarmGetterServiceV1_2 } from '../v1.2/services/farm.v1.2.getter.service';
import { FarmGetterServiceMockV1_2 } from '../mocks/farm.v1.2.getter.service.mock';
import { FarmComputeServiceV1_2 } from '../v1.2/services/farm.v1.2.compute.service';
import { FarmServiceV1_3 } from '../v1.3/services/farm.v1.3.service';
import { FarmComputeServiceV1_3 } from '../v1.3/services/farm.v1.3.compute.service';
import { FarmGetterServiceV1_3 } from '../v1.3/services/farm.v1.3.getter.service';
import { FarmGetterServiceMockV1_3 } from '../mocks/farm.v1.3.getter.service.mock';
import { FarmAbiServiceV1_3 } from '../v1.3/services/farm.v1.3.abi.service';
import { FarmFactoryService } from '../farm.factory';
import { FarmGetterFactory } from '../farm.getter.factory';
import { FarmServiceV2 } from '../v2/services/farm.v2.service';
import { FarmGetterServiceV2 } from '../v2/services/farm.v2.getter.service';
import { FarmGetterServiceMock } from '../mocks/farm.getter.service.mock';
import { FarmAbiServiceV2 } from '../v2/services/farm.v2.abi.service';
import { FarmComputeServiceV2 } from '../v2/services/farm.v2.compute.service';
import { FarmGetterService } from '../base-module/services/farm.getter.service';
import { RewardsModel } from '../models/farm.model';
import { WeekTimekeepingComputeService } from '../../../submodules/week-timekeeping/services/week-timekeeping.compute.service';
import { ProgressComputeService } from '../../../submodules/weekly-rewards-splitting/services/progress.compute.service';
import { ProgressComputeServiceMock } from '../../../submodules/weekly-rewards-splitting/mocks/progress.compute.service.mock';
import { MXDataApiServiceProvider } from 'src/services/multiversx-communication/mx.data.api.service.mock';
import { WrapAbiServiceProvider } from 'src/modules/wrapping/mocks/wrap.abi.service.mock';
import { WeekTimekeepingAbiServiceProvider } from 'src/submodules/week-timekeeping/mocks/week.timekeeping.abi.service.mock';

describe('FarmService', () => {
    let factory: FarmFactoryService;
    let getter: FarmGetterFactory;
    let serviceV1_2: FarmServiceV1_2;
    let serviceV1_3: FarmServiceV1_3;

    const AbiFarmServiceProviderV1_2 = {
        provide: FarmAbiServiceV1_2,
        useClass: AbiFarmServiceMock,
    };

    const FarmGetterServiceProviderV1_2 = {
        provide: FarmGetterServiceV1_2,
        useClass: FarmGetterServiceMockV1_2,
    };

    const AbiFarmServiceProviderV1_3 = {
        provide: FarmAbiServiceV1_3,
        useClass: AbiFarmServiceMock,
    };

    const FarmGetterServiceProviderV1_3 = {
        provide: FarmGetterServiceV1_3,
        useClass: FarmGetterServiceMockV1_3,
    };

    const MXApiServiceProvider = {
        provide: MXApiService,
        useClass: MXApiServiceMock,
    };

    const ContextGetterServiceProvider = {
        provide: ContextGetterService,
        useClass: ContextGetterServiceMock,
    };

    const PairGetterServiceProvider = {
        provide: PairGetterService,
        useClass: PairGetterServiceStub,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [CommonAppModule, CachingModule],
            providers: [
                FarmFactoryService,
                FarmGetterFactory,
                {
                    provide: FarmGetterService,
                    useClass: FarmGetterServiceMock,
                },
                AbiFarmServiceProviderV1_2,
                FarmGetterServiceProviderV1_2,
                FarmComputeServiceV1_2,
                AbiFarmServiceProviderV1_3,
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
                MXApiServiceProvider,
                ContextGetterServiceProvider,
                RouterGetterServiceProvider,
                TokenGetterServiceProvider,
                PairService,
                PairGetterServiceProvider,
                PairComputeService,
                WrapAbiServiceProvider,
                TokenGetterServiceProvider,
                TokenComputeService,
                FarmServiceV1_2,
                FarmServiceV1_3,
                FarmServiceV2,
                WeekTimekeepingComputeService,
                WeekTimekeepingAbiServiceProvider,
                {
                    provide: ProgressComputeService,
                    useValue: new ProgressComputeServiceMock({}),
                },
                MXDataApiServiceProvider,
            ],
        }).compile();

        factory = module.get<FarmFactoryService>(FarmFactoryService);
        getter = module.get<FarmGetterFactory>(FarmGetterFactory);
        serviceV1_2 = module.get<FarmServiceV1_2>(FarmServiceV1_2);
        serviceV1_3 = module.get<FarmServiceV1_3>(FarmServiceV1_3);
    });

    it('should be defined', () => {
        expect(serviceV1_2).toBeDefined();
    });

    it('should get rewards with locked rewards', async () => {
        const attributes =
            'AAAABwc+9Mqu1tkAAAAAAAAAAQAAAAAAAAABAgEAAAAIiscjBInoAAAAAAAAAAAACQEVjkYJE9AAAA==';
        const identifier = 'MEXFARM-abcd-01';
        const liquidity = '2000000000000000000';
        const rewards = await serviceV1_2.getRewardsForPosition({
            farmAddress:
                'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
            identifier: identifier,
            attributes: attributes,
            liquidity: liquidity,
            vmQuery: true,
            user: Address.Zero().bech32(),
        });

        expect(rewards).toEqual(
            new RewardsModel({
                identifier: 'MEXFARM-abcd-01',
                remainingFarmingEpochs: 3,
                rewards: '1000000000000000000',
            }),
        );
    });

    it('should get farms', async () => {
        const farms = factory.getFarms();
        expect(farms).toEqual([
            {
                address:
                    'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
                rewardType: undefined,
                version: 'v1.2',
            },
            {
                address: 'farm_address_2',
                rewardType: 'unlockedRewards',
                version: 'v1.3',
            },
            {
                address: 'farm_address_3',
                rewardType: 'lockedRewards',
                version: 'v1.3',
            },
            {
                address:
                    'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u',
                rewardType: 'customRewards',
                version: 'v1.3',
            },
        ]);
    });

    it('should check if farm token', async () => {
        const isFarmToken_0 = await getter.isFarmToken('TOK1TOK9LPStaked');
        expect(isFarmToken_0).toEqual(false);

        const isFarmToken_1 = await getter.isFarmToken('TOK1TOK4LPStaked');
        expect(isFarmToken_1).toEqual(true);
    });

    it('should get farm address by farm token ID', async () => {
        const farmAddress = await getter.getFarmAddressByFarmTokenID(
            'TOK1TOK4LPStaked',
        );
        expect(farmAddress).toEqual(
            'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
        );
    });

    it('should get batch rewards for position', async () => {
        const batchRewardsForPosition =
            await serviceV1_3.getBatchRewardsForPosition([
                {
                    farmAddress:
                        'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u',
                    liquidity: '1000000000000000',
                    identifier: 'EGLDMEXFL-a329b6-0b',
                    attributes:
                        'AAAAAAAAAAAAAAQVAAAAAAAABBUAAAAIEW8LcTY8qMwAAAAAAAAACBFvC3E2PKjM',
                    vmQuery: false,
                    user: Address.Zero().bech32(),
                },
            ]);

        expect(batchRewardsForPosition).toEqual([
            new RewardsModel({
                identifier: 'EGLDMEXFL-a329b6-0b',
                remainingFarmingEpochs: 1047,
                rewards: '110000000000000000100000000000',
            }),
        ]);
    });

    it('should get tokens for exit farm', async () => {
        const tokensForExitFarm = await serviceV1_3.getTokensForExitFarm({
            farmAddress:
                'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u',
            liquidity: '1000000000000000',
            identifier: 'EGLDMEXFL-a329b6-0b',
            attributes:
                'AAAAAAAAAAAAAAQVAAAAAAAABBUAAAAIEW8LcTY8qMwAAAAAAAAACBFvC3E2PKjM',
            vmQuery: false,
            user: Address.Zero().bech32(),
        });
        expect(tokensForExitFarm).toEqual({
            farmingTokens: '999000000000000',
            rewards: '110000000000000000100000000000',
        });
    });

    it('should get tokens for exit farm', async () => {
        const tokensForExitFarm = serviceV1_3.decodeFarmTokenAttributes(
            'EGLDMEXFL-a329b6-0b',
            'AAAAAAAAAAAAAAQVAAAAAAAABBUAAAAIEW8LcTY8qMwAAAAAAAAACBFvC3E2PKjM',
        );
        expect(tokensForExitFarm).toEqual({
            attributes:
                'AAAAAAAAAAAAAAQVAAAAAAAABBUAAAAIEW8LcTY8qMwAAAAAAAAACBFvC3E2PKjM',
            compoundedReward: '0',
            currentFarmAmount: '1256235401928812748',
            enteringEpoch: 1045,
            identifier: 'EGLDMEXFL-a329b6-0b',
            initialFarmingAmount: '1256235401928812748',
            originalEnteringEpoch: 1045,
            rewardPerShare: '0',
        });
    });
});
