import { ObjectType, Field, Int } from '@nestjs/graphql';
import { EsdtToken } from 'src/models/tokens/esdtToken.model';
import { NftCollection } from '../../../models/tokens/nftCollection.model';

@ObjectType()
export class UnlockMileStoneModel {
    @Field(() => Int)
    epochs: number;
    @Field()
    percent: number;

    constructor(init?: Partial<UnlockMileStoneModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class LockedAssetAttributes {
    @Field()
    attributes: string;
    @Field()
    identifier: string;
    @Field(() => [UnlockMileStoneModel])
    unlockSchedule: UnlockMileStoneModel[];
    @Field()
    isMerged: boolean;

    constructor(init?: Partial<LockedAssetAttributes>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class LockedAssetModel {
    @Field()
    address: string;

    @Field()
    assetToken: EsdtToken;

    @Field()
    lockedToken: NftCollection;

    @Field(() => [UnlockMileStoneModel])
    unlockMilestones: UnlockMileStoneModel[];

    constructor(init?: Partial<LockedAssetModel>) {
        Object.assign(this, init);
    }
}
