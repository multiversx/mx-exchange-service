import { Field, InterfaceType } from '@nestjs/graphql';

@InterfaceType()
export abstract class ISocial {
    @Field({ nullable: true, complexity: 0 }) email?: string;
    @Field({ nullable: true, complexity: 0 }) blog?: string;
    @Field({ nullable: true, complexity: 0 }) twitter?: string;
    @Field({ nullable: true, complexity: 0 }) coinmarketcap?: string;
    @Field({ nullable: true, complexity: 0 }) coingecko?: string;
}

@InterfaceType()
export abstract class IAssets {
    @Field({ nullable: true, complexity: 0 }) website?: string;
    @Field({ nullable: true, complexity: 0 }) description?: string;
    @Field(() => ISocial, { nullable: true })
    social?: ISocial;
    @Field({ nullable: true, complexity: 0 }) status?: string;
    @Field({ nullable: true, complexity: 0 }) pngUrl?: string;
    @Field({ nullable: true, complexity: 0 }) svgUrl?: string;
    @Field(() => [String], { nullable: 'itemsAndList', complexity: 0 })
    lockedAccounts?: string[];
    @Field(() => [String], { nullable: 'itemsAndList', complexity: 0 })
    extraTokens?: string[];
}
