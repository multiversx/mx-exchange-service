import { Args, Query, Resolver } from '@nestjs/graphql';
import { GovernanceContractsFiltersArgs } from '../models/governance.contracts.filter.args';
import { GovernanceService } from '../services/governance.service';
import { GovernanceUnion } from '../models/governance.union';
import { VoteArgs } from '../models/governance.proposal.model';
import { GovernanceTokenSnapshotMerkleService } from '../services/governance.token.snapshot.merkle.service';

@Resolver()
export class GovernanceQueryResolver {
    constructor(
        private readonly governanceService: GovernanceService,
        private readonly governaneMerkle: GovernanceTokenSnapshotMerkleService,
    ) {
    }

    @Query(() => [GovernanceUnion])
    async governanceContracts(
        @Args() filters: GovernanceContractsFiltersArgs
    ): Promise<Array<typeof GovernanceUnion>> {
        return this.governanceService.getGovernanceContracts(filters);
    }

    @Query(() => String)
    async rootHash(
        @Args() args: VoteArgs
    ): Promise<string> {
        const mp = await this.governaneMerkle.getMerkleTree(args.contractAddress, args.proposalId);
        return mp.getRootHash();
    }

    @Query(() => String)
    async totalBalance(
        @Args() args: VoteArgs
    ): Promise<string> {
        const mp = await this.governaneMerkle.getMerkleTree(args.contractAddress, args.proposalId);
        return mp.getTotalBalance();
    }
}
