import { Args, Query, Resolver } from '@nestjs/graphql';
import { GovernanceAbiService } from './services/governance.abi.service';
import { VoteArgs } from './models/governance.proposal.model';
import { UseGuards } from '@nestjs/common';
import { UserAuthResult } from '../auth/user.auth.result';
import { AuthUser } from '../auth/auth.user';
import { JwtOrNativeAdminGuard } from '../auth/jwt.or.native.admin.guard';
import { TransactionModel } from '../../models/transaction.model';

@Resolver()
export class GovernanceTransactionResolver {
    constructor(
        private readonly governanceAbi: GovernanceAbiService,
    ) {
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async vote(
        @Args() args: VoteArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.governanceAbi
            .vote(user.address, args);
    }
}
