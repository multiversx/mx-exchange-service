import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { FarmModelV2 } from '../models/farm.v2.model';
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
    async undistributedBoostedRewards(farmAddress: string): Promise<string> {
        return await this.genericFieldResover(() =>
            this.farmGetter.getUndistributedBoostedRewards(farmAddress),
        );
    }

    @ResolveField()
    async energyFactoryAddress(@Parent() parent: FarmModelV2): Promise<string> {
        return await this.genericFieldResover(() =>
            this.farmGetter.getEnergyFactoryAddress(parent.address),
        );
    }
}
