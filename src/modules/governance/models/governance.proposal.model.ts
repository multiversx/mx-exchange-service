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
}

registerEnumType(GovernanceProposalStatus, { name: 'VoteType' });

@ObjectType()
export class Description_v0 {
    @Field()
    title: string;
    @Field()
    hash: string;
    @Field(() => Int)
    strapiId: number;

    constructor(init: Partial<Description_v0>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class Description_v1 extends Description_v0 {
    @Field()
    shortDescription: string;

    constructor(init: Partial<Description_v1>) {
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
    minimumQuorum: string;
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
    @Field( () => ProposalVotes )
    votes: ProposalVotes;
    @Field()
    hasVoted?: boolean;
    @Field()
    userVotingPower?: string;

    constructor(init: Partial<GovernanceProposalModel>) {
        Object.assign(this, init);
    }
}
