import { Field, Int, InterfaceType } from '@nestjs/graphql';
import { BaseToken } from './token.interface';

@InterfaceType()
export abstract class BaseNftToken extends BaseToken {
    @Field() canAddSpecialRoles: boolean;
    @Field() canTransferNFTCreateRole: boolean;
    @Field() NFTCreateStopped: boolean;
    @Field() wiped: string;

    @Field({ nullable: true })
    attributes?: string;
    @Field({ nullable: true })
    creator?: string;
    @Field(type => Int, { nullable: true }) nonce?: number;
    @Field({ nullable: true }) royalties?: string;
}
