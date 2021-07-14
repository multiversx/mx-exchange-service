import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class EsdtToken {
    @Field() identifier: string;
    @Field() name: string;
    @Field() owner: string;
    @Field() minted: string;
    @Field() burnt: string;
    @Field() decimals: number;
    @Field() isPaused: boolean;
    @Field() canUpgrade: boolean;
    @Field() canMint: boolean;
    @Field() canBurn: boolean;
    @Field() canChangeOwner: boolean;
    @Field() canPause: boolean;
    @Field() canFreeze: boolean;
    @Field() canWipe: boolean;
    @Field({ nullable: true }) type: string;
    @Field({ nullable: true }) balance?: string;
}
