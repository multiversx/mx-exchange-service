import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { FarmResolver } from '../base-module/farm.resolver';
import { FarmMigrationConfig } from '../models/farm.model';
import { FarmModelV1_2 } from '../models/farm.v1.2.model';
import { FarmV12GetterService } from './services/farm.v1.2.getter.service';

@Resolver(() => FarmModelV1_2)
export class FarmResolverV1_2 extends FarmResolver {
    constructor(protected readonly farmGetter: FarmV12GetterService) {
        super(farmGetter);
    }

    @ResolveField()
    async farmingTokenReserve(
        @Parent() parent: FarmModelV1_2,
    ): Promise<string> {
        return await this.genericFieldResover(() =>
            this.farmGetter.getFarmingTokenReserve(parent.address),
        );
    }

    @ResolveField()
    async undistributedFees(@Parent() parent: FarmModelV1_2): Promise<string> {
        return await this.genericFieldResover(() =>
            this.farmGetter.getUndistributedFees(parent.address),
        );
    }

    @ResolveField()
    async currentBlockFee(@Parent() parent: FarmModelV1_2): Promise<string> {
        return await this.genericFieldResover(() =>
            this.farmGetter.getCurrentBlockFee(parent.address),
        );
    }

    @ResolveField()
    async aprMultiplier(@Parent() parent: FarmModelV1_2): Promise<number> {
        return await this.genericFieldResover(() =>
            this.farmGetter.getLockedRewardAprMuliplier(parent.address),
        );
    }

    @ResolveField()
    async unlockedRewardsAPR(@Parent() parent: FarmModelV1_2): Promise<string> {
        return await this.genericFieldResover(() =>
            this.farmGetter.getUnlockedRewardsAPR(parent.address),
        );
    }

    @ResolveField()
    async lockedRewardsAPR(@Parent() parent: FarmModelV1_2): Promise<string> {
        return await this.genericFieldResover(() =>
            this.farmGetter.getLockedRewardsAPR(parent.address),
        );
    }

    @ResolveField()
    async lockedFarmingTokenReserve(parent: FarmModelV1_2): Promise<string> {
        return await this.genericFieldResover(() =>
            this.farmGetter.getLockedFarmingTokenReserve(parent.address),
        );
    }

    @ResolveField()
    async unlockedFarmingTokenReserve(parent: FarmModelV1_2): Promise<string> {
        return await this.genericFieldResover(() =>
            this.farmGetter.getUnlockedFarmingTokenReserve(parent.address),
        );
    }

    @ResolveField()
    async lockedFarmingTokenReserveUSD(parent: FarmModelV1_2): Promise<string> {
        return await this.genericFieldResover(() =>
            this.farmGetter.getLockedFarmingTokenReserveUSD(parent.address),
        );
    }

    @ResolveField()
    async unlockedFarmingTokenReserveUSD(
        parent: FarmModelV1_2,
    ): Promise<string> {
        return await this.genericFieldResover(() =>
            this.farmGetter.getUnlockedFarmingTokenReserveUSD(parent.address),
        );
    }

    @ResolveField()
    async migrationConfig(
        @Parent() parent: FarmModelV1_2,
    ): Promise<FarmMigrationConfig> {
        return await this.genericFieldResover(() =>
            this.farmGetter.getFarmMigrationConfiguration(parent.address),
        );
    }
}
