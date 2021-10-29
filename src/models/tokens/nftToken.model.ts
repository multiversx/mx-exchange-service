import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class NftToken {
    @Field() identifier: string;
    @Field() collection: string;
    @Field(() => Int) decimals: number;
    @Field(() => Int) timestamp: number;
    @Field() attributes: string;
    @Field(() => Int) nonce: number;
    @Field() type: string;
    @Field() name: string;
    @Field() creator: string;
    @Field(() => Int) royalties: number;
    @Field(() => [String]) uris: string[];
    @Field() url: string;
    @Field(() => [String]) tags: string[];
    @Field() balance: string;

    constructor(init?: Partial<NftToken>) {
        Object.assign(this, init);
    }
}
