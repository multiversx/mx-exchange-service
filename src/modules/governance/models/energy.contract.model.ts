import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { GovernanceProposal } from './governance.proposal.model';
import { EsdtToken } from '../../tokens/models/esdtToken.model';

export enum GovernanceType {
    ENERGY = 'energy',
    TOKEN = 'token',
}

registerEnumType(GovernanceType, { name: 'GovernanceType' });

@ObjectType()
export class GovernanceEnergyContract {
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
    feeToken: EsdtToken;
    @Field(() => Int)
    withdrawPercentageDefeated: number;
    @Field(() => [GovernanceProposal])
    proposals: GovernanceProposal[];
    @Field()
    feesCollectorAddress: string;
    @Field()
    energyFactoryAddress: string;

    constructor(init: Partial<GovernanceEnergyContract>) {
        Object.assign(this, init);
    }
}
