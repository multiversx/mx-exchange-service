import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class FarmTokenAttributesModel {
    @Field({ nullable: true })
    identifier?: string;
    @Field({ nullable: true })
    attributes?: string;
    @Field()
    rewardPerShare: string;
    @Field(() => Int)
    originalEnteringEpoch: number;
    @Field(() => Int)
    enteringEpoch: number;
    @Field(() => Int, { nullable: true })
    aprMultiplier: number;
    @Field({ nullable: true })
    lockedRewards: boolean;
    @Field()
    initialFarmingAmount: string;
    @Field()
    compoundedReward: string;
    @Field()
    currentFarmAmount: string;

    constructor(init?: Partial<FarmTokenAttributesModel>) {
        Object.assign(this, init);
    }
}
