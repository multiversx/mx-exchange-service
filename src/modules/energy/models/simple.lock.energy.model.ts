import { Field, Int, ObjectType } from '@nestjs/graphql';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';

@ObjectType()
export class LockOption {
    @Field(() => Int)
    lockEpochs: number;
    @Field(() => Int)
    penaltyStartPercentage: number;

    constructor(init: LockOption) {
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
    @Field(() => [LockOption])
    lockOptions: LockOption[];
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
