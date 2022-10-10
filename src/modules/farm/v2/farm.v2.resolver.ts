import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { FarmModelV2 } from '../models/farm.v2.model';
import { FarmV2GetterService } from '../services/v2/farm.v2.getter.service';
import { FarmResolver } from '../base-module/farm.resolver';

@Resolver(() => FarmModelV2)
export class FarmV2Resolver extends FarmResolver {
    constructor(protected readonly farmGetter: FarmV2GetterService) {
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
    async currentWeek(@Parent() parent: FarmModelV2): Promise<number> {
        return await this.genericFieldResover(() =>
            this.farmGetter.getCurrentWeek(parent.address),
        );
    }

    @ResolveField()
    async energyFactoryAddress(@Parent() parent: FarmModelV2): Promise<string> {
        return await this.genericFieldResover(() =>
            this.farmGetter.getEnergyFactoryAddress(parent.address),
        );
    }
}
