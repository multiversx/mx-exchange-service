import {
    BigUIntType,
    FieldDefinition,
    StructType,
    U64Type,
} from '@elrondnetwork/erdjs/out';
import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';

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
    @Field()
    pauseState: boolean;

    constructor(init?: Partial<SimpleLockEnergyModel>) {
        Object.assign(this, init);
    }
}
