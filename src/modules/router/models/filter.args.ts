import { ArgsType, Field } from '@nestjs/graphql';

@ArgsType()
export class PairFilterArgs {
    @Field({ nullable: true })
    address: string;
    @Field({ nullable: true })
    firstTokenID: string;
    @Field({ nullable: true })
    secondTokenID: string;
    @Field(() => Boolean)
    issuedLpToken = true;
    @Field({ nullable: true })
    state: string;
}
