import { ArgsType, Field, Int } from '@nestjs/graphql';

@ArgsType()
export class CalculateRewardsArgs {
    @Field()
    farmAddress: string;
    @Field()
    liquidity: string;
    @Field()
    identifier: string;
    @Field()
    attributes: string;
}

@ArgsType()
export class EnterFarmArgs {
    @Field()
    farmAddress: string;
    @Field()
    tokenInID: string;
    @Field()
    amount: string;
    @Field({ nullable: true })
    lockRewards: boolean;
}

@ArgsType()
export class SftFarmInteractionArgs {
    @Field()
    farmAddress: string;
    @Field()
    sender: string;
    @Field()
    farmTokenID: string;
    @Field(type => Int)
    farmTokenNonce: number;
    @Field()
    amount: string;
}

@ArgsType()
export class ExitFarmArgs extends SftFarmInteractionArgs {}

@ArgsType()
export class ClaimRewardsArgs extends SftFarmInteractionArgs {}
