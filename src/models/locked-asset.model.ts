import { ObjectType, Field, Int } from '@nestjs/graphql';
import { NftToken } from './tokens/nftToken.model';

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
    lockedToken: NftToken;

    @Field(type => [UnlockMileStoneModel])
    unlockMilestones: UnlockMileStoneModel[];

    @Field(type => Int)
    nftDepositMaxLen: number;

    @Field(type => [String])
    nftDepositAcceptedTokenID: string[];
}
