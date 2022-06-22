import { Field, Int, ObjectType } from '@nestjs/graphql';

export enum EsdtTokenType {
    FungibleToken = 'FungibleESDT',
    FungibleLpToken = 'FungibleESDT-LP',
}

@ObjectType()
export class AssetsModel {
    @Field({ nullable: true }) website: string;
    @Field({ nullable: true }) description: string;
    @Field({ nullable: true }) status: string;
    @Field({ nullable: true }) pngUrl: string;
    @Field({ nullable: true }) svgUrl: string;
    @Field(() => [String], { nullable: true }) lockedAccounts: string[];
    @Field(() => [String], { nullable: true }) extraTokens: string[];

    constructor(init?: Partial<AssetsModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class RolesModel {
    @Field({ nullable: true }) address: string;
    @Field({ nullable: true }) canMint: boolean;
    @Field({ nullable: true }) canBurn: boolean;
    @Field(() => [String], { nullable: true }) roles: string[];

    constructor(init?: Partial<RolesModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class EsdtToken {
    @Field() identifier: string;
    @Field() name: string;
    @Field() ticker: string;
    @Field() owner: string;
    @Field() minted: string;
    @Field() burnt: string;
    @Field() initialMinted: string;
    @Field() decimals: number;
    @Field() price: string;
    @Field() supply: string;
    @Field() circulatingSupply: string;
    @Field(() => AssetsModel, { nullable: true }) assets: AssetsModel;
    @Field(() => Int) transactions: number;
    @Field(() => Int) accounts: number;
    @Field() isPaused: boolean;
    @Field() canUpgrade: boolean;
    @Field() canMint: boolean;
    @Field() canBurn: boolean;
    @Field() canChangeOwner: boolean;
    @Field() canPause: boolean;
    @Field() canFreeze: boolean;
    @Field() canWipe: boolean;
    @Field(() => RolesModel, { nullable: true }) roles: RolesModel;
    @Field({ nullable: true }) type: string;
    @Field({ nullable: true }) balance?: string;

    constructor(init?: Partial<EsdtToken>) {
        Object.assign(this, init);
    }
}
