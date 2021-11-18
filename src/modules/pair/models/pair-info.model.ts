import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class PairInfoModel {
    @Field()
    reserves0: string;

    @Field()
    reserves1: string;

    @Field()
    totalSupply: string;

    constructor(init?: Partial<PairInfoModel>) {
        Object.assign(this, init);
    }
}
