import { Field, Int, ObjectType } from '@nestjs/graphql';
import { GovernanceProposal } from './governance.proposal.model';

export enum GovernanceType {
    ENERGY = 'energy',
    TOKEN = 'token',
}

@ObjectType()
export class GovernanceContract {
    @Field()
    address: string;
    @Field()
    userAddress?: string;
    @Field()
    minEnergyForPropose: string;
    @Field()
    minFeeForPropose: string;
    @Field()
    quorum: string;
    @Field(() => Int)
    votingDelayInBlocks: number;
    @Field(() => Int)
    votingPeriodInBlocks: number;
    @Field()
    feeTokenId: string;
    @Field(() => Int)
    withdrawPercentageDefeated: number;
    @Field(() => [GovernanceProposal])
    proposals: GovernanceProposal[];
    @Field()
    feesCollectorAddress: string;
    @Field()
    energyFactoryAddress: string;

    constructor(init: Partial<GovernanceContract>) {
        Object.assign(this, init);
    }
}
