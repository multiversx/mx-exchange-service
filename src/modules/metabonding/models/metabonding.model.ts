import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class MetabondingStakingModel {
    @Field()
    address: string;

    @Field()
    lockedAssetTokenID: string;

    @Field()
    lockedAssetTokenSupply: string;

    constructor(init?: Partial<MetabondingStakingModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class StakedUserPosition {
    @Field(() => Int)
    nonce: number;
    @Field()
    amount: string;
    @Field({ nullable: true })
    unbondEpoch: number;

    constructor(init?: Partial<StakedUserPosition>) {
        Object.assign(this, init);
    }
}
