import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class TokenUnstakeModel {
    @Field()
    address: string;
    @Field(() => Int)
    unbondEpochs: number;
    @Field(() => Int)
    feesBurnPercentage: number;
    @Field()
    feesCollectorAddress: string;
    @Field(() => Int)
    lastEpochFeeSentToCollector: number;
    @Field()
    energyFactoryAddress: string;

    constructor(init?: Partial<TokenUnstakeModel>) {
        Object.assign(this, init);
    }
}
