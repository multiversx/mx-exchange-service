import { Inject, Injectable } from '@nestjs/common';
import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { StakingModel } from 'src/modules/staking/models/staking.model';
import { StakingProxyModel } from 'src/modules/staking-proxy/models/staking.proxy.model';
import { StakingAbiService } from 'src/modules/staking/services/staking.abi.service';
import { StakingComputeService } from 'src/modules/staking/services/staking.compute.service';
import { StakingProxyAbiService } from 'src/modules/staking-proxy/services/staking.proxy.abi.service';
import { WeekTimekeepingAbiService } from 'src/submodules/week-timekeeping/services/week-timekeeping.abi.service';
import { WeekTimekeepingModel } from 'src/submodules/week-timekeeping/models/week-timekeeping.model';
import { WeeklyRewardsSplittingAbiService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { WeeklyRewardsSyncService } from './weekly-rewards.sync.service';

@Injectable()
export class StakingSyncService {
    constructor(
        private readonly stakingAbi: StakingAbiService,
        private readonly stakingCompute: StakingComputeService,
        private readonly stakingProxyAbi: StakingProxyAbiService,
        private readonly weekTimekeepingAbi: WeekTimekeepingAbiService,
        private readonly weeklyRewardsSplittingAbi: WeeklyRewardsSplittingAbiService,
        private readonly apiService: MXApiService,
        private readonly weeklyRewardsUtils: WeeklyRewardsSyncService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async populateStakingFarm(address: string): Promise<StakingModel> {
        const profiler = new PerformanceProfiler();

        const [
            farmTokenCollection,
            farmingTokenId,
            rewardTokenId,
            farmTokenSupply,
            rewardPerShare,
            accumulatedRewards,
            rewardCapacity,
            annualPercentageRewards,
            perBlockRewards,
            minUnboundEpochs,
            lastRewardBlockNonce,
            divisionSafetyConstant,
            produceRewardsEnabled,
            lockedAssetFactoryManagedAddress,
            state,
            boostedYieldsRewardsPercentage,
            boostedYieldsFactors,
            energyFactoryAddress,
            stakingPositionMigrationNonce,
            deployedAt,
            currentWeek,
            firstWeekStartEpoch,
            lastGlobalUpdateWeek,
        ] = await Promise.all([
            this.stakingAbi.getFarmTokenIDRaw(address),
            this.stakingAbi.getFarmingTokenIDRaw(address),
            this.stakingAbi.getRewardTokenIDRaw(address),
            this.stakingAbi.getFarmTokenSupplyRaw(address),
            this.stakingAbi.getRewardPerShareRaw(address),
            this.stakingAbi.getAccumulatedRewardsRaw(address),
            this.stakingAbi.getRewardCapacityRaw(address),
            this.stakingAbi.getAnnualPercentageRewardsRaw(address),
            this.stakingAbi.getPerBlockRewardsAmountRaw(address),
            this.stakingAbi.getMinUnbondEpochsRaw(address),
            this.stakingAbi.getLastRewardBlockNonceRaw(address),
            this.stakingAbi.getDivisionSafetyConstantRaw(address),
            this.stakingAbi.getProduceRewardsEnabledRaw(address),
            this.stakingAbi.getLockedAssetFactoryAddressRaw(address),
            this.stakingAbi.getStateRaw(address),
            this.stakingAbi.getBoostedYieldsRewardsPercenatageRaw(address),
            this.stakingAbi.getBoostedYieldsFactorsRaw(address),
            this.stakingAbi.getEnergyFactoryAddressRaw(address),
            this.stakingAbi.getFarmPositionMigrationNonceRaw(address),
            this.stakingCompute.computeDeployedAt(address),
            this.weekTimekeepingAbi.getCurrentWeekRaw(address),
            this.weekTimekeepingAbi.firstWeekStartEpochRaw(address),
            this.weeklyRewardsSplittingAbi.lastGlobalUpdateWeekRaw(address),
        ]);

        const [
            boosterRewards,
            farmTokenMetadata,
            farmTokenSupplyCurrentWeek,
            accumulatedRewardsForWeek,
            undistributedBoostedRewards,
        ] = await Promise.all([
            this.weeklyRewardsUtils.getGlobalInfoWeeklyModels(
                address,
                currentWeek,
            ),
            this.apiService.getNftCollection(farmTokenCollection),
            this.stakingAbi.getFarmSupplyForWeekRaw(address, currentWeek),
            this.stakingAbi.getAccumulatedRewardsForWeekRaw(
                address,
                currentWeek,
            ),
            this.stakingCompute.undistributedBoostedRewardsRaw(
                address,
                currentWeek,
            ),
        ]);

        const stakingFarm = new StakingModel({
            address,
            farmTokenCollection,
            farmTokenDecimals: farmTokenMetadata.decimals,
            farmingTokenId,
            rewardTokenId,
            farmTokenSupply,
            rewardPerShare,
            accumulatedRewards,
            rewardCapacity,
            annualPercentageRewards,
            minUnboundEpochs,
            perBlockRewards,
            lastRewardBlockNonce,
            divisionSafetyConstant: divisionSafetyConstant.toString(),
            produceRewardsEnabled,
            lockedAssetFactoryManagedAddress,
            state,
            boostedYieldsRewardsPercenatage: boostedYieldsRewardsPercentage,
            boostedYieldsFactors,
            time: new WeekTimekeepingModel({
                currentWeek,
                firstWeekStartEpoch,
            }),
            boosterRewards,
            lastGlobalUpdateWeek,
            farmTokenSupplyCurrentWeek,
            energyFactoryAddress,
            accumulatedRewardsForWeek,
            undistributedBoostedRewards: undistributedBoostedRewards
                .integerValue()
                .toFixed(),
            stakingPositionMigrationNonce,
            deployedAt,
        });

        profiler.stop();
        this.logger.debug(
            `${this.populateStakingFarm.name} : ${profiler.duration}ms`,
            {
                context: StakingSyncService.name,
                address,
                tokens: [farmingTokenId, rewardTokenId, farmTokenCollection],
            },
        );

        return stakingFarm;
    }

    async populateStakingProxy(address: string): Promise<StakingProxyModel> {
        const profiler = new PerformanceProfiler();

        const [
            lpFarmAddress,
            stakingFarmAddress,
            pairAddress,
            stakingTokenId,
            farmTokenCollection,
            dualYieldTokenCollection,
            lpFarmTokenCollection,
        ] = await Promise.all([
            this.stakingProxyAbi.getlpFarmAddressRaw(address),
            this.stakingProxyAbi.getStakingFarmAddressRaw(address),
            this.stakingProxyAbi.getPairAddressRaw(address),
            this.stakingProxyAbi.getStakingTokenIDRaw(address),
            this.stakingProxyAbi.getFarmTokenIDRaw(address),
            this.stakingProxyAbi.getDualYieldTokenIDRaw(address),
            this.stakingProxyAbi.getLpFarmTokenIDRaw(address),
        ]);

        const stakingProxy = new StakingProxyModel({
            address,
            lpFarmAddress,
            stakingFarmAddress,
            pairAddress,
            stakingTokenId,
            farmTokenCollection,
            dualYieldTokenCollection,
            lpFarmTokenCollection,
        });

        profiler.stop();
        this.logger.debug(
            `${this.populateStakingProxy.name} : ${profiler.duration}ms`,
            {
                context: StakingSyncService.name,
                address,
            },
        );

        return stakingProxy;
    }
}
