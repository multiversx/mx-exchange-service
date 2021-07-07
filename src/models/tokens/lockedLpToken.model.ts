import { Field, Int, ObjectType } from '@nestjs/graphql';
import { WrappedLpTokenAttributesModel } from '../proxy.model';
import { NftToken } from './nftToken.model';

@ObjectType()
export class LockedLpToken extends NftToken {
    @Field(type => Int) decimals: number;
    @Field(type => WrappedLpTokenAttributesModel)
    decodedAttributes: WrappedLpTokenAttributesModel;
}
