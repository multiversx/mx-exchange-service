import { Field, Int, ObjectType } from '@nestjs/graphql';
import { GovernanceProposalModel } from './governance.proposal.model';
import { EsdtToken } from '../../tokens/models/esdtToken.model';

@ObjectType()
export class GovernanceTokenSnapshotContract {
    @Field()
    address: string;
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
    @Field(() => [GovernanceProposalModel])
    proposals: GovernanceProposalModel[];

    constructor(init: Partial<GovernanceTokenSnapshotContract>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class GovernanceEnergyContract extends GovernanceTokenSnapshotContract {
    @Field()
    minEnergyForPropose: string;
    @Field()
    feesCollectorAddress: string;
    @Field()
    energyFactoryAddress: string;

    constructor(init: Partial<GovernanceEnergyContract>) {
        super(init);
        Object.assign(this, init);
    }
}
