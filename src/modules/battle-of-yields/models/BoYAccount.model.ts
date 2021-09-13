import { Field, ObjectType } from '@nestjs/graphql';
import { UserToken } from 'src/modules/user/models/user.model';
import { UserNftTokens } from 'src/modules/user/nfttokens.union';

@ObjectType()
export class BoYAccount {
    @Field()
    address: string;
    @Field(type => [UserToken])
    userTokens: UserToken[];
    @Field(type => [UserNftTokens])
    userNftTokens: Array<typeof UserNftTokens>;
    @Field()
    netWorth: number;

    constructor(init?: Partial<BoYAccount>) {
        Object.assign(this, init);
    }
}
