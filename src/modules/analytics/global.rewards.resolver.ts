import { Resolver, ResolveField, Parent, Query, Args } from '@nestjs/graphql';
import {
    GlobalRewardsModel,
    FeesCollectorGlobalRewards,
    FarmsGlobalRewards,
    StakingGlobalRewards,
} from './models/global.rewards.model';
import { GlobalRewardsService } from './services/global.rewards.service';
import { GlobalRewardsArgs } from './models/query.args';
import { UsePipes } from '@nestjs/common';
import { QueryArgsValidationPipe } from 'src/helpers/validators/query.args.validation.pipe';

@Resolver(() => GlobalRewardsModel)
export class GlobalRewardsResolver {
    constructor(private readonly globalRewardsService: GlobalRewardsService) {}

    @Query(() => GlobalRewardsModel)
    @UsePipes(new QueryArgsValidationPipe())
    async globalRewards(
        @Args() args: GlobalRewardsArgs,
    ): Promise<GlobalRewardsModel> {
        return Object.assign(new GlobalRewardsModel({}), {
            weekOffset: args.weekOffset,
        });
    }

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
