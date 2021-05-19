import { Field, Int, ObjectType } from '@nestjs/graphql';
import { TokenModel } from './pair.model';

@ObjectType()
export class FarmModel {
    @Field()
    address: string;

    @Field(() => TokenModel)
    farmedToken: TokenModel;

    @Field()
    farmToken: TokenModel;

    @Field()
    acceptedToken: TokenModel;

    @Field()
    state: string;
}

@ObjectType()
export class FarmTokenAttributesModel {
    @Field()
    totalEnteringAmount: string;
    @Field()
    totalLiquidityAmount: string;
    @Field(type => Int)
    enteringEpoch: number;
    @Field(type => Int)
    liquidityMultiplier: number;
    @Field()
    lockedRewards: boolean;
}
