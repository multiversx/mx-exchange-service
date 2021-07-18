import { ArgsType, Field, Int } from '@nestjs/graphql';

@ArgsType()
export class UnlockAssetsArs {
    @Field()
    sender: string;
    @Field()
    lockedTokenID: string;
    @Field(type => Int)
    lockedTokenNonce: number;
    @Field()
    amount: string;
}
