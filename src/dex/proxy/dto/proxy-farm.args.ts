import { ArgsType, Field, Int } from '@nestjs/graphql';

@ArgsType()
export class EnterFarmProxyArgs {
    @Field() sender: string;
    @Field() farmAddress: string;
    @Field() acceptedLockedTokenID: string;
    @Field(type => Int)
    acceptedLockedTokenNonce: number;
    @Field() amount: string;
    @Field({ nullable: true }) lockRewards: boolean;
}

@ArgsType()
export class ExitFarmProxyArgs {
    @Field() sender: string;
    @Field() farmAddress: string;
    @Field() wrappedFarmTokenID: string;
    @Field(type => Int)
    wrappedFarmTokenNonce: number;
    @Field() amount: string;
}

@ArgsType()
export class ClaimFarmRewardsProxyArgs {
    @Field() sender: string;
    @Field() farmAddress: string;
    @Field() wrappedFarmTokenID: string;
    @Field(type => Int)
    wrappedFarmTokenNonce: number;
    @Field() amount: string;
}
