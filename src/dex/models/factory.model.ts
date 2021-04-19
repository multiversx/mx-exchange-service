import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class DexFactoryModel {
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
}