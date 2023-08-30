import { Args, Query, Resolver } from '@nestjs/graphql';
import { JwtOrNativeAuthGuard } from '../../auth/jwt.or.native.auth.guard';
import { UseGuards } from '@nestjs/common';
import { TransactionModel } from '../../../models/transaction.model';
import { VoteArgs } from '../models/governance.proposal.model';
import { UserAuthResult } from '../../auth/user.auth.result';
import { AuthUser } from '../../auth/auth.user';
import { GovernanceAbiFactory } from '../services/governance.abi.factory';

@Resolver()
export class GovernanceTransactionService {
    constructor(
        private readonly governanceAbiFactory: GovernanceAbiFactory,
    ) {
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async vote(
        @Args() args: VoteArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.governanceAbiFactory
            .useAbi(args.contractAddress)
            .vote(user.address, args)
    }
}
