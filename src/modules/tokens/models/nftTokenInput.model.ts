import { Field, InputType, Int } from '@nestjs/graphql';
import { INFTToken } from './nft.interface';

@InputType()
export class NftTokenInput implements INFTToken {
    @Field() identifier: string;
    @Field() collection: string;
    @Field() ticker: string;
    @Field(() => Int) decimals: number;
    @Field(() => Int, { nullable: true }) timestamp?: number;
    @Field() attributes: string;
    @Field(() => Int) nonce: number;
    @Field() type: string;
    @Field() name: string;
    @Field() creator: string;
    @Field(() => Int, { nullable: true }) royalties?: number;
    @Field(() => [String], { nullable: true }) uris?: string[];
    @Field({ nullable: true }) url?: string;
    @Field(() => [String], { nullable: true }) tags?: string[];
    @Field() balance: string;
}
