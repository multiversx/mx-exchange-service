import { Field, Int, ObjectType } from '@nestjs/graphql';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';

@ObjectType()
export class PenaltyPercentage {
    @Field(() => Int)
    firstThreshold: number;
    @Field(() => Int)
    secondThreshold: number;
    @Field(() => Int)
    thirdThreshold: number;

    constructor(init: PenaltyPercentage) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class SimpleLockEnergyModel {
    @Field()
    address: string;
    @Field()
    baseAssetToken: EsdtToken;
    @Field()
    lockedToken: NftCollection;
    @Field()
    legacyLockedToken: NftCollection;
    @Field(() => [Int])
    lockOptions: number[];
    @Field(() => PenaltyPercentage)
    penaltyPercentage: PenaltyPercentage;
    @Field(() => Int)
    feesBurnPercentage: number;
    @Field()
    feesCollectorAddress: string;
    @Field(() => Int)
    lastEpochFeeSentToCollector: number;
    @Field()
    getFeesFromPenaltyUnlocking: string;
    @Field()
    pauseState: boolean;

    constructor(init?: Partial<SimpleLockEnergyModel>) {
        Object.assign(this, init);
    }
}