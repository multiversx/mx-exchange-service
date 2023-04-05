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
import { IWeeklyRewardsSplittingGetterService } from './interfaces';

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
        return await this.genericFieldResolver(() =>
            this.weeklyRewardsSplittingGetter(
                parent.scAddress,
            ).totalRewardsForWeek(parent.scAddress, parent.week),
        );
    }

    @ResolveField()
    async totalEnergyForWeek(
        @Parent() parent: GlobalInfoByWeekModel,
    ): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.weeklyRewardsSplittingGetter(
                parent.scAddress,
            ).totalEnergyForWeek(parent.scAddress, parent.week),
        );
    }

    @ResolveField(() => [TokenDistributionModel])
    async rewardsDistributionForWeek(
        @Parent() parent: UserInfoByWeekModel,
    ): Promise<TokenDistributionModel[]> {
        return await this.genericFieldResolver(() =>
            this.weeklyRewardsSplittingGetter(
                parent.scAddress,
            ).totalRewardsDistributionForWeek(parent.scAddress, parent.week),
        );
    }

    @ResolveField()
    async totalLockedTokensForWeek(
        @Parent() parent: GlobalInfoByWeekModel,
    ): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.weeklyRewardsSplittingGetter(
                parent.scAddress,
            ).totalLockedTokensForWeek(parent.scAddress, parent.week),
        );
    }

    @ResolveField()
    async apr(@Parent() parent: GlobalInfoByWeekModel): Promise<string> {
        const totalLockedTokensForWeek =
            await this.weeklyRewardsSplittingGetter(
                parent.scAddress,
            ).totalLockedTokensForWeek(parent.scAddress, parent.week);
        const totalRewardsForWeek = await this.weeklyRewardsSplittingGetter(
            parent.scAddress,
        ).totalRewardsForWeek(parent.scAddress, parent.week);
        return await this.genericFieldResolver(() =>
            this.weeklyRewardsSplittingCompute.computeApr(
                totalLockedTokensForWeek,
                totalRewardsForWeek,
            ),
        );
    }

    private weeklyRewardsSplittingGetter(
        address: string,
    ): IWeeklyRewardsSplittingGetterService {
        return address === scAddress.feesCollector
            ? this.feesCollectorGetter
            : this.farmGetter;
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
        return await this.genericFieldResolver(() =>
            this.weeklyRewardsSplittingGetter(
                parent.address,
            ).lastActiveWeekForUser(parent.address, parent.userAddress),
        );
    }
    @ResolveField(() => ClaimProgress)
    async claimProgress(
        @Parent() parent: UserEntryFeesCollectorModel,
    ): Promise<ClaimProgress> {
        return await this.genericFieldResolver(() =>
            this.weeklyRewardsSplittingGetter(
                parent.address,
            ).currentClaimProgress(parent.address, parent.userAddress),
        );
    }

    private weeklyRewardsSplittingGetter(
        address: string,
    ): IWeeklyRewardsSplittingGetterService {
        return address === scAddress.feesCollector
            ? this.feesCollectorGetter
            : this.farmGetter;
    }
}
