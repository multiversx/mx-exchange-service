import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class DistributionMilestoneModel {
    @Field()
    unlockEpoch: number;

    @Field()
    unlockPercentage: number;
}

@ObjectType()
export class CommunityDistributionModel {
    @Field()
    epoch: number;

    @Field()
    amount: string;

    @Field(type => [DistributionMilestoneModel])
    milestones: DistributionMilestoneModel[];
}

@ObjectType()
export class DistributionModel {
    @Field()
    address: string;

    @Field()
    communityDistribution: CommunityDistributionModel;
}
