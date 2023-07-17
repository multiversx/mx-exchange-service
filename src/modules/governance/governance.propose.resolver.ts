import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { GovernanceAbiService } from './services/governance.abi.service';
import { GovernanceProposal, GovernanceProposalStatus } from './models/governance.proposal.model';
import { ProposalVotes } from './models/proposal.votes.model';
import { GovernanceService } from './services/governance.service';
import { UseGuards } from '@nestjs/common';
import { JwtOrNativeAuthGuard } from '../auth/jwt.or.native.auth.guard';
import { UserAuthResult } from '../auth/user.auth.result';
import { AuthUser } from '../auth/auth.user';

@Resolver(() => GovernanceProposal)
export class GovernanceProposalResolver {
    constructor(
        private readonly governanceAbi: GovernanceAbiService,
        private readonly governanceService: GovernanceService,
    ) {
    }

    @ResolveField()
    async status(@Parent() governanceProposal: GovernanceProposal): Promise<GovernanceProposalStatus> {
        return this.governanceAbi.proposalStatus(governanceProposal.contractAddress, governanceProposal.proposalId);
    }

    @ResolveField()
    async votes(@Parent() governanceProposal: GovernanceProposal): Promise<ProposalVotes> {
        return this.governanceAbi.proposalVotes(governanceProposal.contractAddress, governanceProposal.proposalId);
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @ResolveField()
    async hasVoted(
        @AuthUser() user: UserAuthResult,
        @Parent() governanceProposal: GovernanceProposal
    ): Promise<boolean> {
        return this.governanceService.hasUserVoted(governanceProposal.contractAddress, governanceProposal.proposalId, user.address);
    }
}
