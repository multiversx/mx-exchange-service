import { ObjectType, Field, Int } from '@nestjs/graphql';
import { nestedFieldComplexity } from 'src/helpers/complexity/field.estimators';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';

@ObjectType()
export class UnlockMileStoneModel {
    @Field(() => Int)
    epochs: number;
    @Field()
    percent: number;
    @Field()
    unlockEpoch: number;

    constructor(init?: Partial<UnlockMileStoneModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class LockedAssetAttributesModel {
    @Field()
    attributes: string;
    @Field()
    identifier: string;
    @Field(() => [UnlockMileStoneModel], { complexity: nestedFieldComplexity })
    unlockSchedule: UnlockMileStoneModel[];
    @Field()
    isMerged: boolean;

    constructor(init?: Partial<LockedAssetAttributesModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class LockedAssetModel {
    @Field()
    address: string;

    @Field({ complexity: nestedFieldComplexity })
    assetToken: EsdtToken;

    @Field({ complexity: nestedFieldComplexity })
    lockedToken: NftCollection;

    @Field(() => [UnlockMileStoneModel], { complexity: nestedFieldComplexity })
    unlockMilestones: UnlockMileStoneModel[];

    @Field(() => Int)
    activationNonce: number;

    constructor(init?: Partial<LockedAssetModel>) {
        Object.assign(this, init);
    }
}
