import {
    BigUIntType,
    FieldDefinition,
    StructType,
    U64Type,
} from '@multiversx/sdk-core';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { constantsConfig } from 'src/config';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';

@ObjectType()
export class MetabondingStakingModel {
    @Field()
    address: string;

    @Field()
    lockedAssetToken: NftCollection;

    @Field()
    lockedAssetTokenSupply: string;

    @Field(() => Int)
    unbondEpochs = constantsConfig.UNBOND_EPOCHS;

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

    static getStructure(): StructType {
        return new StructType('UserEntry', [
            new FieldDefinition('tokenNonce', '', new U64Type()),
            new FieldDefinition('stakeAmount', '', new BigUIntType()),
            new FieldDefinition('unstakeAmount', '', new BigUIntType()),
            new FieldDefinition('unbondEpoch', '', new U64Type()),
        ]);
    }
}
