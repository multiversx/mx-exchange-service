import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { FarmResolver } from '../base-module/farm.resolver';
import { FarmMigrationConfig } from '../models/farm.model';
import { FarmModelV1_2 } from '../models/farm.v1.2.model';
import { FarmGetterServiceV1_2 } from './services/farm.v1.2.getter.service';

@Resolver(() => FarmModelV1_2)
export class FarmResolverV1_2 extends FarmResolver {
    constructor(protected readonly farmGetter: FarmGetterServiceV1_2) {
        super(farmGetter);
    }

    @ResolveField()
    async farmingTokenReserve(
        @Parent() parent: FarmModelV1_2,
    ): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.farmGetter.getFarmingTokenReserve(parent.address),
        );
    }

    @ResolveField()
    async undistributedFees(@Parent() parent: FarmModelV1_2): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.farmGetter.getUndistributedFees(parent.address),
        );
    }

    @ResolveField()
    async currentBlockFee(@Parent() parent: FarmModelV1_2): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.farmGetter.getCurrentBlockFee(parent.address),
        );
    }

    @ResolveField()
    async aprMultiplier(@Parent() parent: FarmModelV1_2): Promise<number> {
        return await this.genericFieldResolver(() =>
            this.farmGetter.getLockedRewardAprMuliplier(parent.address),
        );
    }

    @ResolveField()
    async unlockedRewardsAPR(@Parent() parent: FarmModelV1_2): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.farmGetter.getUnlockedRewardsAPR(parent.address),
        );
    }

    @ResolveField()
    async lockedRewardsAPR(@Parent() parent: FarmModelV1_2): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.farmGetter.getLockedRewardsAPR(parent.address),
        );
    }

    @ResolveField()
    async lockedFarmingTokenReserve(parent: FarmModelV1_2): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.farmGetter.getLockedFarmingTokenReserve(parent.address),
        );
    }

    @ResolveField()
    async unlockedFarmingTokenReserve(parent: FarmModelV1_2): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.farmGetter.getUnlockedFarmingTokenReserve(parent.address),
        );
    }

    @ResolveField()
    async lockedFarmingTokenReserveUSD(parent: FarmModelV1_2): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.farmGetter.getLockedFarmingTokenReserveUSD(parent.address),
        );
    }

    @ResolveField()
    async unlockedFarmingTokenReserveUSD(
        parent: FarmModelV1_2,
    ): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.farmGetter.getUnlockedFarmingTokenReserveUSD(parent.address),
        );
    }

    @ResolveField()
    async migrationConfig(
        @Parent() parent: FarmModelV1_2,
    ): Promise<FarmMigrationConfig> {
        return await this.genericFieldResolver(() =>
            this.farmGetter.getFarmMigrationConfiguration(parent.address),
        );
    }
}
