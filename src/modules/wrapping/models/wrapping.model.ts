import { ObjectType, Field, Int } from '@nestjs/graphql';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';

@ObjectType()
export class WrapModel {
    @Field()
    address: string;
    @Field(() => Int)
    shard: number;
    @Field()
    wrappedToken: EsdtToken;

    constructor(init?: Partial<WrapModel>) {
        Object.assign(this, init);
    }
}
