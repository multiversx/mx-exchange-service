import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import {
    GovernanceMexV2ProposalModel,
    GovernanceProposalModel,
    GovernanceProposalStatus,
    VoteType,
} from '../models/governance.proposal.model';
import { ProposalVotes } from '../models/governance.proposal.votes.model';
import { GovernanceService } from '../services/governance.service';
import { UseGuards } from '@nestjs/common';
import { JwtOrNativeAuthGuard } from '../../auth/jwt.or.native.auth.guard';
import { UserAuthResult } from '../../auth/user.auth.result';
import { AuthUser } from '../../auth/auth.user';
import { GovernanceTokenSnapshotAbiService } from '../services/governance.abi.service';
import { GovernanceQuorumService } from '../services/governance.quorum.service';
import BigNumber from 'bignumber.js';
import { GovernanceTokenSnapshotMerkleService } from '../services/governance.token.snapshot.merkle.service';

@Resolver(() => GovernanceProposalModel)
export class GovernanceProposalResolver {
    constructor(
        private readonly governanceAbi: GovernanceTokenSnapshotAbiService,
        private readonly governanceService: GovernanceService,
        private readonly governanceQuorum: GovernanceQuorumService,
        private readonly governaneMerkle: GovernanceTokenSnapshotMerkleService,
    ) {
    }

    @ResolveField()
    async status(@Parent() governanceProposal: GovernanceProposalModel): Promise<GovernanceProposalStatus> {
        return this.governanceAbi.proposalStatus(governanceProposal.contractAddress, governanceProposal.proposalId);
    }

    @ResolveField()
    async rootHash(@Parent() governanceProposal: GovernanceProposalModel): Promise<string> {
        return this.governanceAbi.proposalRootHash(governanceProposal.contractAddress, governanceProposal.proposalId);
    }

    @ResolveField()
    async totalBalance(@Parent() governanceProposal: GovernanceProposalModel): Promise<string> {
        const rootHash = await this.governanceAbi.proposalRootHash(governanceProposal.contractAddress, governanceProposal.proposalId);
        const mt = await this.governaneMerkle.getMerkleTree(rootHash);
        return mt.getTotalBalance();
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
        const rootHash = await this.governanceAbi.proposalRootHash(governanceProposal.contractAddress, governanceProposal.proposalId);
        const userQuorum = await this.governanceQuorum.userQuorum(governanceProposal.contractAddress, user.address, rootHash);
        return new BigNumber(userQuorum).integerValue().toFixed();
    }
}

@Resolver(() => GovernanceMexV2ProposalModel)
export class GovernanceMexV2ProposalResolver {
    constructor(
        private readonly governanceService: GovernanceService,
    ) {
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @ResolveField()
    async hasVoted(
        @AuthUser() user: UserAuthResult,
        @Parent() governanceProposal: GovernanceMexV2ProposalModel
    ): Promise<boolean> {
        return this.governanceService.hasUserVoted(governanceProposal.contractAddress, governanceProposal.proposalId, user.address);
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @ResolveField()
    async userVoteType(
        @AuthUser() user: UserAuthResult,
        @Parent() governanceProposal: GovernanceMexV2ProposalModel
    ): Promise<VoteType> {
        return this.governanceService.userVote(governanceProposal.contractAddress, governanceProposal.proposalId, user.address);
    }
}
