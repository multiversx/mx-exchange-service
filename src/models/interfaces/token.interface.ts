import { Field, InterfaceType } from '@nestjs/graphql';

@InterfaceType()
export abstract class BaseToken {
    @Field() token: string;
    @Field() name: string;
    @Field() type: string;
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
    @Field({ nullable: true }) balance?: string;
    @Field({ nullable: true }) identifier?: string;
}
