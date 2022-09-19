import {
    BigUIntType,
    FieldDefinition,
    StructType,
    U64Type,
} from '@elrondnetwork/erdjs/out';
import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SimpleLockEnergyModel {
    @Field()
    address: string;
    @Field()
    lockedTokenID: string;
    @Field()
    baseAssetTokenID: string;
    @Field(() => [Int])
    lockOptions: number[];
}

@ObjectType()
export class Energy {
    @Field()
    amount: string;
    @Field(() => Int)
    lastUpdateEpoch: number;
    @Field()
    totalLockedTokens: string;

    constructor(init?: Partial<Energy>) {
        Object.assign(this, init);
    }

    static getStructure(): StructType {
        return new StructType('Energy', [
            new FieldDefinition('amount', '', new BigUIntType()),
            new FieldDefinition('lastUpdateEpoch', '', new U64Type()),
            new FieldDefinition('totalLockedTokens', '', new BigUIntType()),
        ]);
    }
}
