import { ObjectType, Field, Int } from '@nestjs/graphql';
import { NftCollection } from '../../../models/tokens/nftCollection.model';

@ObjectType()
export class UnlockMileStoneModel {
    @Field(type => Int)
    epoch: number;
    @Field(type => Int)
    percent: number;

    constructor(init?: Partial<UnlockMileStoneModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class LockedAssetModel {
    @Field()
    address: string;

    @Field()
    lockedToken: NftCollection;

    @Field(type => [UnlockMileStoneModel])
    unlockMilestones: UnlockMileStoneModel[];

    @Field(type => Int)
    nftDepositMaxLen: number;

    @Field(type => [String])
    nftDepositAcceptedTokenIDs: string[];

    constructor(init?: Partial<LockedAssetModel>) {
        Object.assign(this, init);
    }
}
