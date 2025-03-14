import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import {
    GlobalRewardsModel,
    FeesCollectorGlobalRewards,
    FarmsGlobalRewards,
    StakingGlobalRewards,
} from './models/global.rewards.model';
import { GlobalRewardsService } from './services/global.rewards.service';

@Resolver(() => GlobalRewardsModel)
export class GlobalRewardsResolver {
    constructor(private readonly globalRewardsService: GlobalRewardsService) {}

    @ResolveField(() => FeesCollectorGlobalRewards)
    async feesCollectorGlobalRewards(
        @Parent() parent: GlobalRewardsModel & { weekOffset: number },
    ): Promise<FeesCollectorGlobalRewards> {
        return this.globalRewardsService.feesCollectorRewards(
            parent.weekOffset,
        );
    }

    @ResolveField(() => [FarmsGlobalRewards])
    async farmsGlobalRewards(
        @Parent() parent: GlobalRewardsModel & { weekOffset: number },
    ): Promise<FarmsGlobalRewards[]> {
        return this.globalRewardsService.farmRewards(parent.weekOffset);
    }

    @ResolveField(() => [StakingGlobalRewards])
    async stakingGlobalRewards(
        @Parent() parent: GlobalRewardsModel & { weekOffset: number },
    ): Promise<StakingGlobalRewards[]> {
        return this.globalRewardsService.stakingRewards(parent.weekOffset);
    }
}
