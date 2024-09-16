import { BigNumber } from 'bignumber.js';
import { Test, TestingModule } from '@nestjs/testing';
import { FarmComputeServiceV2 } from '../v2/services/farm.v2.compute.service';
import { FarmAbiServiceProviderV2 } from '../mocks/farm.v2.abi.service.mock';
import { FarmServiceV2 } from '../v2/services/farm.v2.service';
import { MXDataApiServiceProvider } from '../../../services/multiversx-communication/mx.data.api.service.mock';
import { WrapAbiServiceProvider } from '../../wrapping/mocks/wrap.abi.service.mock';
import { RouterAbiServiceProvider } from '../../router/mocks/router.abi.service.mock';
import { TokenComputeService } from '../../tokens/services/token.compute.service';
import { TokenServiceProvider } from '../../tokens/mocks/token.service.mock';
import { PairComputeServiceProvider } from '../../pair/mocks/pair.compute.service.mock';
import { PairAbiServiceProvider } from '../../pair/mocks/pair.abi.service.mock';
import { PairService } from '../../pair/services/pair.service';
import { ContextGetterServiceProvider } from '../../../services/context/mocks/context.getter.service.mock';
import { MXApiServiceProvider } from '../../../services/multiversx-communication/mx.api.service.mock';
import { WeekTimekeepingAbiServiceProvider } from '../../../submodules/week-timekeeping/mocks/week.timekeeping.abi.service.mock';
import { WeekTimekeepingComputeService } from '../../../submodules/week-timekeeping/services/week-timekeeping.compute.service';
import { WeeklyRewardsSplittingAbiServiceProvider } from '../../../submodules/weekly-rewards-splitting/mocks/weekly.rewards.splitting.abi.mock';
import { WeeklyRewardsSplittingComputeService } from '../../../submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.compute.service';
import { EnergyAbiServiceProvider } from '../../energy/mocks/energy.abi.service.mock';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { ApiConfigService } from 'src/helpers/api.config.service';
import winston from 'winston';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { AnalyticsQueryServiceProvider } from 'src/services/analytics/mocks/analytics.query.service.mock';
import { WeeklyRewardsSplittingAbiService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service';
import { FarmAbiServiceV2 } from '../v2/services/farm.v2.abi.service';
import { Address } from '@multiversx/sdk-core/out';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { ElasticSearchModule } from 'src/services/elastic-search/elastic.search.module';
import { EsdtTokenPayment } from 'src/models/esdtTokenPayment.model';

describe('FarmServiceV2', () => {
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
                MXApiServiceProvider,
                ContextGetterServiceProvider,
                PairService,
                PairAbiServiceProvider,
                PairComputeServiceProvider,
                TokenServiceProvider,
                TokenComputeService,
                RouterAbiServiceProvider,
                WrapAbiServiceProvider,
                MXDataApiServiceProvider,
                WeekTimekeepingAbiServiceProvider,
                WeekTimekeepingComputeService,
                WeeklyRewardsSplittingAbiServiceProvider,
                EnergyAbiServiceProvider,
                WeeklyRewardsSplittingComputeService,
                FarmComputeServiceV2,
                FarmAbiServiceProviderV2,
                FarmServiceV2,
                AnalyticsQueryServiceProvider,
                ApiConfigService,
            ],
        }).compile();
    });
    it('should correctly calculate total rewards', async () => {
        const service = module.get<FarmComputeServiceV2>(FarmComputeServiceV2);
        const result = await service.undistributedBoostedRewards(
            'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
            10,
        );
        const expectedTotal = new BigNumber('5000')
            .plus('4000')
            .integerValue()
            .toFixed(); // 4 weeks * 1000
        expect(result).toEqual(expectedTotal);
        // expect(mockFarmAbi.undistributedBoostedRewards).toHaveBeenCalled();
        // expect(mockFarmAbi.lastUndistributedBoostedRewardsCollectWeek).toHaveBeenCalled();
        // expect(mockFarmAbi.remainingBoostedRewardsToDistribute).toHaveBeenCalledTimes(4);
    });
    // it("should return undistributedBoostedRewards if firstWeek > lastWeek", async () => {
    //     const service = module.get<FarmComputeServiceV2>(
    //         FarmComputeServiceV2,
    //     );
    //     const result = await service.computeUndistributedBoostedRewards('erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye', 5);
    //     expect(result).toEqual('5000');
    //     // expect(mockFarmAbi.undistributedBoostedRewards).toHaveBeenCalled();
    //     // expect(mockFarmAbi.lastUndistributedBoostedRewardsCollectWeek).toHaveBeenCalled();
    // }, 10000);

    it('should compute blocks in week', async () => {
        const service = module.get<FarmComputeServiceV2>(FarmComputeServiceV2);
        const contextGetter =
            module.get<ContextGetterService>(ContextGetterService);
        jest.spyOn(contextGetter, 'getCurrentEpoch').mockResolvedValue(256);

        const blocksInWeek = await service.computeBlocksInWeek(
            Address.fromBech32(
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqpqsdtp6mh',
            ).bech32(),
            1,
        );

        expect(blocksInWeek).toEqual(10 * 60 * 24 * 7);
    });

    it('should compute user accumulated rewards', async () => {
        const service = module.get<FarmComputeServiceV2>(FarmComputeServiceV2);
        const farmAbi = module.get<FarmAbiServiceV2>(FarmAbiServiceV2);
        const weeklyRewardsSplittingAbi =
            module.get<WeeklyRewardsSplittingAbiService>(
                WeeklyRewardsSplittingAbiService,
            );
        const contextGetter =
            module.get<ContextGetterService>(ContextGetterService);

        jest.spyOn(contextGetter, 'getCurrentEpoch').mockResolvedValue(256);
        jest.spyOn(
            weeklyRewardsSplittingAbi,
            'totalEnergyForWeek',
        ).mockResolvedValue('1440');
        jest.spyOn(
            weeklyRewardsSplittingAbi,
            'userEnergyForWeek',
        ).mockResolvedValue({
            amount: '1440',
            totalLockedTokens: '1',
            lastUpdateEpoch: 256,
        });
        jest.spyOn(
            weeklyRewardsSplittingAbi,
            'totalRewardsForWeek',
        ).mockResolvedValue([
            new EsdtTokenPayment({
                tokenID: 'MEX-123456',
                nonce: 0,
                amount: '60480000000000000000000',
            }),
        ]);
        jest.spyOn(farmAbi, 'farmTokenSupply').mockResolvedValue('2');
        jest.spyOn(farmAbi, 'rewardsPerBlock').mockResolvedValue(
            '1000000000000000000',
        );
        jest.spyOn(farmAbi, 'userTotalFarmPosition').mockResolvedValue('2');

        const accumulatedRewards = await service.computeUserRewardsForWeek(
            Address.fromBech32(
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqpqsdtp6mh',
            ).bech32(),
            Address.Zero().bech32(),
            1,
        );

        expect(accumulatedRewards).toEqual('60480000000000000000000');
    });
});
