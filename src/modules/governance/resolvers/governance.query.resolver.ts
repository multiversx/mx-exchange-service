import { Args, Query, Resolver } from '@nestjs/graphql';
import { GovernanceContractsFiltersArgs } from '../models/governance.contracts.filter.args';
import { GovernanceUnion } from '../models/governance.union';
import { GovernanceTokenSnapshotService } from '../services/governance.service';

@Resolver()
export class GovernanceQueryResolver {
    constructor(
        private readonly governanceService: GovernanceTokenSnapshotService,
    ) {
    }

    @Query(() => [GovernanceUnion])
    async governanceContracts(
        @Args() filters: GovernanceContractsFiltersArgs
    ): Promise<Array<typeof GovernanceUnion>> {
        return this.governanceService.getGovernanceContracts(filters);
    }
}
