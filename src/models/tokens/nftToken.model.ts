import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class NftToken {
    @Field() identifier: string;
    @Field() collection: string;
    @Field(type => Int) timestamp: number;
    @Field() attributes: string;
    @Field(type => Int) nonce: number;
    @Field() type: string;
    @Field() name: string;
    @Field() creator: string;
    @Field(type => Int) royalties: number;
    @Field(type => [String]) uris: string[];
    @Field() url: string;
    @Field(type => [String]) tags: string[];
    @Field() balance: string;
}
