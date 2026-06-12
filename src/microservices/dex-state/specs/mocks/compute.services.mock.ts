import { FarmModelV2 } from 'src/modules/farm/models/farm.v2.model';
import { StakingModel } from 'src/modules/staking/models/staking.model';
import { FeesCollectorModel } from 'src/modules/fees-collector/models/fees-collector.model';
import { FarmComputeService } from '../../services/compute/farm.compute.service';
import { StakingComputeService } from '../../services/compute/staking.compute.service';
import { FeesCollectorComputeService } from '../../services/compute/fees-collector.compute.service';

/**
 * Mock FarmComputeService for testing state handlers
 */
export class MockFarmComputeService {
    computeMissingFarmFields(farm: FarmModelV2): FarmModelV2 {
        return {
            ...farm,
            // Computed price fields
            farmedTokenPriceUSD: farm.farmedTokenPriceUSD ?? '0.001',
            farmingTokenPriceUSD: farm.farmingTokenPriceUSD ?? '20',
            farmTokenPriceUSD: farm.farmTokenPriceUSD ?? '20',
            // Computed value fields
            totalValueLockedUSD: farm.totalValueLockedUSD ?? '1000000',
            // Computed APR fields
            baseApr: farm.baseApr ?? '50',
            boostedApr: farm.boostedApr ?? '100',
            // Computed energy/boost fields
            optimalEnergyPerLp: farm.optimalEnergyPerLp ?? '1000000000000000000',
            boostedRewardsPerWeek: farm.boostedRewardsPerWeek ?? '1000000000000000000000',
        };
    }
}

/**
 * Mock StakingComputeService for testing state handlers
 */
export class MockStakingComputeService {
    computeMissingStakingFarmFields(stakingFarm: StakingModel): StakingModel {
        return {
            ...stakingFarm,
            // Computed price fields
            farmingTokenPriceUSD: stakingFarm.farmingTokenPriceUSD ?? '1',
            // Computed value fields
            stakedValueUSD: stakingFarm.stakedValueUSD ?? '1000000',
            // Computed APR fields
            apr: stakingFarm.apr ?? '25',
            aprUncapped: stakingFarm.aprUncapped ?? '25',
            baseApr: stakingFarm.baseApr ?? '25',
            boostedApr: stakingFarm.boostedApr ?? '50',
            maxBoostedApr: stakingFarm.maxBoostedApr ?? '100',
            // Computed rewards fields
            rewardsRemainingDays: stakingFarm.rewardsRemainingDays ?? 365,
            rewardsRemainingDaysUncapped: stakingFarm.rewardsRemainingDaysUncapped ?? 365,
            // Computed energy fields
            optimalEnergyPerStaking: stakingFarm.optimalEnergyPerStaking ?? '1000000000000000000',
        };
    }
}

/**
 * Mock FeesCollectorComputeService for testing state handlers
 */
export class MockFeesCollectorComputeService {
    computeMissingFeesCollectorFields(feesCollector: FeesCollectorModel): FeesCollectorModel {
        // FeesCollectorComputeService primarily recomputes weekly epochs and distributions
        // For testing, we just return the input with minimal changes
        return {
            ...feesCollector,
            // Most fields are already present, compute service refreshes weekly data
            lastGlobalUpdateWeek: feesCollector.lastGlobalUpdateWeek ?? feesCollector.time?.currentWeek ?? 1,
        };
    }
}

/**
 * Provider for MockFarmComputeService (NestJS DI pattern)
 */
export const MockFarmComputeServiceProvider = {
    provide: FarmComputeService,
    useClass: MockFarmComputeService,
};

/**
 * Provider for MockStakingComputeService (NestJS DI pattern)
 */
export const MockStakingComputeServiceProvider = {
    provide: StakingComputeService,
    useClass: MockStakingComputeService,
};

/**
 * Provider for MockFeesCollectorComputeService (NestJS DI pattern)
 */
export const MockFeesCollectorComputeServiceProvider = {
    provide: FeesCollectorComputeService,
    useClass: MockFeesCollectorComputeService,
};
