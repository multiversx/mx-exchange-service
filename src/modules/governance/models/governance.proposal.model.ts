import { Field, Int, ObjectType } from '@nestjs/graphql';
import { GovernanceAction } from './governance.action.model';
import { EsdtTokenPaymentModel } from '../../tokens/models/esdt.token.payment.model';
import { ProposalVotes } from './proposal.votes.model'; //Assuming you will create GovernanceAction model separately

export enum GovernanceProposalStatus {
    None ='None',
    Pending ='Pending',
    Active ='Active',
    Defeated ='Defeated',
    DefeatedWithVeto ='DefeatedWithVeto',
    Succeeded ='Succeeded',
}

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
    @Field( () => GovernanceProposalStatus)
    status: GovernanceProposalStatus;
    @Field( () => ProposalVotes )
    votes: ProposalVotes;

    // user
    @Field()
    userAddress?: string;
    @Field()
    hasVoted?: boolean;

    constructor(init: Partial<GovernanceProposal>) {
        Object.assign(this, init);
    }
}
