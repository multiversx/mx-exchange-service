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
export class UserEntryModel {
    @Field(() => Int)
    tokenNonce: number;
    @Field()
    stakedAmount: string;
    @Field()
    unstakedAmount: string;
    @Field({ nullable: true })
    unbondEpoch: number;

    constructor(init?: Partial<UserEntryModel>) {
        Object.assign(this, init);
    }
}
