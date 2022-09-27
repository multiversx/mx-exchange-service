import { Field, InterfaceType } from '@nestjs/graphql';

@InterfaceType()
export abstract class IRoles {
    @Field({ nullable: true }) address?: string;
    @Field({ nullable: true }) canMint?: boolean;
    @Field({ nullable: true }) canBurn?: boolean;
    @Field(() => [String], { nullable: 'itemsAndList' }) roles?: string[];
}
