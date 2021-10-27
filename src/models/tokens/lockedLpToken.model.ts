import { Field, ObjectType } from '@nestjs/graphql';
import { WrappedLpTokenAttributesModel } from '../../modules/proxy/models/wrappedLpTokenAttributes.model';
import { NftToken } from './nftToken.model';

@ObjectType()
export class LockedLpToken extends NftToken {
    @Field(type => WrappedLpTokenAttributesModel)
    decodedAttributes: WrappedLpTokenAttributesModel;
}
