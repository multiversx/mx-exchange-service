import { Args, Query, Resolver } from '@nestjs/graphql';
import { GovernanceContractsFiltersArgs } from '../models/governance.contracts.filter.args';
import { GovernanceService } from '../services/governance.service';
import { GovernanceUnion } from '../models/governance.union';

@Resolver()
export class GovernanceQueryResolver {
    constructor(
        private readonly governanceService: GovernanceService,
    ) {
    }

    @Query(() => [GovernanceUnion])
    async governanceContracts(
        @Args() filters: GovernanceContractsFiltersArgs
    ): Promise<Array<typeof GovernanceUnion>> {
        return this.governanceService.getGovernanceContracts(filters);
    }
}
