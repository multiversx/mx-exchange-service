import { Field, InterfaceType } from '@nestjs/graphql';

@InterfaceType()
export abstract class ISocial {
    @Field({ nullable: true }) email?: string;
    @Field({ nullable: true }) blog?: string;
    @Field({ nullable: true }) twitter?: string;
    @Field({ nullable: true }) coinmarketcap?: string;
    @Field({ nullable: true }) coingecko?: string;
}

@InterfaceType()
export abstract class IAssets {
    @Field({ nullable: true }) website?: string;
    @Field({ nullable: true }) description?: string;
    @Field(() => ISocial, { nullable: true }) social?: ISocial;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) pngUrl?: string;
    @Field({ nullable: true }) svgUrl?: string;
    @Field(() => [String], { nullable: 'itemsAndList' })
    lockedAccounts?: string[];
    @Field(() => [String], { nullable: 'itemsAndList' }) extraTokens?: string[];
}
