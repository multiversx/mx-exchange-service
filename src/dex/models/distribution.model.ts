import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class CommunityDistributionModel {
    @Field()
    epoch: number;

    @Field()
    amount: string;
}

@ObjectType()
export class DistributionModel {
    @Field()
    address: string;

    @Field()
    communityDistribution: CommunityDistributionModel;
}
