import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { GovernanceProposalModel, GovernanceProposalStatus, VoteType } from '../models/governance.proposal.model';
import { ProposalVotes } from '../models/governance.proposal.votes.model';
import { GovernanceService } from '../services/governance.service';
import { UseGuards } from '@nestjs/common';
import { JwtOrNativeAuthGuard } from '../../auth/jwt.or.native.auth.guard';
import { UserAuthResult } from '../../auth/user.auth.result';
import { AuthUser } from '../../auth/auth.user';
import { GovernanceTokenSnapshotAbiService } from '../services/governance.abi.service';
import { GovernanceQuorumService } from '../services/governance.quorum.service';
import BigNumber from 'bignumber.js';

@Resolver(() => GovernanceProposalModel)
export class GovernanceProposalResolver {
    constructor(
        protected readonly governanceAbi: GovernanceTokenSnapshotAbiService,
        protected readonly governanceService: GovernanceService,
        protected readonly governanceQuorum: GovernanceQuorumService,
    ) {
    }

    @ResolveField()
    async status(@Parent() governanceProposal: GovernanceProposalModel): Promise<GovernanceProposalStatus> {
        return this.governanceAbi.proposalStatus(governanceProposal.contractAddress, governanceProposal.proposalId);
    }

    @ResolveField()
    async votes(@Parent() governanceProposal: GovernanceProposalModel): Promise<ProposalVotes> {
        return this.governanceAbi.proposalVotes(governanceProposal.contractAddress, governanceProposal.proposalId);
    }

    @ResolveField()
    async totalVotingPower(@Parent() governanceProposal: GovernanceProposalModel): Promise<string> {
        return this.governanceAbi.totalVotingPower(governanceProposal.contractAddress, governanceProposal.proposalId);
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @ResolveField()
    async hasVoted(
        @AuthUser() user: UserAuthResult,
        @Parent() governanceProposal: GovernanceProposalModel
    ): Promise<boolean> {
        return this.governanceService.hasUserVoted(governanceProposal.contractAddress, governanceProposal.proposalId, user.address);
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @ResolveField()
    async userVoteType(
        @AuthUser() user: UserAuthResult,
        @Parent() governanceProposal: GovernanceProposalModel
    ): Promise<VoteType> {
        return this.governanceService.userVote(governanceProposal.contractAddress, governanceProposal.proposalId, user.address);
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @ResolveField()
    async userVotingPower(
        @AuthUser() user: UserAuthResult,
        @Parent() governanceProposal: GovernanceProposalModel
    ): Promise<string> {
        const userQuorum = await this.governanceQuorum.userQuorum(governanceProposal.contractAddress, governanceProposal.proposalId, user.address);
        return new BigNumber(userQuorum).integerValue().toFixed();
    }
}
