import { Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { FeesCollectorModel, UserEntryFeesCollectorModel } from './models/fees-collector.model';
import { FeesCollectorService } from './services/fees-collector.service';
import {
    UserWeeklyRewardsSplittingModel,
    WeeklyRewardsSplittingModel,
} from '../../submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { User } from '../../helpers/userDecorator';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/gql.auth.guard';
import { GenericResolver } from '../../services/generics/generic.resolver';
import { scAddress } from '../../config';
import { EsdtTokenPayment } from '../../models/esdtTokenPayment.model';

@Resolver(() => FeesCollectorModel)
export class FeesCollectorResolver extends GenericResolver {
    constructor(
        private readonly feesCollectorService: FeesCollectorService,
    ) {
        super();
    }

    @ResolveField(() => [WeeklyRewardsSplittingModel])
    async splitRewards(@Parent() parent: FeesCollectorModel): Promise<WeeklyRewardsSplittingModel[]> {
        return await this.genericFieldResover(() =>
            Promise.all(this.feesCollectorService.getWeeklyRewardsSplitPromises(parent.address, parent.time.currentWeek)),
        );
    }

    @ResolveField(() => [EsdtTokenPayment])
    async accumulatedFees(@Parent() parent: FeesCollectorModel): Promise<EsdtTokenPayment[]> {
        return await this.genericFieldResover(() =>
            this.feesCollectorService.getAccumulatedFees(parent.address, parent.time.currentWeek, parent.allTokens),
        );
    }

    @ResolveField(() => [UserWeeklyRewardsSplittingModel])
    async userSplitRewards(
        @Parent() parent: UserEntryFeesCollectorModel,
    ): Promise<UserWeeklyRewardsSplittingModel[]> {
        return await this.genericFieldResover(() =>
            Promise.all(this.feesCollectorService.getUserWeeklyRewardsSplitPromises(parent.address, parent.userAddress, parent.time.currentWeek)),
        );
    }

    @Query(() => FeesCollectorModel)
    async feesCollector(): Promise<FeesCollectorModel> {
        return await this.genericQuery(() =>
            this.feesCollectorService.feesCollector(scAddress.feesCollector),
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => UserEntryFeesCollectorModel)
    async userFeesCollector(
        @User() user: any,
    ): Promise<UserEntryFeesCollectorModel> {
        return await this.genericQuery(() =>
            this.feesCollectorService.userFeesCollector(scAddress.feesCollector, user.publicKey),
        );
    }
}
