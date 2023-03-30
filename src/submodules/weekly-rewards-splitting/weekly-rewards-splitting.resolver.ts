import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { GenericResolver } from '../../services/generics/generic.resolver';
import {
    ClaimProgress,
    GlobalInfoByWeekModel,
    TokenDistributionModel,
    UserInfoByWeekModel,
    UserInfoByWeekSubModel,
} from './models/weekly-rewards-splitting.model';
import { EsdtTokenPayment } from '../../models/esdtTokenPayment.model';
import { WeeklyRewardsSplittingComputeService } from './services/weekly-rewards-splitting.compute.service';
import { UserEntryFeesCollectorModel } from '../../modules/fees-collector/models/fees-collector.model';
import { FarmGetterServiceV2 } from 'src/modules/farm/v2/services/farm.v2.getter.service';
import { FeesCollectorGetterService } from 'src/modules/fees-collector/services/fees-collector.getter.service';
import { scAddress } from 'src/config';

@Resolver(() => GlobalInfoByWeekModel)
export class GlobalInfoByWeekResolver extends GenericResolver {
    constructor(
        private readonly farmGetter: FarmGetterServiceV2,
        private readonly feesCollectorGetter: FeesCollectorGetterService,
        private readonly weeklyRewardsSplittingCompute: WeeklyRewardsSplittingComputeService,
    ) {
        super();
    }

    @ResolveField()
    async totalRewardsForWeek(
        @Parent() parent: GlobalInfoByWeekModel,
    ): Promise<EsdtTokenPayment[]> {
        const getter =
            parent.scAddress === scAddress.feesCollector
                ? this.feesCollectorGetter
                : this.farmGetter;
        return await this.genericFieldResolver(() =>
            getter.totalRewardsForWeek(parent.scAddress, parent.week),
        );
    }

    @ResolveField()
    async totalEnergyForWeek(
        @Parent() parent: GlobalInfoByWeekModel,
    ): Promise<string> {
        const getter =
            parent.scAddress === scAddress.feesCollector
                ? this.feesCollectorGetter
                : this.farmGetter;
        return await this.genericFieldResolver(() =>
            getter.totalEnergyForWeek(parent.scAddress, parent.week),
        );
    }

    @ResolveField(() => [TokenDistributionModel])
    async rewardsDistributionForWeek(
        @Parent() parent: UserInfoByWeekModel,
    ): Promise<TokenDistributionModel[]> {
        const getter =
            parent.scAddress === scAddress.feesCollector
                ? this.feesCollectorGetter
                : this.farmGetter;
        return await this.genericFieldResolver(() =>
            getter.totalRewardsDistributionForWeek(
                parent.scAddress,
                parent.week,
            ),
        );
    }

    @ResolveField()
    async totalLockedTokensForWeek(
        @Parent() parent: GlobalInfoByWeekModel,
    ): Promise<string> {
        const getter =
            parent.scAddress === scAddress.feesCollector
                ? this.feesCollectorGetter
                : this.farmGetter;
        return await this.genericFieldResolver(() =>
            getter.totalLockedTokensForWeek(parent.scAddress, parent.week),
        );
    }

    @ResolveField()
    async apr(@Parent() parent: GlobalInfoByWeekModel): Promise<string> {
        const getter =
            parent.scAddress === scAddress.feesCollector
                ? this.feesCollectorGetter
                : this.farmGetter;
        const totalLockedTokensForWeek = await getter.totalLockedTokensForWeek(
            parent.scAddress,
            parent.week,
        );
        const totalRewardsForWeek = await getter.totalRewardsForWeek(
            parent.scAddress,
            parent.week,
        );
        return await this.genericFieldResolver(() =>
            this.weeklyRewardsSplittingCompute.computeApr(
                parent.scAddress,
                parent.week,
                totalLockedTokensForWeek,
                totalRewardsForWeek,
            ),
        );
    }
}

@Resolver(() => UserInfoByWeekSubModel)
export class UserInfoByWeekSubResolver extends GenericResolver {
    constructor(
        private readonly farmGetter: FarmGetterServiceV2,
        private readonly feesCollectorGetter: FeesCollectorGetterService,
    ) {
        super();
    }

    @ResolveField()
    async lastActiveWeekForUser(
        @Parent() parent: UserEntryFeesCollectorModel,
    ): Promise<number> {
        const getter =
            parent.address === scAddress.feesCollector
                ? this.feesCollectorGetter
                : this.farmGetter;
        return await this.genericFieldResolver(() =>
            getter.lastActiveWeekForUser(parent.address, parent.userAddress),
        );
    }
    @ResolveField(() => ClaimProgress)
    async claimProgress(
        @Parent() parent: UserEntryFeesCollectorModel,
    ): Promise<ClaimProgress> {
        const getter =
            parent.address === scAddress.feesCollector
                ? this.feesCollectorGetter
                : this.farmGetter;
        return await this.genericFieldResolver(() =>
            getter.currentClaimProgress(parent.address, parent.userAddress),
        );
    }
}
