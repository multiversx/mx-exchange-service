import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { GenericResolver } from '../../services/generics/generic.resolver';
import {
    ClaimProgress,
    GlobalInfoByWeekModel,
    TokenDistributionModel,
    UserInfoByWeekSubModel,
} from './models/weekly-rewards-splitting.model';
import { EsdtTokenPayment } from '../../models/esdtTokenPayment.model';
import { WeeklyRewardsSplittingComputeService } from './services/weekly-rewards-splitting.compute.service';
import { UserEntryFeesCollectorModel } from '../../modules/fees-collector/models/fees-collector.model';
import { WeeklyRewardsSplittingAbiService } from './services/weekly-rewards-splitting.abi.service';

@Resolver(() => GlobalInfoByWeekModel)
export class GlobalInfoByWeekResolver extends GenericResolver {
    constructor(
        private readonly weekyRewardsSplittingAbi: WeeklyRewardsSplittingAbiService,
        private readonly weeklyRewardsSplittingCompute: WeeklyRewardsSplittingComputeService,
    ) {
        super();
    }

    @ResolveField()
    async totalRewardsForWeek(
        @Parent() parent: GlobalInfoByWeekModel,
    ): Promise<EsdtTokenPayment[]> {
        return await this.genericFieldResolver(() =>
            this.weekyRewardsSplittingAbi.totalRewardsForWeek(
                parent.scAddress,
                parent.week,
            ),
        );
    }

    @ResolveField()
    async totalEnergyForWeek(
        @Parent() parent: GlobalInfoByWeekModel,
    ): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.weekyRewardsSplittingAbi.totalEnergyForWeek(
                parent.scAddress,
                parent.week,
            ),
        );
    }

    @ResolveField(() => [TokenDistributionModel])
    async rewardsDistributionForWeek(
        @Parent() parent: GlobalInfoByWeekModel,
    ): Promise<TokenDistributionModel[]> {
        const totalRewardsForWeek =
            await this.weekyRewardsSplittingAbi.totalRewardsForWeek(
                parent.scAddress,
                parent.week,
            );
        return await this.genericFieldResolver(() =>
            this.weeklyRewardsSplittingCompute.computeDistribution(
                totalRewardsForWeek,
            ),
        );
    }

    @ResolveField()
    async totalLockedTokensForWeek(
        @Parent() parent: GlobalInfoByWeekModel,
    ): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.weekyRewardsSplittingAbi.totalLockedTokensForWeek(
                parent.scAddress,
                parent.week,
            ),
        );
    }

    @ResolveField()
    async apr(@Parent() parent: GlobalInfoByWeekModel): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.weeklyRewardsSplittingCompute.weekAPR(
                parent.scAddress,
                parent.week,
            ),
        );
    }
}

@Resolver(() => UserInfoByWeekSubModel)
export class UserInfoByWeekSubResolver extends GenericResolver {
    constructor(
        private readonly weekyRewardsSplittingAbi: WeeklyRewardsSplittingAbiService,
    ) {
        super();
    }

    @ResolveField()
    async lastActiveWeekForUser(
        @Parent() parent: UserEntryFeesCollectorModel,
    ): Promise<number> {
        return await this.genericFieldResolver(() =>
            this.weekyRewardsSplittingAbi.lastActiveWeekForUser(
                parent.address,
                parent.userAddress,
            ),
        );
    }
    @ResolveField(() => ClaimProgress)
    async claimProgress(
        @Parent() parent: UserEntryFeesCollectorModel,
    ): Promise<ClaimProgress> {
        return await this.genericFieldResolver(() =>
            this.weekyRewardsSplittingAbi.currentClaimProgress(
                parent.address,
                parent.userAddress,
            ),
        );
    }
}
