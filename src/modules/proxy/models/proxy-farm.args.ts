import { ArgsType, Field, Int } from '@nestjs/graphql';
import { InputTokenModel } from 'src/models/inputToken.model';

@ArgsType()
export class EnterFarmProxyArgs {
    @Field()
    farmAddress: string;
    @Field(type => [InputTokenModel])
    tokens: Array<InputTokenModel>;
    @Field({ nullable: true })
    lockRewards: boolean;
}

@ArgsType()
export class ExitFarmProxyArgs {
    @Field() farmAddress: string;
    @Field() wrappedFarmTokenID: string;
    @Field(type => Int)
    wrappedFarmTokenNonce: number;
    @Field() amount: string;
}

@ArgsType()
export class ClaimFarmRewardsProxyArgs {
    @Field() farmAddress: string;
    @Field() wrappedFarmTokenID: string;
    @Field(type => Int)
    wrappedFarmTokenNonce: number;
    @Field() amount: string;
}

@ArgsType()
export class CompoundRewardsProxyArgs {
    @Field()
    farmAddress: string;
    @Field()
    tokenID: string;
    @Field(type => Int)
    tokenNonce: number;
    @Field()
    amount: string;
}
