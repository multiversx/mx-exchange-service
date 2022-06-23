import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class FactoryModel {
    @Field()
    address: string;
    @Field()
    state: boolean;
    @Field()
    owner: string;
    @Field()
    temporaryOwnerPeriod: string;
    @Field()
    pairCount: number;
    @Field()
    pairCreationEnabled: boolean;
    @Field()
    pairTemplateAddress: string;
    @Field()
    totalTxCount: number;
    @Field()
    totalValueLockedUSD: string;
    @Field()
    totalVolumeUSD24h: string;
    @Field()
    totalFeesUSD24h: string;
    @Field()
    maintenance: boolean;
    @Field()
    lastErrorMessage: string;

    constructor(init?: Partial<FactoryModel>) {
        Object.assign(this, init);
    }
}
