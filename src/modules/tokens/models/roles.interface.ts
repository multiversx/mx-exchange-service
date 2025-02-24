import { Field, InterfaceType } from '@nestjs/graphql';

@InterfaceType()
export abstract class IRoles {
    @Field({ nullable: true, complexity: 0 }) address?: string;
    @Field({ nullable: true, complexity: 0 }) canMint?: boolean;
    @Field({ nullable: true, complexity: 0 }) canBurn?: boolean;
    @Field(() => [String], { nullable: 'itemsAndList' }) roles?: string[];
}
