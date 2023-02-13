import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class EscrowModel {
    @Field()
    address: string;
    @Field()
    energyFactoryAddress: string;
    @Field()
    lockedTokenID: string;
    @Field()
    minLockEpochs: number;
    @Field()
    epochsCooldownDuration: number;
}
