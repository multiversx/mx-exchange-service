import { Field, Int, ObjectType } from '@nestjs/graphql';
import { NftCollection } from 'src/models/tokens/nftCollection.model';

@ObjectType()
export class MetabondingStakingModel {
    @Field()
    address: string;

    @Field()
    lockedAssetToken: NftCollection;

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
