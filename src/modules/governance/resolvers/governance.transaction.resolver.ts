import { Args, Query, Resolver } from '@nestjs/graphql';
import { JwtOrNativeAuthGuard } from '../../auth/jwt.or.native.auth.guard';
import { UseGuards } from '@nestjs/common';
import { TransactionModel } from '../../../models/transaction.model';
import { VoteArgs } from '../models/governance.proposal.model';
import { UserAuthResult } from '../../auth/user.auth.result';
import { AuthUser } from '../../auth/auth.user';
import { GovernanceEnergyAbiService, GovernanceTokenSnapshotAbiService } from '../services/governance.abi.service';
import { GovernanceType, governanceType } from '../../../utils/governance';

@Resolver()
export class GovernanceTransactionService {
    constructor(
        private readonly governanceEnergyAbi: GovernanceEnergyAbiService,
        private readonly governanceTokenSnapshotAbi: GovernanceTokenSnapshotAbiService,
    ) {
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async vote(
        @Args() args: VoteArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this
            .useAbi(args.contractAddress)
            .vote(user.address, args)
    }

    useAbi(contractAddress: string) {
        switch (governanceType(contractAddress)) {
            case GovernanceType.ENERGY:
                return this.governanceEnergyAbi;
            case GovernanceType.TOKEN_SNAPSHOT:
                return this.governanceTokenSnapshotAbi;
        }
    }
}
