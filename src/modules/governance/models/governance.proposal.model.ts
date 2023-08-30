import { ArgsType, Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { GovernanceAction } from './governance.action.model';
import { EsdtTokenPaymentModel } from '../../tokens/models/esdt.token.payment.model';
import { ProposalVotes } from './governance.proposal.votes.model';
import { GovernanceDescriptionUnion } from './governance.union';

export enum GovernanceProposalStatus {
    None ='None',
    Pending ='Pending',
    Active ='Active',
    Defeated ='Defeated',
    DefeatedWithVeto ='DefeatedWithVeto',
    Succeeded ='Succeeded',
}

registerEnumType(GovernanceProposalStatus, { name: 'GovernanceProposalStatus' });

export enum VoteType {
    UpVote,
    DownVote,
    DownVetoVote,
    AbstainVote,
    NotVoted,
}

registerEnumType(GovernanceProposalStatus, { name: 'VoteType' });

@ObjectType()
export class DescriptionV0 {
    @Field()
    title: string;
    @Field(() => Int)
    strapiId: number;
    @Field()
    version: number;

    constructor(init: Partial<DescriptionV0>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class DescriptionV1 extends DescriptionV0 {
    @Field()
    shortDescription: string;

    constructor(init: Partial<DescriptionV1>) {
        super(init);
        Object.assign(this, init);
    }
}

@ArgsType()
export class VoteArgs {
    @Field()
    contractAddress: string;
    @Field()
    proposalId: number;
    @Field()
    vote: VoteType;
}

@ObjectType()
export class GovernanceProposalModel {
    @Field()
    contractAddress: string;
    @Field()
    proposalId: number;
    @Field()
    proposer: string;
    @Field(() => [GovernanceAction])
    actions: GovernanceAction[];
    @Field( () => GovernanceDescriptionUnion)
    description: typeof GovernanceDescriptionUnion;
    @Field(() => EsdtTokenPaymentModel)
    feePayment: EsdtTokenPaymentModel;
    @Field()
    minimumQuorumPercentage: string;
    @Field(() => Int)
    votingDelayInBlocks: number;
    @Field(() => Int)
    votingPeriodInBlocks: number;
    @Field(() => Int)
    withdrawPercentageDefeated: number;
    @Field()
    totalQuorum: string;
    @Field(() => Int)
    proposalStartBlock: number;
    @Field()
    status: GovernanceProposalStatus;
    @Field()
    rootHash: string;
    @Field( () => ProposalVotes )
    votes: ProposalVotes;
    @Field()
    hasVoted?: boolean;
    @Field()
    userVoteType?: VoteType;
    @Field()
    userVotingPower?: string;

    constructor(init: Partial<GovernanceProposalModel>) {
        Object.assign(this, init);
    }
}
