import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class FactoryModel {
    @Field()
    address: string;

    @Field()
    pairCount: number;

    @Field()
    totalTxCount: number;

    @Field()
    totalVolume: number;

    @Field()
    totalLiquidity: number;

    constructor(init?: Partial<FactoryModel>) {
        Object.assign(this, init);
    }
}
