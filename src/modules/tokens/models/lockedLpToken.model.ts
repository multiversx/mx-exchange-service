import { Field, ObjectType } from '@nestjs/graphql';
import { WrappedLpTokenAttributesModel } from 'src/modules/proxy/models/wrappedLpTokenAttributes.model';
import { NftToken } from './nftToken.model';

@ObjectType()
export class LockedLpToken extends NftToken {
    @Field(() => WrappedLpTokenAttributesModel)
    decodedAttributes: WrappedLpTokenAttributesModel;
}
