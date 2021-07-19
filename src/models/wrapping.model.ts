import { ObjectType, Field, Int } from '@nestjs/graphql';
import { EsdtToken } from './tokens/esdtToken.model';

@ObjectType()
export class WrapModel {
    @Field()
    address: string;
    @Field(type => Int)
    shard: number;
    @Field()
    wrappedToken: EsdtToken;

    constructor(init?: Partial<WrapModel>) {
        Object.assign(this, init);
    }
}
