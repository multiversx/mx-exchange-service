import { Args, Query, Resolver } from '@nestjs/graphql';
import { GovernanceContractsFiltersArgs } from './models/contracts.filter.args';
import { GovernanceService } from './services/governance.service';
import { GovernanceContract } from './models/governance.contract.model';
import { UseGuards } from '@nestjs/common';
import { OptionalJwtOrNativeAuthGuard } from '../auth/optional.jwt.or.native.auth.guard';
import { AuthUser } from '../auth/auth.user';
import { UserAuthResult } from '../auth/user.auth.result';

@Resolver()
export class GovernanceQueryResolver {
    constructor(
        private readonly governanceService: GovernanceService,
    ) {
    }

    @Query(() => [GovernanceContract])
    @UseGuards(OptionalJwtOrNativeAuthGuard)
    async governanceContracts(
        @AuthUser() user: UserAuthResult,
        @Args() filters: GovernanceContractsFiltersArgs
    ): Promise<GovernanceContract[]> {
        return this.governanceService.getGovernanceContracts(filters, user.address);
    }
}
