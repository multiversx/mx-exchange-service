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
