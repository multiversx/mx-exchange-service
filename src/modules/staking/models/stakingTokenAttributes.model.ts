import { StakingFarmTokenType } from '@multiversx/sdk-exchange';
import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';

registerEnumType(StakingFarmTokenType, { name: 'StakingTokenType' });

@ObjectType()
export class StakingTokenAttributesModel {
    @Field({ nullable: true })
    identifier?: string;
    @Field({ nullable: true })
    attributes?: string;
    @Field(() => StakingFarmTokenType)
    type: StakingFarmTokenType;
    @Field()
    rewardPerShare: string;
    @Field()
    compoundedReward: string;
    @Field()
    currentFarmAmount: string;

    constructor(init?: Partial<StakingTokenAttributesModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class UnbondTokenAttributesModel {
    @Field({ nullable: true })
    identifier?: string;
    @Field({ nullable: true })
    attributes?: string;
    @Field(() => StakingFarmTokenType)
    type: StakingFarmTokenType;
    @Field(() => Int)
    remainingEpochs: number;

    constructor(init?: Partial<UnbondTokenAttributesModel>) {
        Object.assign(this, init);
    }
}
