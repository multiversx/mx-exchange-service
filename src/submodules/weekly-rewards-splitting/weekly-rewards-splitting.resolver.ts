import { ResolveField, Resolver } from '@nestjs/graphql';
import {
    ClaimProgress,
    UserInfoByWeekSubModel,
} from './models/weekly-rewards-splitting.model';
import { UserEntryFeesCollectorModel } from '../../modules/fees-collector/models/fees-collector.model';
import { WeeklyRewardsSplittingAbiService } from './services/weekly-rewards-splitting.abi.service';

@Resolver(() => UserInfoByWeekSubModel)
export class UserInfoByWeekSubResolver {
    constructor(
        private readonly weekyRewardsSplittingAbi: WeeklyRewardsSplittingAbiService,
    ) {}

    @ResolveField()
    async lastActiveWeekForUser(
        parent: UserEntryFeesCollectorModel,
    ): Promise<number> {
        return this.weekyRewardsSplittingAbi.lastActiveWeekForUser(
            parent.address,
            parent.userAddress,
        );
    }

    @ResolveField(() => ClaimProgress)
    async claimProgress(
        parent: UserEntryFeesCollectorModel,
    ): Promise<ClaimProgress> {
        return this.weekyRewardsSplittingAbi.currentClaimProgress(
            parent.address,
            parent.userAddress,
        );
    }
}
