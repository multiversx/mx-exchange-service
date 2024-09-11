import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { StakingFarmsFilter } from '../models/staking.args';
import { StakingService } from './staking.service';

@Injectable()
export class StakingFilteringService {
    constructor(
        @Inject(forwardRef(() => StakingService))
        private readonly stakingService: StakingService,
    ) {}

    async stakingFarmsByToken(
        stakingFilter: StakingFarmsFilter,
        stakeAddresses: string[],
    ): Promise<string[]> {
        if (
            !stakingFilter.searchToken ||
            stakingFilter.searchToken.trim().length < 3
        ) {
            return stakeAddresses;
        }

        const searchTerm = stakingFilter.searchToken.toUpperCase().trim();

        const farmingTokens = await this.stakingService.getAllFarmingTokens(
            stakeAddresses,
        );

        const filteredAddresses: string[] = [];
        for (const [index, address] of stakeAddresses.entries()) {
            const farmingToken = farmingTokens[index];

            if (
                farmingToken.name.toUpperCase().includes(searchTerm) ||
                farmingToken.identifier.toUpperCase().includes(searchTerm) ||
                farmingToken.ticker.toUpperCase().includes(searchTerm)
            ) {
                filteredAddresses.push(address);
            }
        }

        return filteredAddresses;
    }

    async stakingFarmsByRewardsDepleted(
        stakingFilter: StakingFarmsFilter,
        stakeAddresses: string[],
    ): Promise<string[]> {
        if (
            typeof stakingFilter.rewardsDepleted === 'undefined' ||
            stakingFilter.rewardsDepleted === null
        ) {
            return stakeAddresses;
        }

        const allProduceRewardsEnabled =
            await this.stakingService.getAllProduceRewardsEnabled(
                stakeAddresses,
            );
        const allAccumulatedRewards =
            await this.stakingService.getAllAccumulatedRewards(stakeAddresses);
        const allRewardCapacity =
            await this.stakingService.getAllRewardCapacity(stakeAddresses);

        const rewardsDepleted = stakeAddresses.map(
            (_, index) =>
                allAccumulatedRewards[index] === allRewardCapacity[index] ||
                !allProduceRewardsEnabled[index],
        );

        return stakeAddresses.filter(
            (_, index) =>
                rewardsDepleted[index] === stakingFilter.rewardsDepleted,
        );
    }
}
