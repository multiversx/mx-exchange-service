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
    totalValueLockedUSD: string;
    @Field()
    totalVolumeUSD24h: string;
    @Field()
    totalFeesUSD24h: string;

    constructor(init?: Partial<FactoryModel>) {
        Object.assign(this, init);
    }
}
