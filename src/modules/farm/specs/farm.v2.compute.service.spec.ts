import { BigNumber } from 'bignumber.js';
import { Test, TestingModule } from '@nestjs/testing';
import { FarmComputeServiceV2 } from '../v2/services/farm.v2.compute.service';
import { CommonAppModule } from '../../../common.app.module';
import { CachingModule } from '../../../services/caching/cache.module';
import { FarmAbiServiceProviderV2 } from '../mocks/farm.v2.abi.service.mock';
import { FarmServiceV2 } from '../v2/services/farm.v2.service';
import { MXDataApiServiceProvider } from '../../../services/multiversx-communication/mx.data.api.service.mock';
import { WrapAbiServiceProvider } from '../../wrapping/mocks/wrap.abi.service.mock';
import { RouterAbiServiceProvider } from '../../router/mocks/router.abi.service.mock';
import { TokenComputeService } from '../../tokens/services/token.compute.service';
import { TokenGetterServiceProvider } from '../../tokens/mocks/token.getter.service.mock';
import { PairComputeServiceProvider } from '../../pair/mocks/pair.compute.service.mock';
import { PairAbiServiceProvider } from '../../pair/mocks/pair.abi.service.mock';
import { PairService } from '../../pair/services/pair.service';
import { ContextGetterServiceProvider } from '../../../services/context/mocks/context.getter.service.mock';
import { MXApiServiceProvider } from '../../../services/multiversx-communication/mx.api.service.mock';
import {
    WeekTimekeepingAbiServiceProvider,
} from '../../../submodules/week-timekeeping/mocks/week.timekeeping.abi.service.mock';
import {
    WeekTimekeepingComputeService,
} from '../../../submodules/week-timekeeping/services/week-timekeeping.compute.service';
import {
    WeeklyRewardsSplittingAbiServiceProvider,
} from '../../../submodules/weekly-rewards-splitting/mocks/weekly.rewards.splitting.abi.mock';
import {
    WeeklyRewardsSplittingComputeService,
} from '../../../submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.compute.service';
import { EnergyAbiServiceProvider } from '../../energy/mocks/energy.abi.service.mock';

describe('FarmServiceV2', () => {
    let module: TestingModule;

    beforeEach(async () => {
        module = await Test.createTestingModule({
            imports: [CommonAppModule, CachingModule],
            providers: [
                MXApiServiceProvider,
                ContextGetterServiceProvider,
                PairService,
                PairAbiServiceProvider,
                PairComputeServiceProvider,
                TokenGetterServiceProvider,
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
            ],
        }).compile();
    });
    it("should correctly calculate total rewards", async () => {
        const service = module.get<FarmComputeServiceV2>(
            FarmComputeServiceV2,
        );
        const result = await service.computeUndistributedBoostedRewards('erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye', 10);
        const expectedTotal = new BigNumber('5000').plus('4000').integerValue().toFixed(); // 4 weeks * 1000
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
});

