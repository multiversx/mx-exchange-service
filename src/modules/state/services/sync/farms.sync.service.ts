import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { FarmModel } from 'src/modules/farm/models/farm.v2.model';
import { FarmAbiServiceV2 } from 'src/modules/farm/v2/services/farm.v2.abi.service';
import { FarmComputeServiceV2 } from 'src/modules/farm/v2/services/farm.v2.compute.service';
import { WeekTimekeepingAbiService } from 'src/submodules/week-timekeeping/services/week-timekeeping.abi.service';
import { WeekTimekeepingModel } from 'src/submodules/week-timekeeping/models/week-timekeeping.model';
import { WeeklyRewardsSplittingAbiService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { farmType } from 'src/utils/farm.utils';
import { WeeklyRewardsSyncService } from './weekly-rewards.sync.service';

@Injectable()
export class FarmsSyncService {
    constructor(
        private readonly farmAbiV2: FarmAbiServiceV2,
        @Inject(forwardRef(() => FarmComputeServiceV2))
        private readonly farmComputeV2: FarmComputeServiceV2,
        private readonly weekTimekeepingAbi: WeekTimekeepingAbiService,
        private readonly weeklyRewardsSplittingAbi: WeeklyRewardsSplittingAbiService,
        private readonly apiService: MXApiService,
        private readonly weeklyRewardsUtils: WeeklyRewardsSyncService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async populateFarm(address: string): Promise<FarmModel> {
        const profiler = new PerformanceProfiler();

        const [
            farmingTokenId,
            farmedTokenId,
            farmTokenCollection,
            produceRewardsEnabled,
            perBlockRewards,
            penaltyPercent,
            minimumFarmingEpochs,
            divisionSafetyConstant,
            state,
            burnGasLimit,
            boostedYieldsRewardsPercentage,
            boostedYieldsFactors,
            lockingScAddress,
            lockEpochs,
            energyFactoryAddress,
            farmTokenSupply,
            lastRewardBlockNonce,
            rewardPerShare,
            rewardReserve,
            pairAddress,
            lastGlobalUpdateWeek,
            currentWeek,
            firstWeekStartEpoch,
        ] = await Promise.all([
            this.farmAbiV2.getFarmingTokenIDRaw(address),
            this.farmAbiV2.getFarmedTokenIDRaw(address),
            this.farmAbiV2.getFarmTokenIDRaw(address),
            this.farmAbiV2.getProduceRewardsEnabledRaw(address),
            this.farmAbiV2.getRewardsPerBlockRaw(address),
            this.farmAbiV2.getPenaltyPercentRaw(address),
            this.farmAbiV2.getMinimumFarmingEpochsRaw(address),
            this.farmAbiV2.getDivisionSafetyConstantRaw(address),
            this.farmAbiV2.getStateRaw(address),
            this.farmAbiV2.getBurnGasLimitRaw(address),
            this.farmAbiV2.getBoostedYieldsRewardsPercenatageRaw(address),
            this.farmAbiV2.getBoostedYieldsFactorsRaw(address),
            this.farmAbiV2.getLockingScAddressRaw(address),
            this.farmAbiV2.getLockEpochsRaw(address),
            this.farmAbiV2.getEnergyFactoryAddressRaw(address),
            this.farmAbiV2.getFarmTokenSupplyRaw(address),
            this.farmAbiV2.getLastRewardBlockNonceRaw(address),
            this.farmAbiV2.getRewardPerShareRaw(address),
            this.farmAbiV2.getRewardReserveRaw(address),
            this.farmAbiV2.getPairContractAddressRaw(address),
            this.weeklyRewardsSplittingAbi.lastGlobalUpdateWeekRaw(address),
            this.weekTimekeepingAbi.getCurrentWeekRaw(address),
            this.weekTimekeepingAbi.firstWeekStartEpochRaw(address),
        ]);

        const [
            boosterRewards,
            farmTokenMetadata,
            farmTokenSupplyCurrentWeek,
            accumulatedRewards,
            undistributedBoostedRewards,
        ] = await Promise.all([
            this.weeklyRewardsUtils.getGlobalInfoWeeklyModels(
                address,
                currentWeek,
            ),
            this.apiService.getNftCollection(farmTokenCollection),
            this.farmAbiV2.getFarmSupplyForWeekRaw(address, currentWeek),
            this.farmAbiV2.getAccumulatedRewardsForWeekRaw(
                address,
                currentWeek,
            ),
            this.farmComputeV2.undistributedBoostedRewardsRaw(
                address,
                currentWeek,
            ),
        ]);

        const farm = new FarmModel({
            address,
            farmingTokenId,
            farmedTokenId,
            farmTokenCollection,
            farmTokenDecimals: farmTokenMetadata.decimals,
            farmTokenSupply,
            farmTokenSupplyCurrentWeek,
            pairAddress,
            lastRewardBlockNonce,
            rewardPerShare,
            rewardReserve,
            boosterRewards,
            produceRewardsEnabled,
            perBlockRewards,
            penaltyPercent,
            minimumFarmingEpochs,
            divisionSafetyConstant,
            state,
            burnGasLimit,
            boostedYieldsRewardsPercenatage: boostedYieldsRewardsPercentage,
            boostedYieldsFactors,
            lockingScAddress,
            lockEpochs: lockEpochs.toString(),
            energyFactoryAddress,
            rewardType: farmType(address),
            time: new WeekTimekeepingModel({
                currentWeek,
                firstWeekStartEpoch,
            }),
            lastGlobalUpdateWeek,
            accumulatedRewards,
            undistributedBoostedRewards: undistributedBoostedRewards
                .integerValue()
                .toFixed(),
        });

        profiler.stop();
        this.logger.debug(
            `${this.populateFarm.name} : ${profiler.duration}ms`,
            {
                context: FarmsSyncService.name,
                address,
                tokens: [farmingTokenId, farmedTokenId, farmTokenCollection],
            },
        );

        return farm;
    }
}
