import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class GovernanceAction {
    @Field(() => Int)
    gasLimit: number;
    @Field()
    destAddress: string;
    @Field()
    functionName: string;
    @Field( () => [String])
    arguments: string[];

    constructor(init?: Partial<GovernanceAction>) {
        Object.assign(this, init);
    }
}
