import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class LockOptionModel {
    @Field(type => Int)
    epochs: number;
    @Field()
    interest: number;
}

@ObjectType()
export class LockedRewardsModel {
    @Field(type => [LockOptionModel])
    lockOptions: LockOptionModel[];
}
