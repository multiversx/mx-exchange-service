import { Args, Query, Resolver } from '@nestjs/graphql';
import { GovernanceContractsFiltersArgs } from './models/contracts.filter.args';
import { GovernanceService } from './services/governance.service';
import { GovernanceContract } from './models/governance.contract.model';

@Resolver()
export class GovernanceQueryResolver {
    constructor(
        private readonly governanceService: GovernanceService,
    ) {
    }

    @Query(() => [GovernanceContract])
    async governanceContracts(
        @Args() filters: GovernanceContractsFiltersArgs
    ): Promise<GovernanceContract[]> {
        return this.governanceService.getGovernanceContracts(filters);
    }
}
