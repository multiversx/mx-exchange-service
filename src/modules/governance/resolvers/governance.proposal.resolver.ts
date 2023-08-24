import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import {
    GovernanceLKMEXProposalModel,
    GovernanceProposalModel,
    GovernanceProposalStatus,
    VoteType,
} from '../models/governance.proposal.model';
import { ProposalVotes } from '../models/governance.proposal.votes.model';
import { UseGuards } from '@nestjs/common';
import { JwtOrNativeAuthGuard } from '../../auth/jwt.or.native.auth.guard';
import { UserAuthResult } from '../../auth/user.auth.result';
import { AuthUser } from '../../auth/auth.user';
import { GovernanceTokenSnapshotMerkleService } from '../services/governance.token.snapshot.merkle.service';
import { GovernanceAbiFactory } from '../services/governance.abi.factory';
import { GovernanceServiceFactory } from '../services/governance.factory';
import { GovernanceEnergyService } from '../services/governance.service';

@Resolver(() => GovernanceProposalModel)
export class GovernanceProposalResolver {
    constructor(
        private readonly governanceAbiFactory: GovernanceAbiFactory,
        private readonly governanceServiceFactory: GovernanceServiceFactory,
        private readonly governaneMerkle: GovernanceTokenSnapshotMerkleService,
    ) {
    }

    @ResolveField()
    async status(@Parent() governanceProposal: GovernanceProposalModel): Promise<GovernanceProposalStatus> {
        return this.governanceAbiFactory
            .useAbi(governanceProposal.contractAddress)
            .proposalStatus(governanceProposal.contractAddress, governanceProposal.proposalId);
    }

    @ResolveField()
    async rootHash(@Parent() governanceProposal: GovernanceProposalModel): Promise<string> {
        return this.governanceAbiFactory
            .useAbi(governanceProposal.contractAddress)
            .proposalRootHash(governanceProposal.contractAddress, governanceProposal.proposalId);
    }

    @ResolveField()
    async totalBalance(@Parent() governanceProposal: GovernanceProposalModel): Promise<string> {
        const rootHash = await this.governanceAbiFactory
            .useAbi(governanceProposal.contractAddress)
            .proposalRootHash(governanceProposal.contractAddress, governanceProposal.proposalId);
        const mt = await this.governaneMerkle.getMerkleTree(rootHash);
        return mt.getTotalBalance();
    }

    @ResolveField()
    async votes(@Parent() governanceProposal: GovernanceProposalModel): Promise<ProposalVotes> {
        return this.governanceAbiFactory
            .useAbi(governanceProposal.contractAddress)
            .proposalVotes(governanceProposal.contractAddress, governanceProposal.proposalId);
    }

    @ResolveField()
    async totalVotingPower(@Parent() governanceProposal: GovernanceProposalModel): Promise<string> {
        return this.governanceServiceFactory
            .userService(governanceProposal.contractAddress)
            .totalVotingPower(governanceProposal.contractAddress, governanceProposal.proposalId);
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @ResolveField()
    async hasVoted(
        @AuthUser() user: UserAuthResult,
        @Parent() governanceProposal: GovernanceProposalModel
    ): Promise<boolean> {
        return this.governanceServiceFactory
            .userService(governanceProposal.contractAddress)
            .hasUserVoted(governanceProposal.contractAddress, governanceProposal.proposalId, user.address);
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @ResolveField()
    async userVoteType(
        @AuthUser() user: UserAuthResult,
        @Parent() governanceProposal: GovernanceProposalModel
    ): Promise<VoteType> {
        return this.governanceServiceFactory
            .userService(governanceProposal.contractAddress)
            .userVote(governanceProposal.contractAddress, governanceProposal.proposalId, user.address);
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @ResolveField()
    async userVotingPower(
        @AuthUser() user: UserAuthResult,
        @Parent() governanceProposal: GovernanceProposalModel
    ): Promise<string> {
        return this.governanceServiceFactory
            .userService(governanceProposal.contractAddress)
            .userVotingPower(governanceProposal.contractAddress, governanceProposal.proposalId, user.address);
    }
}

@Resolver(() => GovernanceLKMEXProposalModel)
export class GovernanceLKMEXProposalResolver {
    constructor(
        private readonly governanceService: GovernanceEnergyService,
    ) {
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @ResolveField()
    async hasVoted(
        @AuthUser() user: UserAuthResult,
        @Parent() governanceProposal: GovernanceLKMEXProposalModel
    ): Promise<boolean> {
        const userVoteType = await this.governanceService.userVote(governanceProposal.contractAddress, governanceProposal.proposalId, user.address);
        return userVoteType !== VoteType.NotVoted;
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @ResolveField()
    async userVoteType(
        @AuthUser() user: UserAuthResult,
        @Parent() governanceProposal: GovernanceLKMEXProposalModel
    ): Promise<VoteType> {
        return this.governanceService.userVote(governanceProposal.contractAddress, governanceProposal.proposalId, user.address);
    }
}
