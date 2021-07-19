import { ArgsType, Field, Int, registerEnumType } from '@nestjs/graphql';

export enum SmartContractType {
    FARM,
    LOCKED_ASSET_FACTORY,
    PROXY_PAIR,
    PROXY_FARM,
}

registerEnumType(SmartContractType, {
    name: 'SmartContractType',
});

@ArgsType()
export class TokensMergingArgs {
    @Field(type => SmartContractType)
    smartContractType: SmartContractType;
    @Field({ nullable: true })
    address?: string;
}

@ArgsType()
export class UserNftDepositArgs {
    @Field()
    userAddress: string;
}

@ArgsType()
export class WithdrawTokenFromDepositArgs extends TokensMergingArgs {
    @Field(type => Int)
    tokenIndex: number;
}

@ArgsType()
export class SftInteractionArgs extends TokensMergingArgs {
    @Field()
    sender: string;
    @Field()
    tokenID: string;
    @Field(type => Int)
    tokenNonce: number;
    @Field()
    amount: string;
}

@ArgsType()
export class DepositTokenArgs extends SftInteractionArgs {}
