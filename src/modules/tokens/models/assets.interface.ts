import { Field, InterfaceType } from '@nestjs/graphql';

@InterfaceType()
export abstract class IAssets {
    @Field({ nullable: true }) website?: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) pngUrl?: string;
    @Field({ nullable: true }) svgUrl?: string;
    @Field(() => [String], { nullable: 'itemsAndList' })
    lockedAccounts?: string[];
    @Field(() => [String], { nullable: 'itemsAndList' }) extraTokens?: string[];
}
