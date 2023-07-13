import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { GovernanceAbiService } from './services/governance.abi.service';
import { GovernanceProposal } from './models/governance.proposal.model';
import { ProposalVotes } from './models/proposal.votes.model';
import { GovernanceService } from './services/governance.service';

@Resolver(() => GovernanceProposal)
export class GovernanceProposalResolver {
    constructor(
        private readonly governanceAbi: GovernanceAbiService,
        private readonly governanceService: GovernanceService,
    ) {
    }

    @ResolveField()
    async status(@Parent() governanceProposal: GovernanceProposal): Promise<string> {
        return this.governanceAbi.proposalStatus(governanceProposal.contractAddress, governanceProposal.proposalId);
    }

    @ResolveField()
    async votes(@Parent() governanceProposal: GovernanceProposal): Promise<ProposalVotes> {
        return this.governanceAbi.proposalVotes(governanceProposal.contractAddress, governanceProposal.proposalId);
    }

    @ResolveField()
    async hasVoted(@Parent() governanceProposal: GovernanceProposal): Promise<boolean> {
        return this.governanceService.hasUserVoted(governanceProposal.contractAddress, governanceProposal.proposalId, governanceProposal.userAddress);
    }
}
