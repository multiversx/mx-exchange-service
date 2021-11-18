import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class CommunityDistributionModel {
    @Field()
    epoch: number;

    @Field()
    amount: string;

    constructor(init?: Partial<CommunityDistributionModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class DistributionModel {
    @Field()
    address: string;

    @Field()
    communityDistribution: CommunityDistributionModel;

    constructor(init?: Partial<DistributionModel>) {
        Object.assign(this, init);
    }
}
