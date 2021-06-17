import { Field, Int, ObjectType } from '@nestjs/graphql';
import { TokenModel } from './esdtToken.model';

@ObjectType()
export class NFTTokenModel extends TokenModel {
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
