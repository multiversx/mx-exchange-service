import { ArgsType, Field, Int } from '@nestjs/graphql';

@ArgsType()
export class UnlockAssetsArs {
    @Field()
    lockedTokenID: string;
    @Field(() => Int)
    lockedTokenNonce: number;
    @Field()
    amount: string;
}
