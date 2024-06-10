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

        const farmingTokens = await Promise.all(
            stakeAddresses.map((address) =>
                this.stakingService.getFarmingToken(address),
            ),
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
}
