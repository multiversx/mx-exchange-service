import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { WeeklyRewardsSplittingGetterService } from './services/weekly-rewards-splitting.getter.service';
import { GenericResolver } from '../../services/generics/generic.resolver';
import {
    ClaimProgress,
    GlobalInfoByWeekModel,
    GlobalInfoByWeekSubModel,
    UserInfoByWeekModel,
    UserInfoByWeekSubModel,
} from './models/weekly-rewards-splitting.model';
import { EnergyModel } from '../../modules/energy/models/energy.model';
import { EsdtTokenPayment } from '../../models/esdtTokenPayment.model';
import { WeeklyRewardsSplittingComputeService } from './services/weekly-rewards-splitting.compute.service';
import {
    FeesCollectorModel,
    UserEntryFeesCollectorModel,
} from '../../modules/fees-collector/models/fees-collector.model';

@Resolver(() => GlobalInfoByWeekModel)
export class GlobalInfoByWeekResolver extends GenericResolver {
    constructor(
        protected readonly weeklyRewardsSplittingGetter: WeeklyRewardsSplittingGetterService,
        protected readonly weeklyRewardsSplittingCompute: WeeklyRewardsSplittingComputeService,
    ) {
        super();
    }

    @ResolveField()
    async totalRewardsForWeek(
        @Parent() parent: GlobalInfoByWeekModel,
    ): Promise<EsdtTokenPayment[]> {
        return await this.genericFieldResover(() =>
            this.weeklyRewardsSplittingGetter.totalRewardsForWeek(
                parent.scAddress,
                parent.week,
            ),
        );
    }

    @ResolveField()
    async totalEnergyForWeek(
        @Parent() parent: GlobalInfoByWeekModel,
    ): Promise<string> {
        return await this.genericFieldResover(() =>
            this.weeklyRewardsSplittingGetter.totalEnergyForWeek(
                parent.scAddress,
                parent.week,
            ),
        );
    }

    @ResolveField()
    async totalLockedTokensForWeek(
        @Parent() parent: GlobalInfoByWeekModel,
    ): Promise<string> {
        return await this.genericFieldResover(() =>
            this.weeklyRewardsSplittingGetter.totalLockedTokensForWeek(
                parent.scAddress,
                parent.week,
            ),
        );
    }

    @ResolveField()
    async apr(@Parent() parent: GlobalInfoByWeekModel): Promise<string> {
        return await this.genericFieldResover(() =>
            this.weeklyRewardsSplittingCompute.computeApr(
                parent.scAddress,
                parent.week,
            ),
        );
    }
}

@Resolver(() => UserInfoByWeekModel)
export class UserInfoByWeekResolver extends GenericResolver {
    constructor(
        protected readonly weeklyRewardsSplittingGetter: WeeklyRewardsSplittingGetterService,
        protected readonly weeklyRewardsSplittingCompute: WeeklyRewardsSplittingComputeService,
    ) {
        super();
    }

    @ResolveField(() => EnergyModel)
    async energyForWeek(
        @Parent() parent: UserInfoByWeekModel,
    ): Promise<EnergyModel> {
        return await this.genericFieldResover(() =>
            this.weeklyRewardsSplittingGetter.userEnergyForWeek(
                parent.scAddress,
                parent.userAddress,
                parent.week,
            ),
        );
    }

    @ResolveField()
    async apr(@Parent() parent: UserInfoByWeekModel): Promise<string> {
        return await this.genericFieldResover(() =>
            this.weeklyRewardsSplittingCompute.computeUserApr(
                parent.scAddress,
                parent.userAddress,
                parent.week,
            ),
        );
    }

    @ResolveField(() => [EsdtTokenPayment])
    async rewardsForWeek(
        @Parent() parent: UserInfoByWeekModel,
    ): Promise<EsdtTokenPayment[]> {
        return await this.genericFieldResover(() =>
            this.weeklyRewardsSplittingGetter.userRewardsForWeek(
                parent.scAddress,
                parent.userAddress,
                parent.week,
            ),
        );
    }
}

@Resolver(() => GlobalInfoByWeekSubModel)
export class GlobalInfoByWeekSubResolver extends GenericResolver {
    constructor(
        protected readonly weeklyRewardsSplittingGetter: WeeklyRewardsSplittingGetterService,
    ) {
        super();
    }
    @ResolveField()
    async lastGlobalUpdateWeek(
        @Parent() parent: FeesCollectorModel,
    ): Promise<number> {
        return await this.genericFieldResover(() =>
            this.weeklyRewardsSplittingGetter.lastGlobalUpdateWeek(
                parent.address,
            ),
        );
    }
}

@Resolver(() => UserInfoByWeekSubModel)
export class UserInfoByWeekSubResolver extends GenericResolver {
    constructor(
        protected readonly weeklyRewardsSplittingGetter: WeeklyRewardsSplittingGetterService,
    ) {
        super();
    }

    @ResolveField()
    async lastActiveWeekForUser(
        @Parent() parent: UserEntryFeesCollectorModel,
    ): Promise<number> {
        return await this.genericFieldResover(() =>
            this.weeklyRewardsSplittingGetter.lastActiveWeekForUser(
                parent.address,
                parent.userAddress,
            ),
        );
    }
    @ResolveField(() => ClaimProgress)
    async claimProgress(
        @Parent() parent: UserEntryFeesCollectorModel,
    ): Promise<ClaimProgress> {
        return await this.genericFieldResover(() =>
            this.weeklyRewardsSplittingGetter.currentClaimProgress(
                parent.address,
                parent.userAddress,
            ),
        );
    }
}
