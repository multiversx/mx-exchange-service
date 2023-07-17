import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { GovernanceProposal } from './governance.proposal.model';

export enum GovernanceType {
    ENERGY = 'energy',
    TOKEN = 'token',
}

registerEnumType(GovernanceType, { name: 'GovernanceType' });

@ObjectType()
export class EnergyContract {
    @Field()
    address: string;
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

    constructor(init: Partial<EnergyContract>) {
        Object.assign(this, init);
    }
}
