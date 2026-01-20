import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { FarmModelV2 } from 'src/modules/farm/models/farm.v2.model';
import { FarmAbiServiceV2 } from 'src/modules/farm/v2/services/farm.v2.abi.service';
import { FarmComputeServiceV2 } from 'src/modules/farm/v2/services/farm.v2.compute.service';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { farmType } from 'src/utils/farm.utils';
import { WeeklyRewardsSyncService } from './weekly-rewards.sync.service';

@Injectable()
export class FarmsSyncService {
    constructor(
        private readonly farmAbiV2: FarmAbiServiceV2,
        @Inject(forwardRef(() => FarmComputeServiceV2))
        private readonly farmComputeV2: FarmComputeServiceV2,
        private readonly apiService: MXApiService,
        private readonly weeklyRewardsUtils: WeeklyRewardsSyncService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async populateFarm(address: string): Promise<FarmModelV2> {
        const profiler = new PerformanceProfiler();

        const [
            farmingTokenId,
            farmedTokenId,
            farmTokenCollection,
            perBlockRewards,
            penaltyPercent,
            minimumFarmingEpochs,
            divisionSafetyConstant,
            state,
            burnGasLimit,
            boostedYieldsRewardsPercenatage,
            boostedYieldsFactors,
            lockingScAddress,
            lockEpochs,
            energyFactoryAddress,
            pairAddress,
            time,
        ] = await Promise.all([
            this.farmAbiV2.getFarmingTokenIDRaw(address),
            this.farmAbiV2.getFarmedTokenIDRaw(address),
            this.farmAbiV2.getFarmTokenIDRaw(address),
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
            this.farmAbiV2.getPairContractAddressRaw(address),
            this.weeklyRewardsUtils.getWeekTimekeeping(address),
        ]);

        const [farmTokenMetadata, reservesAndRewards] = await Promise.all([
            this.apiService.getNftCollection(farmTokenCollection),
            this.getReservesAndRewards(address, time.currentWeek),
        ]);

        const farm = new FarmModelV2({
            address,
            farmingTokenId,
            farmedTokenId,
            farmTokenCollection,
            farmTokenDecimals: farmTokenMetadata.decimals,
            pairAddress,
            perBlockRewards,
            penaltyPercent,
            minimumFarmingEpochs,
            divisionSafetyConstant,
            state,
            burnGasLimit,
            boostedYieldsRewardsPercenatage,
            boostedYieldsFactors,
            lockingScAddress,
            lockEpochs: lockEpochs.toString(),
            energyFactoryAddress,
            rewardType: farmType(address),
            time,
            ...reservesAndRewards,
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

    async getReservesAndRewards(
        address: string,
        currentWeek: number,
    ): Promise<Partial<FarmModelV2>> {
        const [
            farmTokenSupply,
            lastRewardBlockNonce,
            rewardPerShare,
            rewardReserve,
            produceRewardsEnabled,
            farmTokenSupplyCurrentWeek,
            accumulatedRewards,
            undistributedBoostedRewards,
            lastGlobalUpdateWeek,
            boosterRewards,
        ] = await Promise.all([
            this.farmAbiV2.getFarmTokenSupplyRaw(address),
            this.farmAbiV2.getLastRewardBlockNonceRaw(address),
            this.farmAbiV2.getRewardPerShareRaw(address),
            this.farmAbiV2.getRewardReserveRaw(address),
            this.farmAbiV2.getProduceRewardsEnabledRaw(address),

            this.farmAbiV2.getFarmSupplyForWeekRaw(address, currentWeek),
            this.farmAbiV2.getAccumulatedRewardsForWeekRaw(
                address,
                currentWeek,
            ),
            this.farmComputeV2.undistributedBoostedRewardsRaw(
                address,
                currentWeek,
            ),
            this.weeklyRewardsUtils.getLastGlobalUpdateWeek(address),
            this.weeklyRewardsUtils.getGlobalInfoWeeklyModels(
                address,
                currentWeek,
            ),
        ]);

        const farm: Partial<FarmModelV2> = {
            farmTokenSupply,
            lastRewardBlockNonce,
            rewardPerShare,
            rewardReserve,
            produceRewardsEnabled,
            farmTokenSupplyCurrentWeek,
            accumulatedRewards,
            undistributedBoostedRewards: undistributedBoostedRewards
                .integerValue()
                .toFixed(),
            lastGlobalUpdateWeek,
            boosterRewards,
        };

        return farm;
    }
}
