import { Field, Int, InterfaceType } from '@nestjs/graphql';

@InterfaceType()
export abstract class BaseNftToken {
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
