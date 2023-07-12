import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { GovernanceAbiService } from './services/governance.abi.service';
import { GovernanceProposal } from './models/governance.proposal.model';
import { ProposalVotes } from './models/proposal.votes.model';

@Resolver(() => GovernanceProposal)
export class GovernanceProposalResolver {
    constructor(
        private readonly governanceAbi: GovernanceAbiService,
    ) {
    }

    @ResolveField()
    async status(@Parent() governanceProposal: GovernanceProposal): Promise<string> {
        return this.governanceAbi.proposalStatus(governanceProposal.contractAddress, governanceProposal.proposalId);
    }

    //votes
    @ResolveField()
    async votes(@Parent() governanceProposal: GovernanceProposal): Promise<ProposalVotes> {
        return this.governanceAbi.proposalVotes(governanceProposal.contractAddress, governanceProposal.proposalId);
    }

}
