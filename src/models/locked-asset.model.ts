import { ObjectType, Field, Int } from '@nestjs/graphql';
import { NftCollection } from './tokens/nftCollection.model';

@ObjectType()
export class UnlockMileStoneModel {
    @Field(type => Int)
    epoch: number;
    @Field(type => Int)
    percent: number;
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
}
