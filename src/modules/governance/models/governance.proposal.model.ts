import { ArgsType, Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { GovernanceAction } from './governance.action.model';
import { EsdtTokenPaymentModel } from '../../tokens/models/esdt.token.payment.model';
import { ProposalVotes } from './proposal.votes.model';

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
export class Description {
    @Field()
    title: string;
    @Field()
    hash: string;
    @Field(() => Int)
    strapiId: number;

    constructor(init: Partial<Description>) {
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
export class GovernanceProposal {
    @Field()
    contractAddress: string;
    @Field()
    proposalId: number;
    @Field()
    proposer: string;
    @Field(() => [GovernanceAction])
    actions: GovernanceAction[];
    @Field( () => Description)
    description: Description;
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
    totalEnergy: string;
    @Field(() => Int)
    proposalStartBlock: number;
    @Field()
    status: GovernanceProposalStatus;
    @Field( () => ProposalVotes )
    votes: ProposalVotes;
    @Field()
    hasVoted?: boolean;

    constructor(init: Partial<GovernanceProposal>) {
        Object.assign(this, init);
    }
}
