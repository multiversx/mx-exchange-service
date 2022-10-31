import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { BoostedYieldsFactors, FarmModelV2 } from '../models/farm.v2.model';
import { FarmGetterServiceV2 } from './services/farm.v2.getter.service';
import { FarmResolver } from '../base-module/farm.resolver';

@Resolver(() => FarmModelV2)
export class FarmResolverV2 extends FarmResolver {
    constructor(protected readonly farmGetter: FarmGetterServiceV2) {
        super(farmGetter);
    }

    @ResolveField()
    async boostedYieldsRewardsPercenatage(
        @Parent() parent: FarmModelV2,
    ): Promise<number> {
        return await this.genericFieldResover(() =>
            this.farmGetter.getBoostedYieldsRewardsPercenatage(parent.address),
        );
    }

    @ResolveField()
    async boostedYieldsFactors(
        @Parent() parent: FarmModelV2,
    ): Promise<BoostedYieldsFactors> {
        return await this.genericFieldResover(() =>
            this.farmGetter.getBoostedYieldsFactors(parent.address),
        );
    }

    @ResolveField()
    async lockingScAddress(@Parent() parent: FarmModelV2): Promise<string> {
        return await this.genericFieldResover(() =>
            this.farmGetter.getLockingScAddress(parent.address),
        );
    }

    @ResolveField()
    async lockEpochs(@Parent() parent: FarmModelV2): Promise<number> {
        return await this.genericFieldResover(() =>
            this.farmGetter.getLockEpochs(parent.address),
        );
    }

    @ResolveField()
    async undistributedBoostedRewards(
        @Parent() parent: FarmModelV2,
    ): Promise<string> {
        return await this.genericFieldResover(() =>
            this.farmGetter.getUndistributedBoostedRewards(parent.address),
        );
    }

    @ResolveField()
    async energyFactoryAddress(@Parent() parent: FarmModelV2): Promise<string> {
        return await this.genericFieldResover(() =>
            this.farmGetter.getEnergyFactoryAddress(parent.address),
        );
    }
}
