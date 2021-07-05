import { ArgsType, Field, Int, registerEnumType } from '@nestjs/graphql';

export enum SmartContractType {
    FARM,
    LOCKED_ASSET_FACTORY,
    PROXY,
}

registerEnumType(SmartContractType, {
    name: 'SmartContractType',
});

@ArgsType()
export class BaseNftDepositArgs {
    @Field(type => SmartContractType)
    smartContractType: SmartContractType;
    @Field({ nullable: true })
    address?: string;
}

@ArgsType()
export class NftDepositArgs extends BaseNftDepositArgs {
    @Field()
    userAddress: string;
}

@ArgsType()
export class WithdrawTokensFromDepositArgs {
    @Field(type => SmartContractType)
    smartContractType: SmartContractType;
    @Field({ nullable: true })
    address?: string;
}

@ArgsType()
export class WithdrawTokenFromDepositArgs extends WithdrawTokensFromDepositArgs {
    @Field(type => Int)
    tokenIndex: number;
}

@ArgsType()
export class SftInteractionArgs {
    @Field(type => SmartContractType)
    smartContractType: SmartContractType;
    @Field({ nullable: true })
    address?: string;
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

@ArgsType()
export class CompoundRewardsArgs extends SftInteractionArgs {}
