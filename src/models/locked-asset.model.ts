import { ObjectType, Field, Int } from '@nestjs/graphql';
import { NFTTokenModel } from './nftToken.model';

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
    lockedToken: NFTTokenModel;

    @Field(type => [UnlockMileStoneModel])
    unlockMilestones: UnlockMileStoneModel[];
}
