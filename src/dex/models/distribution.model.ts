import { ObjectType, Field } from '@nestjs/graphql';
import { TokenModel } from './pair.model';

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
    distributedToken: TokenModel;

    @Field()
    lockedToken: TokenModel;

    @Field()
    wrappedLpToken: TokenModel;

    @Field()
    wrappedFarmToken: TokenModel;

    @Field(type => [TokenModel])
    acceptedLockedTokens: TokenModel[];

    @Field(type => [String])
    intermediatedPairs: string[];

    @Field(type => [String])
    intermediatedFarms: string[];

    @Field()
    communityDistribution: CommunityDistributionModel;
}
